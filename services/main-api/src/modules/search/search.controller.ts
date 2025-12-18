import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { searchService } from './search.service';
import { AppError } from '../../common/middleware/error.middleware';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { logger } from '../../common/utils/logger';

export class SearchController {
  /**
   * Search users
   * POST /api/search/users
   */
  async searchUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Search users validation failed', {
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

      const { query, limit = 20, offset = 0 } = req.body;

      logger.info('Search users request', {
        userId: req.user.id,
        query,
        limit,
        offset,
      });

      const result = await searchService.searchUsers(query, limit, offset);

      res.status(200).json({
        success: true,
        data: {
          results: result.users,
          total: result.total,
          limit,
          offset,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search chats
   * POST /api/search/chats
   */
  async searchChats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Search chats validation failed', {
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

      const { query, limit = 20 } = req.body;

      logger.info('Search chats request', {
        userId: req.user.id,
        query,
        limit,
      });

      const result = await searchService.searchChats(req.user.id, query, limit);

      res.status(200).json({
        success: true,
        data: {
          results: result.chats,
          total: result.total,
          limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search messages
   * POST /api/search/messages
   */
  async searchMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Search messages validation failed', {
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

      const { query, chatId, limit = 50 } = req.body;

      logger.info('Search messages request', {
        userId: req.user.id,
        query,
        chatId,
        limit,
      });

      const result = await searchService.searchMessages(req.user.id, query, chatId, limit);

      res.status(200).json({
        success: true,
        data: {
          results: result.messages,
          total: result.total,
          limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Global search across users, chats, and messages
   * POST /api/search/global
   */
  async globalSearch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Global search validation failed', {
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

      const { query, type, limit = 10 } = req.body;

      logger.info('Global search request', {
        userId: req.user.id,
        query,
        type,
        limit,
      });

      const result = await searchService.globalSearch(req.user.id, query, type, limit);

      res.status(200).json({
        success: true,
        data: {
          results: {
            users: result.users,
            chats: result.chats,
            messages: result.messages,
          },
          total: result.total,
          limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clear search cache for current user
   * POST /api/search/clear-cache
   */
  async clearCache(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      logger.info('Clear search cache request', { userId: req.user.id });

      await searchService.clearSearchCache(req.user.id);

      res.status(200).json({
        success: true,
        message: 'Search cache cleared successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const searchController = new SearchController();
