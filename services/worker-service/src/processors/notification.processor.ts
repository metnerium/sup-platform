import Queue from 'bull';
import { NotificationJob } from '../queues';
import fcmService from '../services/fcm.service';
import emailService from '../services/email.service';
import smsService from '../services/sms.service';
import database from '../utils/database';
import logger from '../utils/logger';
import { metricsCollector } from '../monitoring/metrics';

interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function processNotificationJob(job: Queue.Job<NotificationJob>): Promise<NotificationResult> {
  const { type, userId, title, body } = job.data;
  const startTime = Date.now();

  logger.info('Processing notification job', {
    jobId: job.id,
    type,
    userId,
    title,
  });

  try {
    let result: NotificationResult;

    switch (type) {
      case 'push':
        result = await sendPushNotification(job);
        break;
      case 'email':
        result = await sendEmailNotification(job);
        break;
      case 'sms':
        result = await sendSMSNotification(job);
        break;
      default:
        throw new Error(`Unsupported notification type: ${type}`);
    }

    // Store notification in database
    await storeNotification(userId, type, title, body, result.success);

    // Record metrics
    const duration = Date.now() - startTime;
    metricsCollector.recordJobDuration('notification', duration);
    metricsCollector.recordJobSuccess('notification');

    logger.info('Notification sent successfully', {
      jobId: job.id,
      type,
      userId,
      duration,
      result,
    });

    return result;
  } catch (error) {
    metricsCollector.recordJobFailure('notification');
    logger.error('Notification sending failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : error,
      data: job.data,
    });
    throw error;
  }
}

async function sendPushNotification(job: Queue.Job<NotificationJob>): Promise<NotificationResult> {
  const { userId, fcmToken, title, body, data } = job.data;

  if (!fcmToken) {
    throw new Error('FCM token is required for push notifications');
  }

  try {
    job.progress(30);

    // Convert data object values to strings (FCM requirement)
    const stringData: Record<string, string> = {};
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        stringData[key] = String(value);
      }
    }

    const messageId = await fcmService.sendNotification(fcmToken, title, body, stringData);

    job.progress(100);

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    logger.error('Push notification failed', { error, userId, fcmToken });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function sendEmailNotification(job: Queue.Job<NotificationJob>): Promise<NotificationResult> {
  const { userId, email, title, body, data } = job.data;

  if (!email) {
    throw new Error('Email address is required for email notifications');
  }

  try {
    job.progress(30);

    let htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SUP Messenger</h1>
            </div>
            <div class="content">
              <h2>${title}</h2>
              <p>${body}</p>
    `;

    // Add custom data if provided
    if (data) {
      htmlBody += '<hr><h3>Details:</h3><ul>';
      for (const [key, value] of Object.entries(data)) {
        htmlBody += `<li><strong>${key}:</strong> ${value}</li>`;
      }
      htmlBody += '</ul>';
    }

    htmlBody += `
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} SUP Messenger. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await emailService.sendEmail({
      to: email,
      subject: title,
      text: body,
      html: htmlBody,
    });

    job.progress(100);

    return {
      success: true,
    };
  } catch (error) {
    logger.error('Email notification failed', { error, userId, email });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function sendSMSNotification(job: Queue.Job<NotificationJob>): Promise<NotificationResult> {
  const { userId, phoneNumber, body } = job.data;

  if (!phoneNumber) {
    throw new Error('Phone number is required for SMS notifications');
  }

  try {
    job.progress(30);

    const messageId = await smsService.sendSMS({
      to: phoneNumber,
      message: body,
    });

    job.progress(100);

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    logger.error('SMS notification failed', { error, userId, phoneNumber });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function storeNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  success: boolean
): Promise<void> {
  try {
    await database.query(
      `INSERT INTO notifications (user_id, type, title, body, success, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, type, title, body, success]
    );
  } catch (error) {
    // Don't throw error, just log it - notification storage failure shouldn't fail the job
    logger.error('Failed to store notification', { error, userId, type });
  }
}

// Batch notification processor for multiple users
export async function sendBatchNotifications(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failureCount: number }> {
  try {
    // Get FCM tokens for all users
    const result = await database.query(
      `SELECT user_id, fcm_token
       FROM user_devices
       WHERE user_id = ANY($1)
         AND fcm_token IS NOT NULL
         AND is_active = true`,
      [userIds]
    );

    const tokens = result.rows.map((row: any) => row.fcm_token);

    if (tokens.length === 0) {
      logger.warn('No active FCM tokens found for batch notification', { userIds });
      return { successCount: 0, failureCount: 0 };
    }

    // Convert data to strings
    const stringData: Record<string, string> = {};
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        stringData[key] = String(value);
      }
    }

    // Send multicast notification
    const response = await fcmService.sendMulticast(tokens, title, body, stringData);

    // Store notifications for all users
    await Promise.all(
      userIds.map((userId) => storeNotification(userId, 'push', title, body, true))
    );

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    logger.error('Batch notification failed', { error, userIds });
    throw error;
  }
}

export default processNotificationJob;
