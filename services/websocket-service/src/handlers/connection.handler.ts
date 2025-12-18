import { Server } from 'socket.io';
import logger from '../utils/logger';
import {
  setUserOnline,
  setUserOffline,
  addSocketMapping,
  removeSocketMapping,
  getUserSocketCount,
} from '../utils/redis';
import { AuthenticatedSocket } from '../types/socket.types';

/**
 * Handle new socket connection
 */
export const handleConnection = async (
  io: Server,
  socket: AuthenticatedSocket
): Promise<void> => {
  const { userId, deviceId } = socket;

  logger.info('Client connected', {
    socketId: socket.id,
    userId,
    deviceId,
    ip: socket.handshake.address,
  });

  try {
    // Join user's personal room
    const userRoom = `user:${userId}`;
    await socket.join(userRoom);
    logger.debug('Socket joined user room', { socketId: socket.id, room: userRoom });

    // Add socket to Redis mapping
    await addSocketMapping(userId, socket.id);

    // Set user online status
    await setUserOnline(userId, socket.id);

    // Get user's chats and join chat rooms
    // Note: In production, fetch this from database
    // For now, assuming this will be handled by presence:subscribe

    // Notify user of successful connection
    socket.emit('connected', {
      userId,
      socketId: socket.id,
    });

    // Broadcast user online status to their contacts
    socket.broadcast.emit('presence:update', {
      userId,
      status: 'online',
      lastSeen: Date.now(),
    });

    logger.info('Connection setup completed', {
      socketId: socket.id,
      userId,
    });
  } catch (error) {
    logger.error('Error handling connection', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    socket.emit('error', {
      message: 'Connection setup failed',
      code: 'CONNECTION_ERROR',
    });
  }
};

/**
 * Handle socket disconnection
 */
export const handleDisconnection = async (
  io: Server,
  socket: AuthenticatedSocket,
  reason: string
): Promise<void> => {
  const { userId, deviceId } = socket;

  logger.info('Client disconnecting', {
    socketId: socket.id,
    userId,
    deviceId,
    reason,
  });

  try {
    // Remove socket from Redis mapping
    await removeSocketMapping(userId, socket.id);

    // Check if user has other active connections
    const activeSocketCount = await getUserSocketCount(userId);

    // If no other active connections, set user offline
    if (activeSocketCount === 0) {
      await setUserOffline(userId);

      // Broadcast user offline status to their contacts
      socket.broadcast.emit('presence:update', {
        userId,
        status: 'offline',
        lastSeen: Date.now(),
      });

      logger.info('User went offline', { userId });
    } else {
      logger.debug('User has other active connections', {
        userId,
        activeSocketCount,
      });
    }

    logger.info('Disconnection cleanup completed', {
      socketId: socket.id,
      userId,
    });
  } catch (error) {
    logger.error('Error handling disconnection', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};

/**
 * Handle socket errors
 */
export const handleError = (socket: AuthenticatedSocket, error: Error): void => {
  const { userId } = socket;

  logger.error('Socket error', {
    socketId: socket.id,
    userId,
    error: error.message,
    stack: error.stack,
  });

  socket.emit('error', {
    message: 'An error occurred',
    code: 'SOCKET_ERROR',
  });
};

/**
 * Join a chat room
 */
export const joinChatRoom = async (
  socket: AuthenticatedSocket,
  chatId: string
): Promise<void> => {
  const chatRoom = `chat:${chatId}`;
  await socket.join(chatRoom);

  logger.debug('Socket joined chat room', {
    socketId: socket.id,
    userId: socket.userId,
    chatRoom,
  });
};

/**
 * Leave a chat room
 */
export const leaveChatRoom = async (
  socket: AuthenticatedSocket,
  chatId: string
): Promise<void> => {
  const chatRoom = `chat:${chatId}`;
  await socket.leave(chatRoom);

  logger.debug('Socket left chat room', {
    socketId: socket.id,
    userId: socket.userId,
    chatRoom,
  });
};

/**
 * Setup heartbeat/ping mechanism
 */
export const setupHeartbeat = (socket: AuthenticatedSocket): void => {
  const heartbeatInterval = setInterval(() => {
    socket.emit('ping');
  }, 30000); // Every 30 seconds

  socket.on('pong', () => {
    logger.debug('Heartbeat received', {
      socketId: socket.id,
      userId: socket.userId,
    });
  });

  socket.on('disconnect', () => {
    clearInterval(heartbeatInterval);
  });
};
