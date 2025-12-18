import { Router } from 'express';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { userController } from './user.controller';
import {
  validate,
  updateUserSchema,
  updateAvatarSchema,
  updateStatusSchema,
  searchUsersSchema,
  addContactSchema,
  blockUserSchema,
  userIdParamSchema,
  contactIdParamSchema,
  blockedUserIdParamSchema,
} from './user.validator';
import { asyncHandler } from '../../common/utils/asyncHandler';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authMiddleware);

/**
 * Current user routes
 */

// GET /me - Get current user
router.get(
  '/me',
  asyncHandler(userController.getCurrentUser.bind(userController))
);

// PUT /me - Update profile
router.put(
  '/me',
  validate(updateUserSchema),
  asyncHandler(userController.updateProfile.bind(userController))
);

// PATCH /me/avatar - Update avatar
router.patch(
  '/me/avatar',
  validate(updateAvatarSchema),
  asyncHandler(userController.updateAvatar.bind(userController))
);

// PATCH /me/status - Update status
router.patch(
  '/me/status',
  validate(updateStatusSchema),
  asyncHandler(userController.updateStatus.bind(userController))
);

/**
 * Search routes
 */

// POST /search - Search users
router.post(
  '/search',
  validate(searchUsersSchema),
  asyncHandler(userController.searchUsers.bind(userController))
);

/**
 * Contacts routes
 */

// GET /contacts - Get contacts
router.get(
  '/contacts',
  asyncHandler(userController.getContacts.bind(userController))
);

// POST /contacts - Add contact
router.post(
  '/contacts',
  validate(addContactSchema),
  asyncHandler(userController.addContact.bind(userController))
);

// DELETE /contacts/:contactId - Remove contact
router.delete(
  '/contacts/:contactId',
  validate(contactIdParamSchema),
  asyncHandler(userController.removeContact.bind(userController))
);

/**
 * Block routes
 */

// POST /block - Block user
router.post(
  '/block',
  validate(blockUserSchema),
  asyncHandler(userController.blockUser.bind(userController))
);

// DELETE /block/:blockedUserId - Unblock user
router.delete(
  '/block/:blockedUserId',
  validate(blockedUserIdParamSchema),
  asyncHandler(userController.unblockUser.bind(userController))
);

// GET /blocked - Get blocked users
router.get(
  '/blocked',
  asyncHandler(userController.getBlockedUsers.bind(userController))
);

/**
 * User profile routes (must be last to avoid conflicts)
 */

// GET /:id - Get user profile
router.get(
  '/:id',
  validate(userIdParamSchema),
  asyncHandler(userController.getUserProfile.bind(userController))
);

export default router;
