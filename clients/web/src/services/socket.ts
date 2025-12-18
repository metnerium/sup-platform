import { io, Socket } from 'socket.io-client';
import type { Message, TypingIndicator, Presence, Call } from '@/types';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:4001', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventHandlers();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  // Message events
  onNewMessage(callback: (message: Message) => void) {
    this.socket?.on('message:new', callback);
  }

  onMessageUpdate(callback: (message: Message) => void) {
    this.socket?.on('message:update', callback);
  }

  onMessageDelete(callback: (messageId: string) => void) {
    this.socket?.on('message:delete', callback);
  }

  onMessageStatus(callback: (data: { messageId: string; status: string }) => void) {
    this.socket?.on('message:status', callback);
  }

  sendMessage(message: Partial<Message>) {
    this.socket?.emit('message:send', message);
  }

  editMessage(messageId: string, content: string) {
    this.socket?.emit('message:edit', { messageId, content });
  }

  deleteMessage(messageId: string, forEveryone: boolean = false) {
    this.socket?.emit('message:delete', { messageId, forEveryone });
  }

  markAsRead(chatId: string, messageIds: string[]) {
    this.socket?.emit('message:read', { chatId, messageIds });
  }

  reactToMessage(messageId: string, emoji: string) {
    this.socket?.emit('message:react', { messageId, emoji });
  }

  // Typing indicator
  onTyping(callback: (data: TypingIndicator) => void) {
    this.socket?.on('typing:start', callback);
  }

  onStopTyping(callback: (data: TypingIndicator) => void) {
    this.socket?.on('typing:stop', callback);
  }

  startTyping(chatId: string) {
    this.socket?.emit('typing:start', { chatId });
  }

  stopTyping(chatId: string) {
    this.socket?.emit('typing:stop', { chatId });
  }

  // Presence
  onPresenceUpdate(callback: (presence: Presence) => void) {
    this.socket?.on('presence:update', callback);
  }

  updatePresence(isOnline: boolean) {
    this.socket?.emit('presence:update', { isOnline });
  }

  // Calls
  onIncomingCall(callback: (call: Call) => void) {
    this.socket?.on('call:incoming', callback);
  }

  onCallAccepted(callback: (call: Call) => void) {
    this.socket?.on('call:accepted', callback);
  }

  onCallDeclined(callback: (callId: string) => void) {
    this.socket?.on('call:declined', callback);
  }

  onCallEnded(callback: (callId: string) => void) {
    this.socket?.on('call:ended', callback);
  }

  initiateCall(participantIds: string[], type: 'audio' | 'video') {
    this.socket?.emit('call:initiate', { participantIds, type });
  }

  acceptCall(callId: string) {
    this.socket?.emit('call:accept', { callId });
  }

  declineCall(callId: string) {
    this.socket?.emit('call:decline', { callId });
  }

  endCall(callId: string) {
    this.socket?.emit('call:end', { callId });
  }

  // Chat events
  onChatUpdate(callback: (chatId: string) => void) {
    this.socket?.on('chat:update', callback);
  }

  onChatDelete(callback: (chatId: string) => void) {
    this.socket?.on('chat:delete', callback);
  }

  // Group events
  onGroupMemberAdded(callback: (data: { groupId: string; userId: string }) => void) {
    this.socket?.on('group:member:added', callback);
  }

  onGroupMemberRemoved(callback: (data: { groupId: string; userId: string }) => void) {
    this.socket?.on('group:member:removed', callback);
  }

  onGroupUpdate(callback: (groupId: string) => void) {
    this.socket?.on('group:update', callback);
  }

  // Stories
  onNewStory(callback: (userId: string) => void) {
    this.socket?.on('story:new', callback);
  }

  onStoryView(callback: (data: { storyId: string; userId: string }) => void) {
    this.socket?.on('story:view', callback);
  }

  // Remove listeners
  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
