import { Server } from 'socket.io';
import logger from '../utils/logger';
import { AuthenticatedSocket } from '../types/socket.types';
import { joinChatRoom, leaveChatRoom } from './connection.handler';

/**
 * Handle join chat event
 */
export const handleJoinChat = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: { chatId: string },
  callback?: (response: any) => void
): Promise<void> => {
  const { userId } = socket;

  logger.info('Join chat event', {
    socketId: socket.id,
    userId,
    chatId: data.chatId,
  });

  try {
    if (!data.chatId) {
      const error = { error: 'Invalid payload', message: 'chatId is required' };
      if (callback) callback(error);
      return;
    }

    // In production, verify user is a member of the chat
    // For now, allow joining any chat
    await joinChatRoom(socket, data.chatId);

    if (callback) {
      callback({ success: true, chatId: data.chatId });
    }

    logger.info('User joined chat', {
      userId,
      chatId: data.chatId,
      socketId: socket.id,
    });

    // Notify other members in the chat
    socket.to(`chat:${data.chatId}`).emit('chat:member-joined', {
      chatId: data.chatId,
      userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error joining chat', {
      socketId: socket.id,
      userId,
      chatId: data.chatId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (callback) {
      callback({ error: 'Failed to join chat', message: 'Could not join the chat' });
    }
  }
};

/**
 * Handle leave chat event
 */
export const handleLeaveChat = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: { chatId: string },
  callback?: (response: any) => void
): Promise<void> => {
  const { userId } = socket;

  logger.info('Leave chat event', {
    socketId: socket.id,
    userId,
    chatId: data.chatId,
  });

  try {
    if (!data.chatId) {
      const error = { error: 'Invalid payload', message: 'chatId is required' };
      if (callback) callback(error);
      return;
    }

    // Notify other members before leaving
    socket.to(`chat:${data.chatId}`).emit('chat:member-left', {
      chatId: data.chatId,
      userId,
      timestamp: new Date().toISOString(),
    });

    await leaveChatRoom(socket, data.chatId);

    if (callback) {
      callback({ success: true, chatId: data.chatId });
    }

    logger.info('User left chat', {
      userId,
      chatId: data.chatId,
      socketId: socket.id,
    });
  } catch (error) {
    logger.error('Error leaving chat', {
      socketId: socket.id,
      userId,
      chatId: data.chatId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (callback) {
      callback({ error: 'Failed to leave chat', message: 'Could not leave the chat' });
    }
  }
};

/**
 * Handle join multiple chats at once (e.g., on user login)
 */
export const handleJoinChats = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: { chatIds: string[] },
  callback?: (response: any) => void
): Promise<void> => {
  const { userId } = socket;

  logger.info('Join chats event', {
    socketId: socket.id,
    userId,
    chatCount: data.chatIds?.length || 0,
  });

  try {
    if (!data.chatIds || !Array.isArray(data.chatIds)) {
      const error = { error: 'Invalid payload', message: 'chatIds array is required' };
      if (callback) callback(error);
      return;
    }

    // Limit to 100 chats per request
    const chatIds = data.chatIds.slice(0, 100);

    // Join all chat rooms
    await Promise.all(
      chatIds.map((chatId) => joinChatRoom(socket, chatId))
    );

    if (callback) {
      callback({ success: true, joinedCount: chatIds.length });
    }

    logger.info('User joined multiple chats', {
      userId,
      chatCount: chatIds.length,
      socketId: socket.id,
    });
  } catch (error) {
    logger.error('Error joining multiple chats', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (callback) {
      callback({ error: 'Failed to join chats', message: 'Could not join the chats' });
    }
  }
};

/**
 * Handle chat member typing (for group chats with multiple active users)
 */
export const handleChatMemberTyping = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: { chatId: string; isTyping: boolean }
): Promise<void> => {
  const { userId } = socket;

  logger.debug('Chat member typing event', {
    socketId: socket.id,
    userId,
    chatId: data.chatId,
    isTyping: data.isTyping,
  });

  try {
    if (!data.chatId) {
      logger.warn('Invalid chat member typing payload', { userId, data });
      return;
    }

    const eventName = data.isTyping ? 'chat:user-typing' : 'chat:user-stopped-typing';

    socket.to(`chat:${data.chatId}`).emit(eventName, {
      chatId: data.chatId,
      userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error handling chat member typing', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Handle get active chat members
 */
export const handleGetActiveChatMembers = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: { chatId: string },
  callback?: (response: any) => void
): Promise<void> => {
  const { userId } = socket;

  logger.debug('Get active chat members event', {
    socketId: socket.id,
    userId,
    chatId: data.chatId,
  });

  try {
    if (!data.chatId) {
      const error = { error: 'Invalid payload', message: 'chatId is required' };
      if (callback) callback(error);
      return;
    }

    // Get all sockets in the chat room
    const roomName = `chat:${data.chatId}`;
    const socketsInRoom = await io.in(roomName).fetchSockets();

    // Extract unique user IDs
    const activeUserIds = Array.from(
      new Set(
        socketsInRoom
          .map((s) => (s as any).userId)
          .filter((id) => id)
      )
    );

    if (callback) {
      callback({
        success: true,
        chatId: data.chatId,
        activeMembers: activeUserIds,
        count: activeUserIds.length,
      });
    }

    logger.debug('Active chat members retrieved', {
      chatId: data.chatId,
      activeCount: activeUserIds.length,
    });
  } catch (error) {
    logger.error('Error getting active chat members', {
      socketId: socket.id,
      userId,
      chatId: data.chatId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (callback) {
      callback({
        error: 'Failed to get active members',
        message: 'Could not retrieve active chat members',
      });
    }
  }
};

/**
 * Register all chat event handlers
 */
export const registerChatHandlers = (
  io: Server,
  socket: AuthenticatedSocket
): void => {
  socket.on('chat:join', (data, callback) => {
    handleJoinChat(io, socket, data, callback);
  });

  socket.on('chat:leave', (data, callback) => {
    handleLeaveChat(io, socket, data, callback);
  });

  socket.on('chat:join-multiple', (data, callback) => {
    handleJoinChats(io, socket, data, callback);
  });

  socket.on('chat:member-typing', (data) => {
    handleChatMemberTyping(io, socket, data);
  });

  socket.on('chat:get-active-members', (data, callback) => {
    handleGetActiveChatMembers(io, socket, data, callback);
  });

  logger.debug('Chat handlers registered', {
    socketId: socket.id,
    userId: socket.userId,
  });
};
