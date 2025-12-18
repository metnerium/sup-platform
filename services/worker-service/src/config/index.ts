import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3004', 10),

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE || 'sup_exchange',
    queues: {
      media: process.env.RABBITMQ_MEDIA_QUEUE || 'media_queue',
      notification: process.env.RABBITMQ_NOTIFICATION_QUEUE || 'notification_queue',
      cleanup: process.env.RABBITMQ_CLEANUP_QUEUE || 'cleanup_queue',
    },
  },

  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/sup_messenger',
  },

  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Bucket: process.env.AWS_S3_BUCKET || 'sup-messenger-media',
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || '',
    },
  },

  emailFrom: process.env.EMAIL_FROM || 'SUP Messenger <noreply@supmessenger.com>',

  media: {
    maxImageWidth: parseInt(process.env.MAX_IMAGE_WIDTH || '2048', 10),
    maxImageHeight: parseInt(process.env.MAX_IMAGE_HEIGHT || '2048', 10),
    thumbnailSize: parseInt(process.env.THUMBNAIL_SIZE || '200', 10),
    videoMaxBitrate: process.env.VIDEO_MAX_BITRATE || '2000k',
    audioBitrate: process.env.AUDIO_BITRATE || '128k',
  },

  jobs: {
    attempts: parseInt(process.env.JOB_ATTEMPTS || '3', 10),
    backoffDelay: parseInt(process.env.JOB_BACKOFF_DELAY || '5000', 10),
    concurrency: {
      media: parseInt(process.env.CONCURRENCY_MEDIA || '2', 10),
      notification: parseInt(process.env.CONCURRENCY_NOTIFICATION || '5', 10),
      cleanup: parseInt(process.env.CONCURRENCY_CLEANUP || '1', 10),
    },
  },

  cleanup: {
    storyExpirationHours: parseInt(process.env.STORY_EXPIRATION_HOURS || '24', 10),
    sessionExpirationDays: parseInt(process.env.SESSION_EXPIRATION_DAYS || '30', 10),
    oldMessageDays: parseInt(process.env.OLD_MESSAGE_DAYS || '365', 10),
  },
};
