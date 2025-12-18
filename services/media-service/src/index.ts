import app from './app';
import { logger } from './config/logger.config';
import { s3Client, bucketName } from './config/s3.config';
import { HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { websocketService } from './services/websocket.service';

const PORT = process.env.PORT || 3003;
const WS_PORT = parseInt(process.env.WS_PORT || '3004');
const ENABLE_UPLOAD_PROGRESS = process.env.ENABLE_UPLOAD_PROGRESS === 'true';

async function initializeS3Bucket(): Promise<void> {
  try {
    logger.info('Checking S3 bucket', { bucket: bucketName });

    // Try to access the bucket
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));

    logger.info('S3 bucket exists and is accessible', { bucket: bucketName });
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      logger.warn('S3 bucket does not exist, creating it', { bucket: bucketName });

      try {
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        logger.info('S3 bucket created successfully', { bucket: bucketName });
      } catch (createError) {
        logger.error('Failed to create S3 bucket', { error: createError, bucket: bucketName });
        throw createError;
      }
    } else {
      logger.error('Failed to access S3 bucket', { error, bucket: bucketName });
      throw error;
    }
  }
}

async function startServer(): Promise<void> {
  try {
    // Initialize S3 bucket
    await initializeS3Bucket();

    // Initialize WebSocket server for upload progress tracking
    if (ENABLE_UPLOAD_PROGRESS) {
      websocketService.initialize(WS_PORT);
      logger.info('WebSocket service initialized', { port: WS_PORT });
    }

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Media service started successfully`, {
        port: PORT,
        wsPort: ENABLE_UPLOAD_PROGRESS ? WS_PORT : 'disabled',
        env: process.env.NODE_ENV || 'development',
        s3Bucket: bucketName,
      });

      console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║        SUP Messenger - Media Service         ║
║                                               ║
║  HTTP Server: port ${PORT}                     ║
║  WebSocket: port ${ENABLE_UPLOAD_PROGRESS ? WS_PORT : 'disabled'.padEnd(5)}                     ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(28)} ║
║  S3 Bucket: ${bucketName.padEnd(30)} ║
║                                               ║
║  Features:                                    ║
║    - Image Processing (Sharp)                 ║
║    - Video Processing (FFmpeg)                ║
║    - Audio Processing (FFmpeg)                ║
║    - Chunked Upload (up to 2GB)              ║
║    - Thumbnail Generation                     ║
║    - File Type Validation                     ║
║    - Streaming Support                        ║
║                                               ║
╚═══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  websocketService.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  websocketService.close();
  process.exit(0);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

// Start the server
startServer();
