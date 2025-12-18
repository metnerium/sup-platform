import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

export const s3Config = {
  endpoint: process.env.S3_ENDPOINT || 'http://minio:9000',
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
};

export const bucketName = process.env.S3_BUCKET || 'sup-media';

export const s3Client = new S3Client(s3Config);

export const fileConfig = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '2147483648'), // 2GB
  maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE || '52428800'), // 50MB
  maxVideoSize: parseInt(process.env.MAX_VIDEO_SIZE || '2147483648'), // 2GB
  maxAudioSize: parseInt(process.env.MAX_AUDIO_SIZE || '104857600'), // 100MB
  maxDocumentSize: parseInt(process.env.MAX_DOCUMENT_SIZE || '104857600'), // 100MB
  maxThumbnailSize: parseInt(process.env.MAX_THUMBNAIL_SIZE || '2097152'), // 2MB
  allowedMimeTypes: [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/heic',
    'image/heif',
    // Videos
    'video/mp4',
    'video/mpeg',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    // Audio
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'audio/aac',
    'audio/opus',
    'audio/flac',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
  ],
  imageMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/heic', 'image/heif'],
  videoMimeTypes: ['video/mp4', 'video/mpeg', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
  audioMimeTypes: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/aac', 'audio/opus', 'audio/flac'],
  documentMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
};

export const presignedUrlConfig = {
  expiresIn: parseInt(process.env.PRESIGNED_URL_EXPIRY || '3600'), // 1 hour
};
