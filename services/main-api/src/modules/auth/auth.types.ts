import { Request } from 'express';

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    deviceId: string;
  };
}

/**
 * User session data
 */
export interface UserSession {
  id: string;
  deviceId: string;
  deviceName?: string;
  deviceType?: string;
  ipAddress?: string;
  userAgent?: string;
  lastActive: Date;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Current user data (full profile)
 */
export interface CurrentUserData {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Password change request data
 */
export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Password reset request data
 */
export interface PasswordResetRequestData {
  email: string;
}

/**
 * Password reset confirmation data
 */
export interface PasswordResetConfirmData {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Email verification data
 */
export interface EmailVerificationData {
  token: string;
}

/**
 * Phone verification data
 */
export interface PhoneVerificationData {
  code: string;
}

/**
 * 2FA setup response
 */
export interface TwoFactorSetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

/**
 * 2FA verification data
 */
export interface TwoFactorVerificationData {
  code: string;
}
