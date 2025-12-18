import { UserStatus } from './common.types';

// User types

export interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  status: UserStatus;
  lastSeen?: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDevice {
  id: string;
  userId: string;
  deviceId: string;
  deviceName?: string;
  deviceType?: string;
  pushToken?: string;
  publicKey?: string;
  lastActive: Date;
  createdAt: Date;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  status: UserStatus;
  lastSeen?: Date;
}

export interface Contact {
  userId: string;
  contactUserId: string;
  displayName?: string;
  addedAt: Date;
}
