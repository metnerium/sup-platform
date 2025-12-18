import Queue from 'bull';
import Redis from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';

export interface MediaJob {
  type: 'image' | 'video' | 'audio';
  s3Key: string;
  userId: string;
  messageId: string;
  originalName?: string;
  metadata?: Record<string, any>;
}

export interface NotificationJob {
  type: 'push' | 'email' | 'sms';
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  email?: string;
  fcmToken?: string;
  phoneNumber?: string;
}

export interface CleanupJob {
  type: 'stories' | 'sessions' | 'messages' | 'temp_files' | 'prekeys' | 'orphaned_media';
  data?: Record<string, any>;
}

const redisClient = new Redis(config.redis);

const defaultJobOptions = {
  attempts: config.jobs.attempts,
  backoff: {
    type: 'exponential',
    delay: config.jobs.backoffDelay,
  },
  removeOnComplete: 100,
  removeOnFail: 200,
};

export function createQueue<T = any>(name: string): Queue.Queue<T> {
  const queue = new Queue<T>(name, {
    redis: config.redis,
    defaultJobOptions,
  });

  queue.on('error', (error) => {
    logger.error(`Queue ${name} error`, { error: error.message });
  });

  queue.on('failed', (job, err) => {
    logger.error(`Job ${job.id} in queue ${name} failed`, {
      jobId: job.id,
      error: err.message,
      data: job.data,
    });
  });

  queue.on('completed', (job) => {
    logger.info(`Job ${job.id} in queue ${name} completed`, {
      jobId: job.id,
      duration: Date.now() - job.timestamp,
    });
  });

  queue.on('stalled', (job) => {
    logger.warn(`Job ${job.id} in queue ${name} stalled`, {
      jobId: job.id,
    });
  });

  return queue;
}

export async function closeAllQueues(...queues: Queue.Queue[]): Promise<void> {
  try {
    await Promise.all(queues.map((queue) => queue.close()));
    await redisClient.quit();
    logger.info('All queues closed successfully');
  } catch (error) {
    logger.error('Error closing queues', { error });
    throw error;
  }
}
