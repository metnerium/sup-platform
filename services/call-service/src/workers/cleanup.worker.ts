import { logger } from '../utils/logger';
import { callRepository } from '../repositories/call.repository';
import { livekitService } from '../services/livekit.service';
import { db } from '../config/database';
import { config } from '../config';
import { CallState, CallEndReason } from '@sup/types';

/**
 * Cleanup worker for stale calls and rooms
 * This should run periodically (e.g., every minute)
 */
export class CleanupWorker {
  private isRunning: boolean = false;

  /**
   * Run cleanup tasks
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      logger.debug('Cleanup already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      logger.info('Starting cleanup worker...');

      await Promise.all([
        this.cleanupStaleRingingCalls(),
        this.cleanupStaleConnectingCalls(),
        this.cleanupOrphanedRooms(),
        this.cleanupOldQualityMetrics(),
      ]);

      logger.info('Cleanup worker completed successfully');
    } catch (error) {
      logger.error('Cleanup worker failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Clean up calls stuck in ringing state
   */
  private async cleanupStaleRingingCalls(): Promise<void> {
    try {
      const timeout = config.calls.ringingTimeout;

      const query = `
        UPDATE calls
        SET state = $1,
            ended_at = NOW(),
            end_reason = $2
        WHERE state = $3
          AND created_at < NOW() - INTERVAL '${timeout} seconds'
          AND ended_at IS NULL
        RETURNING id, room_id
      `;

      const staleCalls = await db.manyOrNone(query, [
        CallState.ENDED,
        CallEndReason.TIMEOUT,
        CallState.RINGING,
      ]);

      if (staleCalls.length > 0) {
        logger.info(`Cleaned up ${staleCalls.length} stale ringing calls`);

        // Delete associated LiveKit rooms
        for (const call of staleCalls) {
          try {
            await livekitService.deleteRoom(call.room_id);
          } catch (error) {
            logger.error('Failed to delete LiveKit room:', {
              roomId: call.room_id,
              error,
            });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup stale ringing calls:', error);
    }
  }

  /**
   * Clean up calls stuck in connecting state
   */
  private async cleanupStaleConnectingCalls(): Promise<void> {
    try {
      const timeout = config.calls.connectionTimeout;

      const query = `
        UPDATE calls
        SET state = $1,
            ended_at = NOW(),
            end_reason = $2
        WHERE state = $3
          AND created_at < NOW() - INTERVAL '${timeout} seconds'
          AND ended_at IS NULL
        RETURNING id, room_id
      `;

      const staleCalls = await db.manyOrNone(query, [
        CallState.FAILED,
        CallEndReason.TIMEOUT,
        CallState.CONNECTING,
      ]);

      if (staleCalls.length > 0) {
        logger.info(`Cleaned up ${staleCalls.length} stale connecting calls`);

        // Delete associated LiveKit rooms
        for (const call of staleCalls) {
          try {
            await livekitService.deleteRoom(call.room_id);
          } catch (error) {
            logger.error('Failed to delete LiveKit room:', {
              roomId: call.room_id,
              error,
            });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup stale connecting calls:', error);
    }
  }

  /**
   * Clean up LiveKit rooms that don't have corresponding calls
   */
  private async cleanupOrphanedRooms(): Promise<void> {
    try {
      // Get all active LiveKit rooms
      const livekitRooms = await livekitService
        .getActiveRoomsCount()
        .catch(() => 0);

      if (livekitRooms === 0) return;

      // Get all active calls from database
      const query = `
        SELECT room_id FROM calls
        WHERE state IN ($1, $2, $3, $4)
      `;

      const activeCalls = await db.manyOrNone(query, [
        CallState.RINGING,
        CallState.CONNECTING,
        CallState.CONNECTED,
        CallState.RECONNECTING,
      ]);

      const activeRoomIds = new Set(activeCalls.map((c) => c.room_id));

      // Note: We can't easily get all room names from LiveKit without iterating
      // This is a placeholder for more sophisticated cleanup
      logger.debug('Checked for orphaned rooms', {
        livekitRooms,
        databaseCalls: activeCalls.length,
      });
    } catch (error) {
      logger.error('Failed to cleanup orphaned rooms:', error);
    }
  }

  /**
   * Clean up old quality metrics (keep only last 7 days)
   */
  private async cleanupOldQualityMetrics(): Promise<void> {
    try {
      const query = `
        DELETE FROM call_quality_metrics
        WHERE timestamp < NOW() - INTERVAL '7 days'
      `;

      const result = await db.result(query);

      if (result.rowCount > 0) {
        logger.info(`Deleted ${result.rowCount} old quality metrics`);
      }
    } catch (error) {
      logger.error('Failed to cleanup old quality metrics:', error);
    }
  }

  /**
   * Clean up calls that exceeded max duration
   */
  async cleanupLongRunningCalls(): Promise<void> {
    try {
      const maxDuration = config.calls.maxDuration;

      const query = `
        UPDATE calls
        SET state = $1,
            ended_at = NOW(),
            end_reason = $2
        WHERE state IN ($3, $4)
          AND started_at IS NOT NULL
          AND started_at < NOW() - INTERVAL '${maxDuration} seconds'
          AND ended_at IS NULL
        RETURNING id, room_id
      `;

      const longCalls = await db.manyOrNone(query, [
        CallState.ENDED,
        CallEndReason.TIMEOUT,
        CallState.CONNECTED,
        CallState.RECONNECTING,
      ]);

      if (longCalls.length > 0) {
        logger.info(`Ended ${longCalls.length} long-running calls`);

        // Delete associated LiveKit rooms
        for (const call of longCalls) {
          try {
            await livekitService.deleteRoom(call.room_id);
          } catch (error) {
            logger.error('Failed to delete LiveKit room:', {
              roomId: call.room_id,
              error,
            });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup long-running calls:', error);
    }
  }

  /**
   * Update participants who left but weren't marked
   */
  async updateMissingParticipants(): Promise<void> {
    try {
      const query = `
        UPDATE call_participants cp
        SET left_at = c.ended_at
        FROM calls c
        WHERE cp.call_id = c.id
          AND c.state = $1
          AND c.ended_at IS NOT NULL
          AND cp.left_at IS NULL
      `;

      const result = await db.result(query, [CallState.ENDED]);

      if (result.rowCount > 0) {
        logger.info(`Updated ${result.rowCount} participant left times`);
      }
    } catch (error) {
      logger.error('Failed to update missing participants:', error);
    }
  }
}

export const cleanupWorker = new CleanupWorker();

// Run cleanup every minute if this file is executed directly
if (require.main === module) {
  logger.info('Starting cleanup worker in standalone mode...');

  setInterval(async () => {
    await cleanupWorker.run();
  }, 60000); // Every minute

  // Run immediately on start
  cleanupWorker.run();
}
