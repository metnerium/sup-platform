import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { s3Service } from '../services/s3.service';
import { validateFile, scanForMalware } from '../utils/validation';
import { ValidationError, NotFoundError } from '../utils/errors';
import { logger } from '../config/logger.config';

interface ChunkedUploadSession {
  uploadId: string;
  s3Key: string;
  parts: Array<{ partNumber: number; etag: string }>;
  userId: string;
  chatId?: string;
  filename: string;
  mimeType: string;
  createdAt: Date;
}

// In-memory store for chunked upload sessions (in production, use Redis)
const uploadSessions = new Map<string, ChunkedUploadSession>();

export class UploadController {
  async uploadFile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file;
      const userId = req.user?.userId;
      const { chatId } = req.body;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!file) {
        throw new ValidationError('No file provided');
      }

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new ValidationError(validation.error || 'File validation failed');
      }

      // Scan for malware
      const scanResult = await scanForMalware(file.buffer);
      if (!scanResult.valid) {
        throw new ValidationError(scanResult.error || 'File contains malicious content');
      }

      logger.info('Uploading file', {
        userId,
        chatId,
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      });

      // Upload to S3
      const result = await s3Service.uploadFile(file, userId, chatId);

      // Generate presigned URL for immediate access
      const url = await s3Service.getPresignedUrl(result.s3Key);

      let thumbnailUrl: string | undefined;
      if (result.thumbnailS3Key) {
        thumbnailUrl = await s3Service.getPresignedUrl(result.thumbnailS3Key);
      }

      logger.info('File uploaded successfully', {
        userId,
        s3Key: result.s3Key,
        size: result.size,
      });

      res.status(200).json({
        success: true,
        data: {
          s3Key: result.s3Key,
          url,
          thumbnailS3Key: result.thumbnailS3Key,
          thumbnailUrl,
          size: result.size,
          mimeType: result.mimeType,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadMultipleFiles(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      const userId = req.user?.userId;
      const { chatId } = req.body;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!files || files.length === 0) {
        throw new ValidationError('No files provided');
      }

      logger.info('Uploading multiple files', {
        userId,
        chatId,
        fileCount: files.length,
      });

      const uploadPromises = files.map(async (file) => {
        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
          throw new ValidationError(validation.error || 'File validation failed');
        }

        // Scan for malware
        const scanResult = await scanForMalware(file.buffer);
        if (!scanResult.valid) {
          throw new ValidationError(scanResult.error || 'File contains malicious content');
        }

        // Upload to S3
        const result = await s3Service.uploadFile(file, userId, chatId);

        // Generate presigned URL
        const url = await s3Service.getPresignedUrl(result.s3Key);

        let thumbnailUrl: string | undefined;
        if (result.thumbnailS3Key) {
          thumbnailUrl = await s3Service.getPresignedUrl(result.thumbnailS3Key);
        }

        return {
          s3Key: result.s3Key,
          url,
          thumbnailS3Key: result.thumbnailS3Key,
          thumbnailUrl,
          size: result.size,
          mimeType: result.mimeType,
          originalName: file.originalname,
        };
      });

      const results = await Promise.all(uploadPromises);

      logger.info('Multiple files uploaded successfully', {
        userId,
        fileCount: results.length,
      });

      res.status(200).json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  async initChunkedUpload(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { filename, mimeType, chatId } = req.body;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!filename || !mimeType) {
        throw new ValidationError('Filename and MIME type are required');
      }

      logger.info('Initializing chunked upload', {
        userId,
        chatId,
        filename,
        mimeType,
      });

      const { uploadId, s3Key } = await s3Service.uploadChunkedInit(
        filename,
        mimeType,
        userId,
        chatId
      );

      // Store session
      const session: ChunkedUploadSession = {
        uploadId,
        s3Key,
        parts: [],
        userId,
        chatId,
        filename,
        mimeType,
        createdAt: new Date(),
      };

      uploadSessions.set(uploadId, session);

      logger.info('Chunked upload initialized', { uploadId, s3Key, userId });

      res.status(200).json({
        success: true,
        data: {
          uploadId,
          s3Key,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadChunk(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { uploadId } = req.params;
      const file = req.file;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!uploadId) {
        throw new ValidationError('Upload ID is required');
      }

      if (!file) {
        throw new ValidationError('No chunk data provided');
      }

      const session = uploadSessions.get(uploadId);
      if (!session) {
        throw new NotFoundError('Upload session not found');
      }

      if (session.userId !== userId) {
        throw new ValidationError('Unauthorized to upload to this session');
      }

      const partNumber = session.parts.length + 1;

      logger.info('Uploading chunk', {
        uploadId,
        partNumber,
        size: file.size,
      });

      const part = await s3Service.uploadChunkedPart(
        uploadId,
        session.s3Key,
        partNumber,
        file.buffer
      );

      session.parts.push(part);

      logger.info('Chunk uploaded', { uploadId, partNumber, totalParts: session.parts.length });

      res.status(200).json({
        success: true,
        data: {
          partNumber: part.partNumber,
          etag: part.etag,
          totalParts: session.parts.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async completeChunkedUpload(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { uploadId } = req.params;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!uploadId) {
        throw new ValidationError('Upload ID is required');
      }

      const session = uploadSessions.get(uploadId);
      if (!session) {
        throw new NotFoundError('Upload session not found');
      }

      if (session.userId !== userId) {
        throw new ValidationError('Unauthorized to complete this upload');
      }

      if (session.parts.length === 0) {
        throw new ValidationError('No parts uploaded');
      }

      logger.info('Completing chunked upload', {
        uploadId,
        s3Key: session.s3Key,
        totalParts: session.parts.length,
      });

      await s3Service.uploadChunkedComplete(uploadId, session.s3Key, session.parts);

      // Get file metadata
      const metadata = await s3Service.getFileMetadata(session.s3Key);

      // Generate presigned URL
      const url = await s3Service.getPresignedUrl(session.s3Key);

      // Clean up session
      uploadSessions.delete(uploadId);

      logger.info('Chunked upload completed', { uploadId, s3Key: session.s3Key });

      res.status(200).json({
        success: true,
        data: {
          s3Key: session.s3Key,
          url,
          size: metadata.size,
          mimeType: metadata.mimeType,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async abortChunkedUpload(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { uploadId } = req.params;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!uploadId) {
        throw new ValidationError('Upload ID is required');
      }

      const session = uploadSessions.get(uploadId);
      if (!session) {
        throw new NotFoundError('Upload session not found');
      }

      if (session.userId !== userId) {
        throw new ValidationError('Unauthorized to abort this upload');
      }

      logger.info('Aborting chunked upload', { uploadId, s3Key: session.s3Key });

      await s3Service.uploadChunkedAbort(uploadId, session.s3Key);

      // Clean up session
      uploadSessions.delete(uploadId);

      logger.info('Chunked upload aborted', { uploadId });

      res.status(200).json({
        success: true,
        message: 'Upload aborted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getDownloadUrl(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { s3Key } = req.params;
      const { expiresIn } = req.query;

      if (!s3Key) {
        throw new ValidationError('S3 key is required');
      }

      logger.info('Generating download URL', { s3Key });

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

  async deleteFile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { s3Key } = req.params;

      if (!s3Key) {
        throw new ValidationError('S3 key is required');
      }

      logger.info('Deleting file', { s3Key });

      // Check if file exists
      const exists = await s3Service.fileExists(s3Key);
      if (!exists) {
        throw new NotFoundError('File not found');
      }

      await s3Service.deleteFile(s3Key);

      logger.info('File deleted successfully', { s3Key });

      res.status(200).json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getFileMetadata(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { s3Key } = req.params;

      if (!s3Key) {
        throw new ValidationError('S3 key is required');
      }

      logger.info('Getting file metadata', { s3Key });

      const metadata = await s3Service.getFileMetadata(s3Key);

      res.status(200).json({
        success: true,
        data: {
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
}

export const uploadController = new UploadController();
