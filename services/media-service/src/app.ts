import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { generalLimiter } from './middleware/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import uploadRoutes from './routes/upload.routes';
import downloadRoutes from './routes/download.routes';
import healthRoutes from './routes/health.routes';
import { logger } from './config/logger.config';

dotenv.config();

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(generalLimiter);

// Request logging
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Routes
app.use('/api/media', uploadRoutes);
app.use('/api/media', downloadRoutes);
app.use('/api', healthRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Media Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      upload: '/api/media/upload',
      uploadMultiple: '/api/media/upload/multiple',
      chunkedUploadInit: '/api/media/upload/chunked/init',
      chunkedUploadPart: '/api/media/upload/chunked/:uploadId',
      chunkedUploadComplete: '/api/media/upload/chunked/:uploadId/complete',
      chunkedUploadAbort: '/api/media/upload/chunked/:uploadId (DELETE)',
      download: '/api/media/download/:s3Key',
      stream: '/api/media/stream/:s3Key',
      thumbnail: '/api/media/thumbnail/:s3Key',
      fileInfo: '/api/media/file/:fileId/info',
      deleteFile: '/api/media/:s3Key (DELETE)',
      metadata: '/api/media/metadata/:s3Key',
      health: '/api/health',
      readiness: '/api/ready',
    },
    features: {
      imageProcessing: 'Optimization, HEIC/HEIF conversion, multi-size thumbnails',
      videoProcessing: 'Compression, thumbnail extraction, MP4 conversion, streaming format',
      audioProcessing: 'Opus encoding, waveform generation for voice messages',
      fileTypes: 'Images, videos, audio, documents, voice messages',
      maxFileSize: '2GB',
      securityFeatures: 'Magic number validation, metadata stripping, malware scanning ready',
    },
  });
});

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
