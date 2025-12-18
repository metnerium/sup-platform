import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { messageService } from './message.service';
import { AppError } from '../../common/middleware/error.middleware';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { logger } from '../../common/utils/logger';
import { MessageType } from '@sup/types';

export class MessageController {
  /**
   * Send a message
   * POST /api/chats/:chatId/messages
   */
  async sendMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Send message validation failed', {
          errors: errors.array(),
        });
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            errors: errors.array(),
          },
        });
        return;
      }

      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const { chatId } = req.params;
      const {
        encryptedContent,
        type,
        replyToId,
        forwardFromId,
        recipientDeviceIds,
      } = req.body;

      logger.info('Send message attempt', {
        chatId,
        userId: req.user.id,
        deviceId: req.user.deviceId,
        type,
      });

      const result = await messageService.sendMessage(
        chatId,
        req.user.id,
        req.user.deviceId,
        encryptedContent,
        type as MessageType,
        recipientDeviceIds,
        replyToId,
        forwardFromId
      );

      logger.info('Message sent successfully', {
        messageId: result.message.id,
        chatId,
        userId: req.user.id,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get messages for a chat
   * GET /api/chats/:chatId/messages
   */
  async getMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Get messages validation failed', {
          errors: errors.array(),
        });
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            errors: errors.array(),
          },
        });
        return;
      }

      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const { chatId } = req.params;
      const cursor = req.query.cursor as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      logger.info('Get messages attempt', {
        chatId,
        userId: req.user.id,
        cursor,
        limit,
      });

      const result = await messageService.getMessages(
        chatId,
        req.user.id,
        cursor,
        limit
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single message
   * GET /api/messages/:id
   */
  async getMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Get message validation failed', {
          errors: errors.array(),
        });
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            errors: errors.array(),
          },
        });
        return;
      }

      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const { id } = req.params;

      logger.info('Get message attempt', {
        messageId: id,
        userId: req.user.id,
      });

      const message = await messageService.getMessage(id, req.user.id);

      if (!message) {
        throw new AppError(404, 'Message not found');
      }

      res.status(200).json({
        success: true,
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Edit a message
   * PUT /api/messages/:id
   */
  async editMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Edit message validation failed', {
          errors: errors.array(),
        });
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            errors: errors.array(),
          },
        });
        return;
      }

      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const { id } = req.params;
      const { encryptedContent } = req.body;

      logger.info('Edit message attempt', {
        messageId: id,
        userId: req.user.id,
      });

      const message = await messageService.editMessage(
        id,
        req.user.id,
        encryptedContent
      );

      logger.info('Message edited successfully', {
        messageId: id,
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a message
   * DELETE /api/messages/:id
   */
  async deleteMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Delete message validation failed', {
          errors: errors.array(),
        });
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            errors: errors.array(),
          },
        });
        return;
      }

      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const { id } = req.params;
      const { forEveryone } = req.body;

      logger.info('Delete message attempt', {
        messageId: id,
        userId: req.user.id,
        forEveryone: forEveryone || false,
      });

      await messageService.deleteMessage(id, req.user.id, forEveryone || false);

      logger.info('Message deleted successfully', {
        messageId: id,
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        message: 'Message deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark message as delivered
   * POST /api/messages/:id/delivered
   */
  async markAsDelivered(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Mark as delivered validation failed', {
          errors: errors.array(),
        });
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            errors: errors.array(),
          },
        });
        return;
      }

      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const { id } = req.params;

      logger.info('Mark as delivered attempt', {
        messageId: id,
        userId: req.user.id,
        deviceId: req.user.deviceId,
      });

      await messageService.markAsDelivered(id, req.user.id, req.user.deviceId);

      res.status(200).json({
        success: true,
        message: 'Message marked as delivered',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark messages as read
   * POST /api/messages/read
   */
  async markAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Mark as read validation failed', {
          errors: errors.array(),
        });
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            errors: errors.array(),
          },
        });
        return;
      }

      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const { messageIds } = req.body;

      logger.info('Mark as read attempt', {
        messageCount: messageIds.length,
        userId: req.user.id,
        deviceId: req.user.deviceId,
      });

      await messageService.markAsRead(messageIds, req.user.id, req.user.deviceId);

      logger.info('Messages marked as read', {
        messageCount: messageIds.length,
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        message: 'Messages marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add a reaction to a message
   * POST /api/messages/:id/reactions
   */
  async addReaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Add reaction validation failed', {
          errors: errors.array(),
        });
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            errors: errors.array(),
          },
        });
        return;
      }

      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const { id } = req.params;
      const { emoji } = req.body;

      logger.info('Add reaction attempt', {
        messageId: id,
        userId: req.user.id,
        emoji,
      });

      const reaction = await messageService.addReaction(id, req.user.id, emoji);

      logger.info('Reaction added successfully', {
        messageId: id,
        userId: req.user.id,
        emoji,
      });

      res.status(201).json({
        success: true,
        data: reaction,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove a reaction from a message
   * DELETE /api/messages/:id/reactions/:emoji
   */
  async removeReaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Remove reaction validation failed', {
          errors: errors.array(),
        });
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            errors: errors.array(),
          },
        });
        return;
      }

      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const { id, emoji } = req.params;

      logger.info('Remove reaction attempt', {
        messageId: id,
        userId: req.user.id,
        emoji,
      });

      await messageService.removeReaction(id, req.user.id, emoji);

      logger.info('Reaction removed successfully', {
        messageId: id,
        userId: req.user.id,
        emoji,
      });

      res.status(200).json({
        success: true,
        message: 'Reaction removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all reactions for a message
   * GET /api/messages/:id/reactions
   */
  async getReactions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Get reactions validation failed', {
          errors: errors.array(),
        });
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            errors: errors.array(),
          },
        });
        return;
      }

      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const { id } = req.params;

      logger.info('Get reactions attempt', {
        messageId: id,
        userId: req.user.id,
      });

      const reactions = await messageService.getReactions(id, req.user.id);

      res.status(200).json({
        success: true,
        data: reactions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search messages
   * POST /api/messages/search
   */
  async searchMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Search messages validation failed', {
          errors: errors.array(),
        });
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            errors: errors.array(),
          },
        });
        return;
      }

      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const { query, chatId, limit } = req.body;

      logger.info('Search messages attempt', {
        userId: req.user.id,
        query,
        chatId,
        limit,
      });

      const messages = await messageService.searchMessages(
        req.user.id,
        query,
        chatId,
        limit || 50
      );

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get unread message count
   * GET /api/messages/unread
   */
  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      logger.info('Get unread count attempt', {
        userId: req.user.id,
        deviceId: req.user.deviceId,
      });

      const count = await messageService.getUnreadCount(req.user.id, req.user.deviceId);

      res.status(200).json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const messageController = new MessageController();
