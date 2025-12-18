import { Router } from 'express';
import { chatController } from './chat.controller';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import {
  createChatValidation,
  updateChatValidation,
  chatIdValidation,
  addMemberValidation,
  removeMemberValidation,
  updateMemberRoleValidation,
  paginationValidation,
  inviteLinkValidation,
  createRoleValidation,
  updateRoleValidation,
  deleteRoleValidation,
} from './chat.validator';

const router = Router();

/**
 * All chat routes require authentication
 */

// Chat CRUD operations
router.post(
  '/',
  authMiddleware,
  createChatValidation,
  chatController.createChat.bind(chatController)
);

router.get(
  '/',
  authMiddleware,
  paginationValidation,
  chatController.getUserChats.bind(chatController)
);

router.get(
  '/:id',
  authMiddleware,
  chatIdValidation,
  chatController.getChat.bind(chatController)
);

router.put(
  '/:id',
  authMiddleware,
  updateChatValidation,
  chatController.updateChat.bind(chatController)
);

router.delete(
  '/:id',
  authMiddleware,
  chatIdValidation,
  chatController.deleteChat.bind(chatController)
);

// Chat member operations
router.post(
  '/:id/members',
  authMiddleware,
  addMemberValidation,
  chatController.addMember.bind(chatController)
);

router.delete(
  '/:id/members/:userId',
  authMiddleware,
  removeMemberValidation,
  chatController.removeMember.bind(chatController)
);

router.put(
  '/:id/members/role',
  authMiddleware,
  updateMemberRoleValidation,
  chatController.updateMemberRole.bind(chatController)
);

router.get(
  '/:id/members',
  authMiddleware,
  chatIdValidation,
  chatController.getChatMembers.bind(chatController)
);

router.post(
  '/:id/leave',
  authMiddleware,
  chatIdValidation,
  chatController.leaveChat.bind(chatController)
);

// Invite link operations
router.get(
  '/:id/invite',
  authMiddleware,
  chatIdValidation,
  chatController.generateInviteLink.bind(chatController)
);

router.post(
  '/join/:link',
  authMiddleware,
  inviteLinkValidation,
  chatController.joinByInviteLink.bind(chatController)
);

// Role operations
router.get(
  '/:id/roles',
  authMiddleware,
  chatIdValidation,
  chatController.getChatRoles.bind(chatController)
);

router.post(
  '/:id/roles',
  authMiddleware,
  createRoleValidation,
  chatController.createRole.bind(chatController)
);

router.put(
  '/:id/roles/:roleId',
  authMiddleware,
  updateRoleValidation,
  chatController.updateRole.bind(chatController)
);

router.delete(
  '/:id/roles/:roleId',
  authMiddleware,
  deleteRoleValidation,
  chatController.deleteRole.bind(chatController)
);

export default router;
