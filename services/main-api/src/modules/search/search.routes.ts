import { Router } from 'express';
import { searchController } from './search.controller';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { apiLimiter } from '../../common/middleware/ratelimit.middleware';
import {
  searchUsersValidation,
  searchChatsValidation,
  searchMessagesValidation,
  globalSearchValidation,
} from './search.validator';

const router = Router();

/**
 * All search routes require authentication
 */

// Search users
router.post(
  '/users',
  authMiddleware,
  apiLimiter,
  searchUsersValidation,
  searchController.searchUsers.bind(searchController)
);

// Search chats
router.post(
  '/chats',
  authMiddleware,
  apiLimiter,
  searchChatsValidation,
  searchController.searchChats.bind(searchController)
);

// Search messages
router.post(
  '/messages',
  authMiddleware,
  apiLimiter,
  searchMessagesValidation,
  searchController.searchMessages.bind(searchController)
);

// Global search
router.post(
  '/global',
  authMiddleware,
  apiLimiter,
  globalSearchValidation,
  searchController.globalSearch.bind(searchController)
);

// Clear cache
router.post(
  '/clear-cache',
  authMiddleware,
  searchController.clearCache.bind(searchController)
);

export default router;
