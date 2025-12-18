import { db } from '../../config/database';
import { AppError } from '../../common/middleware/error.middleware';
import { logger } from '../../common/utils/logger';
import {
  Message,
  MessageRecipient,
  MessageReaction,
  MessageType,
  SendMessageResponse,
} from '@sup/types';

export class MessageService {
  /**
   * Send a new message
   */
  async sendMessage(
    chatId: string,
    senderId: string,
    deviceId: string,
    encryptedContent: string,
    type: MessageType,
    recipientDeviceIds?: Record<string, string[]>,
    replyToId?: string,
    forwardFromId?: string
  ): Promise<SendMessageResponse> {
    try {
      // Verify user is a member of the chat
      const isMember = await this.verifyUserInChat(chatId, senderId);
      if (!isMember) {
        throw new AppError(403, 'You are not a member of this chat');
      }

      // Verify reply_to message exists if provided
      if (replyToId) {
        const replyMessage = await db.oneOrNone(
          'SELECT id FROM messages WHERE id = $1 AND chat_id = $2 AND deleted_at IS NULL',
          [replyToId, chatId]
        );
        if (!replyMessage) {
          throw new AppError(404, 'Reply message not found');
        }
      }

      // Verify forward_from message exists if provided
      if (forwardFromId) {
        const forwardMessage = await db.oneOrNone(
          'SELECT id FROM messages WHERE id = $1 AND deleted_at IS NULL',
          [forwardFromId]
        );
        if (!forwardMessage) {
          throw new AppError(404, 'Forward message not found');
        }
      }

      // Insert message
      const message = await db.one(
        `INSERT INTO messages (chat_id, sender_id, sender_device_id, encrypted_content, type, reply_to_id, forward_from_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, chat_id, sender_id, sender_device_id, encrypted_content, type, reply_to_id, forward_from_id, edited_at, deleted_at, created_at`,
        [chatId, senderId, deviceId, encryptedContent, type, replyToId, forwardFromId]
      );

      // Get all chat members except sender
      const chatMembers = await db.any(
        `SELECT user_id FROM chat_members
         WHERE chat_id = $1 AND user_id != $2 AND left_at IS NULL`,
        [chatId, senderId]
      );

      // Get all devices for recipients
      const recipients: MessageRecipient[] = [];

      for (const member of chatMembers) {
        const userId = member.user_id;
        let devices: { device_id: string }[] = [];

        // If recipientDeviceIds provided, use those specific devices
        if (recipientDeviceIds && recipientDeviceIds[userId]) {
          devices = recipientDeviceIds[userId].map(deviceId => ({ device_id: deviceId }));
        } else {
          // Otherwise get all user devices
          devices = await db.any(
            'SELECT device_id FROM user_devices WHERE user_id = $1',
            [userId]
          );
        }

        // Create recipient records for each device
        for (const device of devices) {
          await db.none(
            `INSERT INTO message_recipients (message_id, user_id, device_id)
             VALUES ($1, $2, $3)`,
            [message.id, userId, device.device_id]
          );

          recipients.push({
            messageId: message.id,
            userId: userId,
            deviceId: device.device_id,
            deliveredAt: undefined,
            readAt: undefined,
          });
        }
      }

      // Update chat's updated_at timestamp
      await db.none(
        'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [chatId]
      );

      logger.info('Message sent', { messageId: message.id, chatId, senderId });

      return {
        message: this.mapMessageFromDb(message),
        recipients,
      };
    } catch (error) {
      logger.error('Error sending message:', { chatId, senderId, error });
      throw error;
    }
  }

  /**
   * Get messages for a chat with cursor-based pagination
   */
  async getMessages(
    chatId: string,
    userId: string,
    cursor?: string,
    limit: number = 50
  ): Promise<{ messages: Message[]; nextCursor?: string; hasMore: boolean }> {
    try {
      // Verify user is a member of the chat
      const isMember = await this.verifyUserInChat(chatId, userId);
      if (!isMember) {
        throw new AppError(403, 'You are not a member of this chat');
      }

      // Build query with cursor pagination
      let query = `
        SELECT id, chat_id, sender_id, sender_device_id, encrypted_content, type,
               reply_to_id, forward_from_id, edited_at, deleted_at, created_at
        FROM messages
        WHERE chat_id = $1 AND deleted_at IS NULL
      `;
      const params: any[] = [chatId];

      if (cursor) {
        // Cursor is the created_at timestamp of the last message
        query += ` AND created_at < $${params.length + 1}`;
        params.push(cursor);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit + 1); // Fetch one extra to check if there are more

      const messages = await db.any(query, params);

      const hasMore = messages.length > limit;
      const resultMessages = hasMore ? messages.slice(0, limit) : messages;

      const nextCursor = hasMore && resultMessages.length > 0
        ? resultMessages[resultMessages.length - 1].created_at.toISOString()
        : undefined;

      logger.info('Messages retrieved', { chatId, userId, count: resultMessages.length });

      return {
        messages: resultMessages.map(this.mapMessageFromDb),
        nextCursor,
        hasMore,
      };
    } catch (error) {
      logger.error('Error getting messages:', { chatId, userId, error });
      throw error;
    }
  }

  /**
   * Get a single message by ID
   */
  async getMessage(messageId: string, userId: string): Promise<Message | null> {
    try {
      const message = await db.oneOrNone(
        `SELECT m.id, m.chat_id, m.sender_id, m.sender_device_id, m.encrypted_content,
                m.type, m.reply_to_id, m.forward_from_id, m.edited_at, m.deleted_at, m.created_at
         FROM messages m
         JOIN chat_members cm ON m.chat_id = cm.chat_id
         WHERE m.id = $1 AND cm.user_id = $2 AND cm.left_at IS NULL AND m.deleted_at IS NULL`,
        [messageId, userId]
      );

      if (!message) {
        return null;
      }

      logger.info('Message retrieved', { messageId, userId });

      return this.mapMessageFromDb(message);
    } catch (error) {
      logger.error('Error getting message:', { messageId, userId, error });
      throw error;
    }
  }

  /**
   * Edit a message (only sender, within 48 hours)
   */
  async editMessage(
    messageId: string,
    userId: string,
    newEncryptedContent: string
  ): Promise<Message> {
    try {
      // Get message and verify ownership
      const message = await db.oneOrNone(
        'SELECT id, sender_id, created_at, deleted_at FROM messages WHERE id = $1',
        [messageId]
      );

      if (!message) {
        throw new AppError(404, 'Message not found');
      }

      if (message.deleted_at) {
        throw new AppError(400, 'Cannot edit deleted message');
      }

      if (message.sender_id !== userId) {
        throw new AppError(403, 'You can only edit your own messages');
      }

      // Check if message is within 48 hours
      const hoursSinceCreation = (Date.now() - new Date(message.created_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation > 48) {
        throw new AppError(403, 'Messages can only be edited within 48 hours');
      }

      // Update message
      const updatedMessage = await db.one(
        `UPDATE messages
         SET encrypted_content = $1, edited_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, chat_id, sender_id, sender_device_id, encrypted_content, type,
                   reply_to_id, forward_from_id, edited_at, deleted_at, created_at`,
        [newEncryptedContent, messageId]
      );

      logger.info('Message edited', { messageId, userId });

      return this.mapMessageFromDb(updatedMessage);
    } catch (error) {
      logger.error('Error editing message:', { messageId, userId, error });
      throw error;
    }
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(
    messageId: string,
    userId: string,
    forEveryone: boolean = false
  ): Promise<void> {
    try {
      // Get message and chat info
      const message = await db.oneOrNone(
        `SELECT m.id, m.sender_id, m.chat_id, m.deleted_at,
                c.type as chat_type,
                cm.role_id,
                cr.permissions
         FROM messages m
         JOIN chats c ON m.chat_id = c.chat_id
         JOIN chat_members cm ON m.chat_id = cm.chat_id AND cm.user_id = $2
         LEFT JOIN chat_roles cr ON cm.role_id = cr.id
         WHERE m.id = $1`,
        [messageId, userId]
      );

      if (!message) {
        throw new AppError(404, 'Message not found');
      }

      if (message.deleted_at) {
        throw new AppError(400, 'Message already deleted');
      }

      if (forEveryone) {
        // Check if user has permission to delete for everyone
        const isOwner = message.sender_id === userId;
        const isAdmin = message.permissions?.deleteMessages === true;
        const isChatCreator = await db.oneOrNone(
          'SELECT 1 FROM chats WHERE id = $1 AND created_by = $2',
          [message.chat_id, userId]
        );

        if (!isOwner && !isAdmin && !isChatCreator) {
          throw new AppError(403, 'You can only delete for everyone if you are the sender, admin, or chat owner');
        }

        // Delete for everyone
        await db.none(
          'UPDATE messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
          [messageId]
        );

        logger.info('Message deleted for everyone', { messageId, userId });
      } else {
        // Delete for self only - mark as deleted in recipients table or just for this user
        // In a real implementation, we might use a separate table for per-user deletions
        // For simplicity, we'll use a soft delete approach
        await db.none(
          'UPDATE messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
          [messageId]
        );

        logger.info('Message deleted', { messageId, userId });
      }
    } catch (error) {
      logger.error('Error deleting message:', { messageId, userId, error });
      throw error;
    }
  }

  /**
   * Mark message as delivered
   */
  async markAsDelivered(
    messageId: string,
    userId: string,
    deviceId: string
  ): Promise<void> {
    try {
      // Check if recipient record exists
      const recipient = await db.oneOrNone(
        'SELECT message_id, delivered_at FROM message_recipients WHERE message_id = $1 AND user_id = $2 AND device_id = $3',
        [messageId, userId, deviceId]
      );

      if (!recipient) {
        throw new AppError(404, 'Recipient record not found');
      }

      if (recipient.delivered_at) {
        // Already delivered
        return;
      }

      // Mark as delivered
      await db.none(
        'UPDATE message_recipients SET delivered_at = CURRENT_TIMESTAMP WHERE message_id = $1 AND user_id = $2 AND device_id = $3',
        [messageId, userId, deviceId]
      );

      logger.info('Message marked as delivered', { messageId, userId, deviceId });
    } catch (error) {
      logger.error('Error marking message as delivered:', { messageId, userId, deviceId, error });
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(
    messageIds: string[],
    userId: string,
    deviceId: string
  ): Promise<void> {
    try {
      if (messageIds.length === 0) {
        return;
      }

      // Mark all as read
      await db.none(
        `UPDATE message_recipients
         SET read_at = CURRENT_TIMESTAMP, delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP)
         WHERE message_id = ANY($1) AND user_id = $2 AND device_id = $3 AND read_at IS NULL`,
        [messageIds, userId, deviceId]
      );

      logger.info('Messages marked as read', { messageIds: messageIds.length, userId, deviceId });
    } catch (error) {
      logger.error('Error marking messages as read:', { messageIds: messageIds.length, userId, deviceId, error });
      throw error;
    }
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<MessageReaction> {
    try {
      // Verify message exists and user has access
      const message = await this.getMessage(messageId, userId);
      if (!message) {
        throw new AppError(404, 'Message not found');
      }

      // Check if reaction already exists
      const existing = await db.oneOrNone(
        'SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
        [messageId, userId, emoji]
      );

      if (existing) {
        // Already reacted with this emoji
        return {
          id: existing.id,
          messageId,
          userId,
          emoji,
          createdAt: new Date(),
        };
      }

      // Add reaction
      const reaction = await db.one(
        `INSERT INTO message_reactions (message_id, user_id, emoji)
         VALUES ($1, $2, $3)
         RETURNING id, message_id, user_id, emoji, created_at`,
        [messageId, userId, emoji]
      );

      logger.info('Reaction added', { messageId, userId, emoji });

      return {
        id: reaction.id,
        messageId: reaction.message_id,
        userId: reaction.user_id,
        emoji: reaction.emoji,
        createdAt: reaction.created_at,
      };
    } catch (error) {
      logger.error('Error adding reaction:', { messageId, userId, emoji, error });
      throw error;
    }
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<void> {
    try {
      const result = await db.result(
        'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
        [messageId, userId, emoji]
      );

      if (result.rowCount === 0) {
        throw new AppError(404, 'Reaction not found');
      }

      logger.info('Reaction removed', { messageId, userId, emoji });
    } catch (error) {
      logger.error('Error removing reaction:', { messageId, userId, emoji, error });
      throw error;
    }
  }

  /**
   * Get all reactions for a message
   */
  async getReactions(messageId: string, userId: string): Promise<MessageReaction[]> {
    try {
      // Verify user has access to the message
      const message = await this.getMessage(messageId, userId);
      if (!message) {
        throw new AppError(404, 'Message not found');
      }

      const reactions = await db.any(
        `SELECT id, message_id, user_id, emoji, created_at
         FROM message_reactions
         WHERE message_id = $1
         ORDER BY created_at ASC`,
        [messageId]
      );

      return reactions.map(r => ({
        id: r.id,
        messageId: r.message_id,
        userId: r.user_id,
        emoji: r.emoji,
        createdAt: r.created_at,
      }));
    } catch (error) {
      logger.error('Error getting reactions:', { messageId, userId, error });
      throw error;
    }
  }

  /**
   * Search messages (only by metadata, content is encrypted)
   */
  async searchMessages(
    userId: string,
    query: string,
    chatId?: string,
    limit: number = 50
  ): Promise<Message[]> {
    try {
      // Search is limited since content is encrypted
      // We can only search by chat participation, but not content
      // This is a placeholder implementation

      let sql = `
        SELECT DISTINCT m.id, m.chat_id, m.sender_id, m.sender_device_id,
               m.encrypted_content, m.type, m.reply_to_id, m.forward_from_id,
               m.edited_at, m.deleted_at, m.created_at
        FROM messages m
        JOIN chat_members cm ON m.chat_id = cm.chat_id
        WHERE cm.user_id = $1 AND cm.left_at IS NULL AND m.deleted_at IS NULL
      `;
      const params: any[] = [userId];

      if (chatId) {
        sql += ` AND m.chat_id = $${params.length + 1}`;
        params.push(chatId);
      }

      sql += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const messages = await db.any(sql, params);

      logger.info('Messages searched', { userId, query, chatId, count: messages.length });

      return messages.map(this.mapMessageFromDb);
    } catch (error) {
      logger.error('Error searching messages:', { userId, query, chatId, error });
      throw error;
    }
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(userId: string, deviceId: string): Promise<number> {
    try {
      const result = await db.one(
        `SELECT COUNT(*) as count
         FROM message_recipients mr
         JOIN messages m ON mr.message_id = m.id
         JOIN chat_members cm ON m.chat_id = cm.chat_id
         WHERE mr.user_id = $1 AND mr.device_id = $2
         AND mr.read_at IS NULL
         AND cm.user_id = $1 AND cm.left_at IS NULL
         AND m.deleted_at IS NULL`,
        [userId, deviceId]
      );

      return parseInt(result.count);
    } catch (error) {
      logger.error('Error getting unread count:', { userId, deviceId, error });
      throw error;
    }
  }

  /**
   * Verify user is a member of the chat
   */
  private async verifyUserInChat(chatId: string, userId: string): Promise<boolean> {
    const member = await db.oneOrNone(
      'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2 AND left_at IS NULL',
      [chatId, userId]
    );

    return !!member;
  }

  /**
   * Map database message to Message type
   */
  private mapMessageFromDb(dbMessage: any): Message {
    return {
      id: dbMessage.id,
      chatId: dbMessage.chat_id,
      senderId: dbMessage.sender_id,
      senderDeviceId: dbMessage.sender_device_id,
      encryptedContent: dbMessage.encrypted_content,
      type: dbMessage.type,
      replyToId: dbMessage.reply_to_id,
      forwardFromId: dbMessage.forward_from_id,
      editedAt: dbMessage.edited_at,
      deletedAt: dbMessage.deleted_at,
      createdAt: dbMessage.created_at,
    };
  }
}

export const messageService = new MessageService();
