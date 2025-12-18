import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler, notFoundHandler } from './common/middleware/error.middleware';
import { apiLimiter } from './common/middleware/ratelimit.middleware';
import { logger } from './common/utils/logger';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import cryptoRoutes from './modules/crypto/crypto.routes';
import chatRoutes from './modules/chat/chat.routes';
import messageRoutes from './modules/message/message.routes';
import storyRoutes from './modules/story/story.routes';
import searchRoutes from './modules/search/search.routes';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // CORS
  app.use(cors(config.cors));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Cookie parser
  app.use(cookieParser());

  // Compression
  app.use(compression());

  // Logging
  if (config.env === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    }));
  }

  // Health check (no rate limiting)
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  });

  // API versioning
  const apiV1 = express.Router();

  // Apply rate limiting to all API routes
  apiV1.use(apiLimiter);

  // Mount module routes
  // Auth routes (public + protected) - authLimiter applied per route
  apiV1.use('/auth', authRoutes);

  // User routes (all protected with authMiddleware)
  apiV1.use('/users', userRoutes);

  // Crypto routes (all protected with authMiddleware)
  apiV1.use('/crypto', cryptoRoutes);

  // Chat routes (all protected with authMiddleware)
  apiV1.use('/chats', chatRoutes);

  // Message routes (all protected with authMiddleware)
  apiV1.use('/', messageRoutes);

  // Story routes (all protected with authMiddleware)
  apiV1.use('/stories', storyRoutes);

  // Search routes (all protected with authMiddleware)
  apiV1.use('/search', searchRoutes);

  // Temporary welcome route
  apiV1.get('/', (req, res) => {
    res.json({
      success: true,
      data: {
        message: 'SUP Messenger API v1',
        version: '1.0.0',
        documentation: '/api/v1/docs',
      },
    });
  });

  app.use('/api/v1', apiV1);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

export default createApp;
