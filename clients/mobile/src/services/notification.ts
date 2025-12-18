import notifee, {AndroidImportance, EventType} from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import {NOTIFICATION_CHANNELS, STORAGE_KEYS} from '@/constants/config';
import storageUtils from '@/utils/storage';
import {Message, Call} from '@/types';

class NotificationServiceClass {
  async initialize() {
    await this.createChannels();
    await this.setupMessageHandlers();
    await this.requestPermission();
    await this.getFCMToken();
  }

  private async createChannels() {
    await notifee.createChannel({
      id: NOTIFICATION_CHANNELS.MESSAGES.id,
      name: NOTIFICATION_CHANNELS.MESSAGES.name,
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    await notifee.createChannel({
      id: NOTIFICATION_CHANNELS.CALLS.id,
      name: NOTIFICATION_CHANNELS.CALLS.name,
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    await notifee.createChannel({
      id: NOTIFICATION_CHANNELS.STORIES.id,
      name: NOTIFICATION_CHANNELS.STORIES.name,
      importance: AndroidImportance.DEFAULT,
      sound: 'default',
    });

    await notifee.createChannel({
      id: NOTIFICATION_CHANNELS.GROUPS.id,
      name: NOTIFICATION_CHANNELS.GROUPS.name,
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
  }

  private async setupMessageHandlers() {
    // Foreground message handler
    messaging().onMessage(async remoteMessage => {
      console.log('Foreground message:', remoteMessage);
      await this.displayNotification(remoteMessage);
    });

    // Background message handler
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Background message:', remoteMessage);
      await this.displayNotification(remoteMessage);
    });

    // Notification interaction handler
    notifee.onForegroundEvent(({type, detail}) => {
      if (type === EventType.PRESS) {
        console.log('Notification pressed:', detail);
        this.handleNotificationPress(detail.notification);
      }
    });

    notifee.onBackgroundEvent(async ({type, detail}) => {
      if (type === EventType.PRESS) {
        console.log('Background notification pressed:', detail);
        this.handleNotificationPress(detail.notification);
      }
    });
  }

  private async requestPermission(): Promise<boolean> {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Notification permission granted');
    }

    return enabled;
  }

  private async getFCMToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      console.log('FCM Token:', token);
      storageUtils.set(STORAGE_KEYS.FCM_TOKEN, token);
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  async displayNotification(remoteMessage: any) {
    const {title, body, data} = remoteMessage;

    await notifee.displayNotification({
      title,
      body,
      data,
      android: {
        channelId: NOTIFICATION_CHANNELS.MESSAGES.id,
        smallIcon: 'ic_notification',
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: 'default',
      },
    });
  }

  async displayMessageNotification(message: Message) {
    await notifee.displayNotification({
      title: message.sender.displayName,
      body: message.content || 'New message',
      data: {
        type: 'message',
        conversationId: message.conversationId,
        messageId: message.id,
      },
      android: {
        channelId: NOTIFICATION_CHANNELS.MESSAGES.id,
        smallIcon: 'ic_notification',
        largeIcon: message.sender.avatar,
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: 'default',
        attachments: message.sender.avatar
          ? [
              {
                url: message.sender.avatar,
                thumbnailHidden: false,
              },
            ]
          : [],
      },
    });
  }

  async displayCallNotification(call: Call) {
    await notifee.displayNotification({
      title: `${call.type === 'video' ? 'Video' : 'Audio'} Call`,
      body: `${call.initiator.displayName} is calling...`,
      data: {
        type: 'call',
        callId: call.id,
        callType: call.type,
      },
      android: {
        channelId: NOTIFICATION_CHANNELS.CALLS.id,
        smallIcon: 'ic_notification',
        largeIcon: call.initiator.avatar,
        category: 'call',
        pressAction: {
          id: 'default',
        },
        actions: [
          {
            title: 'Accept',
            pressAction: {id: 'accept'},
          },
          {
            title: 'Decline',
            pressAction: {id: 'decline'},
          },
        ],
      },
      ios: {
        sound: 'default',
        categoryId: 'call',
      },
    });
  }

  async cancelNotification(notificationId: string) {
    await notifee.cancelNotification(notificationId);
  }

  async cancelAllNotifications() {
    await notifee.cancelAllNotifications();
  }

  async setBadgeCount(count: number) {
    await notifee.setBadgeCount(count);
  }

  private handleNotificationPress(notification: any) {
    const {data} = notification;

    if (!data) return;

    switch (data.type) {
      case 'message':
        // Navigate to chat screen
        console.log('Navigate to chat:', data.conversationId);
        break;
      case 'call':
        // Handle call notification
        console.log('Handle call:', data.callId);
        break;
      default:
        console.log('Unknown notification type:', data.type);
    }
  }
}

export const NotificationService = new NotificationServiceClass();
