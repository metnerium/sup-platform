import Queue from 'bull';
import { createQueue, MediaJob } from './index';
import logger from '../utils/logger';

export const mediaQueue: Queue.Queue<MediaJob> = createQueue<MediaJob>('media');

export async function addMediaJob(job: MediaJob): Promise<Queue.Job<MediaJob>> {
  try {
    const queueJob = await mediaQueue.add(job, {
      priority: job.type === 'image' ? 2 : 1, // Images have higher priority
      timeout: job.type === 'video' ? 300000 : 60000, // 5 min for video, 1 min for others
    });

    logger.info('Media job added to queue', {
      jobId: queueJob.id,
      type: job.type,
      userId: job.userId,
    });

    return queueJob;
  } catch (error) {
    logger.error('Failed to add media job', { error, job });
    throw error;
  }
}

export async function addImageProcessingJob(
  s3Key: string,
  userId: string,
  messageId: string,
  originalName?: string
): Promise<Queue.Job<MediaJob>> {
  return addMediaJob({
    type: 'image',
    s3Key,
    userId,
    messageId,
    originalName,
  });
}

export async function addVideoProcessingJob(
  s3Key: string,
  userId: string,
  messageId: string,
  originalName?: string
): Promise<Queue.Job<MediaJob>> {
  return addMediaJob({
    type: 'video',
    s3Key,
    userId,
    messageId,
    originalName,
  });
}

export async function addAudioProcessingJob(
  s3Key: string,
  userId: string,
  messageId: string,
  originalName?: string
): Promise<Queue.Job<MediaJob>> {
  return addMediaJob({
    type: 'audio',
    s3Key,
    userId,
    messageId,
    originalName,
  });
}

export async function getMediaJobStatus(jobId: string): Promise<any> {
  try {
    const job = await mediaQueue.getJob(jobId);
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
    logger.error('Failed to get media job status', { error, jobId });
    throw error;
  }
}

export async function getMediaQueueStats(): Promise<any> {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      mediaQueue.getWaitingCount(),
      mediaQueue.getActiveCount(),
      mediaQueue.getCompletedCount(),
      mediaQueue.getFailedCount(),
      mediaQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  } catch (error) {
    logger.error('Failed to get media queue stats', { error });
    throw error;
  }
}

export default mediaQueue;
