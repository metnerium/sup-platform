import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { s3Service } from '../services/s3.service';
import { ValidationError, NotFoundError } from '../utils/errors';
import { logger } from '../config/logger.config';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, bucketName } from '../config/s3.config';
import { Readable } from 'stream';

export class DownloadController {
  async getDownloadUrl(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { s3Key } = req.params;
      const { expiresIn } = req.query;

      if (!s3Key) {
        throw new ValidationError('S3 key is required');
      }

      logger.info('Generating download URL', { s3Key, userId: req.user?.userId });

      // Check if file exists
      const exists = await s3Service.fileExists(s3Key);
      if (!exists) {
        throw new NotFoundError('File not found');
      }

      // Get metadata
      const metadata = await s3Service.getFileMetadata(s3Key);

      // Generate presigned URL
      const expiresInSeconds = expiresIn ? parseInt(expiresIn as string) : undefined;
      const url = await s3Service.getPresignedUrl(s3Key, expiresInSeconds);

      res.status(200).json({
        success: true,
        data: {
          s3Key,
          url,
          size: metadata.size,
          mimeType: metadata.mimeType,
          expiresIn: expiresInSeconds,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getThumbnail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { s3Key } = req.params;

      if (!s3Key) {
        throw new ValidationError('S3 key is required');
      }

      logger.info('Getting thumbnail', { s3Key, userId: req.user?.userId });

      // Generate thumbnail S3 key from original key
      const thumbnailKey = this.getThumbnailKey(s3Key);

      // Check if thumbnail exists
      const exists = await s3Service.fileExists(thumbnailKey);
      if (!exists) {
        throw new NotFoundError('Thumbnail not found');
      }

      // Generate presigned URL for thumbnail
      const url = await s3Service.getPresignedUrl(thumbnailKey);

      res.status(200).json({
        success: true,
        data: {
          thumbnailUrl: url,
          s3Key: thumbnailKey,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async streamFile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { s3Key } = req.params;

      if (!s3Key) {
        throw new ValidationError('S3 key is required');
      }

      logger.info('Streaming file', { s3Key, userId: req.user?.userId });

      // Check if file exists
      const exists = await s3Service.fileExists(s3Key);
      if (!exists) {
        throw new NotFoundError('File not found');
      }

      // Get metadata
      const metadata = await s3Service.getFileMetadata(s3Key);

      // Get file from S3
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      const response = await s3Client.send(command);

      if (!response.Body) {
        throw new Error('Failed to get file from S3');
      }

      // Set headers
      res.setHeader('Content-Type', metadata.mimeType);
      res.setHeader('Content-Length', metadata.size);
      res.setHeader('Content-Disposition', `inline; filename="${this.getFilename(s3Key)}"`);
      res.setHeader('Cache-Control', 'public, max-age=31536000');

      // Handle range requests for streaming
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : metadata.size - 1;
        const chunksize = end - start + 1;

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${metadata.size}`);
        res.setHeader('Content-Length', chunksize);
      }

      // Pipe the stream to response
      const stream = response.Body as Readable;
      stream.pipe(res);

      stream.on('error', (error) => {
        logger.error('Stream error', { error, s3Key });
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: {
              message: 'Failed to stream file',
            },
          });
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getFileInfo(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileId } = req.params;

      if (!fileId) {
        throw new ValidationError('File ID is required');
      }

      logger.info('Getting file info', { fileId, userId: req.user?.userId });

      // In a real implementation, you would look up the file by ID in a database
      // For now, we'll assume fileId is the S3 key
      const s3Key = fileId;

      // Check if file exists
      const exists = await s3Service.fileExists(s3Key);
      if (!exists) {
        throw new NotFoundError('File not found');
      }

      // Get metadata
      const metadata = await s3Service.getFileMetadata(s3Key);

      res.status(200).json({
        success: true,
        data: {
          fileId,
          s3Key,
          size: metadata.size,
          mimeType: metadata.mimeType,
          lastModified: metadata.lastModified,
          etag: metadata.etag,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  private getThumbnailKey(originalKey: string): string {
    // Convert file path to thumbnail path
    // Example: users/123/chats/456/media/images/uuid.jpg -> users/123/chats/456/thumbnails/uuid-thumb.jpg
    const parts = originalKey.split('/');
    const filename = parts.pop() || 'unknown';
    const thumbnailFilename = filename.replace(/\.[^.]+$/, '-thumb.jpg');

    // Replace the folder name with 'thumbnails'
    const folderIndex = parts.findIndex((p) =>
      ['files', 'media', 'voice', 'documents'].includes(p)
    );

    if (folderIndex !== -1) {
      parts.splice(folderIndex, parts.length - folderIndex);
      parts.push('thumbnails');
    }

    return [...parts, thumbnailFilename].join('/');
  }

  private getFilename(s3Key: string): string {
    const parts = s3Key.split('/');
    return parts[parts.length - 1] || 'download';
  }
}

export const downloadController = new DownloadController();
