import Queue from 'bull';
import { createQueue, CleanupJob } from './index';
import logger from '../utils/logger';

export const cleanupQueue: Queue.Queue<CleanupJob> = createQueue<CleanupJob>('cleanup');

export async function addCleanupJob(job: CleanupJob, delay?: number): Promise<Queue.Job<CleanupJob>> {
  try {
    const queueJob = await cleanupQueue.add(job, {
      priority: 1,
      timeout: 120000, // 2 minutes timeout
      delay,
    });

    logger.info('Cleanup job added to queue', {
      jobId: queueJob.id,
      type: job.type,
      delay,
    });

    return queueJob;
  } catch (error) {
    logger.error('Failed to add cleanup job', { error, job });
    throw error;
  }
}

export async function addExpiredStoriesCleanupJob(): Promise<Queue.Job<CleanupJob>> {
  return addCleanupJob({
    type: 'stories',
  });
}

export async function addExpiredSessionsCleanupJob(): Promise<Queue.Job<CleanupJob>> {
  return addCleanupJob({
    type: 'sessions',
  });
}

export async function addOldMessagesCleanupJob(): Promise<Queue.Job<CleanupJob>> {
  return addCleanupJob({
    type: 'messages',
  });
}

export async function addTempFilesCleanupJob(): Promise<Queue.Job<CleanupJob>> {
  return addCleanupJob({
    type: 'temp_files',
  });
}

export async function addPrekeyRotationJob(): Promise<Queue.Job<CleanupJob>> {
  return addCleanupJob({
    type: 'prekeys',
  });
}

export async function addOrphanedMediaCleanupJob(): Promise<Queue.Job<CleanupJob>> {
  return addCleanupJob({
    type: 'orphaned_media',
  });
}

export async function getCleanupJobStatus(jobId: string): Promise<any> {
  try {
    const job = await cleanupQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
    };
  } catch (error) {
    logger.error('Failed to get cleanup job status', { error, jobId });
    throw error;
  }
}

export async function getCleanupQueueStats(): Promise<any> {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      cleanupQueue.getWaitingCount(),
      cleanupQueue.getActiveCount(),
      cleanupQueue.getCompletedCount(),
      cleanupQueue.getFailedCount(),
      cleanupQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  } catch (error) {
    logger.error('Failed to get cleanup queue stats', { error });
    throw error;
  }
}

export default cleanupQueue;
