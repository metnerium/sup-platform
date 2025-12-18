import cron from 'node-cron';
import {
  addExpiredStoriesCleanupJob,
  addExpiredSessionsCleanupJob,
  addOldMessagesCleanupJob,
  addTempFilesCleanupJob,
  addPrekeyRotationJob,
  addOrphanedMediaCleanupJob,
} from '../queues/cleanup.queue';
import database from '../utils/database';
import logger from '../utils/logger';

class ScheduledJobs {
  private jobs: cron.ScheduledTask[] = [];

  start(): void {
    logger.info('Starting scheduled jobs');

    // Cleanup expired stories every hour
    const storiesJob = cron.schedule('0 * * * *', async () => {
      logger.info('Running scheduled job: cleanup expired stories');
      try {
        await addExpiredStoriesCleanupJob();
      } catch (error) {
        logger.error('Failed to schedule stories cleanup', { error });
      }
    });

    // Cleanup expired sessions daily at midnight
    const sessionsJob = cron.schedule('0 0 * * *', async () => {
      logger.info('Running scheduled job: cleanup expired sessions');
      try {
        await addExpiredSessionsCleanupJob();
      } catch (error) {
        logger.error('Failed to schedule sessions cleanup', { error });
      }
    });

    // Cleanup old messages daily at 1am
    const messagesJob = cron.schedule('0 1 * * *', async () => {
      logger.info('Running scheduled job: cleanup old messages');
      try {
        await addOldMessagesCleanupJob();
      } catch (error) {
        logger.error('Failed to schedule messages cleanup', { error });
      }
    });

    // Cleanup temporary files daily at 2am
    const tempFilesJob = cron.schedule('0 2 * * *', async () => {
      logger.info('Running scheduled job: cleanup temporary files');
      try {
        await addTempFilesCleanupJob();
      } catch (error) {
        logger.error('Failed to schedule temp files cleanup', { error });
      }
    });

    // Database maintenance daily at 3am
    const dbMaintenanceJob = cron.schedule('0 3 * * *', async () => {
      logger.info('Running scheduled job: database maintenance');
      try {
        await performDatabaseMaintenance();
      } catch (error) {
        logger.error('Failed to perform database maintenance', { error });
      }
    });

    // Update user statistics every 6 hours
    const statsJob = cron.schedule('0 */6 * * *', async () => {
      logger.info('Running scheduled job: update user statistics');
      try {
        await updateUserStatistics();
      } catch (error) {
        logger.error('Failed to update user statistics', { error });
      }
    });

    // Clean up stale websocket connections every 15 minutes
    const wsCleanupJob = cron.schedule('*/15 * * * *', async () => {
      logger.info('Running scheduled job: cleanup stale websocket connections');
      try {
        await cleanupStaleConnections();
      } catch (error) {
        logger.error('Failed to cleanup stale connections', { error });
      }
    });

    // Health check job - every 5 minutes
    const healthCheckJob = cron.schedule('*/5 * * * *', async () => {
      logger.debug('Running scheduled job: health check');
      try {
        await performHealthCheck();
      } catch (error) {
        logger.error('Health check failed', { error });
      }
    });

    // Prekey rotation - daily at 4am
    const prekeyRotationJob = cron.schedule('0 4 * * *', async () => {
      logger.info('Running scheduled job: prekey rotation');
      try {
        await addPrekeyRotationJob();
      } catch (error) {
        logger.error('Failed to schedule prekey rotation', { error });
      }
    });

    // Orphaned media cleanup - weekly on Sundays at 5am
    const orphanedMediaJob = cron.schedule('0 5 * * 0', async () => {
      logger.info('Running scheduled job: orphaned media cleanup');
      try {
        await addOrphanedMediaCleanupJob();
      } catch (error) {
        logger.error('Failed to schedule orphaned media cleanup', { error });
      }
    });

    this.jobs = [
      storiesJob,
      sessionsJob,
      messagesJob,
      tempFilesJob,
      dbMaintenanceJob,
      statsJob,
      wsCleanupJob,
      healthCheckJob,
      prekeyRotationJob,
      orphanedMediaJob,
    ];

    logger.info(`Started ${this.jobs.length} scheduled jobs`);
  }

  stop(): void {
    logger.info('Stopping scheduled jobs');

    for (const job of this.jobs) {
      job.stop();
    }

    this.jobs = [];
    logger.info('All scheduled jobs stopped');
  }
}

async function performDatabaseMaintenance(): Promise<void> {
  try {
    logger.info('Starting database maintenance');

    // Vacuum analyze to reclaim space and update statistics
    await database.query('VACUUM ANALYZE');

    // Reindex tables for better performance
    await database.query('REINDEX TABLE messages');
    await database.query('REINDEX TABLE users');
    await database.query('REINDEX TABLE chats');

    // Clean up orphaned records
    await database.query(`
      DELETE FROM message_reactions
      WHERE message_id NOT IN (SELECT id FROM messages)
    `);

    await database.query(`
      DELETE FROM chat_members
      WHERE chat_id NOT IN (SELECT id FROM chats)
    `);

    await database.query(`
      DELETE FROM user_blocks
      WHERE blocker_id NOT IN (SELECT id FROM users)
         OR blocked_id NOT IN (SELECT id FROM users)
    `);

    logger.info('Database maintenance completed successfully');
  } catch (error) {
    logger.error('Database maintenance failed', { error });
    throw error;
  }
}

async function updateUserStatistics(): Promise<void> {
  try {
    logger.info('Updating user statistics');

    // Update message counts
    await database.query(`
      UPDATE users u
      SET messages_count = (
        SELECT COUNT(*)
        FROM messages m
        WHERE m.sender_id = u.id
          AND m.deleted_at IS NULL
      ),
      updated_at = NOW()
    `);

    // Update chat counts
    await database.query(`
      UPDATE users u
      SET chats_count = (
        SELECT COUNT(*)
        FROM chat_members cm
        WHERE cm.user_id = u.id
          AND cm.deleted_at IS NULL
      ),
      updated_at = NOW()
    `);

    // Update last active timestamps based on user sessions
    await database.query(`
      UPDATE users u
      SET last_seen_at = (
        SELECT MAX(last_active_at)
        FROM user_sessions s
        WHERE s.user_id = u.id
      ),
      updated_at = NOW()
      WHERE EXISTS (
        SELECT 1
        FROM user_sessions s
        WHERE s.user_id = u.id
      )
    `);

    logger.info('User statistics updated successfully');
  } catch (error) {
    logger.error('Failed to update user statistics', { error });
    throw error;
  }
}

async function cleanupStaleConnections(): Promise<void> {
  try {
    logger.info('Cleaning up stale websocket connections');

    // Mark sessions as inactive if no heartbeat for 5 minutes
    const staleTime = new Date();
    staleTime.setMinutes(staleTime.getMinutes() - 5);

    const result = await database.query(
      `UPDATE user_sessions
       SET is_active = false,
           updated_at = NOW()
       WHERE last_active_at < $1
         AND is_active = true
       RETURNING id`,
      [staleTime]
    );

    const updatedCount = result.rowCount || 0;

    if (updatedCount > 0) {
      logger.info('Marked stale connections as inactive', { count: updatedCount });
    }
  } catch (error) {
    logger.error('Failed to cleanup stale connections', { error });
    throw error;
  }
}

async function performHealthCheck(): Promise<void> {
  try {
    // Check database connection
    await database.query('SELECT 1');

    // Log queue statistics
    logger.debug('Health check passed');
  } catch (error) {
    logger.error('Health check failed', { error });
    throw error;
  }
}

export const scheduledJobs = new ScheduledJobs();
export default scheduledJobs;
