import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { config } from './config';
import logger from './utils/logger';
import { connectRedis, disconnectRedis, redisClient, redisSubClient } from './utils/redis';
import { authMiddleware } from './middleware/auth.middleware';
import { applyRateLimits } from './middleware/rate-limit.middleware';
import { AuthenticatedSocket } from './types/socket.types';
import {
  handleConnection,
  handleDisconnection,
  handleError,
  setupHeartbeat,
} from './handlers/connection.handler';
import { registerMessageHandlers } from './handlers/message.handler';
import { registerPresenceHandlers } from './handlers/presence.handler';
import { registerCallHandlers } from './handlers/call.handler';
import { registerNotificationHandlers } from './handlers/notification.handler';
import { registerReactionHandlers } from './handlers/reaction.handler';
import { registerChatHandlers } from './handlers/chat.handler';
import { metrics } from './utils/metrics';
import { setupIdleTimeout } from './utils/idle-timeout';
import { HealthCheck } from './utils/health';

/**
 * WebSocket Service for SUP Messenger
 * Handles real-time communication with Socket.io
 */
class WebSocketService {
  private io: Server;
  private healthCheck: HealthCheck | null = null;
  private isShuttingDown: boolean = false;

  constructor() {
    // Initialize Socket.io server
    this.io = new Server({
      cors: {
        origin: config.cors.origin,
        credentials: config.cors.credentials,
      },
      pingTimeout: config.socketio.pingTimeout,
      pingInterval: config.socketio.pingInterval,
      maxHttpBufferSize: config.socketio.maxHttpBufferSize,
      transports: ['websocket', 'polling'],
      allowEIO3: true,
    });

    logger.info('Socket.io server initialized', {
      port: config.port,
      env: config.env,
    });
  }

  /**
   * Initialize the WebSocket service
   */
  async initialize(): Promise<void> {
    try {
      // Connect to Redis
      await connectRedis();

      // Set up Redis adapter for horizontal scaling
      this.io.adapter(createAdapter(redisClient, redisSubClient));
      logger.info('Redis adapter configured for Socket.io');

      // Set up authentication middleware
      this.io.use(authMiddleware);
      logger.info('Authentication middleware configured');

      // Set up connection handler
      this.io.on('connection', (socket) => {
        this.handleSocketConnection(socket as AuthenticatedSocket);
      });

      logger.info('WebSocket service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize WebSocket service', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Handle new socket connection
   */
  private handleSocketConnection(socket: AuthenticatedSocket): void {
    try {
      // Record connection in metrics
      metrics.recordConnection();

      // Apply rate limiting
      applyRateLimits(socket);

      // Set up idle timeout tracking
      setupIdleTimeout(socket);

      // Set up heartbeat
      setupHeartbeat(socket);

      // Handle connection
      handleConnection(this.io, socket);

      // Register all event handlers
      this.registerEventHandlers(socket);

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        metrics.recordDisconnection();
        handleDisconnection(this.io, socket, reason);
      });

      // Handle errors
      socket.on('error', (error) => {
        metrics.recordError('socket_error');
        handleError(socket, error);
      });

      logger.info('Socket connection fully configured', {
        socketId: socket.id,
        userId: socket.userId,
      });
    } catch (error) {
      logger.error('Error handling socket connection', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      socket.disconnect(true);
    }
  }

  /**
   * Register all event handlers for a socket
   */
  private registerEventHandlers(socket: AuthenticatedSocket): void {
    try {
      registerMessageHandlers(this.io, socket);
      registerPresenceHandlers(this.io, socket);
      registerCallHandlers(this.io, socket);
      registerNotificationHandlers(this.io, socket);
      registerReactionHandlers(this.io, socket);
      registerChatHandlers(this.io, socket);

      logger.debug('All event handlers registered', {
        socketId: socket.id,
        userId: socket.userId,
      });
    } catch (error) {
      logger.error('Error registering event handlers', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Start the WebSocket service
   */
  async start(): Promise<void> {
    try {
      await this.initialize();

      this.io.listen(config.port);

      logger.info('WebSocket service started', {
        port: config.port,
        env: config.env,
        cors: config.cors.origin,
      });

      // Start health check server
      this.healthCheck = new HealthCheck(this.io);
      this.healthCheck.start();

      // Log connection stats periodically
      setInterval(() => {
        this.logConnectionStats();
      }, 60000); // Every minute

      // Set up graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start WebSocket service', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.exit(1);
    }
  }

  /**
   * Log connection statistics
   */
  private logConnectionStats(): void {
    const connectionMetrics = metrics.getConnectionMetrics();
    const socketCount = this.io.sockets.sockets.size;

    logger.info('Connection statistics', {
      currentConnections: socketCount,
      totalConnections: connectionMetrics.total,
      peakConnections: connectionMetrics.peak,
      uptime: Math.floor(connectionMetrics.uptime / 1000) + 's',
    });
  }

  /**
   * Set up graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        return;
      }

      this.isShuttingDown = true;

      logger.info(`Received ${signal}, starting graceful shutdown...`);

      try {
        // Stop health check server
        if (this.healthCheck) {
          logger.info('Stopping health check server...');
          this.healthCheck.stop();
        }

        // Stop accepting new connections
        logger.info('Closing Socket.io server...');
        await new Promise<void>((resolve) => {
          this.io.close(() => {
            logger.info('Socket.io server closed');
            resolve();
          });
        });

        // Disconnect all sockets
        const sockets = await this.io.fetchSockets();
        logger.info(`Disconnecting ${sockets.length} active sockets...`);
        sockets.forEach((socket) => {
          socket.disconnect(true);
        });

        // Disconnect from Redis
        logger.info('Disconnecting from Redis...');
        await disconnectRedis();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
      shutdown('unhandledRejection');
    });
  }

  /**
   * Get Socket.io server instance
   */
  getIO(): Server {
    return this.io;
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const connectionMetrics = metrics.getConnectionMetrics();
    const socketCount = this.io.sockets.sockets.size;

    return {
      status: 'healthy',
      connections: {
        active: socketCount,
        total: connectionMetrics.total,
        peak: connectionMetrics.peak,
      },
      uptime: connectionMetrics.uptime,
      timestamp: new Date().toISOString(),
    };
  }
}

// Create and start the service
const service = new WebSocketService();

// Start the service
service.start().catch((error) => {
  logger.error('Fatal error starting WebSocket service', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});

// Export for testing
export default service;
export { WebSocketService };
