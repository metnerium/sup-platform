import { Server } from 'socket.io';
import logger from '../utils/logger';
import {
  AuthenticatedSocket,
  CallIncomingPayload,
  CallAnswerPayload,
  CallRejectPayload,
  CallEndPayload,
  CallIceCandidatePayload,
  CallBroadcast,
} from '../types/socket.types';
import { redisClient } from '../utils/redis';

/**
 * Store active call in Redis
 */
const storeActiveCall = async (callId: string, callData: any): Promise<void> => {
  const key = `call:${callId}`;
  await redisClient.hSet(key, callData);
  await redisClient.expire(key, 3600); // 1 hour TTL
};

/**
 * Get active call from Redis
 */
const getActiveCall = async (callId: string): Promise<any> => {
  const key = `call:${callId}`;
  const data = await redisClient.hGetAll(key);
  return Object.keys(data).length > 0 ? data : null;
};

/**
 * Delete active call from Redis
 */
const deleteActiveCall = async (callId: string): Promise<void> => {
  const key = `call:${callId}`;
  await redisClient.del(key);
};

/**
 * Handle call initiation
 */
export const handleCallInitiate = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: CallIncomingPayload,
  callback?: (response: any) => void
): Promise<void> => {
  const { userId } = socket;

  logger.info('Call initiate event', {
    socketId: socket.id,
    callerId: userId,
    targetUserId: data.targetUserId,
    callType: data.callType,
    callId: data.callId,
  });

  try {
    // Validate payload
    if (!data.callId || !data.targetUserId || !data.callType || !data.offer) {
      const error = {
        error: 'Invalid payload',
        message: 'callId, targetUserId, callType, and offer are required',
      };
      if (callback) callback(error);
      return;
    }

    // Validate call type
    if (!['audio', 'video'].includes(data.callType)) {
      const error = {
        error: 'Invalid call type',
        message: 'callType must be audio or video',
      };
      if (callback) callback(error);
      return;
    }

    // Store call info in Redis
    await storeActiveCall(data.callId, {
      callerId: userId,
      targetUserId: data.targetUserId,
      callType: data.callType,
      status: 'incoming',
      createdAt: Date.now().toString(),
      offer: JSON.stringify(data.offer),
    });

    // Prepare call broadcast
    const callBroadcast: CallBroadcast = {
      callId: data.callId,
      callerId: userId,
      callerName: 'User', // In production, fetch from database
      callerAvatar: undefined,
      callType: data.callType,
      offer: data.offer,
      status: 'incoming',
    };

    // Send call notification to target user
    io.to(`user:${data.targetUserId}`).emit('call:incoming', callBroadcast);

    // Send acknowledgment to caller
    if (callback) {
      callback({ success: true, callId: data.callId });
    }

    logger.info('Call initiated', {
      callId: data.callId,
      callerId: userId,
      targetUserId: data.targetUserId,
    });
  } catch (error) {
    logger.error('Error handling call initiate', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (callback) {
      callback({
        error: 'Call initiation failed',
        message: 'Failed to initiate call',
      });
    }
  }
};

/**
 * Handle call answer
 */
export const handleCallAnswer = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: CallAnswerPayload
): Promise<void> => {
  const { userId } = socket;

  logger.info('Call answer event', {
    socketId: socket.id,
    userId,
    callId: data.callId,
  });

  try {
    // Validate payload
    if (!data.callId || !data.answer) {
      logger.warn('Invalid call answer payload', { userId, data });
      socket.emit('error', {
        message: 'callId and answer are required',
        code: 'INVALID_PAYLOAD',
      });
      return;
    }

    // Get call info from Redis
    const callData = await getActiveCall(data.callId);
    if (!callData) {
      logger.warn('Call not found', { callId: data.callId, userId });
      socket.emit('error', {
        message: 'Call not found',
        code: 'CALL_NOT_FOUND',
      });
      return;
    }

    // Update call status
    await storeActiveCall(data.callId, {
      ...callData,
      status: 'answered',
      answeredAt: Date.now().toString(),
      answer: JSON.stringify(data.answer),
    });

    // Prepare call broadcast
    const callBroadcast: CallBroadcast = {
      callId: data.callId,
      callerId: callData.callerId,
      callerName: 'User',
      callerAvatar: undefined,
      callType: callData.callType,
      answer: data.answer,
      status: 'answered',
    };

    // Send answer to caller
    io.to(`user:${callData.callerId}`).emit('call:answer', callBroadcast);

    logger.info('Call answered', {
      callId: data.callId,
      callerId: callData.callerId,
      answeredBy: userId,
    });
  } catch (error) {
    logger.error('Error handling call answer', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    socket.emit('error', {
      message: 'Failed to answer call',
      code: 'CALL_ANSWER_ERROR',
    });
  }
};

/**
 * Handle call rejection
 */
export const handleCallReject = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: CallRejectPayload
): Promise<void> => {
  const { userId } = socket;

  logger.info('Call reject event', {
    socketId: socket.id,
    userId,
    callId: data.callId,
  });

  try {
    // Validate payload
    if (!data.callId) {
      logger.warn('Invalid call reject payload', { userId, data });
      return;
    }

    // Get call info from Redis
    const callData = await getActiveCall(data.callId);
    if (!callData) {
      logger.warn('Call not found', { callId: data.callId, userId });
      return;
    }

    // Update call status
    await storeActiveCall(data.callId, {
      ...callData,
      status: 'rejected',
      rejectedAt: Date.now().toString(),
      rejectReason: data.reason || '',
    });

    // Prepare call broadcast
    const callBroadcast: CallBroadcast = {
      callId: data.callId,
      callerId: callData.callerId,
      callerName: 'User',
      callerAvatar: undefined,
      callType: callData.callType,
      status: 'rejected',
    };

    // Notify caller
    io.to(`user:${callData.callerId}`).emit('call:reject', callBroadcast);

    // Clean up call after delay
    setTimeout(() => {
      deleteActiveCall(data.callId);
    }, 5000);

    logger.info('Call rejected', {
      callId: data.callId,
      callerId: callData.callerId,
      rejectedBy: userId,
    });
  } catch (error) {
    logger.error('Error handling call reject', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};

/**
 * Handle call end
 */
export const handleCallEnd = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: CallEndPayload
): Promise<void> => {
  const { userId } = socket;

  logger.info('Call end event', {
    socketId: socket.id,
    userId,
    callId: data.callId,
  });

  try {
    // Validate payload
    if (!data.callId) {
      logger.warn('Invalid call end payload', { userId, data });
      return;
    }

    // Get call info from Redis
    const callData = await getActiveCall(data.callId);
    if (!callData) {
      logger.debug('Call not found (may already be ended)', { callId: data.callId });
      return;
    }

    // Prepare call broadcast
    const callBroadcast: CallBroadcast = {
      callId: data.callId,
      callerId: callData.callerId,
      callerName: 'User',
      callerAvatar: undefined,
      callType: callData.callType,
      status: 'ended',
    };

    // Notify both participants
    io.to(`user:${callData.callerId}`).emit('call:end', callBroadcast);
    io.to(`user:${callData.targetUserId}`).emit('call:end', callBroadcast);

    // Clean up call
    await deleteActiveCall(data.callId);

    logger.info('Call ended', {
      callId: data.callId,
      endedBy: userId,
    });
  } catch (error) {
    logger.error('Error handling call end', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};

/**
 * Handle ICE candidate exchange
 */
export const handleCallIceCandidate = async (
  io: Server,
  socket: AuthenticatedSocket,
  data: CallIceCandidatePayload
): Promise<void> => {
  const { userId } = socket;

  logger.debug('Call ICE candidate event', {
    socketId: socket.id,
    userId,
    callId: data.callId,
  });

  try {
    // Validate payload
    if (!data.callId || !data.candidate) {
      logger.warn('Invalid ICE candidate payload', { userId, data });
      return;
    }

    // Get call info from Redis
    const callData = await getActiveCall(data.callId);
    if (!callData) {
      logger.warn('Call not found for ICE candidate', { callId: data.callId });
      return;
    }

    // Determine recipient (other participant)
    const recipientId = callData.callerId === userId
      ? callData.targetUserId
      : callData.callerId;

    // Forward ICE candidate to the other participant
    io.to(`user:${recipientId}`).emit('call:ice-candidate', {
      callId: data.callId,
      candidate: data.candidate,
    });

    logger.debug('ICE candidate forwarded', {
      callId: data.callId,
      fromUserId: userId,
      toUserId: recipientId,
    });
  } catch (error) {
    logger.error('Error handling ICE candidate', {
      socketId: socket.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};

/**
 * Register all call event handlers
 */
export const registerCallHandlers = (
  io: Server,
  socket: AuthenticatedSocket
): void => {
  socket.on('call:initiate', (data: CallIncomingPayload, callback) => {
    handleCallInitiate(io, socket, data, callback);
  });

  socket.on('call:answer', (data: CallAnswerPayload) => {
    handleCallAnswer(io, socket, data);
  });

  socket.on('call:reject', (data: CallRejectPayload) => {
    handleCallReject(io, socket, data);
  });

  socket.on('call:end', (data: CallEndPayload) => {
    handleCallEnd(io, socket, data);
  });

  socket.on('call:ice-candidate', (data: CallIceCandidatePayload) => {
    handleCallIceCandidate(io, socket, data);
  });

  logger.debug('Call handlers registered', {
    socketId: socket.id,
    userId: socket.userId,
  });
};
