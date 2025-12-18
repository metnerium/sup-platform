import { Server } from 'socket.io';
import logger from '../utils/logger';
import {
  setUserOnline,
  setUserOffline,
  getUserPresence,
  redisClient,
} from '../utils/redis';
import {
  AuthenticatedSocket,
  PresenceUpdatePayload,
  PresenceSubscribePayload,
  PresenceUnsubscribePayload,
  PresenceBroadcast,
  PresenceStatus,
} from '../types/socket.types';

/**
 * Handle presence update event
 */
export const handlePresenceUpdate = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: PresenceUpdatePayload
): Promise<void> => {
  const { userId } = socket;

  logger.info('Presence update event', {
    socketId: socket.id,
    userId,
    status: data.status,
  });

  try {
    // Validate status
    const validStatuses: PresenceStatus[] = ['online', 'offline', 'away', 'busy'];
    if (!validStatuses.includes(data.status)) {
      logger.warn('Invalid presence status', { userId, status: data.status });
      socket.emit('error', {
        message: 'Invalid presence status',
        code: 'INVALID_STATUS',
      });
      return;
    }

    // Update presence in Redis
    const key = `presence:${userId}`;
    await redisClient.hSet(key, {
      status: data.status,
      customStatus: data.customStatus || '',
      lastSeen: Date.now().toString(),
      socketId: socket.id,
    });
    await redisClient.expire(key, 86400); // 24 hours TTL

    // Prepare broadcast data
    const presenceBroadcast: PresenceBroadcast = {
      userId,
      status: data.status,
      lastSeen: Date.now(),
      customStatus: data.customStatus,
    };

    // Broadcast presence update to all connected clients
    // In production, should only broadcast to user's contacts
    socket.broadcast.emit('presence:update', presenceBroadcast);

    logger.info('Presence updated and broadcasted', {
      userId,
      status: data.status,
    });
  } catch (error) {
    logger.error('Error handling presence update', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    socket.emit('error', {
      message: 'Failed to update presence',
      code: 'PRESENCE_UPDATE_ERROR',
    });
  }
};

/**
 * Handle presence subscribe event
 * Subscribe to presence updates of specific users (contacts)
 */
export const handlePresenceSubscribe = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: PresenceSubscribePayload
): Promise<void> => {
  const { userId } = socket;

  logger.debug('Presence subscribe event', {
    socketId: socket.id,
    userId,
    userIds: data.userIds,
  });

  try {
    if (!data.userIds || !Array.isArray(data.userIds) || data.userIds.length === 0) {
      logger.warn('Invalid presence subscribe payload', { userId, data });
      return;
    }

    // Limit to 100 subscriptions per request
    const userIds = data.userIds.slice(0, 100);

    // Store subscriptions in Redis
    const subscriptionKey = `presence:subscriptions:${userId}`;
    await redisClient.sAdd(subscriptionKey, userIds);
    await redisClient.expire(subscriptionKey, 86400); // 24 hours TTL

    // Fetch and send current presence status for all subscribed users
    const presenceStatuses = await Promise.all(
      userIds.map(async (targetUserId) => {
        const presence = await getUserPresence(targetUserId);
        return {
          userId: targetUserId,
          status: (presence?.status as PresenceStatus) || 'offline',
          lastSeen: presence?.lastSeen,
        };
      })
    );

    // Send initial presence statuses to the subscriber
    presenceStatuses.forEach((presence) => {
      socket.emit('presence:update', presence);
    });

    logger.info('Presence subscriptions updated', {
      userId,
      subscribedCount: userIds.length,
    });
  } catch (error) {
    logger.error('Error handling presence subscribe', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};

/**
 * Handle presence unsubscribe event
 */
export const handlePresenceUnsubscribe = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: PresenceUnsubscribePayload
): Promise<void> => {
  const { userId } = socket;

  logger.debug('Presence unsubscribe event', {
    socketId: socket.id,
    userId,
    userIds: data.userIds,
  });

  try {
    if (!data.userIds || !Array.isArray(data.userIds) || data.userIds.length === 0) {
      logger.warn('Invalid presence unsubscribe payload', { userId, data });
      return;
    }

    // Remove subscriptions from Redis
    const subscriptionKey = `presence:subscriptions:${userId}`;
    await redisClient.sRem(subscriptionKey, data.userIds);

    logger.info('Presence unsubscribed', {
      userId,
      unsubscribedCount: data.userIds.length,
    });
  } catch (error) {
    logger.error('Error handling presence unsubscribe', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};

/**
 * Get subscribed users for a given user
 */
export const getPresenceSubscriptions = async (userId: string): Promise<string[]> => {
  try {
    const subscriptionKey = `presence:subscriptions:${userId}`;
    const subscriptions = await redisClient.sMembers(subscriptionKey);
    return subscriptions;
  } catch (error) {
    logger.error('Error getting presence subscriptions', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
};

/**
 * Broadcast presence update to subscribers
 */
export const broadcastPresenceToSubscribers = async (
  io: Server,
  userId: string,
  presenceData: PresenceBroadcast
): Promise<void> => {
  try {
    // In production, query database for users who have this user in their contacts
    // For now, broadcast to all connected clients
    io.emit('presence:update', presenceData);

    logger.debug('Presence broadcasted to subscribers', {
      userId,
      status: presenceData.status,
    });
  } catch (error) {
    logger.error('Error broadcasting presence to subscribers', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Register all presence event handlers
 */
export const registerPresenceHandlers = (
  io: Server,
  socket: AuthenticatedSocket
): void => {
  socket.on('presence:update', (data: PresenceUpdatePayload) => {
    handlePresenceUpdate(io, socket, data);
  });

  socket.on('presence:subscribe', (data: PresenceSubscribePayload) => {
    handlePresenceSubscribe(io, socket, data);
  });

  socket.on('presence:unsubscribe', (data: PresenceUnsubscribePayload) => {
    handlePresenceUnsubscribe(io, socket, data);
  });

  logger.debug('Presence handlers registered', {
    socketId: socket.id,
    userId: socket.userId,
  });
};
