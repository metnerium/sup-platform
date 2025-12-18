export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://api.supmessenger.com';

export const WS_URL = __DEV__
  ? 'http://localhost:3001'
  : 'https://ws.supmessenger.com';

export const LIVEKIT_URL = __DEV__
  ? 'ws://localhost:7880'
  : 'wss://livekit.supmessenger.com';

export const CDN_URL = 'https://cdn.supmessenger.com';

export const PAGINATION = {
  MESSAGES_PER_PAGE: 50,
  CONVERSATIONS_PER_PAGE: 20,
  CONTACTS_PER_PAGE: 50,
  STORIES_PER_PAGE: 20,
};

export const UPLOAD_LIMITS = {
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_AUDIO_SIZE: 20 * 1024 * 1024, // 20MB
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
};

export const MEDIA_QUALITY = {
  IMAGE: {
    WIDTH: 1920,
    HEIGHT: 1920,
    QUALITY: 0.8,
  },
  THUMBNAIL: {
    WIDTH: 200,
    HEIGHT: 200,
    QUALITY: 0.6,
  },
  VIDEO: {
    BITRATE: 2000000,
  },
};

export const CALL_CONFIG = {
  ICE_SERVERS: [
    {urls: 'stun:stun.l.google.com:19302'},
    {urls: 'stun:stun1.l.google.com:19302'},
  ],
  RING_DURATION: 30000, // 30 seconds
  CONNECTION_TIMEOUT: 15000, // 15 seconds
};

export const MESSAGE_CONFIG = {
  TYPING_TIMEOUT: 3000, // 3 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000, // 2 seconds
  DELETE_FOR_EVERYONE_TIMEOUT: 86400000, // 24 hours
  EDIT_TIMEOUT: 900000, // 15 minutes
};

export const STORY_CONFIG = {
  MAX_DURATION: 30, // 30 seconds
  EXPIRES_AFTER: 86400000, // 24 hours
  MAX_TEXT_LENGTH: 200,
};

export const STORAGE_KEYS = {
  AUTH_TOKENS: 'auth_tokens',
  USER: 'user',
  DEVICE_ID: 'device_id',
  FCM_TOKEN: 'fcm_token',
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations',
  CONTACTS: 'contacts',
  SETTINGS: 'settings',
  THEME: 'theme',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  MESSAGE_QUEUE: 'message_queue',
};

export const NOTIFICATION_CHANNELS = {
  MESSAGES: {
    id: 'messages',
    name: 'Messages',
    importance: 'high' as const,
  },
  CALLS: {
    id: 'calls',
    name: 'Calls',
    importance: 'high' as const,
  },
  STORIES: {
    id: 'stories',
    name: 'Stories',
    importance: 'default' as const,
  },
  GROUPS: {
    id: 'groups',
    name: 'Groups',
    importance: 'high' as const,
  },
};

export const APP_CONFIG = {
  NAME: 'SUP Messenger',
  VERSION: '1.0.0',
  SUPPORT_EMAIL: 'support@supmessenger.com',
  TERMS_URL: 'https://supmessenger.com/terms',
  PRIVACY_URL: 'https://supmessenger.com/privacy',
  MIN_PASSWORD_LENGTH: 8,
  OTP_LENGTH: 6,
  OTP_EXPIRY: 300000, // 5 minutes
};
