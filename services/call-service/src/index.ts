import http from 'http';
import { createApp } from './app';
import { config } from './config';
import {
  testDatabaseConnection,
  closeDatabaseConnection,
} from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { websocketService } from './services/websocket.service';
import { logger } from './utils/logger';

async function startServer() {
  try {
    logger.info('Starting SUP Call Service...');

    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Connect to Redis
    await connectRedis();

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize WebSocket service
    await websocketService.initialize(httpServer);

    // Start HTTP server
    httpServer.listen(config.port, () => {
      logger.info(`HTTP Server running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
      logger.info(`API: http://localhost:${config.port}/api/v1`);
      logger.info(`WebSocket: ws://localhost:${config.port}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      httpServer.close(async () => {
        logger.info('HTTP server closed');

        try {
          await disconnectRedis();
          await closeDatabaseConnection();
          logger.info('All connections closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
