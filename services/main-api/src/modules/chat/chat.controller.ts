import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { chatService } from './chat.service';
import { AppError } from '../../common/middleware/error.middleware';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { logger } from '../../common/utils/logger';
import { ChatType, PaginationParams } from '@sup/types';

export class ChatController {
  /**
   * Create a new chat
   * POST /api/chats
   */
  async createChat(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Create chat validation failed', {
          errors: errors.array(),
          userId: req.user?.id,
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

      const { type, name, memberIds, description, isPublic } = req.body;

      logger.info('Create chat attempt', {
        userId: req.user.id,
        type,
        name,
        memberCount: memberIds?.length || 0,
      });

      const result = await chatService.createChat(
        req.user.id,
        type as ChatType,
        name,
        memberIds,
        description,
        isPublic
      );

      logger.info('Chat created successfully', {
        chatId: result.chat.id,
        userId: req.user.id,
        type: result.chat.type,
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
   * Get user's chats
   * GET /api/chats
   */
  async getUserChats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Get user chats validation failed', {
          errors: errors.array(),
          userId: req.user?.id,
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

      const pagination: PaginationParams = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        cursor: req.query.cursor as string,
      };

      logger.info('Get user chats request', {
        userId: req.user.id,
        pagination,
      });

      const result = await chatService.getUserChats(req.user.id, pagination);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get chat by ID
   * GET /api/chats/:id
   */
  async getChat(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Get chat validation failed', {
          errors: errors.array(),
          userId: req.user?.id,
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

      const { id: chatId } = req.params;

      logger.info('Get chat request', {
        userId: req.user.id,
        chatId,
      });

      const chat = await chatService.getChat(chatId, req.user.id);

      res.status(200).json({
        success: true,
        data: chat,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update chat
   * PUT /api/chats/:id
   */
  async updateChat(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Update chat validation failed', {
          errors: errors.array(),
          userId: req.user?.id,
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

      const { id: chatId } = req.params;
      const { name, description, avatarUrl, isPublic } = req.body;

      logger.info('Update chat attempt', {
        userId: req.user.id,
        chatId,
        updates: Object.keys(req.body),
      });

      const chat = await chatService.updateChat(chatId, req.user.id, {
        name,
        description,
        avatarUrl,
        isPublic,
      });

      logger.info('Chat updated successfully', {
        chatId,
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        data: chat,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete chat
   * DELETE /api/chats/:id
   */
  async deleteChat(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Delete chat validation failed', {
          errors: errors.array(),
          userId: req.user?.id,
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

      const { id: chatId } = req.params;

      logger.info('Delete chat attempt', {
        userId: req.user.id,
        chatId,
      });

      await chatService.deleteChat(chatId, req.user.id);

      logger.info('Chat deleted successfully', {
        chatId,
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        message: 'Chat deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add member to chat
   * POST /api/chats/:id/members
   */
  async addMember(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Add member validation failed', {
          errors: errors.array(),
          userId: req.user?.id,
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

      const { id: chatId } = req.params;
      const { userId, roleId } = req.body;

      logger.info('Add member attempt', {
        userId: req.user.id,
        chatId,
        newMemberId: userId,
      });

      const member = await chatService.addMember(
        chatId,
        req.user.id,
        userId,
        roleId
      );

      logger.info('Member added successfully', {
        chatId,
        userId: req.user.id,
        newMemberId: userId,
      });

      res.status(201).json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove member from chat
   * DELETE /api/chats/:id/members/:userId
   */
  async removeMember(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Remove member validation failed', {
          errors: errors.array(),
          userId: req.user?.id,
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

      const { id: chatId, userId: memberId } = req.params;

      logger.info('Remove member attempt', {
        userId: req.user.id,
        chatId,
        memberId,
      });

      await chatService.removeMember(chatId, req.user.id, memberId);

      logger.info('Member removed successfully', {
        chatId,
        userId: req.user.id,
        memberId,
      });

      res.status(200).json({
        success: true,
        message: 'Member removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update member role
   * PUT /api/chats/:id/members/:userId/role
   */
  async updateMemberRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Update member role validation failed', {
          errors: errors.array(),
          userId: req.user?.id,
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

      const { id: chatId } = req.params;
      const { userId: memberId, roleId } = req.body;

      logger.info('Update member role attempt', {
        userId: req.user.id,
        chatId,
        memberId,
        roleId,
      });

      const member = await chatService.updateMemberRole(
        chatId,
        req.user.id,
        memberId,
        roleId
      );

      logger.info('Member role updated successfully', {
        chatId,
        userId: req.user.id,
        memberId,
      });

      res.status(200).json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get chat members
   * GET /api/chats/:id/members
   */
  async getChatMembers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Get chat members validation failed', {
          errors: errors.array(),
          userId: req.user?.id,
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

      const { id: chatId } = req.params;

      logger.info('Get chat members request', {
        userId: req.user.id,
        chatId,
      });

      const members = await chatService.getChatMembers(chatId, req.user.id);

      res.status(200).json({
        success: true,
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Leave chat
   * POST /api/chats/:id/leave
   */
  async leaveChat(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Leave chat validation failed', {
          errors: errors.array(),
          userId: req.user?.id,
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

      const { id: chatId } = req.params;

      logger.info('Leave chat attempt', {
        userId: req.user.id,
        chatId,
      });

      await chatService.leaveChat(chatId, req.user.id);

      logger.info('User left chat successfully', {
        chatId,
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        message: 'Left chat successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate invite link
   * GET /api/chats/:id/invite
   */
  async generateInviteLink(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Generate invite link validation failed', {
          errors: errors.array(),
          userId: req.user?.id,
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

      const { id: chatId } = req.params;

      logger.info('Generate invite link request', {
        userId: req.user.id,
        chatId,
      });

      const inviteLink = await chatService.generateInviteLink(chatId, req.user.id);

      logger.info('Invite link generated successfully', {
        chatId,
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        data: {
          inviteLink,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Join chat by invite link
   * POST /api/chats/join/:link
   */
  async joinByInviteLink(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Join by invite link validation failed', {
          errors: errors.array(),
          userId: req.user?.id,
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

      const { link: inviteLink } = req.params;

      logger.info('Join by invite link attempt', {
        userId: req.user.id,
        inviteLink: inviteLink.substring(0, 10) + '...',
      });

      const chat = await chatService.joinByInviteLink(inviteLink, req.user.id);

      logger.info('User joined chat via invite link successfully', {
        chatId: chat.id,
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        data: chat,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get chat roles
   * GET /api/chats/:id/roles
   */
  async getChatRoles(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Get chat roles validation failed', {
          errors: errors.array(),
          userId: req.user?.id,
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

      const { id: chatId } = req.params;

      logger.info('Get chat roles request', {
        userId: req.user.id,
        chatId,
      });

      const roles = await chatService.getChatRoles(chatId, req.user.id);

      res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create chat role
   * POST /api/chats/:id/roles
   */
  async createRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Create role validation failed', {
          errors: errors.array(),
          userId: req.user?.id,
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

      const { id: chatId } = req.params;
      const { name, permissions, color } = req.body;

      logger.info('Create role attempt', {
        userId: req.user.id,
        chatId,
        roleName: name,
      });

      const role = await chatService.createRole(chatId, req.user.id, {
        name,
        permissions,
        color,
      });

      logger.info('Role created successfully', {
        chatId,
        userId: req.user.id,
        roleId: role.id,
      });

      res.status(201).json({
        success: true,
        data: role,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update chat role
   * PUT /api/chats/:id/roles/:roleId
   */
  async updateRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Update role validation failed', {
          errors: errors.array(),
          userId: req.user?.id,
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

      const { id: chatId, roleId } = req.params;
      const { name, permissions, color } = req.body;

      logger.info('Update role attempt', {
        userId: req.user.id,
        chatId,
        roleId,
      });

      const role = await chatService.updateRole(chatId, req.user.id, roleId, {
        name,
        permissions,
        color,
      });

      logger.info('Role updated successfully', {
        chatId,
        userId: req.user.id,
        roleId,
      });

      res.status(200).json({
        success: true,
        data: role,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete chat role
   * DELETE /api/chats/:id/roles/:roleId
   */
  async deleteRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Delete role validation failed', {
          errors: errors.array(),
          userId: req.user?.id,
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

      const { id: chatId, roleId } = req.params;

      logger.info('Delete role attempt', {
        userId: req.user.id,
        chatId,
        roleId,
      });

      await chatService.deleteRole(chatId, req.user.id, roleId);

      logger.info('Role deleted successfully', {
        chatId,
        userId: req.user.id,
        roleId,
      });

      res.status(200).json({
        success: true,
        message: 'Role deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
