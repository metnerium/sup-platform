import { Server } from 'socket.io';
import logger from '../utils/logger';
import { joinChatRoom } from './connection.handler';
import {
  AuthenticatedSocket,
  MessageNewPayload,
  MessageNewResponse,
  MessageDeliveredPayload,
  MessageReadPayload,
  MessageTypingPayload,
  MessageStopTypingPayload,
} from '../types/socket.types';

/**
 * Handle new message event
 */
export const handleMessageNew = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: MessageNewPayload,
  callback?: (response: any) => void
): Promise<void> => {
  const { userId } = socket;

  logger.info('New message event', {
    socketId: socket.id,
    userId,
    chatId: data.chatId,
    messageType: data.messageType,
  });

  try {
    // Validate payload
    if (!data.chatId || !data.encryptedContent) {
      const error = { error: 'Invalid payload', message: 'chatId and encryptedContent are required' };
      if (callback) callback(error);
      return;
    }

    // Ensure socket is in chat room
    await joinChatRoom(socket, data.chatId);

    // In production, save message to database via message service
    // For now, create mock response
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    const response: MessageNewResponse = {
      message: {
        id: messageId,
        chatId: data.chatId,
        senderId: userId,
        encryptedContent: data.encryptedContent,
        messageType: data.messageType,
        replyToId: data.replyToId,
        createdAt: timestamp,
        status: 'sent',
        tempId: data.tempId,
      },
      sender: {
        id: userId,
        username: 'User', // In production, fetch from database
        avatar: undefined,
      },
    };

    // Broadcast message to chat room (excluding sender)
    socket.to(`chat:${data.chatId}`).emit('message:new', response);

    // Send acknowledgment to sender
    if (callback) {
      callback({ success: true, message: response });
    }

    logger.info('Message broadcasted', {
      messageId,
      chatId: data.chatId,
      senderId: userId,
    });
  } catch (error) {
    logger.error('Error handling new message', {
      socketId: socket.id,
      userId,
      chatId: data.chatId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (callback) {
      callback({
        error: 'Message failed',
        message: 'Failed to send message',
      });
    }
  }
};

/**
 * Handle message delivered event
 */
export const handleMessageDelivered = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: MessageDeliveredPayload
): Promise<void> => {
  const { userId } = socket;

  logger.debug('Message delivered event', {
    socketId: socket.id,
    userId,
    messageId: data.messageId,
    chatId: data.chatId,
  });

  try {
    if (!data.messageId || !data.chatId) {
      logger.warn('Invalid message delivered payload', { userId, data });
      return;
    }

    const deliveredAt = data.deliveredAt || new Date().toISOString();

    // Broadcast delivery status to chat room
    io.to(`chat:${data.chatId}`).emit('message:delivered', {
      messageId: data.messageId,
      userId,
      deliveredAt,
    });

    logger.debug('Message delivery broadcasted', {
      messageId: data.messageId,
      userId,
    });
  } catch (error) {
    logger.error('Error handling message delivered', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Handle message read event
 */
export const handleMessageRead = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: MessageReadPayload
): Promise<void> => {
  const { userId } = socket;

  logger.debug('Message read event', {
    socketId: socket.id,
    userId,
    messageId: data.messageId,
    chatId: data.chatId,
  });

  try {
    if (!data.messageId || !data.chatId) {
      logger.warn('Invalid message read payload', { userId, data });
      return;
    }

    const readAt = data.readAt || new Date().toISOString();

    // Broadcast read status to chat room
    io.to(`chat:${data.chatId}`).emit('message:read', {
      messageId: data.messageId,
      userId,
      readAt,
    });

    logger.debug('Message read broadcasted', {
      messageId: data.messageId,
      userId,
    });
  } catch (error) {
    logger.error('Error handling message read', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Handle typing indicator event
 */
export const handleMessageTyping = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: MessageTypingPayload
): Promise<void> => {
  const { userId } = socket;

  logger.debug('Typing event', {
    socketId: socket.id,
    userId,
    chatId: data.chatId,
  });

  try {
    if (!data.chatId) {
      logger.warn('Invalid typing payload', { userId, data });
      return;
    }

    // Ensure socket is in chat room
    await joinChatRoom(socket, data.chatId);

    // Broadcast typing indicator to chat room (excluding sender)
    socket.to(`chat:${data.chatId}`).emit('message:typing', {
      chatId: data.chatId,
      userId,
      userName: 'User', // In production, fetch from cache/database
    });
  } catch (error) {
    logger.error('Error handling typing event', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Handle stop typing event
 */
export const handleMessageStopTyping = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: MessageStopTypingPayload
): Promise<void> => {
  const { userId } = socket;

  logger.debug('Stop typing event', {
    socketId: socket.id,
    userId,
    chatId: data.chatId,
  });

  try {
    if (!data.chatId) {
      logger.warn('Invalid stop typing payload', { userId, data });
      return;
    }

    // Broadcast stop typing indicator to chat room (excluding sender)
    socket.to(`chat:${data.chatId}`).emit('message:stop-typing', {
      chatId: data.chatId,
      userId,
    });
  } catch (error) {
    logger.error('Error handling stop typing event', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Register all message event handlers
 */
export const registerMessageHandlers = (
  io: Server,
  socket: AuthenticatedSocket
): void => {
  socket.on('message:new', (data: MessageNewPayload, callback) => {
    handleMessageNew(io, socket, data, callback);
  });

  socket.on('message:delivered', (data: MessageDeliveredPayload) => {
    handleMessageDelivered(io, socket, data);
  });

  socket.on('message:read', (data: MessageReadPayload) => {
    handleMessageRead(io, socket, data);
  });

  socket.on('message:typing', (data: MessageTypingPayload) => {
    handleMessageTyping(io, socket, data);
  });

  socket.on('message:stop-typing', (data: MessageStopTypingPayload) => {
    handleMessageStopTyping(io, socket, data);
  });

  logger.debug('Message handlers registered', {
    socketId: socket.id,
    userId: socket.userId,
  });
};
