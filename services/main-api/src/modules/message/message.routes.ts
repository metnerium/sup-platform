import { Router } from 'express';
import { messageController } from './message.controller';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import {
  sendMessageValidation,
  getMessagesValidation,
  getMessageValidation,
  editMessageValidation,
  deleteMessageValidation,
  markAsDeliveredValidation,
  markAsReadValidation,
  addReactionValidation,
  removeReactionValidation,
  getReactionsValidation,
  searchMessagesValidation,
  getUnreadCountValidation,
} from './message.validator';

const router = Router();

/**
 * All message routes require authentication
 */

// Send a message to a chat
router.post(
  '/chats/:chatId/messages',
  authMiddleware,
  sendMessageValidation,
  messageController.sendMessage.bind(messageController)
);

// Get messages for a chat (with pagination)
router.get(
  '/chats/:chatId/messages',
  authMiddleware,
  getMessagesValidation,
  messageController.getMessages.bind(messageController)
);

// Get a single message
router.get(
  '/messages/:id',
  authMiddleware,
  getMessageValidation,
  messageController.getMessage.bind(messageController)
);

// Edit a message
router.put(
  '/messages/:id',
  authMiddleware,
  editMessageValidation,
  messageController.editMessage.bind(messageController)
);

// Delete a message
router.delete(
  '/messages/:id',
  authMiddleware,
  deleteMessageValidation,
  messageController.deleteMessage.bind(messageController)
);

// Mark message as delivered
router.post(
  '/messages/:id/delivered',
  authMiddleware,
  markAsDeliveredValidation,
  messageController.markAsDelivered.bind(messageController)
);

// Mark messages as read
router.post(
  '/messages/read',
  authMiddleware,
  markAsReadValidation,
  messageController.markAsRead.bind(messageController)
);

// Add a reaction to a message
router.post(
  '/messages/:id/reactions',
  authMiddleware,
  addReactionValidation,
  messageController.addReaction.bind(messageController)
);

// Remove a reaction from a message
router.delete(
  '/messages/:id/reactions/:emoji',
  authMiddleware,
  removeReactionValidation,
  messageController.removeReaction.bind(messageController)
);

// Get all reactions for a message
router.get(
  '/messages/:id/reactions',
  authMiddleware,
  getReactionsValidation,
  messageController.getReactions.bind(messageController)
);

// Search messages
router.post(
  '/messages/search',
  authMiddleware,
  searchMessagesValidation,
  messageController.searchMessages.bind(messageController)
);

// Get unread message count
router.get(
  '/messages/unread',
  authMiddleware,
  getUnreadCountValidation,
  messageController.getUnreadCount.bind(messageController)
);

export default router;
