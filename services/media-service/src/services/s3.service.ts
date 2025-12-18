import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, bucketName, presignedUrlConfig } from '../config/s3.config';
import { logger } from '../config/logger.config';
import { v4 as uuidv4 } from 'uuid';
import { S3Error } from '../utils/errors';
import { sanitizeFilename, getFileExtension } from '../utils/validation';
import { generateImageThumbnail, generateVideoThumbnail, shouldGenerateThumbnail } from '../utils/thumbnail';
import { Readable } from 'stream';
import { imageService } from './image.service';
import { videoService } from './video.service';
import { audioService } from './audio.service';
import { fileConfig } from '../config/s3.config';
import { processingConfig } from '../config/processing.config';

export interface UploadResult {
  s3Key: string;
  size: number;
  mimeType: string;
  thumbnailS3Key?: string;
  metadata?: {
    duration?: number;
    width?: number;
    height?: number;
    waveform?: number[];
  };
}

export interface FileMetadata {
  size: number;
  mimeType: string;
  lastModified?: Date;
  etag?: string;
}

export interface ChunkedUploadInit {
  uploadId: string;
  s3Key: string;
}

export interface ChunkedUploadPart {
  partNumber: number;
  etag: string;
}

export class S3Service {
  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    chatId?: string
  ): Promise<UploadResult> {
    try {
      let processedBuffer = file.buffer;
      let processedMimeType = file.mimetype;
      const metadata: any = {};

      // Process file based on type
      if (fileConfig.imageMimeTypes.includes(file.mimetype)) {
        const imageResult = await imageService.processImage(file.buffer);
        processedBuffer = imageResult.buffer;
        metadata.width = imageResult.metadata.width;
        metadata.height = imageResult.metadata.height;

        // Update MIME type if converted
        if (imageResult.metadata.format === 'jpeg') {
          processedMimeType = 'image/jpeg';
        }
      } else if (fileConfig.videoMimeTypes.includes(file.mimetype)) {
        if (processingConfig.enableVideoProcessing) {
          const videoResult = await videoService.processVideo(file.buffer);
          processedBuffer = videoResult.buffer;
          metadata.duration = videoResult.metadata.duration;
          metadata.width = videoResult.metadata.width;
          metadata.height = videoResult.metadata.height;
          processedMimeType = 'video/mp4';
        } else {
          const videoMetadata = await videoService.getVideoMetadata(file.buffer);
          metadata.duration = videoMetadata.duration;
          metadata.width = videoMetadata.width;
          metadata.height = videoMetadata.height;
        }
      } else if (fileConfig.audioMimeTypes.includes(file.mimetype)) {
        const isVoiceMessage = file.originalname.includes('voice') ||
                              file.mimetype.includes('opus');

        if (processingConfig.enableAudioProcessing) {
          const audioResult = await audioService.processAudio(file.buffer, isVoiceMessage);
          processedBuffer = audioResult.buffer;
          metadata.duration = audioResult.metadata.duration;
          processedMimeType = `audio/${isVoiceMessage ? 'opus' : 'opus'}`;
        } else {
          const audioMetadata = await audioService.getAudioMetadata(file.buffer);
          metadata.duration = audioMetadata.duration;
        }

        // Generate waveform for voice messages
        if (isVoiceMessage) {
          try {
            const waveform = await audioService.generateWaveform(file.buffer);
            metadata.waveform = waveform;
          } catch (error) {
            logger.warn('Failed to generate waveform', { error });
          }
        }
      }

      const s3Key = this.generateS3Key(userId, file.originalname, chatId, processedMimeType);

      const uploadParams = {
        Bucket: bucketName,
        Key: s3Key,
        Body: processedBuffer,
        ContentType: processedMimeType,
        Metadata: {
          userId,
          chatId: chatId || '',
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          ...(metadata.duration && { duration: metadata.duration.toString() }),
          ...(metadata.width && { width: metadata.width.toString() }),
          ...(metadata.height && { height: metadata.height.toString() }),
        },
      };

      await s3Client.send(new PutObjectCommand(uploadParams));

      logger.info('File uploaded to S3', {
        s3Key,
        userId,
        chatId,
        originalSize: file.size,
        processedSize: processedBuffer.length,
        mimeType: processedMimeType,
      });

      const result: UploadResult = {
        s3Key,
        size: processedBuffer.length,
        mimeType: processedMimeType,
        metadata,
      };

      // Generate thumbnail for images and videos
      if (shouldGenerateThumbnail(processedMimeType)) {
        try {
          const thumbnailS3Key = await this.generateThumbnail(
            processedBuffer,
            s3Key,
            userId,
            processedMimeType
          );
          result.thumbnailS3Key = thumbnailS3Key;
        } catch (error) {
          logger.warn('Failed to generate thumbnail, continuing without it', { error });
        }
      }

      return result;
    } catch (error) {
      logger.error('Failed to upload file to S3', { error, userId, chatId });
      throw new S3Error('Failed to upload file');
    }
  }

  async uploadChunkedInit(
    filename: string,
    mimeType: string,
    userId: string,
    chatId?: string
  ): Promise<ChunkedUploadInit> {
    try {
      const s3Key = this.generateS3Key(userId, filename, chatId);

      const command = new CreateMultipartUploadCommand({
        Bucket: bucketName,
        Key: s3Key,
        ContentType: mimeType,
        Metadata: {
          userId,
          chatId: chatId || '',
          originalName: filename,
          uploadedAt: new Date().toISOString(),
        },
      });

      const response = await s3Client.send(command);

      if (!response.UploadId) {
        throw new S3Error('Failed to initialize multipart upload');
      }

      logger.info('Initialized chunked upload', { s3Key, uploadId: response.UploadId, userId });

      return {
        uploadId: response.UploadId,
        s3Key,
      };
    } catch (error) {
      logger.error('Failed to initialize chunked upload', { error, userId, chatId });
      throw new S3Error('Failed to initialize chunked upload');
    }
  }

  async uploadChunkedPart(
    uploadId: string,
    s3Key: string,
    partNumber: number,
    buffer: Buffer
  ): Promise<ChunkedUploadPart> {
    try {
      const command = new UploadPartCommand({
        Bucket: bucketName,
        Key: s3Key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: buffer,
      });

      const response = await s3Client.send(command);

      if (!response.ETag) {
        throw new S3Error('Failed to upload part');
      }

      logger.info('Uploaded chunk part', { s3Key, uploadId, partNumber, size: buffer.length });

      return {
        partNumber,
        etag: response.ETag,
      };
    } catch (error) {
      logger.error('Failed to upload chunk part', { error, uploadId, s3Key, partNumber });
      throw new S3Error('Failed to upload chunk part');
    }
  }

  async uploadChunkedComplete(
    uploadId: string,
    s3Key: string,
    parts: ChunkedUploadPart[]
  ): Promise<void> {
    try {
      const command = new CompleteMultipartUploadCommand({
        Bucket: bucketName,
        Key: s3Key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map((part) => ({
            PartNumber: part.partNumber,
            ETag: part.etag,
          })),
        },
      });

      await s3Client.send(command);

      logger.info('Completed chunked upload', { s3Key, uploadId, totalParts: parts.length });
    } catch (error) {
      logger.error('Failed to complete chunked upload', { error, uploadId, s3Key });
      throw new S3Error('Failed to complete chunked upload');
    }
  }

  async uploadChunkedAbort(uploadId: string, s3Key: string): Promise<void> {
    try {
      const command = new AbortMultipartUploadCommand({
        Bucket: bucketName,
        Key: s3Key,
        UploadId: uploadId,
      });

      await s3Client.send(command);

      logger.info('Aborted chunked upload', { s3Key, uploadId });
    } catch (error) {
      logger.error('Failed to abort chunked upload', { error, uploadId, s3Key });
      throw new S3Error('Failed to abort chunked upload');
    }
  }

  async uploadStream(
    stream: Readable,
    filename: string,
    mimeType: string,
    userId: string,
    chatId?: string
  ): Promise<UploadResult> {
    try {
      const s3Key = this.generateS3Key(userId, filename, chatId);

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      const uploadParams = {
        Bucket: bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          userId,
          chatId: chatId || '',
          originalName: filename,
          uploadedAt: new Date().toISOString(),
        },
      };

      await s3Client.send(new PutObjectCommand(uploadParams));

      logger.info('Stream uploaded to S3', { s3Key, userId, chatId, size: buffer.length });

      return {
        s3Key,
        size: buffer.length,
        mimeType,
      };
    } catch (error) {
      logger.error('Failed to upload stream to S3', { error, userId, chatId });
      throw new S3Error('Failed to upload stream');
    }
  }

  async getPresignedUrl(s3Key: string, expiresIn?: number): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      const url = await getSignedUrl(
        s3Client,
        command,
        { expiresIn: expiresIn || presignedUrlConfig.expiresIn }
      );

      logger.info('Generated presigned URL', { s3Key, expiresIn });

      return url;
    } catch (error) {
      logger.error('Failed to generate presigned URL', { error, s3Key });
      throw new S3Error('Failed to generate presigned URL');
    }
  }

  async deleteFile(s3Key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      await s3Client.send(command);

      logger.info('File deleted from S3', { s3Key });

      // Try to delete thumbnail if it exists
      if (s3Key.includes('/files/')) {
        const thumbnailKey = s3Key.replace('/files/', '/thumbs/').replace(/\.[^.]+$/, '-thumb.jpg');
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: thumbnailKey,
          }));
          logger.info('Thumbnail deleted from S3', { thumbnailKey });
        } catch (error) {
          logger.warn('Failed to delete thumbnail or it does not exist', { thumbnailKey });
        }
      }
    } catch (error) {
      logger.error('Failed to delete file from S3', { error, s3Key });
      throw new S3Error('Failed to delete file');
    }
  }

  async generateThumbnail(
    fileBuffer: Buffer,
    originalS3Key: string,
    userId: string,
    mimeType: string
  ): Promise<string> {
    try {
      let thumbnailBuffer: Buffer;

      // Generate thumbnail based on file type
      if (fileConfig.imageMimeTypes.includes(mimeType)) {
        thumbnailBuffer = await generateImageThumbnail(fileBuffer);
      } else if (fileConfig.videoMimeTypes.includes(mimeType)) {
        thumbnailBuffer = await generateVideoThumbnail(fileBuffer);
      } else {
        throw new Error('Unsupported file type for thumbnail generation');
      }

      const thumbnailS3Key = this.generateThumbnailS3Key(originalS3Key, userId);

      const uploadParams = {
        Bucket: bucketName,
        Key: thumbnailS3Key,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
        Metadata: {
          userId,
          originalS3Key,
          isThumbnail: 'true',
          createdAt: new Date().toISOString(),
        },
      };

      await s3Client.send(new PutObjectCommand(uploadParams));

      logger.info('Thumbnail uploaded to S3', {
        thumbnailS3Key,
        originalS3Key,
        size: thumbnailBuffer.length,
      });

      return thumbnailS3Key;
    } catch (error) {
      logger.error('Failed to generate and upload thumbnail', { error, originalS3Key });
      throw new S3Error('Failed to generate thumbnail');
    }
  }

  async getFileMetadata(s3Key: string): Promise<FileMetadata> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      const response = await s3Client.send(command);

      return {
        size: response.ContentLength || 0,
        mimeType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified,
        etag: response.ETag,
      };
    } catch (error) {
      logger.error('Failed to get file metadata', { error, s3Key });
      throw new S3Error('Failed to get file metadata');
    }
  }

  async fileExists(s3Key: string): Promise<boolean> {
    try {
      await this.getFileMetadata(s3Key);
      return true;
    } catch (error) {
      return false;
    }
  }

  private generateS3Key(userId: string, filename: string, chatId?: string, mimeType?: string): string {
    const sanitized = sanitizeFilename(filename);
    let extension = getFileExtension(sanitized);
    const uuid = uuidv4();

    // Override extension based on processed MIME type
    if (mimeType === 'video/mp4') {
      extension = 'mp4';
    } else if (mimeType === 'audio/opus') {
      extension = 'opus';
    } else if (mimeType === 'image/jpeg') {
      extension = 'jpg';
    }

    const baseFilename = `${uuid}.${extension}`;

    // Organize by file type
    let folder = 'files';
    if (mimeType) {
      if (fileConfig.imageMimeTypes.includes(mimeType)) {
        folder = 'media/images';
      } else if (fileConfig.videoMimeTypes.includes(mimeType)) {
        folder = 'media/videos';
      } else if (fileConfig.audioMimeTypes.includes(mimeType)) {
        if (filename.includes('voice') || mimeType.includes('opus')) {
          folder = 'voice';
        } else {
          folder = 'media/audio';
        }
      } else if (fileConfig.documentMimeTypes.includes(mimeType)) {
        folder = 'documents';
      }
    }

    if (chatId) {
      return `users/${userId}/chats/${chatId}/${folder}/${baseFilename}`;
    }

    return `users/${userId}/${folder}/${baseFilename}`;
  }

  private generateThumbnailS3Key(originalS3Key: string, userId: string): string {
    const filename = originalS3Key.split('/').pop() || 'unknown';
    const baseFilename = filename.replace(/\.[^.]+$/, '-thumb.jpg');

    if (originalS3Key.includes('/chats/')) {
      const chatIdMatch = originalS3Key.match(/\/chats\/([^\/]+)\//);
      const chatId = chatIdMatch ? chatIdMatch[1] : 'unknown';
      return `users/${userId}/chats/${chatId}/thumbs/${baseFilename}`;
    }

    return `users/${userId}/thumbs/${baseFilename}`;
  }
}

export const s3Service = new S3Service();
