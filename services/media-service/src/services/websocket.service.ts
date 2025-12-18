import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { logger } from '../config/logger.config';
import jwt from 'jsonwebtoken';

interface UploadProgress {
  uploadId: string;
  userId: string;
  progress: number;
  bytesUploaded: number;
  totalBytes: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
}

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  uploadId?: string;
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  initialize(port: number = 3004): void {
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    logger.info('WebSocket server initialized', { port });
  }

  private handleConnection(ws: AuthenticatedWebSocket, req: IncomingMessage): void {
    logger.info('New WebSocket connection', {
      url: req.url,
      ip: req.socket.remoteAddress,
    });

    // Extract authentication token from query string
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      logger.warn('WebSocket connection rejected: No token provided');
      ws.close(1008, 'Authentication required');
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
        userId: string;
      };

      ws.userId = decoded.userId;

      // Register client
      if (!this.clients.has(decoded.userId)) {
        this.clients.set(decoded.userId, new Set());
      }
      this.clients.get(decoded.userId)?.add(ws);

      logger.info('WebSocket client authenticated', { userId: decoded.userId });

      ws.on('message', (message: Buffer) => {
        this.handleMessage(ws, message);
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', { error, userId: ws.userId });
      });

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: 'connected',
          message: 'WebSocket connection established',
          userId: decoded.userId,
        })
      );
    } catch (error) {
      logger.error('WebSocket authentication failed', { error });
      ws.close(1008, 'Authentication failed');
    }
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: Buffer): void {
    try {
      const data = JSON.parse(message.toString());

      logger.debug('WebSocket message received', {
        userId: ws.userId,
        type: data.type,
      });

      switch (data.type) {
        case 'subscribe':
          if (data.uploadId) {
            ws.uploadId = data.uploadId;
            logger.info('Client subscribed to upload', {
              userId: ws.userId,
              uploadId: data.uploadId,
            });
          }
          break;

        case 'unsubscribe':
          ws.uploadId = undefined;
          logger.info('Client unsubscribed from upload', { userId: ws.userId });
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          logger.warn('Unknown WebSocket message type', { type: data.type });
      }
    } catch (error) {
      logger.error('Failed to process WebSocket message', { error });
    }
  }

  private handleDisconnection(ws: AuthenticatedWebSocket): void {
    if (ws.userId) {
      const userClients = this.clients.get(ws.userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          this.clients.delete(ws.userId);
        }
      }

      logger.info('WebSocket client disconnected', { userId: ws.userId });
    }
  }

  sendProgress(progress: UploadProgress): void {
    const userClients = this.clients.get(progress.userId);

    if (!userClients || userClients.size === 0) {
      return;
    }

    const message = JSON.stringify({
      type: 'upload_progress',
      data: progress,
    });

    userClients.forEach((client) => {
      if (
        client.readyState === WebSocket.OPEN &&
        (!client.uploadId || client.uploadId === progress.uploadId)
      ) {
        client.send(message);
      }
    });

    logger.debug('Progress update sent', {
      userId: progress.userId,
      uploadId: progress.uploadId,
      progress: progress.progress,
      status: progress.status,
    });
  }

  sendError(userId: string, uploadId: string, error: string): void {
    this.sendProgress({
      uploadId,
      userId,
      progress: 0,
      bytesUploaded: 0,
      totalBytes: 0,
      status: 'error',
      message: error,
    });
  }

  sendCompletion(userId: string, uploadId: string, s3Key: string): void {
    this.sendProgress({
      uploadId,
      userId,
      progress: 100,
      bytesUploaded: 0,
      totalBytes: 0,
      status: 'completed',
      message: `File uploaded successfully: ${s3Key}`,
    });
  }

  close(): void {
    if (this.wss) {
      this.wss.close();
      logger.info('WebSocket server closed');
    }
  }
}

export const websocketService = new WebSocketService();
