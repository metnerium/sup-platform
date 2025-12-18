import { Server } from 'socket.io';
import logger from '../utils/logger';
import { AuthenticatedSocket } from '../types/socket.types';
import { redisClient } from '../utils/redis';

/**
 * Notification types
 */
export type NotificationType =
  | 'mention'
  | 'reply'
  | 'call_missed'
  | 'call_incoming'
  | 'chat_invite'
  | 'chat_updated'
  | 'message_reaction'
  | 'system';

/**
 * Notification payload interface
 */
export interface NotificationPayload {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  userId: string;
  fromUserId?: string;
  chatId?: string;
  messageId?: string;
  priority?: 'low' | 'normal' | 'high';
  sound?: boolean;
  badge?: number;
}

/**
 * Send notification to a specific user
 */
export const sendNotificationToUser = async (
  io: Server,
  userId: string,
  notification: NotificationPayload
): Promise<void> => {
  try {
    // Generate notification ID if not provided
    const notificationId = notification.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const notificationData = {
      id: notificationId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      fromUserId: notification.fromUserId,
      chatId: notification.chatId,
      messageId: notification.messageId,
      priority: notification.priority || 'normal',
      sound: notification.sound !== false,
      badge: notification.badge,
      timestamp: new Date().toISOString(),
      read: false,
    };

    // Store notification in Redis for offline users
    const notifKey = `notifications:${userId}`;
    await redisClient.lPush(notifKey, JSON.stringify(notificationData));
    await redisClient.lTrim(notifKey, 0, 99); // Keep last 100 notifications
    await redisClient.expire(notifKey, 604800); // 7 days TTL

    // Send notification to user's room
    io.to(`user:${userId}`).emit('notification:new', notificationData);

    logger.info('Notification sent', {
      notificationId,
      userId,
      type: notification.type,
    });
  } catch (error) {
    logger.error('Error sending notification', {
      userId,
      type: notification.type,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};

/**
 * Send notification to multiple users
 */
export const sendNotificationToUsers = async (
  io: Server,
  userIds: string[],
  notification: Omit<NotificationPayload, 'userId'>
): Promise<void> => {
  try {
    const promises = userIds.map((userId) =>
      sendNotificationToUser(io, userId, { ...notification, userId })
    );
    await Promise.all(promises);

    logger.info('Batch notification sent', {
      userCount: userIds.length,
      type: notification.type,
    });
  } catch (error) {
    logger.error('Error sending batch notifications', {
      userCount: userIds.length,
      type: notification.type,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Handle notification mark as read
 */
export const handleNotificationRead = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: { notificationId: string }
): Promise<void> => {
  const { userId } = socket;

  logger.debug('Notification read event', {
    socketId: socket.id,
    userId,
    notificationId: data.notificationId,
  });

  try {
    if (!data.notificationId) {
      logger.warn('Invalid notification read payload', { userId, data });
      return;
    }

    // Mark notification as read in Redis
    const notifKey = `notification:read:${userId}:${data.notificationId}`;
    await redisClient.set(notifKey, '1', { EX: 604800 }); // 7 days TTL

    logger.debug('Notification marked as read', {
      userId,
      notificationId: data.notificationId,
    });
  } catch (error) {
    logger.error('Error marking notification as read', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Handle notification clear
 */
export const handleNotificationClear = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: { notificationId: string }
): Promise<void> => {
  const { userId } = socket;

  logger.debug('Notification clear event', {
    socketId: socket.id,
    userId,
    notificationId: data.notificationId,
  });

  try {
    if (!data.notificationId) {
      logger.warn('Invalid notification clear payload', { userId, data });
      return;
    }

    // Clear notification from Redis
    const notifKey = `notifications:${userId}`;
    const notifications = await redisClient.lRange(notifKey, 0, -1);

    // Filter out the cleared notification
    const filteredNotifications = notifications.filter((notif) => {
      try {
        const parsed = JSON.parse(notif);
        return parsed.id !== data.notificationId;
      } catch {
        return false;
      }
    });

    // Update the list
    if (filteredNotifications.length < notifications.length) {
      await redisClient.del(notifKey);
      if (filteredNotifications.length > 0) {
        await redisClient.rPush(notifKey, filteredNotifications);
        await redisClient.expire(notifKey, 604800);
      }
    }

    logger.debug('Notification cleared', {
      userId,
      notificationId: data.notificationId,
    });
  } catch (error) {
    logger.error('Error clearing notification', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Handle notification clear all
 */
export const handleNotificationClearAll = async (
  io: Server,
  socket: AuthenticatedSocket
): Promise<void> => {
  const { userId } = socket;

  logger.debug('Notification clear all event', {
    socketId: socket.id,
    userId,
  });

  try {
    // Clear all notifications from Redis
    const notifKey = `notifications:${userId}`;
    await redisClient.del(notifKey);

    logger.info('All notifications cleared', { userId });
  } catch (error) {
    logger.error('Error clearing all notifications', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get pending notifications for a user
 */
export const getPendingNotifications = async (userId: string): Promise<any[]> => {
  try {
    const notifKey = `notifications:${userId}`;
    const notifications = await redisClient.lRange(notifKey, 0, -1);

    return notifications.map((notif) => {
      try {
        return JSON.parse(notif);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    logger.error('Error getting pending notifications', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
};

/**
 * Handle chat updated notification
 */
export const notifyChatUpdated = async (
  io: Server,
  chatId: string,
  memberIds: string[],
  updateData: {
    updatedBy: string;
    updateType: 'name' | 'avatar' | 'description' | 'settings' | 'members';
    changes: Record<string, any>;
  }
): Promise<void> => {
  try {
    // Broadcast to chat room
    io.to(`chat:${chatId}`).emit('chat:updated', {
      chatId,
      updatedBy: updateData.updatedBy,
      updateType: updateData.updateType,
      changes: updateData.changes,
      timestamp: new Date().toISOString(),
    });

    // Send notifications to members (except the updater)
    const notificationMessage = getUpdateMessage(updateData.updateType, updateData.changes);
    const notification: Omit<NotificationPayload, 'userId'> = {
      type: 'chat_updated',
      title: 'Chat Updated',
      message: notificationMessage,
      fromUserId: updateData.updatedBy,
      chatId,
      priority: 'low',
      sound: false,
      data: {
        updateType: updateData.updateType,
        changes: updateData.changes,
      },
    };

    const recipientIds = memberIds.filter((id) => id !== updateData.updatedBy);
    await sendNotificationToUsers(io, recipientIds, notification);

    logger.info('Chat update broadcasted', {
      chatId,
      updateType: updateData.updateType,
      memberCount: memberIds.length,
    });
  } catch (error) {
    logger.error('Error notifying chat update', {
      chatId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Generate human-readable update message
 */
const getUpdateMessage = (
  updateType: string,
  changes: Record<string, any>
): string => {
  switch (updateType) {
    case 'name':
      return `Chat name changed to "${changes.name}"`;
    case 'avatar':
      return 'Chat avatar updated';
    case 'description':
      return 'Chat description updated';
    case 'settings':
      return 'Chat settings updated';
    case 'members':
      return 'Chat members updated';
    default:
      return 'Chat updated';
  }
};

/**
 * Register notification event handlers
 */
export const registerNotificationHandlers = (
  io: Server,
  socket: AuthenticatedSocket
): void => {
  socket.on('notification:read', (data) => {
    handleNotificationRead(io, socket, data);
  });

  socket.on('notification:clear', (data) => {
    handleNotificationClear(io, socket, data);
  });

  socket.on('notification:clear-all', () => {
    handleNotificationClearAll(io, socket);
  });

  socket.on('notification:get-pending', async (callback) => {
    try {
      const notifications = await getPendingNotifications(socket.userId);
      if (callback) {
        callback({ success: true, notifications });
      }
    } catch (error) {
      logger.error('Error getting pending notifications', {
        userId: socket.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      if (callback) {
        callback({ success: false, error: 'Failed to get notifications' });
      }
    }
  });

  logger.debug('Notification handlers registered', {
    socketId: socket.id,
    userId: socket.userId,
  });
};
