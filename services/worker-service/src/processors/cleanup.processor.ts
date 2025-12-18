import Queue from 'bull';
import { CleanupJob } from '../queues';
import database from '../utils/database';
import s3Service from '../services/s3.service';
import logger from '../utils/logger';
import { config } from '../config';
import { metricsCollector } from '../monitoring/metrics';

interface CleanupResult {
  type: string;
  itemsDeleted: number;
  errors?: number;
}

export async function processCleanupJob(job: Queue.Job<CleanupJob>): Promise<CleanupResult> {
  const { type } = job.data;
  const startTime = Date.now();

  logger.info('Processing cleanup job', {
    jobId: job.id,
    type,
  });

  try {
    let result: CleanupResult;

    switch (type) {
      case 'stories':
        result = await cleanupExpiredStories(job);
        break;
      case 'sessions':
        result = await cleanupExpiredSessions(job);
        break;
      case 'messages':
        result = await cleanupOldMessages(job);
        break;
      case 'temp_files':
        result = await cleanupTempFiles(job);
        break;
      case 'prekeys':
        result = await cleanupOldPrekeys(job);
        break;
      case 'orphaned_media':
        result = await cleanupOrphanedMedia(job);
        break;
      default:
        throw new Error(`Unsupported cleanup type: ${type}`);
    }

    // Record metrics
    const duration = Date.now() - startTime;
    metricsCollector.recordJobDuration('cleanup', duration);
    metricsCollector.recordJobSuccess('cleanup');

    logger.info('Cleanup job completed', {
      jobId: job.id,
      duration,
      result,
    });

    return result;
  } catch (error) {
    metricsCollector.recordJobFailure('cleanup');
    logger.error('Cleanup job failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : error,
      data: job.data,
    });
    throw error;
  }
}

async function cleanupExpiredStories(job: Queue.Job<CleanupJob>): Promise<CleanupResult> {
  try {
    job.progress(10);

    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() - config.cleanup.storyExpirationHours);

    // Get expired stories with media URLs
    const result = await database.query(
      `SELECT id, media_url, thumbnail_url
       FROM stories
       WHERE created_at < $1
         AND deleted_at IS NULL`,
      [expirationTime]
    );

    const stories = result.rows;
    const totalStories = stories.length;

    logger.info('Found expired stories', { count: totalStories });

    job.progress(30);

    if (totalStories === 0) {
      return {
        type: 'stories',
        itemsDeleted: 0,
      };
    }

    let errors = 0;

    // Delete media files from S3
    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];

      try {
        if (story.media_url) {
          const key = extractS3Key(story.media_url);
          await s3Service.deleteFile(key);
        }

        if (story.thumbnail_url) {
          const key = extractS3Key(story.thumbnail_url);
          await s3Service.deleteFile(key);
        }
      } catch (error) {
        logger.error('Failed to delete story media from S3', { error, storyId: story.id });
        errors++;
      }

      job.progress(30 + Math.floor((i / totalStories) * 50));
    }

    job.progress(80);

    // Soft delete stories in database
    await database.query(
      `UPDATE stories
       SET deleted_at = NOW()
       WHERE created_at < $1
         AND deleted_at IS NULL`,
      [expirationTime]
    );

    job.progress(100);

    return {
      type: 'stories',
      itemsDeleted: totalStories,
      errors: errors > 0 ? errors : undefined,
    };
  } catch (error) {
    logger.error('Failed to cleanup expired stories', { error });
    throw error;
  }
}

async function cleanupExpiredSessions(job: Queue.Job<CleanupJob>): Promise<CleanupResult> {
  try {
    job.progress(20);

    const expirationTime = new Date();
    expirationTime.setDate(expirationTime.getDate() - config.cleanup.sessionExpirationDays);

    // Delete expired sessions
    const result = await database.query(
      `DELETE FROM user_sessions
       WHERE last_active_at < $1
       RETURNING id`,
      [expirationTime]
    );

    const deletedCount = result.rowCount || 0;

    logger.info('Deleted expired sessions', { count: deletedCount });

    job.progress(100);

    return {
      type: 'sessions',
      itemsDeleted: deletedCount,
    };
  } catch (error) {
    logger.error('Failed to cleanup expired sessions', { error });
    throw error;
  }
}

async function cleanupOldMessages(job: Queue.Job<CleanupJob>): Promise<CleanupResult> {
  try {
    job.progress(10);

    const expirationTime = new Date();
    expirationTime.setDate(expirationTime.getDate() - config.cleanup.oldMessageDays);

    // Get old messages with media URLs
    const result = await database.query(
      `SELECT id, media_url, thumbnail_url
       FROM messages
       WHERE created_at < $1
         AND deleted_at IS NULL
         AND (media_url IS NOT NULL OR thumbnail_url IS NOT NULL)
       LIMIT 1000`, // Process in batches
      [expirationTime]
    );

    const messages = result.rows;
    const totalMessages = messages.length;

    logger.info('Found old messages to cleanup', { count: totalMessages });

    job.progress(30);

    if (totalMessages === 0) {
      return {
        type: 'messages',
        itemsDeleted: 0,
      };
    }

    let errors = 0;

    // Delete media files from S3
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      try {
        if (message.media_url) {
          const key = extractS3Key(message.media_url);
          await s3Service.deleteFile(key);
        }

        if (message.thumbnail_url) {
          const key = extractS3Key(message.thumbnail_url);
          await s3Service.deleteFile(key);
        }
      } catch (error) {
        logger.error('Failed to delete message media from S3', { error, messageId: message.id });
        errors++;
      }

      job.progress(30 + Math.floor((i / totalMessages) * 50));
    }

    job.progress(80);

    // Clear media URLs in database (soft delete media)
    await database.query(
      `UPDATE messages
       SET media_url = NULL,
           thumbnail_url = NULL,
           updated_at = NOW()
       WHERE created_at < $1
         AND deleted_at IS NULL
         AND (media_url IS NOT NULL OR thumbnail_url IS NOT NULL)`,
      [expirationTime]
    );

    job.progress(100);

    return {
      type: 'messages',
      itemsDeleted: totalMessages,
      errors: errors > 0 ? errors : undefined,
    };
  } catch (error) {
    logger.error('Failed to cleanup old messages', { error });
    throw error;
  }
}

async function cleanupTempFiles(job: Queue.Job<CleanupJob>): Promise<CleanupResult> {
  try {
    job.progress(20);

    // Get temporary files older than 24 hours
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() - 24);

    const result = await database.query(
      `SELECT id, file_path
       FROM temporary_files
       WHERE created_at < $1
       LIMIT 1000`, // Process in batches
      [expirationTime]
    );

    const files = result.rows;
    const totalFiles = files.length;

    logger.info('Found temporary files to cleanup', { count: totalFiles });

    job.progress(40);

    if (totalFiles === 0) {
      return {
        type: 'temp_files',
        itemsDeleted: 0,
      };
    }

    let errors = 0;

    // Delete files from S3
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const key = extractS3Key(file.file_path);
        await s3Service.deleteFile(key);
      } catch (error) {
        logger.error('Failed to delete temp file from S3', { error, fileId: file.id });
        errors++;
      }

      job.progress(40 + Math.floor((i / totalFiles) * 40));
    }

    job.progress(80);

    // Delete records from database
    await database.query(
      `DELETE FROM temporary_files
       WHERE created_at < $1`,
      [expirationTime]
    );

    job.progress(100);

    return {
      type: 'temp_files',
      itemsDeleted: totalFiles,
      errors: errors > 0 ? errors : undefined,
    };
  } catch (error) {
    logger.error('Failed to cleanup temporary files', { error });
    throw error;
  }
}

async function cleanupOldPrekeys(job: Queue.Job<CleanupJob>): Promise<CleanupResult> {
  try {
    job.progress(20);

    // Delete used prekeys older than 30 days
    const expirationTime = new Date();
    expirationTime.setDate(expirationTime.getDate() - 30);

    const result = await database.query(
      `DELETE FROM user_prekeys
       WHERE used_at IS NOT NULL
         AND used_at < $1
       RETURNING id`,
      [expirationTime]
    );

    const deletedCount = result.rowCount || 0;

    logger.info('Deleted old prekeys', { count: deletedCount });

    job.progress(60);

    // Generate new prekeys for users with low count
    const lowPrekeyUsers = await database.query(
      `SELECT user_id, COUNT(*) as prekey_count
       FROM user_prekeys
       WHERE used_at IS NULL
       GROUP BY user_id
       HAVING COUNT(*) < 10`
    );

    let prekeyRegenCount = 0;

    for (const user of lowPrekeyUsers.rows) {
      try {
        // Generate 100 new prekeys for this user
        const prekeyCount = 100;
        const values: string[] = [];

        for (let i = 0; i < prekeyCount; i++) {
          const prekeyId = Math.floor(Math.random() * 0xffffff);
          // In production, generate actual prekey using Signal Protocol
          const prekeyData = `prekey_${prekeyId}_${Date.now()}`;

          values.push(`('${user.user_id}', ${prekeyId}, '${prekeyData}')`);
        }

        await database.query(
          `INSERT INTO user_prekeys (user_id, prekey_id, public_key)
           VALUES ${values.join(', ')}
           ON CONFLICT (user_id, prekey_id) DO NOTHING`
        );

        prekeyRegenCount++;
      } catch (error) {
        logger.error('Failed to regenerate prekeys for user', {
          error,
          userId: user.user_id,
        });
      }

      job.progress(60 + Math.floor((prekeyRegenCount / lowPrekeyUsers.rowCount) * 30));
    }

    job.progress(100);

    logger.info('Prekey rotation completed', {
      deletedOld: deletedCount,
      regeneratedUsers: prekeyRegenCount,
    });

    return {
      type: 'prekeys',
      itemsDeleted: deletedCount,
    };
  } catch (error) {
    logger.error('Failed to cleanup old prekeys', { error });
    throw error;
  }
}

async function cleanupOrphanedMedia(job: Queue.Job<CleanupJob>): Promise<CleanupResult> {
  try {
    job.progress(10);

    // Find media files in database that don't have corresponding messages or stories
    const orphanedResult = await database.query(
      `SELECT DISTINCT m.media_url, m.thumbnail_url
       FROM (
         SELECT media_url, thumbnail_url FROM messages WHERE media_url IS NOT NULL
         UNION ALL
         SELECT media_url, thumbnail_url FROM stories WHERE media_url IS NOT NULL
       ) m
       LEFT JOIN messages msg ON msg.media_url = m.media_url OR msg.thumbnail_url = m.thumbnail_url
       LEFT JOIN stories st ON st.media_url = m.media_url OR st.thumbnail_url = m.thumbnail_url
       WHERE msg.id IS NULL AND st.id IS NULL
       LIMIT 1000`
    );

    const orphanedFiles = orphanedResult.rows;
    const totalFiles = orphanedFiles.length;

    logger.info('Found orphaned media files', { count: totalFiles });

    job.progress(30);

    if (totalFiles === 0) {
      return {
        type: 'orphaned_media',
        itemsDeleted: 0,
      };
    }

    let errors = 0;
    let deletedCount = 0;

    // Delete orphaned files from S3
    for (let i = 0; i < orphanedFiles.length; i++) {
      const file = orphanedFiles[i];

      try {
        if (file.media_url) {
          const key = extractS3Key(file.media_url);
          await s3Service.deleteFile(key);
          deletedCount++;
        }

        if (file.thumbnail_url) {
          const key = extractS3Key(file.thumbnail_url);
          await s3Service.deleteFile(key);
          deletedCount++;
        }
      } catch (error) {
        logger.error('Failed to delete orphaned media from S3', { error, file });
        errors++;
      }

      job.progress(30 + Math.floor((i / totalFiles) * 60));
    }

    job.progress(100);

    logger.info('Orphaned media cleanup completed', {
      filesDeleted: deletedCount,
      errors,
    });

    return {
      type: 'orphaned_media',
      itemsDeleted: deletedCount,
      errors: errors > 0 ? errors : undefined,
    };
  } catch (error) {
    logger.error('Failed to cleanup orphaned media', { error });
    throw error;
  }
}

function extractS3Key(url: string): string {
  try {
    // Extract S3 key from URL
    // Supports both path-style and virtual-hosted-style URLs
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');

    // For virtual-hosted-style: https://bucket.s3.region.amazonaws.com/key
    // For path-style: https://s3.region.amazonaws.com/bucket/key
    if (urlObj.hostname.includes('s3')) {
      if (urlObj.hostname.startsWith(config.aws.s3Bucket)) {
        // Virtual-hosted-style
        return pathParts.slice(1).join('/');
      } else {
        // Path-style
        return pathParts.slice(2).join('/');
      }
    }

    // If not S3 URL, assume the full path is the key
    return pathParts.slice(1).join('/');
  } catch (error) {
    logger.error('Failed to extract S3 key from URL', { error, url });
    throw error;
  }
}

export default processCleanupJob;
