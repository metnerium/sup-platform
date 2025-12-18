// Call-related types for SUP Messenger

export enum CallType {
  AUDIO = 'audio',
  VIDEO = 'video',
}

export enum CallState {
  INITIATING = 'initiating',
  RINGING = 'ringing',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ENDED = 'ended',
  FAILED = 'failed',
  BUSY = 'busy',
  DECLINED = 'declined',
  MISSED = 'missed',
  CANCELLED = 'cancelled',
}

export enum CallEndReason {
  NORMAL = 'normal',
  TIMEOUT = 'timeout',
  DECLINED = 'declined',
  BUSY = 'busy',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  NETWORK_ERROR = 'network_error',
  NO_ANSWER = 'no_answer',
}

export enum ParticipantRole {
  INITIATOR = 'initiator',
  PARTICIPANT = 'participant',
}

export interface Call {
  id: string;
  roomId: string;
  type: CallType;
  state: CallState;
  initiatorId: string;
  chatId?: string;
  isGroup: boolean;
  maxParticipants: number;
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
  endReason?: CallEndReason;
  recordingEnabled: boolean;
  recordingUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CallParticipant {
  id: string;
  callId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt?: Date;
  leftAt?: Date;
  duration?: number;
  connectionState: CallState;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShareEnabled: boolean;
  connectionQuality?: ConnectionQuality;
}

export interface ConnectionQuality {
  jitter: number;
  packetLoss: number;
  latency: number;
  bandwidth: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface CallRecording {
  id: string;
  callId: string;
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
  fileSize?: number;
  s3Key?: string;
  url?: string;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

export interface CallInvitation {
  callId: string;
  roomId: string;
  type: CallType;
  initiatorId: string;
  initiatorName: string;
  initiatorAvatar?: string;
  chatId?: string;
  isGroup: boolean;
  participants: string[];
}

export interface LiveKitToken {
  token: string;
  url: string;
  roomName: string;
  identity: string;
}

export interface ICEServer {
  urls: string[];
  username?: string;
  credential?: string;
}

export interface CallMetrics {
  totalCalls: number;
  activeCalls: number;
  completedCalls: number;
  failedCalls: number;
  averageDuration: number;
  averageConnectionTime: number;
  successRate: number;
  peakConcurrentCalls: number;
}

export interface CallQualityMetrics {
  callId: string;
  participantId: string;
  timestamp: Date;
  jitter: number;
  packetLoss: number;
  roundTripTime: number;
  bandwidth: number;
  fps?: number;
  resolution?: string;
  codec?: string;
}

// WebSocket Events
export enum CallEvent {
  INCOMING = 'call:incoming',
  RINGING = 'call:ringing',
  ACCEPTED = 'call:accepted',
  DECLINED = 'call:declined',
  CANCELLED = 'call:cancelled',
  ENDED = 'call:ended',
  PARTICIPANT_JOINED = 'call:participant_joined',
  PARTICIPANT_LEFT = 'call:participant_left',
  PARTICIPANT_UPDATED = 'call:participant_updated',
  STATE_CHANGED = 'call:state_changed',
  QUALITY_CHANGED = 'call:quality_changed',
  ERROR = 'call:error',
}

export interface CallEventPayload {
  callId: string;
  userId?: string;
  state?: CallState;
  reason?: CallEndReason;
  participant?: CallParticipant;
  quality?: ConnectionQuality;
  error?: string;
}

// API Request/Response Types
export interface StartCallRequest {
  type: CallType;
  chatId?: string;
  participantIds: string[];
  videoEnabled?: boolean;
  audioEnabled?: boolean;
}

export interface StartCallResponse {
  call: Call;
  token: LiveKitToken;
  iceServers: ICEServer[];
}

export interface JoinCallRequest {
  videoEnabled?: boolean;
  audioEnabled?: boolean;
}

export interface JoinCallResponse {
  call: Call;
  token: LiveKitToken;
  iceServers: ICEServer[];
  participants: CallParticipant[];
}

export interface EndCallRequest {
  reason?: CallEndReason;
}

export interface UpdateParticipantRequest {
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  screenShareEnabled?: boolean;
}

export interface CallHistoryQuery {
  userId?: string;
  chatId?: string;
  type?: CallType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface CallHistoryItem {
  call: Call;
  participants: CallParticipant[];
  initiator: {
    id: string;
    username: string;
    avatar?: string;
  };
}
