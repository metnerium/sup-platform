// Common types used across the application

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    statusCode: number;
    details?: any;
  };
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export type UserStatus = 'online' | 'offline' | 'away';
export type ChatType = 'direct' | 'group' | 'channel';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice' | 'sticker';
export type StoryMediaType = 'image' | 'video' | 'text';
