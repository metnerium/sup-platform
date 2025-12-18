import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { callService } from '../services/call.service';
import { websocketService } from '../services/websocket.service';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../utils/logger';
import {
  CallEvent,
  CallEndReason,
  CallInvitation,
  CallType,
  StartCallRequest,
} from '@sup/types';
import { z } from 'zod';

// Validation schemas
const startCallSchema = z.object({
  type: z.enum(['audio', 'video']),
  chatId: z.string().uuid().optional(),
  participantIds: z.array(z.string().uuid()).min(1).max(7),
  videoEnabled: z.boolean().optional().default(true),
  audioEnabled: z.boolean().optional().default(true),
});

const joinCallSchema = z.object({
  videoEnabled: z.boolean().optional().default(true),
  audioEnabled: z.boolean().optional().default(true),
});

const endCallSchema = z.object({
  reason: z
    .enum([
      'normal',
      'timeout',
      'declined',
      'busy',
      'failed',
      'cancelled',
      'network_error',
      'no_answer',
    ])
    .optional(),
});

const updateParticipantSchema = z.object({
  audioEnabled: z.boolean().optional(),
  videoEnabled: z.boolean().optional(),
  screenShareEnabled: z.boolean().optional(),
});

export const CallController = {
  /**
   * Start a new call
   * POST /calls/start
   */
  startCall: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;

    // Validate request
    const validatedData = startCallSchema.parse(req.body);

    logger.info('Starting call', { userId, data: validatedData });

    // Start call
    const startRequest: StartCallRequest = {
      ...validatedData,
      type: validatedData.type as CallType,
    };
    const result = await callService.startCall(userId, startRequest);

    // Get initiator info for invitation
    const initiatorName = req.user!.username;

    // Create invitation object
    const invitation: CallInvitation = {
      callId: result.call.id,
      roomId: result.call.roomId,
      type: result.call.type,
      initiatorId: userId,
      initiatorName,
      chatId: result.call.chatId,
      isGroup: result.call.isGroup,
      participants: validatedData.participantIds,
    };

    // Send invitations via WebSocket
    for (const participantId of validatedData.participantIds) {
      websocketService.emitToUser(participantId, CallEvent.INCOMING, {
        callId: result.call.id,
        invitation,
      });
    }

    res.status(201).json({
      success: true,
      data: result,
    });
  }),

  /**
   * Join an existing call
   * POST /calls/:callId/join
   */
  joinCall: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { callId } = req.params;

    // Validate request
    joinCallSchema.parse(req.body);

    logger.info('Joining call', { userId, callId });

    // Join call
    const result = await callService.joinCall(userId, callId);

    // Notify other participants
    websocketService.emitToCall(callId, CallEvent.PARTICIPANT_JOINED, {
      callId,
      userId,
    });

    res.json({
      success: true,
      data: result,
    });
  }),

  /**
   * End a call
   * POST /calls/:callId/end
   */
  endCall: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { callId } = req.params;

    // Validate request
    const validatedData = endCallSchema.parse(req.body);

    logger.info('Ending call', { userId, callId, reason: validatedData.reason });

    // End call
    await callService.endCall(
      callId,
      userId,
      validatedData.reason as CallEndReason
    );

    // Notify participants
    websocketService.emitToCall(callId, CallEvent.ENDED, {
      callId,
      userId,
      reason: validatedData.reason,
    });

    res.json({
      success: true,
      message: 'Call ended successfully',
    });
  }),

  /**
   * Get LiveKit token
   * POST /calls/:callId/token
   */
  getToken: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { callId } = req.params;

    logger.info('Getting call token', { userId, callId });

    // Get call
    const call = await callService.getCall(callId);
    if (!call) {
      res.status(404).json({ error: 'Call not found' });
      return;
    }

    // Verify user is participant
    const participants = await callService.getCallParticipants(callId);
    const participant = participants.find((p) => p.userId === userId);
    if (!participant) {
      res.status(403).json({ error: 'User not part of this call' });
      return;
    }

    // Generate new token (for reconnection)
    const result = await callService.joinCall(userId, callId);

    res.json({
      success: true,
      data: {
        token: result.token,
        iceServers: result.iceServers,
      },
    });
  }),

  /**
   * Get call details
   * GET /calls/:callId
   */
  getCall: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { callId } = req.params;

    logger.info('Getting call details', { userId, callId });

    const call = await callService.getCall(callId);
    if (!call) {
      res.status(404).json({ error: 'Call not found' });
      return;
    }

    // Verify user is participant
    const participants = await callService.getCallParticipants(callId);
    const isParticipant = participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json({
      success: true,
      data: {
        call,
        participants,
      },
    });
  }),

  /**
   * Get call history
   * GET /calls/history
   */
  getHistory: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    logger.info('Getting call history', { userId, limit, offset });

    const calls = await callService.getCallHistory(userId, limit, offset);

    res.json({
      success: true,
      data: {
        calls,
        pagination: {
          limit,
          offset,
          total: calls.length,
        },
      },
    });
  }),

  /**
   * Get active calls
   * GET /calls/active
   */
  getActiveCalls: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;

    logger.info('Getting active calls', { userId });

    const calls = await callService.getActiveCallsForUser(userId);

    res.json({
      success: true,
      data: {
        calls,
      },
    });
  }),

  /**
   * Update participant settings
   * PATCH /calls/:callId/participant
   */
  updateParticipant: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { callId } = req.params;

    // Validate request
    const validatedData = updateParticipantSchema.parse(req.body);

    logger.info('Updating participant settings', {
      userId,
      callId,
      settings: validatedData,
    });

    await callService.updateParticipantSettings(
      userId,
      callId,
      validatedData
    );

    // Notify other participants
    websocketService.emitToCall(callId, CallEvent.PARTICIPANT_UPDATED, {
      callId,
      userId,
      participant: validatedData,
    });

    res.json({
      success: true,
      message: 'Participant settings updated',
    });
  }),

  /**
   * Get call statistics (admin/monitoring)
   * GET /calls/stats
   */
  getStats: asyncHandler(async (_req: AuthRequest, res: Response) => {
    logger.info('Getting call statistics');

    const stats = await callService.getCallStats();

    res.json({
      success: true,
      data: stats,
    });
  }),
};
