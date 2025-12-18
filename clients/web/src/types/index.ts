export interface User {
  id: string;
  username: string;
  phone?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  isOnline: boolean;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content?: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice';
  replyTo?: string;
  forwarded?: boolean;
  edited?: boolean;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  status: 'sending' | 'sent' | 'delivered' | 'read';
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  filename?: string;
  size?: number;
  duration?: number;
  thumbnail?: string;
  width?: number;
  height?: number;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  createdAt: Date;
}

export interface Chat {
  id: string;
  type: 'private' | 'group' | 'channel';
  name?: string;
  avatar?: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group extends Chat {
  type: 'group';
  name: string;
  description?: string;
  avatar?: string;
  ownerId: string;
  adminIds: string[];
  settings: {
    onlyAdminsCanPost: boolean;
    onlyAdminsCanAddMembers: boolean;
    approveNewMembers: boolean;
  };
}

export interface Contact {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isBlocked: boolean;
  isFavorite: boolean;
  createdAt: Date;
}

export interface Story {
  id: string;
  userId: string;
  type: 'text' | 'image' | 'video';
  content?: string;
  mediaUrl?: string;
  backgroundColor?: string;
  duration: number;
  views: StoryView[];
  reactions: StoryReaction[];
  createdAt: Date;
  expiresAt: Date;
}

export interface StoryView {
  userId: string;
  viewedAt: Date;
}

export interface StoryReaction {
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface Call {
  id: string;
  roomId: string;
  type: 'audio' | 'video';
  initiatorId: string;
  participantIds: string[];
  status: 'ringing' | 'ongoing' | 'ended' | 'missed' | 'declined';
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
}

export interface TypingIndicator {
  chatId: string;
  userId: string;
  isTyping: boolean;
}

export interface Presence {
  userId: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface Session {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: string;
  ipAddress: string;
  location?: string;
  isActive: boolean;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface NotificationSettings {
  messageNotifications: boolean;
  callNotifications: boolean;
  groupNotifications: boolean;
  storyNotifications: boolean;
  sound: boolean;
  vibration: boolean;
}

export interface PrivacySettings {
  lastSeen: 'everyone' | 'contacts' | 'nobody';
  profilePhoto: 'everyone' | 'contacts' | 'nobody';
  about: 'everyone' | 'contacts' | 'nobody';
  readReceipts: boolean;
  groupInvites: 'everyone' | 'contacts' | 'nobody';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  identifier: string; // phone or email
  password: string;
}

export interface RegisterData {
  username: string;
  phone?: string;
  email?: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface VerificationCode {
  code: string;
  method: 'sms' | 'email' | 'authenticator';
}
