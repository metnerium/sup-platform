import { ChatType } from './common.types';

// Chat types

export interface Chat {
  id: string;
  type: ChatType;
  name?: string;
  description?: string;
  avatarUrl?: string;
  createdBy: string;
  isPublic: boolean;
  inviteLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMember {
  chatId: string;
  userId: string;
  roleId?: string;
  joinedAt: Date;
  leftAt?: Date;
  invitedBy?: string;
}

export interface ChatRole {
  id: string;
  chatId: string;
  name: string;
  permissions: Record<string, boolean>;
  color?: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface CreateChatRequest {
  type: ChatType;
  name?: string;
  description?: string;
  memberIds?: string[];
}

export interface CreateChatResponse {
  chat: Chat;
  members: ChatMember[];
}
