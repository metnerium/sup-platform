import Queue from 'bull';
import { createQueue, NotificationJob } from './index';
import logger from '../utils/logger';

export const notificationQueue: Queue.Queue<NotificationJob> = createQueue<NotificationJob>('notification');

export async function addNotificationJob(job: NotificationJob): Promise<Queue.Job<NotificationJob>> {
  try {
    const queueJob = await notificationQueue.add(job, {
      priority: job.type === 'push' ? 3 : 1, // Push notifications have higher priority
      timeout: 30000, // 30 seconds timeout
    });

    logger.info('Notification job added to queue', {
      jobId: queueJob.id,
      type: job.type,
      userId: job.userId,
    });

    return queueJob;
  } catch (error) {
    logger.error('Failed to add notification job', { error, job });
    throw error;
  }
}

export async function addPushNotificationJob(
  userId: string,
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<Queue.Job<NotificationJob>> {
  return addNotificationJob({
    type: 'push',
    userId,
    fcmToken,
    title,
    body,
    data,
  });
}

export async function addEmailNotificationJob(
  userId: string,
  email: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<Queue.Job<NotificationJob>> {
  return addNotificationJob({
    type: 'email',
    userId,
    email,
    title,
    body,
    data,
  });
}

export async function addMessageNotification(
  userId: string,
  fcmToken: string,
  senderName: string,
  messageText: string,
  chatId: string
): Promise<Queue.Job<NotificationJob>> {
  return addPushNotificationJob(
    userId,
    fcmToken,
    `New message from ${senderName}`,
    messageText,
    {
      type: 'message',
      chatId,
    }
  );
}

export async function addCallNotification(
  userId: string,
  fcmToken: string,
  callerName: string,
  callType: 'voice' | 'video',
  callId: string
): Promise<Queue.Job<NotificationJob>> {
  return addPushNotificationJob(
    userId,
    fcmToken,
    `Incoming ${callType} call`,
    `${callerName} is calling you`,
    {
      type: 'call',
      callType,
      callId,
    }
  );
}

export async function addSMSNotificationJob(
  userId: string,
  phoneNumber: string,
  title: string,
  body: string
): Promise<Queue.Job<NotificationJob>> {
  return addNotificationJob({
    type: 'sms',
    userId,
    phoneNumber,
    title,
    body,
  });
}

export async function addOTPSMSJob(
  userId: string,
  phoneNumber: string,
  code: string
): Promise<Queue.Job<NotificationJob>> {
  return addSMSNotificationJob(
    userId,
    phoneNumber,
    'OTP Verification',
    `Your SUP Messenger verification code is: ${code}`
  );
}

export async function add2FASMSJob(
  userId: string,
  phoneNumber: string,
  code: string
): Promise<Queue.Job<NotificationJob>> {
  return addSMSNotificationJob(
    userId,
    phoneNumber,
    '2FA Code',
    `Your 2FA code is: ${code}. Do not share this code.`
  );
}

export async function getNotificationJobStatus(jobId: string): Promise<any> {
  try {
    const job = await notificationQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();

    return {
      id: job.id,
      state,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
    };
  } catch (error) {
    logger.error('Failed to get notification job status', { error, jobId });
    throw error;
  }
}

export async function getNotificationQueueStats(): Promise<any> {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      notificationQueue.getWaitingCount(),
      notificationQueue.getActiveCount(),
      notificationQueue.getCompletedCount(),
      notificationQueue.getFailedCount(),
      notificationQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  } catch (error) {
    logger.error('Failed to get notification queue stats', { error });
    throw error;
  }
}

export default notificationQueue;
