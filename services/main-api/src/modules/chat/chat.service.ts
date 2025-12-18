import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { db } from '../../config/database';
import { AppError } from '../../common/middleware/error.middleware';
import { logger } from '../../common/utils/logger';
import {
  Chat,
  ChatMember,
  ChatRole,
  CreateChatRequest,
  CreateChatResponse,
} from '@sup/types';
import { ChatType, PaginationParams, PaginatedResponse } from '@sup/types';

interface UpdateChatData {
  name?: string;
  description?: string;
  avatarUrl?: string;
  isPublic?: boolean;
}

interface CreateRoleData {
  name: string;
  permissions: Record<string, boolean>;
  color?: string;
}

interface UpdateRoleData {
  name?: string;
  permissions?: Record<string, boolean>;
  color?: string;
}

export class ChatService {
  /**
   * Create a new chat
   */
  async createChat(
    userId: string,
    type: ChatType,
    name?: string,
    memberIds?: string[],
    description?: string,
    isPublic: boolean = false
  ): Promise<CreateChatResponse> {
    // Validate chat type requirements
    if (type === 'direct') {
      if (!memberIds || memberIds.length !== 1) {
        throw new AppError(400, 'Direct chat requires exactly one other member');
      }

      // Check if direct chat already exists between these users
      const existingChat = await this.findExistingDirectChat(userId, memberIds[0]);
      if (existingChat) {
        throw new AppError(409, 'Direct chat already exists with this user');
      }
    }

    if ((type === 'group' || type === 'channel') && !name) {
      throw new AppError(400, `${type} chat requires a name`);
    }

    // Verify all member users exist
    if (memberIds && memberIds.length > 0) {
      const users = await db.manyOrNone(
        'SELECT id FROM users WHERE id = ANY($1) AND deleted_at IS NULL',
        [memberIds]
      );

      if (users.length !== memberIds.length) {
        throw new AppError(400, 'One or more member users not found');
      }
    }

    // Create chat and members in a transaction
    const result = await db.tx(async (t) => {
      // Create chat
      const chat = await t.one(
        `INSERT INTO chats (type, name, description, created_by, is_public)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, type, name, description, avatar_url, created_by, is_public,
                   invite_link, created_at, updated_at`,
        [type, name || null, description || null, userId, isPublic]
      );

      const members: any[] = [];

      // Create default roles for group/channel
      let ownerRoleId: string | undefined;
      if (type === 'group' || type === 'channel') {
        // Owner role
        const ownerRole = await t.one(
          `INSERT INTO chat_roles (chat_id, name, permissions, color, is_default)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            chat.id,
            'Owner',
            JSON.stringify({
              manage_chat: true,
              manage_members: true,
              manage_roles: true,
              send_messages: true,
              delete_messages: true,
              pin_messages: true,
            }),
            '#FF0000',
            false,
          ]
        );
        ownerRoleId = ownerRole.id;

        // Admin role
        await t.none(
          `INSERT INTO chat_roles (chat_id, name, permissions, color, is_default)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            chat.id,
            'Admin',
            JSON.stringify({
              manage_members: true,
              send_messages: true,
              delete_messages: true,
              pin_messages: true,
            }),
            '#FFA500',
            false,
          ]
        );

        // Member role (default)
        await t.none(
          `INSERT INTO chat_roles (chat_id, name, permissions, color, is_default)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            chat.id,
            'Member',
            JSON.stringify({
              send_messages: true,
            }),
            '#808080',
            true,
          ]
        );
      }

      // Add creator as member
      const creatorMember = await t.one(
        `INSERT INTO chat_members (chat_id, user_id, role_id, invited_by)
         VALUES ($1, $2, $3, $4)
         RETURNING chat_id, user_id, role_id, joined_at, left_at, invited_by`,
        [chat.id, userId, ownerRoleId || null, null]
      );
      members.push(creatorMember);

      // Add other members
      if (memberIds && memberIds.length > 0) {
        for (const memberId of memberIds) {
          const member = await t.one(
            `INSERT INTO chat_members (chat_id, user_id, role_id, invited_by)
             VALUES ($1, $2, $3, $4)
             RETURNING chat_id, user_id, role_id, joined_at, left_at, invited_by`,
            [chat.id, memberId, null, userId]
          );
          members.push(member);
        }
      }

      return { chat, members };
    });

    logger.info('Chat created successfully', {
      chatId: result.chat.id,
      type,
      createdBy: userId,
    });

    return {
      chat: this.mapChatFromDb(result.chat),
      members: result.members.map(this.mapChatMemberFromDb),
    };
  }

  /**
   * Get chat by ID with access check
   */
  async getChat(chatId: string, userId: string): Promise<Chat> {
    // Check if user is a member of the chat
    const isMember = await this.isChatMember(chatId, userId);
    if (!isMember) {
      throw new AppError(403, 'You are not a member of this chat');
    }

    const chat = await db.oneOrNone(
      `SELECT id, type, name, description, avatar_url, created_by, is_public,
              invite_link, created_at, updated_at
       FROM chats
       WHERE id = $1`,
      [chatId]
    );

    if (!chat) {
      throw new AppError(404, 'Chat not found');
    }

    return this.mapChatFromDb(chat);
  }

  /**
   * Update chat details (only admins/owners)
   */
  async updateChat(
    chatId: string,
    userId: string,
    data: UpdateChatData
  ): Promise<Chat> {
    // Check permissions
    await this.checkChatPermission(chatId, userId, 'manage_chat');

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (data.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(data.avatarUrl);
    }

    if (data.isPublic !== undefined) {
      updates.push(`is_public = $${paramIndex++}`);
      values.push(data.isPublic);
    }

    if (updates.length === 0) {
      throw new AppError(400, 'No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(chatId);

    const query = `
      UPDATE chats
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, type, name, description, avatar_url, created_by, is_public,
                invite_link, created_at, updated_at
    `;

    const chat = await db.one(query, values);

    logger.info('Chat updated', { chatId, userId, updates: Object.keys(data) });

    return this.mapChatFromDb(chat);
  }

  /**
   * Delete chat (only owner)
   */
  async deleteChat(chatId: string, userId: string): Promise<void> {
    // Check if user is the owner
    const chat = await db.oneOrNone(
      'SELECT created_by FROM chats WHERE id = $1',
      [chatId]
    );

    if (!chat) {
      throw new AppError(404, 'Chat not found');
    }

    if (chat.created_by !== userId) {
      throw new AppError(403, 'Only the chat owner can delete the chat');
    }

    // Delete chat (cascade will delete members, roles, messages)
    await db.tx(async (t) => {
      await t.none('DELETE FROM chat_members WHERE chat_id = $1', [chatId]);
      await t.none('DELETE FROM chat_roles WHERE chat_id = $1', [chatId]);
      await t.none('DELETE FROM chats WHERE id = $1', [chatId]);
    });

    logger.info('Chat deleted', { chatId, userId });
  }

  /**
   * Get user's chats with pagination
   */
  async getUserChats(
    userId: string,
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<Chat>> {
    const limit = Math.min(pagination.limit || 50, 100);
    const offset = pagination.offset || 0;

    // Get chats where user is a member
    const chats = await db.manyOrNone(
      `SELECT c.id, c.type, c.name, c.description, c.avatar_url, c.created_by,
              c.is_public, c.invite_link, c.created_at, c.updated_at
       FROM chats c
       INNER JOIN chat_members cm ON c.id = cm.chat_id
       WHERE cm.user_id = $1 AND cm.left_at IS NULL
       ORDER BY c.updated_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit + 1, offset]
    );

    const hasMore = chats.length > limit;
    const items = hasMore ? chats.slice(0, limit) : chats;

    // Get total count
    const totalResult = await db.one(
      `SELECT COUNT(*) as count
       FROM chat_members
       WHERE user_id = $1 AND left_at IS NULL`,
      [userId]
    );

    return {
      items: items.map(this.mapChatFromDb),
      total: parseInt(totalResult.count),
      hasMore,
      nextCursor: hasMore ? String(offset + limit) : undefined,
    };
  }

  /**
   * Add member to chat
   */
  async addMember(
    chatId: string,
    userId: string,
    newMemberId: string,
    roleId?: string
  ): Promise<ChatMember> {
    // Check if user has permission to add members
    await this.checkChatPermission(chatId, userId, 'manage_members');

    // Check if chat is direct (cannot add members to direct chats)
    const chat = await db.oneOrNone('SELECT type FROM chats WHERE id = $1', [
      chatId,
    ]);

    if (!chat) {
      throw new AppError(404, 'Chat not found');
    }

    if (chat.type === 'direct') {
      throw new AppError(400, 'Cannot add members to direct chats');
    }

    // Check if new member exists
    const newUser = await db.oneOrNone(
      'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
      [newMemberId]
    );

    if (!newUser) {
      throw new AppError(404, 'User not found');
    }

    // Check if already a member
    const existingMember = await db.oneOrNone(
      'SELECT user_id FROM chat_members WHERE chat_id = $1 AND user_id = $2 AND left_at IS NULL',
      [chatId, newMemberId]
    );

    if (existingMember) {
      throw new AppError(409, 'User is already a member of this chat');
    }

    // Validate role if provided
    if (roleId) {
      const role = await db.oneOrNone(
        'SELECT id FROM chat_roles WHERE id = $1 AND chat_id = $2',
        [roleId, chatId]
      );

      if (!role) {
        throw new AppError(404, 'Role not found');
      }
    }

    // Add member
    const member = await db.one(
      `INSERT INTO chat_members (chat_id, user_id, role_id, invited_by)
       VALUES ($1, $2, $3, $4)
       RETURNING chat_id, user_id, role_id, joined_at, left_at, invited_by`,
      [chatId, newMemberId, roleId || null, userId]
    );

    logger.info('Member added to chat', { chatId, userId, newMemberId });

    return this.mapChatMemberFromDb(member);
  }

  /**
   * Remove member from chat
   */
  async removeMember(
    chatId: string,
    userId: string,
    memberId: string
  ): Promise<void> {
    // Check if user has permission to remove members
    await this.checkChatPermission(chatId, userId, 'manage_members');

    // Check if target is the owner
    const chat = await db.oneOrNone(
      'SELECT created_by FROM chats WHERE id = $1',
      [chatId]
    );

    if (!chat) {
      throw new AppError(404, 'Chat not found');
    }

    if (chat.created_by === memberId) {
      throw new AppError(400, 'Cannot remove the chat owner');
    }

    // Check if member exists
    const member = await db.oneOrNone(
      'SELECT user_id FROM chat_members WHERE chat_id = $1 AND user_id = $2 AND left_at IS NULL',
      [chatId, memberId]
    );

    if (!member) {
      throw new AppError(404, 'Member not found in this chat');
    }

    // Remove member (soft delete)
    await db.none(
      'UPDATE chat_members SET left_at = CURRENT_TIMESTAMP WHERE chat_id = $1 AND user_id = $2',
      [chatId, memberId]
    );

    logger.info('Member removed from chat', { chatId, userId, memberId });
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    chatId: string,
    userId: string,
    memberId: string,
    roleId: string
  ): Promise<ChatMember> {
    // Check if user has permission to manage roles
    await this.checkChatPermission(chatId, userId, 'manage_roles');

    // Check if target is the owner
    const chat = await db.oneOrNone(
      'SELECT created_by FROM chats WHERE id = $1',
      [chatId]
    );

    if (!chat) {
      throw new AppError(404, 'Chat not found');
    }

    if (chat.created_by === memberId) {
      throw new AppError(400, 'Cannot change the owner role');
    }

    // Verify role exists and belongs to this chat
    const role = await db.oneOrNone(
      'SELECT id FROM chat_roles WHERE id = $1 AND chat_id = $2',
      [roleId, chatId]
    );

    if (!role) {
      throw new AppError(404, 'Role not found');
    }

    // Update member role
    const member = await db.one(
      `UPDATE chat_members
       SET role_id = $1
       WHERE chat_id = $2 AND user_id = $3 AND left_at IS NULL
       RETURNING chat_id, user_id, role_id, joined_at, left_at, invited_by`,
      [roleId, chatId, memberId]
    );

    logger.info('Member role updated', { chatId, userId, memberId, roleId });

    return this.mapChatMemberFromDb(member);
  }

  /**
   * Leave chat
   */
  async leaveChat(chatId: string, userId: string): Promise<void> {
    // Check if user is the owner
    const chat = await db.oneOrNone(
      'SELECT created_by, type FROM chats WHERE id = $1',
      [chatId]
    );

    if (!chat) {
      throw new AppError(404, 'Chat not found');
    }

    if (chat.created_by === userId) {
      throw new AppError(400, 'Owner cannot leave the chat. Transfer ownership or delete the chat instead.');
    }

    // Check if member exists
    const member = await db.oneOrNone(
      'SELECT user_id FROM chat_members WHERE chat_id = $1 AND user_id = $2 AND left_at IS NULL',
      [chatId, userId]
    );

    if (!member) {
      throw new AppError(404, 'You are not a member of this chat');
    }

    // Leave chat (soft delete)
    await db.none(
      'UPDATE chat_members SET left_at = CURRENT_TIMESTAMP WHERE chat_id = $1 AND user_id = $2',
      [chatId, userId]
    );

    logger.info('User left chat', { chatId, userId });
  }

  /**
   * Get chat members
   */
  async getChatMembers(chatId: string, userId: string): Promise<ChatMember[]> {
    // Check if user is a member
    await this.checkChatMembership(chatId, userId);

    const members = await db.manyOrNone(
      `SELECT chat_id, user_id, role_id, joined_at, left_at, invited_by
       FROM chat_members
       WHERE chat_id = $1 AND left_at IS NULL
       ORDER BY joined_at ASC`,
      [chatId]
    );

    return members.map(this.mapChatMemberFromDb);
  }

  /**
   * Generate invite link for chat
   */
  async generateInviteLink(chatId: string, userId: string): Promise<string> {
    // Check if user has permission to manage chat
    await this.checkChatPermission(chatId, userId, 'manage_chat');

    // Generate unique invite code
    const inviteCode = crypto.randomBytes(16).toString('hex');

    // Update chat with invite link
    await db.none(
      'UPDATE chats SET invite_link = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [inviteCode, chatId]
    );

    logger.info('Invite link generated', { chatId, userId });

    return inviteCode;
  }

  /**
   * Join chat by invite link
   */
  async joinByInviteLink(inviteLink: string, userId: string): Promise<Chat> {
    // Find chat by invite link
    const chat = await db.oneOrNone(
      'SELECT id, type FROM chats WHERE invite_link = $1',
      [inviteLink]
    );

    if (!chat) {
      throw new AppError(404, 'Invalid invite link');
    }

    // Check if already a member
    const existingMember = await db.oneOrNone(
      'SELECT user_id FROM chat_members WHERE chat_id = $1 AND user_id = $2 AND left_at IS NULL',
      [chat.id, userId]
    );

    if (existingMember) {
      throw new AppError(409, 'You are already a member of this chat');
    }

    // Add user as member
    await db.none(
      `INSERT INTO chat_members (chat_id, user_id, role_id, invited_by)
       VALUES ($1, $2, $3, $4)`,
      [chat.id, userId, null, null]
    );

    logger.info('User joined chat via invite link', { chatId: chat.id, userId });

    return this.getChat(chat.id, userId);
  }

  /**
   * Get chat roles
   */
  async getChatRoles(chatId: string, userId: string): Promise<ChatRole[]> {
    // Check if user is a member
    await this.checkChatMembership(chatId, userId);

    const roles = await db.manyOrNone(
      `SELECT id, chat_id, name, permissions, color, is_default, created_at
       FROM chat_roles
       WHERE chat_id = $1
       ORDER BY created_at ASC`,
      [chatId]
    );

    return roles.map(this.mapChatRoleFromDb);
  }

  /**
   * Create custom role
   */
  async createRole(
    chatId: string,
    userId: string,
    data: CreateRoleData
  ): Promise<ChatRole> {
    // Check if user has permission to manage roles
    await this.checkChatPermission(chatId, userId, 'manage_roles');

    // Check if role name already exists
    const existingRole = await db.oneOrNone(
      'SELECT id FROM chat_roles WHERE chat_id = $1 AND name = $2',
      [chatId, data.name]
    );

    if (existingRole) {
      throw new AppError(409, 'Role with this name already exists');
    }

    // Create role
    const role = await db.one(
      `INSERT INTO chat_roles (chat_id, name, permissions, color, is_default)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, chat_id, name, permissions, color, is_default, created_at`,
      [
        chatId,
        data.name,
        JSON.stringify(data.permissions),
        data.color || '#808080',
        false,
      ]
    );

    logger.info('Chat role created', { chatId, userId, roleId: role.id });

    return this.mapChatRoleFromDb(role);
  }

  /**
   * Update role
   */
  async updateRole(
    chatId: string,
    userId: string,
    roleId: string,
    data: UpdateRoleData
  ): Promise<ChatRole> {
    // Check if user has permission to manage roles
    await this.checkChatPermission(chatId, userId, 'manage_roles');

    // Verify role exists and belongs to this chat
    const role = await db.oneOrNone(
      'SELECT id, is_default FROM chat_roles WHERE id = $1 AND chat_id = $2',
      [roleId, chatId]
    );

    if (!role) {
      throw new AppError(404, 'Role not found');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.permissions !== undefined) {
      updates.push(`permissions = $${paramIndex++}`);
      values.push(JSON.stringify(data.permissions));
    }

    if (data.color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(data.color);
    }

    if (updates.length === 0) {
      throw new AppError(400, 'No fields to update');
    }

    values.push(roleId);

    const query = `
      UPDATE chat_roles
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, chat_id, name, permissions, color, is_default, created_at
    `;

    const updatedRole = await db.one(query, values);

    logger.info('Chat role updated', { chatId, userId, roleId });

    return this.mapChatRoleFromDb(updatedRole);
  }

  /**
   * Delete role
   */
  async deleteRole(chatId: string, userId: string, roleId: string): Promise<void> {
    // Check if user has permission to manage roles
    await this.checkChatPermission(chatId, userId, 'manage_roles');

    // Verify role exists and is not default
    const role = await db.oneOrNone(
      'SELECT id, is_default FROM chat_roles WHERE id = $1 AND chat_id = $2',
      [roleId, chatId]
    );

    if (!role) {
      throw new AppError(404, 'Role not found');
    }

    if (role.is_default) {
      throw new AppError(400, 'Cannot delete default role');
    }

    // Remove role from members and delete
    await db.tx(async (t) => {
      await t.none(
        'UPDATE chat_members SET role_id = NULL WHERE role_id = $1',
        [roleId]
      );
      await t.none('DELETE FROM chat_roles WHERE id = $1', [roleId]);
    });

    logger.info('Chat role deleted', { chatId, userId, roleId });
  }

  // Helper methods

  private async findExistingDirectChat(
    userId1: string,
    userId2: string
  ): Promise<string | null> {
    const result = await db.oneOrNone(
      `SELECT c.id
       FROM chats c
       INNER JOIN chat_members cm1 ON c.id = cm1.chat_id
       INNER JOIN chat_members cm2 ON c.id = cm2.chat_id
       WHERE c.type = 'direct'
         AND cm1.user_id = $1
         AND cm2.user_id = $2
         AND cm1.left_at IS NULL
         AND cm2.left_at IS NULL`,
      [userId1, userId2]
    );

    return result ? result.id : null;
  }

  private async isChatMember(chatId: string, userId: string): Promise<boolean> {
    const result = await db.oneOrNone(
      'SELECT user_id FROM chat_members WHERE chat_id = $1 AND user_id = $2 AND left_at IS NULL',
      [chatId, userId]
    );

    return !!result;
  }

  private async checkChatMembership(
    chatId: string,
    userId: string
  ): Promise<void> {
    const isMember = await this.isChatMember(chatId, userId);
    if (!isMember) {
      throw new AppError(403, 'You are not a member of this chat');
    }
  }

  private async checkChatPermission(
    chatId: string,
    userId: string,
    permission: string
  ): Promise<void> {
    // Get user's role in the chat
    const member = await db.oneOrNone(
      `SELECT cm.role_id, c.created_by
       FROM chat_members cm
       INNER JOIN chats c ON cm.chat_id = c.id
       WHERE cm.chat_id = $1 AND cm.user_id = $2 AND cm.left_at IS NULL`,
      [chatId, userId]
    );

    if (!member) {
      throw new AppError(403, 'You are not a member of this chat');
    }

    // Owner has all permissions
    if (member.created_by === userId) {
      return;
    }

    // Check role permissions
    if (member.role_id) {
      const role = await db.oneOrNone(
        'SELECT permissions FROM chat_roles WHERE id = $1',
        [member.role_id]
      );

      if (role && role.permissions[permission]) {
        return;
      }
    }

    throw new AppError(403, 'You do not have permission to perform this action');
  }

  private mapChatFromDb(row: any): Chat {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      description: row.description,
      avatarUrl: row.avatar_url,
      createdBy: row.created_by,
      isPublic: row.is_public,
      inviteLink: row.invite_link,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapChatMemberFromDb(row: any): ChatMember {
    return {
      chatId: row.chat_id,
      userId: row.user_id,
      roleId: row.role_id,
      joinedAt: row.joined_at,
      leftAt: row.left_at,
      invitedBy: row.invited_by,
    };
  }

  private mapChatRoleFromDb(row: any): ChatRole {
    return {
      id: row.id,
      chatId: row.chat_id,
      name: row.name,
      permissions:
        typeof row.permissions === 'string'
          ? JSON.parse(row.permissions)
          : row.permissions,
      color: row.color,
      isDefault: row.is_default,
      createdAt: row.created_at,
    };
  }
}

export const chatService = new ChatService();
