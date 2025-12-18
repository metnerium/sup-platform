export interface User {
  id: string;
  phoneNumber: string;
  username?: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
  publicKey?: string;
  twoFactorEnabled: boolean;
  privacySettings: PrivacySettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrivacySettings {
  lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
  profilePhotoVisibility: 'everyone' | 'contacts' | 'nobody';
  statusVisibility: 'everyone' | 'contacts' | 'nobody';
  readReceipts: boolean;
  groupAddPermission: 'everyone' | 'contacts' | 'nobody';
}

export interface Contact {
  id: string;
  userId: string;
  user: User;
  displayName?: string;
  phoneNumber: string;
  isBlocked: boolean;
  isFavorite: boolean;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'channel';
  name?: string;
  avatar?: string;
  participants: Participant[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Participant {
  id: string;
  userId: string;
  user: User;
  conversationId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
  leftAt?: Date;
  isActive: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: User;
  content?: string;
  type: MessageType;
  status: MessageStatus;
  replyTo?: Message;
  replyToId?: string;
  forwardedFrom?: Message;
  reactions: Reaction[];
  attachments: Attachment[];
  metadata?: Record<string, any>;
  isEdited: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  localId?: string;
  expiresAt?: Date;
}

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'voice'
  | 'file'
  | 'location'
  | 'contact'
  | 'sticker'
  | 'gif'
  | 'poll'
  | 'system';

export type MessageStatus =
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  user: User;
  emoji: string;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  messageId: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  thumbnailUrl?: string;
  filename: string;
  mimeType: string;
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  metadata?: Record<string, any>;
}

export interface Story {
  id: string;
  userId: string;
  user: User;
  type: 'image' | 'video' | 'text';
  content: string;
  thumbnail?: string;
  backgroundColor?: string;
  duration: number;
  views: StoryView[];
  replies: StoryReply[];
  expiresAt: Date;
  createdAt: Date;
}

export interface StoryView {
  id: string;
  storyId: string;
  userId: string;
  user: User;
  viewedAt: Date;
}

export interface StoryReply {
  id: string;
  storyId: string;
  userId: string;
  user: User;
  content: string;
  createdAt: Date;
}

export interface Call {
  id: string;
  roomId: string;
  type: 'audio' | 'video';
  status: CallStatus;
  initiatorId: string;
  initiator: User;
  participants: CallParticipant[];
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
  createdAt: Date;
}

export type CallStatus =
  | 'ringing'
  | 'connecting'
  | 'active'
  | 'ended'
  | 'missed'
  | 'declined'
  | 'failed';

export interface CallParticipant {
  id: string;
  callId: string;
  userId: string;
  user: User;
  joinedAt?: Date;
  leftAt?: Date;
  isMuted: boolean;
  isVideoEnabled: boolean;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  userId: string;
  isRead: boolean;
  createdAt: Date;
}

export type NotificationType =
  | 'message'
  | 'call_incoming'
  | 'call_missed'
  | 'story'
  | 'contact_joined'
  | 'group_invite'
  | 'mention';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface OnlineStatus {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
}

export interface MessageQueue {
  id: string;
  message: Partial<Message>;
  conversationId: string;
  retryCount: number;
  error?: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: 'ios' | 'android';
  osVersion: string;
  appVersion: string;
  fcmToken?: string;
}
