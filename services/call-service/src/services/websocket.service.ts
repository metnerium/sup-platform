import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { redisPub, redisSub } from '../config/redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { callService } from './call.service';
import {
  CallEvent,
  CallInvitation,
  CallEndReason,
} from '@sup/types';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export class WebSocketService {
  private io: SocketIOServer | null = null;

  /**
   * Initialize WebSocket server
   */
  async initialize(httpServer: HttpServer): Promise<void> {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.cors.origin,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Set up Redis adapter for scaling
    this.io.adapter(createAdapter(redisPub, redisSub));

    // Authentication middleware
    this.io.use(this.authenticateSocket.bind(this));

    // Handle connections
    this.io.on('connection', this.handleConnection.bind(this));

    logger.info('WebSocket service initialized');
  }

  /**
   * Authenticate socket connection
   */
  private async authenticateSocket(
    socket: AuthenticatedSocket,
    next: (err?: Error) => void
  ): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, config.jwt.secret) as any;
      socket.userId = decoded.userId;
      socket.username = decoded.username;

      logger.info('Socket authenticated', {
        socketId: socket.id,
        userId: socket.userId,
      });

      next();
    } catch (error) {
      logger.error('Socket authentication failed', { error });
      next(new Error('Authentication failed'));
    }
  }

  /**
   * Handle socket connection
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;

    logger.info('Client connected', { socketId: socket.id, userId });

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Handle call events
    socket.on('call:invite', (data) => this.handleCallInvite(socket, data));
    socket.on('call:accept', (data) => this.handleCallAccept(socket, data));
    socket.on('call:decline', (data) => this.handleCallDecline(socket, data));
    socket.on('call:end', (data) => this.handleCallEnd(socket, data));
    socket.on('call:toggle_audio', (data) => this.handleToggleAudio(socket, data));
    socket.on('call:toggle_video', (data) => this.handleToggleVideo(socket, data));
    socket.on('call:toggle_screen_share', (data) => this.handleToggleScreenShare(socket, data));
    socket.on('call:quality_update', (data) => this.handleQualityUpdate(socket, data));

    // WebRTC signaling
    socket.on('webrtc:offer', (data) => this.handleWebRTCOffer(socket, data));
    socket.on('webrtc:answer', (data) => this.handleWebRTCAnswer(socket, data));
    socket.on('webrtc:ice_candidate', (data) => this.handleICECandidate(socket, data));

    // Handle disconnection
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  /**
   * Handle call invitation
   */
  private async handleCallInvite(
    socket: AuthenticatedSocket,
    data: { callId: string; invitation: CallInvitation }
  ): Promise<void> {
    try {
      const { callId, invitation } = data;

      // Send invitation to all participants
      for (const participantId of invitation.participants) {
        this.emitToUser(participantId, CallEvent.INCOMING, {
          callId,
          invitation,
        });
      }

      logger.info('Call invitation sent', {
        callId,
        participants: invitation.participants.length,
      });
    } catch (error) {
      logger.error('Failed to handle call invite', { error });
      socket.emit(CallEvent.ERROR, { error: 'Failed to send invitation' });
    }
  }

  /**
   * Handle call acceptance
   */
  private async handleCallAccept(
    socket: AuthenticatedSocket,
    data: { callId: string }
  ): Promise<void> {
    try {
      const userId = socket.userId!;
      const { callId } = data;

      // Mark participant as connecting
      await callService.markParticipantConnected(userId, callId);

      // Notify other participants
      this.emitToCall(callId, CallEvent.ACCEPTED, {
        callId,
        userId,
      });

      logger.info('Call accepted', { callId, userId });
    } catch (error) {
      logger.error('Failed to handle call accept', { error });
      socket.emit(CallEvent.ERROR, { error: 'Failed to accept call' });
    }
  }

  /**
   * Handle call decline
   */
  private async handleCallDecline(
    socket: AuthenticatedSocket,
    data: { callId: string }
  ): Promise<void> {
    try {
      const userId = socket.userId!;
      const { callId } = data;

      // End call for this user
      await callService.endCall(callId, userId, CallEndReason.DECLINED);

      // Notify other participants
      this.emitToCall(callId, CallEvent.DECLINED, {
        callId,
        userId,
      });

      logger.info('Call declined', { callId, userId });
    } catch (error) {
      logger.error('Failed to handle call decline', { error });
      socket.emit(CallEvent.ERROR, { error: 'Failed to decline call' });
    }
  }

  /**
   * Handle call end
   */
  private async handleCallEnd(
    socket: AuthenticatedSocket,
    data: { callId: string; reason?: CallEndReason }
  ): Promise<void> {
    try {
      const userId = socket.userId!;
      const { callId, reason } = data;

      await callService.endCall(callId, userId, reason || CallEndReason.NORMAL);

      // Notify other participants
      this.emitToCall(callId, CallEvent.ENDED, {
        callId,
        userId,
        reason,
      });

      logger.info('Call ended', { callId, userId, reason });
    } catch (error) {
      logger.error('Failed to handle call end', { error });
      socket.emit(CallEvent.ERROR, { error: 'Failed to end call' });
    }
  }

  /**
   * Handle audio toggle
   */
  private async handleToggleAudio(
    socket: AuthenticatedSocket,
    data: { callId: string; enabled: boolean }
  ): Promise<void> {
    try {
      const userId = socket.userId!;
      const { callId, enabled } = data;

      await callService.updateParticipantSettings(userId, callId, {
        audioEnabled: enabled,
      });

      // Notify other participants
      this.emitToCall(callId, CallEvent.PARTICIPANT_UPDATED, {
        callId,
        userId,
        participant: { audioEnabled: enabled },
      });

      logger.info('Audio toggled', { callId, userId, enabled });
    } catch (error) {
      logger.error('Failed to toggle audio', { error });
      socket.emit(CallEvent.ERROR, { error: 'Failed to toggle audio' });
    }
  }

  /**
   * Handle video toggle
   */
  private async handleToggleVideo(
    socket: AuthenticatedSocket,
    data: { callId: string; enabled: boolean }
  ): Promise<void> {
    try {
      const userId = socket.userId!;
      const { callId, enabled } = data;

      await callService.updateParticipantSettings(userId, callId, {
        videoEnabled: enabled,
      });

      // Notify other participants
      this.emitToCall(callId, CallEvent.PARTICIPANT_UPDATED, {
        callId,
        userId,
        participant: { videoEnabled: enabled },
      });

      logger.info('Video toggled', { callId, userId, enabled });
    } catch (error) {
      logger.error('Failed to toggle video', { error });
      socket.emit(CallEvent.ERROR, { error: 'Failed to toggle video' });
    }
  }

  /**
   * Handle screen share toggle
   */
  private async handleToggleScreenShare(
    socket: AuthenticatedSocket,
    data: { callId: string; enabled: boolean }
  ): Promise<void> {
    try {
      const userId = socket.userId!;
      const { callId, enabled } = data;

      await callService.updateParticipantSettings(userId, callId, {
        screenShareEnabled: enabled,
      });

      // Notify other participants
      this.emitToCall(callId, CallEvent.PARTICIPANT_UPDATED, {
        callId,
        userId,
        participant: { screenShareEnabled: enabled },
      });

      logger.info('Screen share toggled', { callId, userId, enabled });
    } catch (error) {
      logger.error('Failed to toggle screen share', { error });
      socket.emit(CallEvent.ERROR, { error: 'Failed to toggle screen share' });
    }
  }

  /**
   * Handle quality update
   */
  private async handleQualityUpdate(
    socket: AuthenticatedSocket,
    data: {
      callId: string;
      jitter: number;
      packetLoss: number;
      roundTripTime: number;
      bandwidth: number;
      fps?: number;
      resolution?: string;
      codec?: string;
    }
  ): Promise<void> {
    try {
      const userId = socket.userId!;
      const { callId, ...metrics } = data;

      await callService.saveQualityMetrics(userId, callId, metrics);
    } catch (error) {
      logger.error('Failed to handle quality update', { error });
    }
  }

  /**
   * Handle WebRTC offer
   */
  private handleWebRTCOffer(
    socket: AuthenticatedSocket,
    data: { callId: string; targetUserId: string; offer: any }
  ): void {
    const { callId, targetUserId, offer } = data;
    this.emitToUser(targetUserId, 'webrtc:offer', {
      callId,
      fromUserId: socket.userId,
      offer,
    });
  }

  /**
   * Handle WebRTC answer
   */
  private handleWebRTCAnswer(
    socket: AuthenticatedSocket,
    data: { callId: string; targetUserId: string; answer: any }
  ): void {
    const { callId, targetUserId, answer } = data;
    this.emitToUser(targetUserId, 'webrtc:answer', {
      callId,
      fromUserId: socket.userId,
      answer,
    });
  }

  /**
   * Handle ICE candidate
   */
  private handleICECandidate(
    socket: AuthenticatedSocket,
    data: { callId: string; targetUserId: string; candidate: any }
  ): void {
    const { callId, targetUserId, candidate } = data;
    this.emitToUser(targetUserId, 'webrtc:ice_candidate', {
      callId,
      fromUserId: socket.userId,
      candidate,
    });
  }

  /**
   * Handle disconnect
   */
  private async handleDisconnect(socket: AuthenticatedSocket): Promise<void> {
    const userId = socket.userId!;
    logger.info('Client disconnected', { socketId: socket.id, userId });

    // Note: Don't automatically end calls on disconnect
    // The user might reconnect soon
  }

  /**
   * Emit event to specific user
   */
  public emitToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit event to all participants in a call
   */
  public async emitToCall(
    callId: string,
    event: string,
    data: any
  ): Promise<void> {
    if (!this.io) return;

    try {
      const participants = await callService.getCallParticipants(callId);
      for (const participant of participants) {
        this.emitToUser(participant.userId, event, data);
      }
    } catch (error) {
      logger.error('Failed to emit to call', { callId, event, error });
    }
  }

  /**
   * Get server instance
   */
  public getServer(): SocketIOServer | null {
    return this.io;
  }
}

export const websocketService = new WebSocketService();
