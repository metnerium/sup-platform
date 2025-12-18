import { Server } from 'socket.io';
import logger from '../utils/logger';
import {
  AuthenticatedSocket,
  ReactionNewPayload,
  ReactionRemovePayload,
  ReactionBroadcast,
} from '../types/socket.types';
import { redisClient } from '../utils/redis';
import { joinChatRoom } from './connection.handler';

/**
 * Store reaction in Redis
 */
const storeReaction = async (
  messageId: string,
  userId: string,
  reaction: string
): Promise<void> => {
  const key = `reactions:${messageId}`;
  await redisClient.hSet(key, userId, reaction);
  await redisClient.expire(key, 2592000); // 30 days TTL
};

/**
 * Remove reaction from Redis
 */
const removeReaction = async (messageId: string, userId: string): Promise<void> => {
  const key = `reactions:${messageId}`;
  await redisClient.hDel(key, userId);
};

/**
 * Get all reactions for a message
 */
const getMessageReactions = async (messageId: string): Promise<Record<string, string>> => {
  const key = `reactions:${messageId}`;
  const reactions = await redisClient.hGetAll(key);
  return reactions;
};

/**
 * Handle new reaction event
 */
export const handleReactionNew = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: ReactionNewPayload
): Promise<void> => {
  const { userId } = socket;

  logger.info('Reaction new event', {
    socketId: socket.id,
    userId,
    messageId: data.messageId,
    chatId: data.chatId,
    reaction: data.reaction,
  });

  try {
    // Validate payload
    if (!data.messageId || !data.chatId || !data.reaction) {
      logger.warn('Invalid reaction new payload', { userId, data });
      socket.emit('error', {
        message: 'messageId, chatId, and reaction are required',
        code: 'INVALID_PAYLOAD',
      });
      return;
    }

    // Validate reaction (basic emoji validation)
    if (data.reaction.length > 10) {
      logger.warn('Reaction too long', { userId, reaction: data.reaction });
      socket.emit('error', {
        message: 'Reaction must be 10 characters or less',
        code: 'INVALID_REACTION',
      });
      return;
    }

    // Ensure socket is in chat room
    await joinChatRoom(socket, data.chatId);

    // Store reaction in Redis
    await storeReaction(data.messageId, userId, data.reaction);

    // Prepare reaction broadcast
    const reactionBroadcast: ReactionBroadcast = {
      messageId: data.messageId,
      chatId: data.chatId,
      userId,
      userName: 'User', // In production, fetch from cache/database
      reaction: data.reaction,
      action: 'add',
      timestamp: new Date().toISOString(),
    };

    // Broadcast reaction to chat room
    io.to(`chat:${data.chatId}`).emit('reaction:new', reactionBroadcast);

    logger.info('Reaction added and broadcasted', {
      messageId: data.messageId,
      userId,
      reaction: data.reaction,
    });
  } catch (error) {
    logger.error('Error handling reaction new', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    socket.emit('error', {
      message: 'Failed to add reaction',
      code: 'REACTION_ERROR',
    });
  }
};

/**
 * Handle remove reaction event
 */
export const handleReactionRemove = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: ReactionRemovePayload
): Promise<void> => {
  const { userId } = socket;

  logger.info('Reaction remove event', {
    socketId: socket.id,
    userId,
    messageId: data.messageId,
    chatId: data.chatId,
    reaction: data.reaction,
  });

  try {
    // Validate payload
    if (!data.messageId || !data.chatId || !data.reaction) {
      logger.warn('Invalid reaction remove payload', { userId, data });
      socket.emit('error', {
        message: 'messageId, chatId, and reaction are required',
        code: 'INVALID_PAYLOAD',
      });
      return;
    }

    // Remove reaction from Redis
    await removeReaction(data.messageId, userId);

    // Prepare reaction broadcast
    const reactionBroadcast: ReactionBroadcast = {
      messageId: data.messageId,
      chatId: data.chatId,
      userId,
      userName: 'User', // In production, fetch from cache/database
      reaction: data.reaction,
      action: 'remove',
      timestamp: new Date().toISOString(),
    };

    // Broadcast reaction removal to chat room
    io.to(`chat:${data.chatId}`).emit('reaction:remove', reactionBroadcast);

    logger.info('Reaction removed and broadcasted', {
      messageId: data.messageId,
      userId,
      reaction: data.reaction,
    });
  } catch (error) {
    logger.error('Error handling reaction remove', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    socket.emit('error', {
      message: 'Failed to remove reaction',
      code: 'REACTION_ERROR',
    });
  }
};

/**
 * Handle get message reactions
 */
export const handleGetMessageReactions = async (
  socket: AuthenticatedSocket,
  data: { messageId: string },
  callback?: (response: any) => void
): Promise<void> => {
  const { userId } = socket;

  logger.debug('Get message reactions event', {
    socketId: socket.id,
    userId,
    messageId: data.messageId,
  });

  try {
    if (!data.messageId) {
      const error = { error: 'Invalid payload', message: 'messageId is required' };
      if (callback) callback(error);
      return;
    }

    const reactions = await getMessageReactions(data.messageId);

    // Convert to array format: [{ userId, reaction }]
    const reactionsArray = Object.entries(reactions).map(([userId, reaction]) => ({
      userId,
      reaction,
    }));

    if (callback) {
      callback({ success: true, reactions: reactionsArray });
    }

    logger.debug('Message reactions retrieved', {
      messageId: data.messageId,
      reactionCount: reactionsArray.length,
    });
  } catch (error) {
    logger.error('Error getting message reactions', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (callback) {
      callback({
        error: 'Failed to get reactions',
        message: 'Failed to retrieve message reactions',
      });
    }
  }
};

/**
 * Register all reaction event handlers
 */
export const registerReactionHandlers = (
  io: Server,
  socket: AuthenticatedSocket
): void => {
  socket.on('reaction:new', (data: ReactionNewPayload) => {
    handleReactionNew(io, socket, data);
  });

  socket.on('reaction:remove', (data: ReactionRemovePayload) => {
    handleReactionRemove(io, socket, data);
  });

  socket.on('reaction:get', (data: { messageId: string }, callback) => {
    handleGetMessageReactions(socket, data, callback);
  });

  logger.debug('Reaction handlers registered', {
    socketId: socket.id,
    userId: socket.userId,
  });
};
