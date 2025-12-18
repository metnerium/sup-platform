import { Response } from 'express';
import { userService } from './user.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { AppError } from '../../common/middleware/error.middleware';
import { logger } from '../../common/utils/logger';
import {
  UpdateUserInput,
  UpdateAvatarInput,
  UpdateStatusInput,
  SearchUsersInput,
  AddContactInput,
  BlockUserInput,
} from './user.validator';

export class UserController {
  /**
   * GET /me - Get current user
   */
  async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const user = await userService.getUserById(userId);

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Error getting current user:', { error });
      throw error;
    }
  }

  /**
   * GET /:id - Get user profile by ID
   */
  async getUserProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const requesterId = req.user!.id;

      const profile = await userService.getUserProfile(id, requesterId);

      if (!profile) {
        throw new AppError(404, 'User not found');
      }

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      logger.error('Error getting user profile:', { error });
      throw error;
    }
  }

  /**
   * PUT /me - Update current user profile
   */
  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const updateData: UpdateUserInput = req.body;

      const updatedUser = await userService.updateUser(userId, updateData);

      res.json({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      logger.error('Error updating user profile:', { error });
      throw error;
    }
  }

  /**
   * PATCH /me/avatar - Update current user avatar
   */
  async updateAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { avatarUrl }: UpdateAvatarInput = req.body;

      const updatedUser = await userService.updateAvatar(userId, avatarUrl);

      res.json({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      logger.error('Error updating avatar:', { error });
      throw error;
    }
  }

  /**
   * PATCH /me/status - Update current user status
   */
  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { status }: UpdateStatusInput = req.body;

      await userService.updateStatus(userId, status);

      res.json({
        success: true,
        data: { status },
      });
    } catch (error) {
      logger.error('Error updating status:', { error });
      throw error;
    }
  }

  /**
   * POST /search - Search users by username
   */
  async searchUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const requesterId = req.user!.id;
      const { query, limit, offset }: SearchUsersInput = req.body;

      const result = await userService.searchUsers(
        query,
        requesterId,
        limit,
        offset
      );

      res.json({
        success: true,
        data: {
          users: result.users,
          total: result.total,
          limit,
          offset,
          hasMore: offset + limit < result.total,
        },
      });
    } catch (error) {
      logger.error('Error searching users:', { error });
      throw error;
    }
  }

  /**
   * GET /contacts - Get current user's contacts
   */
  async getContacts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const contacts = await userService.getContacts(userId);

      res.json({
        success: true,
        data: contacts,
      });
    } catch (error) {
      logger.error('Error getting contacts:', { error });
      throw error;
    }
  }

  /**
   * POST /contacts - Add contact
   */
  async addContact(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { contactUserId, displayName }: AddContactInput = req.body;

      const contact = await userService.addContact(
        userId,
        contactUserId,
        displayName
      );

      res.status(201).json({
        success: true,
        data: contact,
      });
    } catch (error) {
      logger.error('Error adding contact:', { error });
      throw error;
    }
  }

  /**
   * DELETE /contacts/:contactId - Remove contact
   */
  async removeContact(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { contactId } = req.params;

      await userService.removeContact(userId, contactId);

      res.json({
        success: true,
        data: { message: 'Contact removed successfully' },
      });
    } catch (error) {
      logger.error('Error removing contact:', { error });
      throw error;
    }
  }

  /**
   * POST /block - Block user
   */
  async blockUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { blockedUserId }: BlockUserInput = req.body;

      await userService.blockUser(userId, blockedUserId);

      res.json({
        success: true,
        data: { message: 'User blocked successfully' },
      });
    } catch (error) {
      logger.error('Error blocking user:', { error });
      throw error;
    }
  }

  /**
   * DELETE /block/:blockedUserId - Unblock user
   */
  async unblockUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { blockedUserId } = req.params;

      await userService.unblockUser(userId, blockedUserId);

      res.json({
        success: true,
        data: { message: 'User unblocked successfully' },
      });
    } catch (error) {
      logger.error('Error unblocking user:', { error });
      throw error;
    }
  }

  /**
   * GET /blocked - Get blocked users
   */
  async getBlockedUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const blockedUsers = await userService.getBlockedUsers(userId);

      res.json({
        success: true,
        data: blockedUsers,
      });
    } catch (error) {
      logger.error('Error getting blocked users:', { error });
      throw error;
    }
  }
}

export const userController = new UserController();
