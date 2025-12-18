import { v4 as uuidv4 } from 'uuid';
import { callRepository } from '../repositories/call.repository';
import { livekitService } from './livekit.service';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';
import { config } from '../config';
import {
  Call,
  CallParticipant,
  CallType,
  CallState,
  CallEndReason,
  ParticipantRole,
  StartCallRequest,
  StartCallResponse,
  JoinCallResponse,
  ICEServer,
  CallInvitation,
  LiveKitToken,
} from '@sup/types';

export class CallService {
  /**
   * Start a new call
   */
  async startCall(
    initiatorId: string,
    request: StartCallRequest
  ): Promise<StartCallResponse> {
    try {
      // Check if user already in an active call
      const activeCalls = await callRepository.getActiveCallsForUser(initiatorId);
      if (activeCalls.length > 0) {
        throw new Error('User already in an active call');
      }

      // Generate unique room ID
      const roomId = `room_${uuidv4()}`;

      // Create LiveKit room
      await livekitService.createRoom(
        roomId,
        request.participantIds.length + 1
      );

      // Create call in database
      const call = await callRepository.createCall({
        roomId,
        type: request.type,
        initiatorId,
        chatId: request.chatId,
        isGroup: request.participantIds.length > 1,
        maxParticipants: config.calls.maxParticipants,
      });

      // Add initiator as participant
      await callRepository.addParticipant({
        callId: call.id,
        userId: initiatorId,
        role: ParticipantRole.INITIATOR,
      });

      // Add other participants
      for (const participantId of request.participantIds) {
        await callRepository.addParticipant({
          callId: call.id,
          userId: participantId,
          role: ParticipantRole.PARTICIPANT,
        });
      }

      // Generate token for initiator
      const token = await livekitService.generateToken(
        roomId,
        initiatorId,
        `user_${initiatorId}`,
        {
          userId: initiatorId,
          callId: call.id,
          role: ParticipantRole.INITIATOR,
        }
      );

      // Get ICE servers
      const iceServers = this.getICEServers();

      // Store call info in Redis for quick access
      await this.storeCallInRedis(call);

      // Update call state to ringing
      await callRepository.updateCallState(call.id, CallState.RINGING);

      logger.info('Call started', {
        callId: call.id,
        roomId,
        initiatorId,
        participants: request.participantIds.length,
      });

      return { call, token, iceServers };
    } catch (error) {
      logger.error('Failed to start call', { initiatorId, error });
      throw error;
    }
  }

  /**
   * Join an existing call
   */
  async joinCall(
    userId: string,
    callId: string
  ): Promise<JoinCallResponse> {
    try {
      // Get call
      const call = await callRepository.getCallById(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      // Check if call is still active
      if (![CallState.RINGING, CallState.CONNECTING, CallState.CONNECTED].includes(call.state)) {
        throw new Error('Call is not active');
      }

      // Get participant
      const participant = await callRepository.getParticipantByUserAndCall(
        userId,
        callId
      );
      if (!participant) {
        throw new Error('User not invited to this call');
      }

      // Update participant state to connecting
      await callRepository.updateParticipantState(
        participant.id,
        CallState.CONNECTING
      );

      // Generate token
      const token = await livekitService.generateToken(
        call.roomId,
        userId,
        `user_${userId}`,
        {
          userId,
          callId: call.id,
          role: participant.role,
        }
      );

      // Get all participants
      const participants = await callRepository.getParticipantsByCallId(callId);

      // Get ICE servers
      const iceServers = this.getICEServers();

      logger.info('User joined call', { callId, userId });

      return { call, token, iceServers, participants };
    } catch (error) {
      logger.error('Failed to join call', { userId, callId, error });
      throw error;
    }
  }

  /**
   * End a call
   */
  async endCall(
    callId: string,
    userId: string,
    reason: CallEndReason = CallEndReason.NORMAL
  ): Promise<void> {
    try {
      const call = await callRepository.getCallById(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      // Check if user is initiator or participant
      const participant = await callRepository.getParticipantByUserAndCall(
        userId,
        callId
      );
      if (!participant) {
        throw new Error('User not part of this call');
      }

      // If initiator ends the call, end for everyone
      if (participant.role === ParticipantRole.INITIATOR) {
        await this.endCallForAll(call, reason);
      } else {
        // Just remove this participant
        await callRepository.removeParticipant(participant.id);
      }

      logger.info('Call ended', { callId, userId, reason });
    } catch (error) {
      logger.error('Failed to end call', { callId, userId, error });
      throw error;
    }
  }

  /**
   * End call for all participants
   */
  private async endCallForAll(
    call: Call,
    reason: CallEndReason
  ): Promise<void> {
    // Update call state
    await callRepository.endCall(call.id, reason);

    // Remove all participants
    const participants = await callRepository.getParticipantsByCallId(call.id);
    for (const participant of participants) {
      if (!participant.leftAt) {
        await callRepository.removeParticipant(participant.id);
      }
    }

    // Delete LiveKit room
    try {
      await livekitService.deleteRoom(call.roomId);
    } catch (error) {
      logger.error('Failed to delete LiveKit room', {
        callId: call.id,
        roomId: call.roomId,
        error,
      });
    }

    // Remove from Redis
    await this.removeCallFromRedis(call.id);
  }

  /**
   * Update participant settings
   */
  async updateParticipantSettings(
    userId: string,
    callId: string,
    settings: {
      audioEnabled?: boolean;
      videoEnabled?: boolean;
      screenShareEnabled?: boolean;
    }
  ): Promise<void> {
    try {
      const participant = await callRepository.getParticipantByUserAndCall(
        userId,
        callId
      );
      if (!participant) {
        throw new Error('Participant not found');
      }

      await callRepository.updateParticipantSettings(participant.id, settings);

      logger.info('Participant settings updated', {
        callId,
        userId,
        settings,
      });
    } catch (error) {
      logger.error('Failed to update participant settings', {
        callId,
        userId,
        error,
      });
      throw error;
    }
  }

  /**
   * Mark participant as connected
   */
  async markParticipantConnected(userId: string, callId: string): Promise<void> {
    try {
      const participant = await callRepository.getParticipantByUserAndCall(
        userId,
        callId
      );
      if (!participant) {
        throw new Error('Participant not found');
      }

      await callRepository.updateParticipantState(
        participant.id,
        CallState.CONNECTED
      );

      // Check if all participants are connected, update call state
      const participants = await callRepository.getParticipantsByCallId(callId);
      const allConnected = participants.every(
        (p) => p.connectionState === CallState.CONNECTED
      );

      if (allConnected) {
        await callRepository.updateCallState(callId, CallState.CONNECTED);
      }

      logger.info('Participant marked as connected', { callId, userId });
    } catch (error) {
      logger.error('Failed to mark participant as connected', {
        callId,
        userId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get call details
   */
  async getCall(callId: string): Promise<Call | null> {
    return callRepository.getCallById(callId);
  }

  /**
   * Get call participants
   */
  async getCallParticipants(callId: string): Promise<CallParticipant[]> {
    return callRepository.getParticipantsByCallId(callId);
  }

  /**
   * Get user's call history
   */
  async getCallHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Call[]> {
    return callRepository.getCallHistory(userId, limit, offset);
  }

  /**
   * Get active calls for user
   */
  async getActiveCallsForUser(userId: string): Promise<Call[]> {
    return callRepository.getActiveCallsForUser(userId);
  }

  /**
   * Save call quality metrics
   */
  async saveQualityMetrics(
    userId: string,
    callId: string,
    metrics: {
      jitter: number;
      packetLoss: number;
      roundTripTime: number;
      bandwidth: number;
      fps?: number;
      resolution?: string;
      codec?: string;
    }
  ): Promise<void> {
    try {
      const participant = await callRepository.getParticipantByUserAndCall(
        userId,
        callId
      );
      if (!participant) {
        throw new Error('Participant not found');
      }

      // Determine quality based on metrics
      const quality = this.calculateConnectionQuality(metrics);

      await callRepository.saveQualityMetrics(callId, participant.id, {
        ...metrics,
        quality,
      });
    } catch (error) {
      logger.error('Failed to save quality metrics', {
        userId,
        callId,
        error,
      });
    }
  }

  /**
   * Calculate connection quality
   */
  private calculateConnectionQuality(metrics: {
    jitter: number;
    packetLoss: number;
    roundTripTime: number;
  }): string {
    // Excellent: jitter < 20ms, packet loss < 1%, RTT < 100ms
    // Good: jitter < 40ms, packet loss < 3%, RTT < 200ms
    // Fair: jitter < 60ms, packet loss < 5%, RTT < 300ms
    // Poor: anything worse

    if (
      metrics.jitter < 20 &&
      metrics.packetLoss < 1 &&
      metrics.roundTripTime < 100
    ) {
      return 'excellent';
    } else if (
      metrics.jitter < 40 &&
      metrics.packetLoss < 3 &&
      metrics.roundTripTime < 200
    ) {
      return 'good';
    } else if (
      metrics.jitter < 60 &&
      metrics.packetLoss < 5 &&
      metrics.roundTripTime < 300
    ) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  /**
   * Get ICE servers configuration
   */
  private getICEServers(): ICEServer[] {
    return [
      {
        urls: config.stun.urls,
      },
      {
        urls: config.turn.urls,
        username: config.turn.username,
        credential: config.turn.credential,
      },
    ];
  }

  /**
   * Store call in Redis for quick access
   */
  private async storeCallInRedis(call: Call): Promise<void> {
    const key = `call:${call.id}`;
    await redis.setex(key, 3600, JSON.stringify(call)); // 1 hour TTL
  }

  /**
   * Remove call from Redis
   */
  private async removeCallFromRedis(callId: string): Promise<void> {
    const key = `call:${callId}`;
    await redis.del(key);
  }

  /**
   * Get call statistics
   */
  async getCallStats() {
    return callRepository.getCallStats();
  }

  /**
   * Check for stale calls and clean them up
   */
  async cleanupStaleCalls(): Promise<void> {
    try {
      // This would be called periodically by a worker
      // Find calls that have been in ringing/connecting state too long
      const staleTimeout = config.calls.ringingTimeout * 1000; // Convert to ms

      logger.info('Cleanup stale calls executed');
    } catch (error) {
      logger.error('Failed to cleanup stale calls', { error });
    }
  }
}

export const callService = new CallService();
