import http from 'http';
import { Server } from 'socket.io';
import logger from './logger';
import { metrics } from './metrics';
import { redisClient } from './redis';

/**
 * Health check utilities
 */
export class HealthCheck {
  private io: Server;
  private httpServer: http.Server | null = null;
  private healthCheckPort: number;

  constructor(io: Server, healthCheckPort: number = 9091) {
    this.io = io;
    this.healthCheckPort = healthCheckPort;
  }

  /**
   * Start health check HTTP server
   */
  start(): void {
    this.httpServer = http.createServer(async (req, res) => {
      if (req.url === '/health') {
        await this.handleHealthCheck(req, res);
      } else if (req.url === '/metrics') {
        await this.handleMetrics(req, res);
      } else if (req.url === '/ready') {
        await this.handleReadiness(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    this.httpServer.listen(this.healthCheckPort, () => {
      logger.info('Health check server started', {
        port: this.healthCheckPort,
      });
    });
  }

  /**
   * Handle health check request
   */
  private async handleHealthCheck(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    try {
      const health = await this.getHealthStatus();

      const statusCode = health.status === 'healthy' ? 200 : 503;

      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health, null, 2));
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }

  /**
   * Handle metrics request
   */
  private async handleMetrics(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    try {
      const allMetrics = metrics.getAllMetrics();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(allMetrics, null, 2));
    } catch (error) {
      logger.error('Failed to get metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }

  /**
   * Handle readiness check
   */
  private async handleReadiness(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    try {
      // Check if Redis is connected
      const redisReady = redisClient.isReady;

      // Check if Socket.io is running
      const socketReady = this.io !== null;

      const ready = redisReady && socketReady;

      const statusCode = ready ? 200 : 503;

      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ready,
        checks: {
          redis: redisReady,
          socket: socketReady,
        },
        timestamp: new Date().toISOString(),
      }, null, 2));
    } catch (error) {
      logger.error('Readiness check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ready: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }

  /**
   * Get health status
   */
  private async getHealthStatus(): Promise<any> {
    const connectionMetrics = metrics.getConnectionMetrics();
    const socketCount = this.io.sockets.sockets.size;

    // Check Redis connection
    const redisHealthy = redisClient.isReady;

    // Determine overall health
    const status = redisHealthy ? 'healthy' : 'degraded';

    return {
      status,
      service: 'websocket-service',
      connections: {
        active: socketCount,
        total: connectionMetrics.total,
        peak: connectionMetrics.peak,
      },
      uptime: connectionMetrics.uptime,
      dependencies: {
        redis: redisHealthy ? 'connected' : 'disconnected',
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Stop health check server
   */
  stop(): void {
    if (this.httpServer) {
      this.httpServer.close(() => {
        logger.info('Health check server stopped');
      });
    }
  }
}

export default HealthCheck;
