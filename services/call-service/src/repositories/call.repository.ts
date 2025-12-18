import { db } from '../config/database';
import { logger } from '../utils/logger';
import {
  Call,
  CallParticipant,
  CallRecording,
  CallType,
  CallState,
  CallEndReason,
  ParticipantRole,
  CallQualityMetrics,
  ConnectionQuality,
} from '@sup/types';
import { v4 as uuidv4 } from 'uuid';

export class CallRepository {
  /**
   * Create a new call
   */
  async createCall(data: {
    roomId: string;
    type: CallType;
    initiatorId: string;
    chatId?: string;
    isGroup: boolean;
    maxParticipants?: number;
  }): Promise<Call> {
    const query = `
      INSERT INTO calls (
        room_id, type, state, initiator_id, chat_id, is_group, max_participants
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      data.roomId,
      data.type,
      CallState.INITIATING,
      data.initiatorId,
      data.chatId || null,
      data.isGroup,
      data.maxParticipants || 8,
    ];

    try {
      const call = await db.one(query, values);
      logger.info('Call created', { callId: call.id });
      return this.mapCallFromDb(call);
    } catch (error) {
      logger.error('Failed to create call', { error });
      throw error;
    }
  }

  /**
   * Get call by ID
   */
  async getCallById(callId: string): Promise<Call | null> {
    const query = 'SELECT * FROM calls WHERE id = $1';
    try {
      const call = await db.oneOrNone(query, [callId]);
      return call ? this.mapCallFromDb(call) : null;
    } catch (error) {
      logger.error('Failed to get call', { callId, error });
      throw error;
    }
  }

  /**
   * Get call by room ID
   */
  async getCallByRoomId(roomId: string): Promise<Call | null> {
    const query = 'SELECT * FROM calls WHERE room_id = $1';
    try {
      const call = await db.oneOrNone(query, [roomId]);
      return call ? this.mapCallFromDb(call) : null;
    } catch (error) {
      logger.error('Failed to get call by room', { roomId, error });
      throw error;
    }
  }

  /**
   * Update call state
   */
  async updateCallState(callId: string, state: CallState): Promise<void> {
    const query = `
      UPDATE calls
      SET state = $1,
          started_at = CASE WHEN $1 = 'connected' AND started_at IS NULL THEN NOW() ELSE started_at END,
          updated_at = NOW()
      WHERE id = $2
    `;

    try {
      await db.none(query, [state, callId]);
      logger.info('Call state updated', { callId, state });
    } catch (error) {
      logger.error('Failed to update call state', { callId, state, error });
      throw error;
    }
  }

  /**
   * End call
   */
  async endCall(callId: string, reason: CallEndReason): Promise<void> {
    const query = `
      UPDATE calls
      SET state = $1,
          ended_at = NOW(),
          end_reason = $2,
          updated_at = NOW()
      WHERE id = $3
    `;

    try {
      await db.none(query, [CallState.ENDED, reason, callId]);
      logger.info('Call ended', { callId, reason });
    } catch (error) {
      logger.error('Failed to end call', { callId, error });
      throw error;
    }
  }

  /**
   * Add participant to call
   */
  async addParticipant(data: {
    callId: string;
    userId: string;
    role: ParticipantRole;
  }): Promise<CallParticipant> {
    const query = `
      INSERT INTO call_participants (call_id, user_id, role, connection_state)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (call_id, user_id) DO UPDATE
      SET connection_state = $4, updated_at = NOW()
      RETURNING *
    `;

    try {
      const participant = await db.one(query, [
        data.callId,
        data.userId,
        data.role,
        CallState.RINGING,
      ]);
      logger.info('Participant added to call', {
        callId: data.callId,
        userId: data.userId,
      });
      return this.mapParticipantFromDb(participant);
    } catch (error) {
      logger.error('Failed to add participant', { data, error });
      throw error;
    }
  }

  /**
   * Update participant state
   */
  async updateParticipantState(
    participantId: string,
    state: CallState
  ): Promise<void> {
    const query = `
      UPDATE call_participants
      SET connection_state = $1,
          joined_at = CASE WHEN $1 = 'connected' AND joined_at IS NULL THEN NOW() ELSE joined_at END,
          updated_at = NOW()
      WHERE id = $2
    `;

    try {
      await db.none(query, [state, participantId]);
      logger.info('Participant state updated', { participantId, state });
    } catch (error) {
      logger.error('Failed to update participant state', {
        participantId,
        state,
        error,
      });
      throw error;
    }
  }

  /**
   * Update participant settings
   */
  async updateParticipantSettings(
    participantId: string,
    settings: {
      audioEnabled?: boolean;
      videoEnabled?: boolean;
      screenShareEnabled?: boolean;
    }
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (settings.audioEnabled !== undefined) {
      updates.push(`audio_enabled = $${paramCount++}`);
      values.push(settings.audioEnabled);
    }
    if (settings.videoEnabled !== undefined) {
      updates.push(`video_enabled = $${paramCount++}`);
      values.push(settings.videoEnabled);
    }
    if (settings.screenShareEnabled !== undefined) {
      updates.push(`screen_share_enabled = $${paramCount++}`);
      values.push(settings.screenShareEnabled);
    }

    if (updates.length === 0) return;

    updates.push(`updated_at = NOW()`);
    values.push(participantId);

    const query = `
      UPDATE call_participants
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
    `;

    try {
      await db.none(query, values);
      logger.info('Participant settings updated', { participantId, settings });
    } catch (error) {
      logger.error('Failed to update participant settings', {
        participantId,
        settings,
        error,
      });
      throw error;
    }
  }

  /**
   * Remove participant from call
   */
  async removeParticipant(participantId: string): Promise<void> {
    const query = `
      UPDATE call_participants
      SET left_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND left_at IS NULL
    `;

    try {
      await db.none(query, [participantId]);
      logger.info('Participant removed from call', { participantId });
    } catch (error) {
      logger.error('Failed to remove participant', { participantId, error });
      throw error;
    }
  }

  /**
   * Get participants by call ID
   */
  async getParticipantsByCallId(callId: string): Promise<CallParticipant[]> {
    const query = 'SELECT * FROM call_participants WHERE call_id = $1';
    try {
      const participants = await db.manyOrNone(query, [callId]);
      return participants.map(this.mapParticipantFromDb);
    } catch (error) {
      logger.error('Failed to get participants', { callId, error });
      throw error;
    }
  }

  /**
   * Get participant by user and call
   */
  async getParticipantByUserAndCall(
    userId: string,
    callId: string
  ): Promise<CallParticipant | null> {
    const query = `
      SELECT * FROM call_participants
      WHERE user_id = $1 AND call_id = $2
    `;
    try {
      const participant = await db.oneOrNone(query, [userId, callId]);
      return participant ? this.mapParticipantFromDb(participant) : null;
    } catch (error) {
      logger.error('Failed to get participant', { userId, callId, error });
      throw error;
    }
  }

  /**
   * Get active calls for user
   */
  async getActiveCallsForUser(userId: string): Promise<Call[]> {
    const query = `
      SELECT DISTINCT c.* FROM calls c
      INNER JOIN call_participants cp ON c.id = cp.call_id
      WHERE cp.user_id = $1
        AND c.state IN ('ringing', 'connecting', 'connected', 'reconnecting')
        AND cp.left_at IS NULL
      ORDER BY c.created_at DESC
    `;

    try {
      const calls = await db.manyOrNone(query, [userId]);
      return calls.map(this.mapCallFromDb);
    } catch (error) {
      logger.error('Failed to get active calls for user', { userId, error });
      throw error;
    }
  }

  /**
   * Get call history for user
   */
  async getCallHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Call[]> {
    const query = `
      SELECT DISTINCT c.* FROM calls c
      INNER JOIN call_participants cp ON c.id = cp.call_id
      WHERE cp.user_id = $1
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const calls = await db.manyOrNone(query, [userId, limit, offset]);
      return calls.map(this.mapCallFromDb);
    } catch (error) {
      logger.error('Failed to get call history', { userId, error });
      throw error;
    }
  }

  /**
   * Save call quality metrics
   */
  async saveQualityMetrics(
    callId: string,
    participantId: string,
    metrics: {
      jitter: number;
      packetLoss: number;
      roundTripTime: number;
      bandwidth: number;
      fps?: number;
      resolution?: string;
      codec?: string;
      quality: string;
    }
  ): Promise<void> {
    const query = `
      INSERT INTO call_quality_metrics (
        call_id, participant_id, jitter, packet_loss, round_trip_time,
        bandwidth, fps, resolution, codec, quality
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    try {
      await db.none(query, [
        callId,
        participantId,
        metrics.jitter,
        metrics.packetLoss,
        metrics.roundTripTime,
        metrics.bandwidth,
        metrics.fps || null,
        metrics.resolution || null,
        metrics.codec || null,
        metrics.quality,
      ]);
      logger.debug('Quality metrics saved', { callId, participantId });
    } catch (error) {
      logger.error('Failed to save quality metrics', {
        callId,
        participantId,
        error,
      });
    }
  }

  /**
   * Get call statistics
   */
  async getCallStats(): Promise<{
    totalCalls: number;
    activeCalls: number;
    completedCalls: number;
    failedCalls: number;
  }> {
    const query = `
      SELECT
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE state IN ('ringing', 'connecting', 'connected', 'reconnecting')) as active_calls,
        COUNT(*) FILTER (WHERE state = 'ended' AND end_reason = 'normal') as completed_calls,
        COUNT(*) FILTER (WHERE state IN ('failed', 'busy', 'declined')) as failed_calls
      FROM calls
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `;

    try {
      const stats = await db.one(query);
      return {
        totalCalls: parseInt(stats.total_calls, 10),
        activeCalls: parseInt(stats.active_calls, 10),
        completedCalls: parseInt(stats.completed_calls, 10),
        failedCalls: parseInt(stats.failed_calls, 10),
      };
    } catch (error) {
      logger.error('Failed to get call stats', { error });
      return {
        totalCalls: 0,
        activeCalls: 0,
        completedCalls: 0,
        failedCalls: 0,
      };
    }
  }

  /**
   * Map database row to Call object
   */
  private mapCallFromDb(row: any): Call {
    return {
      id: row.id,
      roomId: row.room_id,
      type: row.type as CallType,
      state: row.state as CallState,
      initiatorId: row.initiator_id,
      chatId: row.chat_id,
      isGroup: row.is_group,
      maxParticipants: row.max_participants,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      duration: row.duration,
      endReason: row.end_reason as CallEndReason,
      recordingEnabled: row.recording_enabled,
      recordingUrl: row.recording_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to CallParticipant object
   */
  private mapParticipantFromDb(row: any): CallParticipant {
    return {
      id: row.id,
      callId: row.call_id,
      userId: row.user_id,
      role: row.role as ParticipantRole,
      joinedAt: row.joined_at,
      leftAt: row.left_at,
      duration: row.duration,
      connectionState: row.connection_state as CallState,
      audioEnabled: row.audio_enabled,
      videoEnabled: row.video_enabled,
      screenShareEnabled: row.screen_share_enabled,
    };
  }
}

export const callRepository = new CallRepository();
