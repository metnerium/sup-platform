import admin from 'firebase-admin';
import { config } from '../config';
import logger from '../utils/logger';

class FCMService {
  private initialized = false;

  initialize(): void {
    if (this.initialized) {
      return;
    }

    try {
      if (!config.firebase.projectId || !config.firebase.clientEmail || !config.firebase.privateKey) {
        logger.warn('Firebase credentials not configured, push notifications will be disabled');
        return;
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          clientEmail: config.firebase.clientEmail,
          privateKey: config.firebase.privateKey,
        }),
      });

      this.initialized = true;
      logger.info('Firebase Admin initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin', { error });
      throw error;
    }
  }

  async sendNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<string> {
    if (!this.initialized) {
      throw new Error('FCM Service not initialized');
    }

    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const messageId = await admin.messaging().send(message);
      logger.info('Push notification sent successfully', { messageId, token });
      return messageId;
    } catch (error) {
      logger.error('Failed to send push notification', { error, token });
      throw error;
    }
  }

  async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<admin.messaging.BatchResponse> {
    if (!this.initialized) {
      throw new Error('FCM Service not initialized');
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendMulticast(message);
      logger.info('Multicast notification sent', {
        successCount: response.successCount,
        failureCount: response.failureCount,
      });
      return response;
    } catch (error) {
      logger.error('Failed to send multicast notification', { error });
      throw error;
    }
  }

  async subscribeTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('FCM Service not initialized');
    }

    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      logger.info('Subscribed to topic', { topic, successCount: response.successCount });
    } catch (error) {
      logger.error('Failed to subscribe to topic', { error, topic });
      throw error;
    }
  }

  async unsubscribeTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('FCM Service not initialized');
    }

    try {
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      logger.info('Unsubscribed from topic', { topic, successCount: response.successCount });
    } catch (error) {
      logger.error('Failed to unsubscribe from topic', { error, topic });
      throw error;
    }
  }
}

export const fcmService = new FCMService();
export default fcmService;
