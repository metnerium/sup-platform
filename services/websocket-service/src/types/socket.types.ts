import { Socket } from 'socket.io';

// Extended Socket with authenticated user data
export interface AuthenticatedSocket extends Socket {
  userId: string;
  deviceId?: string;
}

// Presence status types
export type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';

// Message event payloads
export interface MessageNewPayload {
  chatId: string;
  encryptedContent: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice';
  replyToId?: string;
  metadata?: Record<string, any>;
  tempId?: string; // Client-side temporary ID
}

export interface MessageNewResponse {
  message: {
    id: string;
    chatId: string;
    senderId: string;
    encryptedContent: string;
    messageType: string;
    replyToId?: string;
    createdAt: string;
    status: 'sent' | 'delivered' | 'read';
    tempId?: string;
  };
  sender: {
    id: string;
    username: string;
    avatar?: string;
  };
}

export interface MessageDeliveredPayload {
  messageId: string;
  chatId: string;
  deliveredAt?: string;
}

export interface MessageReadPayload {
  messageId: string;
  chatId: string;
  readAt?: string;
}

export interface MessageTypingPayload {
  chatId: string;
}

export interface MessageStopTypingPayload {
  chatId: string;
}

// Presence event payloads
export interface PresenceUpdatePayload {
  status: PresenceStatus;
  customStatus?: string;
}

export interface PresenceSubscribePayload {
  userIds: string[];
}

export interface PresenceUnsubscribePayload {
  userIds: string[];
}

export interface PresenceBroadcast {
  userId: string;
  status: PresenceStatus;
  lastSeen?: number;
  customStatus?: string;
}

// WebRTC types (for Node.js environment without DOM)
export interface RTCSessionDescription {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp: string;
}

export interface RTCIceCandidate {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

// Call event payloads
export interface CallIncomingPayload {
  callId: string;
  callerId: string;
  targetUserId: string;
  callType: 'audio' | 'video';
  offer: RTCSessionDescription;
}

export interface CallAnswerPayload {
  callId: string;
  answer: RTCSessionDescription;
}

export interface CallRejectPayload {
  callId: string;
  reason?: string;
}

export interface CallEndPayload {
  callId: string;
}

export interface CallIceCandidatePayload {
  callId: string;
  candidate: RTCIceCandidate;
}

export interface CallBroadcast {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
  offer?: RTCSessionDescription;
  answer?: RTCSessionDescription;
  status: 'incoming' | 'answered' | 'rejected' | 'ended' | 'missed';
}

// Reaction event payloads
export interface ReactionNewPayload {
  messageId: string;
  chatId: string;
  reaction: string; // emoji or reaction identifier
}

export interface ReactionRemovePayload {
  messageId: string;
  chatId: string;
  reaction: string;
}

export interface ReactionBroadcast {
  messageId: string;
  chatId: string;
  userId: string;
  userName: string;
  reaction: string;
  action: 'add' | 'remove';
  timestamp: string;
}

// Server-to-client events
export interface ServerToClientEvents {
  // Message events
  'message:new': (data: MessageNewResponse) => void;
  'message:delivered': (data: { messageId: string; userId: string; deliveredAt: string }) => void;
  'message:read': (data: { messageId: string; userId: string; readAt: string }) => void;
  'message:typing': (data: { chatId: string; userId: string; userName: string }) => void;
  'message:stop-typing': (data: { chatId: string; userId: string }) => void;

  // Presence events
  'presence:update': (data: PresenceBroadcast) => void;

  // Call events
  'call:incoming': (data: CallBroadcast) => void;
  'call:answer': (data: CallBroadcast) => void;
  'call:reject': (data: CallBroadcast) => void;
  'call:end': (data: CallBroadcast) => void;
  'call:ice-candidate': (data: { callId: string; candidate: RTCIceCandidate }) => void;

  // Reaction events
  'reaction:new': (data: ReactionBroadcast) => void;
  'reaction:remove': (data: ReactionBroadcast) => void;

  // System events
  'error': (data: { message: string; code?: string }) => void;
  'connected': (data: { userId: string; socketId: string }) => void;
}

// Client-to-server events
export interface ClientToServerEvents {
  // Message events
  'message:new': (data: MessageNewPayload, callback?: (response: any) => void) => void;
  'message:delivered': (data: MessageDeliveredPayload) => void;
  'message:read': (data: MessageReadPayload) => void;
  'message:typing': (data: MessageTypingPayload) => void;
  'message:stop-typing': (data: MessageStopTypingPayload) => void;

  // Presence events
  'presence:update': (data: PresenceUpdatePayload) => void;
  'presence:subscribe': (data: PresenceSubscribePayload) => void;
  'presence:unsubscribe': (data: PresenceUnsubscribePayload) => void;

  // Call events
  'call:initiate': (data: CallIncomingPayload, callback?: (response: any) => void) => void;
  'call:answer': (data: CallAnswerPayload) => void;
  'call:reject': (data: CallRejectPayload) => void;
  'call:end': (data: CallEndPayload) => void;
  'call:ice-candidate': (data: CallIceCandidatePayload) => void;

  // Reaction events
  'reaction:new': (data: ReactionNewPayload) => void;
  'reaction:remove': (data: ReactionRemovePayload) => void;
}

// Socket data structure
export interface SocketData {
  userId: string;
  deviceId?: string;
  sessionId?: string;
}

// Rate limit configuration
export interface RateLimitConfig {
  event: string;
  limit: number;
  windowMs: number;
}

// Error response structure
export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
}
