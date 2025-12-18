import {io, Socket} from 'socket.io-client';
import {WS_URL, STORAGE_KEYS} from '@/constants/config';
import storageUtils from '@/utils/storage';
import {
  Message,
  TypingIndicator,
  OnlineStatus,
  Call,
  Notification,
  AuthTokens,
} from '@/types';

type SocketEvent =
  | 'connect'
  | 'disconnect'
  | 'error'
  | 'message:new'
  | 'message:delivered'
  | 'message:read'
  | 'message:deleted'
  | 'message:edited'
  | 'message:reaction'
  | 'typing:start'
  | 'typing:stop'
  | 'user:online'
  | 'user:offline'
  | 'call:incoming'
  | 'call:accepted'
  | 'call:rejected'
  | 'call:ended'
  | 'notification:new';

type EventCallback = (data: any) => void;

class SocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<SocketEvent, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    if (this.socket?.connected) {
      return;
    }

    const tokens = storageUtils.get<AuthTokens>(STORAGE_KEYS.AUTH_TOKENS);
    if (!tokens?.accessToken) {
      console.warn('No auth token available for socket connection');
      return;
    }

    this.socket = io(WS_URL, {
      auth: {
        token: tokens.accessToken,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
      this.emit('connect', {});
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.emit('disconnect', {reason});
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('error', error);
    });

    // Message events
    this.socket.on('message:new', (message: Message) => {
      this.emit('message:new', message);
    });

    this.socket.on('message:delivered', (data: {messageId: string}) => {
      this.emit('message:delivered', data);
    });

    this.socket.on('message:read', (data: {messageId: string}) => {
      this.emit('message:read', data);
    });

    this.socket.on('message:deleted', (data: {messageId: string}) => {
      this.emit('message:deleted', data);
    });

    this.socket.on('message:edited', (message: Message) => {
      this.emit('message:edited', message);
    });

    this.socket.on('message:reaction', (data: any) => {
      this.emit('message:reaction', data);
    });

    // Typing events
    this.socket.on('typing:start', (data: TypingIndicator) => {
      this.emit('typing:start', data);
    });

    this.socket.on('typing:stop', (data: TypingIndicator) => {
      this.emit('typing:stop', data);
    });

    // User status events
    this.socket.on('user:online', (data: OnlineStatus) => {
      this.emit('user:online', data);
    });

    this.socket.on('user:offline', (data: OnlineStatus) => {
      this.emit('user:offline', data);
    });

    // Call events
    this.socket.on('call:incoming', (call: Call) => {
      this.emit('call:incoming', call);
    });

    this.socket.on('call:accepted', (data: {callId: string}) => {
      this.emit('call:accepted', data);
    });

    this.socket.on('call:rejected', (data: {callId: string}) => {
      this.emit('call:rejected', data);
    });

    this.socket.on('call:ended', (data: {callId: string}) => {
      this.emit('call:ended', data);
    });

    // Notification events
    this.socket.on('notification:new', (notification: Notification) => {
      this.emit('notification:new', notification);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: SocketEvent, callback: EventCallback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(callback);
  }

  off(event: SocketEvent, callback: EventCallback) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(callback);
    }
  }

  private emit(event: SocketEvent, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(callback => callback(data));
    }
  }

  // Send events
  sendMessage(conversationId: string, message: Partial<Message>) {
    this.socket?.emit('message:send', {conversationId, message});
  }

  markAsDelivered(messageId: string) {
    this.socket?.emit('message:delivered', {messageId});
  }

  markAsRead(messageId: string) {
    this.socket?.emit('message:read', {messageId});
  }

  deleteMessage(messageId: string, forEveryone: boolean = false) {
    this.socket?.emit('message:delete', {messageId, forEveryone});
  }

  editMessage(messageId: string, content: string) {
    this.socket?.emit('message:edit', {messageId, content});
  }

  addReaction(messageId: string, emoji: string) {
    this.socket?.emit('message:reaction:add', {messageId, emoji});
  }

  removeReaction(messageId: string, emoji: string) {
    this.socket?.emit('message:reaction:remove', {messageId, emoji});
  }

  startTyping(conversationId: string) {
    this.socket?.emit('typing:start', {conversationId});
  }

  stopTyping(conversationId: string) {
    this.socket?.emit('typing:stop', {conversationId});
  }

  updateStatus(status: 'online' | 'offline' | 'away') {
    this.socket?.emit('user:status', {status});
  }

  initiateCall(participantIds: string[], type: 'audio' | 'video') {
    this.socket?.emit('call:initiate', {participantIds, type});
  }

  acceptCall(callId: string) {
    this.socket?.emit('call:accept', {callId});
  }

  rejectCall(callId: string) {
    this.socket?.emit('call:reject', {callId});
  }

  endCall(callId: string) {
    this.socket?.emit('call:end', {callId});
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
export default socketService;
