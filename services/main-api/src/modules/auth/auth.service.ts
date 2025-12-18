import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { db } from '../../config/database';
import { redisClient } from '../../config/redis';
import { config } from '../../config';
import { AppError } from '../../common/middleware/error.middleware';
import { logger } from '../../common/utils/logger';
import {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  JWTPayload,
} from '@sup/types';

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const { username, email, phone, password, deviceId, deviceName, deviceType } = data;

    // Validate: must have at least email or phone
    if (!email && !phone) {
      throw new AppError(400, 'Email or phone is required');
    }

    // Check if username already exists
    const existingUsername = await db.oneOrNone(
      'SELECT id FROM users WHERE username = $1 AND deleted_at IS NULL',
      [username]
    );

    if (existingUsername) {
      throw new AppError(409, 'Username already exists');
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await db.oneOrNone(
        'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
        [email]
      );

      if (existingEmail) {
        throw new AppError(409, 'Email already exists');
      }
    }

    // Check if phone already exists (if provided)
    if (phone) {
      const existingPhone = await db.oneOrNone(
        'SELECT id FROM users WHERE phone = $1 AND deleted_at IS NULL',
        [phone]
      );

      if (existingPhone) {
        throw new AppError(409, 'Phone number already exists');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.bcrypt.rounds);

    // Create user and device in a transaction
    const result = await db.tx(async (t) => {
      // Insert user
      const user = await t.one(
        `INSERT INTO users (username, email, phone, password_hash, status)
         VALUES ($1, $2, $3, $4, 'offline')
         RETURNING id, username, email, phone, created_at`,
        [username, email, phone, passwordHash]
      );

      // Insert device
      await t.none(
        `INSERT INTO user_devices (user_id, device_id, device_name, device_type)
         VALUES ($1, $2, $3, $4)`,
        [user.id, deviceId, deviceName, deviceType]
      );

      return user;
    });

    logger.info('User registered successfully', { userId: result.id, username });

    // Generate tokens
    const tokens = await this.generateTokens(result.id, deviceId);

    return {
      user: {
        id: result.id,
        username: result.username,
        email: result.email,
        phone: result.phone,
        createdAt: result.created_at,
      },
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const { username, email, phone, password, deviceId, deviceName, deviceType } = data;

    // Find user by username, email, or phone
    let query = 'SELECT * FROM users WHERE deleted_at IS NULL AND (';
    const params: any[] = [];
    const conditions: string[] = [];

    if (username) {
      params.push(username);
      conditions.push(`username = $${params.length}`);
    }
    if (email) {
      params.push(email);
      conditions.push(`email = $${params.length}`);
    }
    if (phone) {
      params.push(phone);
      conditions.push(`phone = $${params.length}`);
    }

    if (conditions.length === 0) {
      throw new AppError(400, 'Username, email, or phone is required');
    }

    query += conditions.join(' OR ') + ')';

    const user = await db.oneOrNone(query, params);

    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      logger.warn('Failed login attempt', { userId: user.id, username: user.username });
      throw new AppError(401, 'Invalid credentials');
    }

    // Check if device exists, create if not
    let device = await db.oneOrNone(
      'SELECT * FROM user_devices WHERE user_id = $1 AND device_id = $2',
      [user.id, deviceId]
    );

    if (!device) {
      await db.none(
        `INSERT INTO user_devices (user_id, device_id, device_name, device_type)
         VALUES ($1, $2, $3, $4)`,
        [user.id, deviceId, deviceName, deviceType]
      );
    } else {
      // Update last active
      await db.none(
        'UPDATE user_devices SET last_active = CURRENT_TIMESTAMP WHERE user_id = $1 AND device_id = $2',
        [user.id, deviceId]
      );
    }

    // Update user status to online
    await db.none(
      'UPDATE users SET status = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2',
      ['online', user.id]
    );

    logger.info('User logged in successfully', { userId: user.id, deviceId });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, deviceId);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        status: 'online',
      },
      tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const { refreshToken } = data;

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as JWTPayload;

      if (decoded.type !== 'refresh') {
        throw new AppError(401, 'Invalid token type');
      }

      // Check if session exists
      const session = await db.oneOrNone(
        'SELECT * FROM sessions WHERE user_id = $1 AND device_id = $2 AND expires_at > CURRENT_TIMESTAMP',
        [decoded.userId, decoded.deviceId]
      );

      if (!session) {
        throw new AppError(401, 'Invalid or expired session');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(decoded.userId, decoded.deviceId);

      // Update session with new refresh token hash
      const newRefreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
      await db.none(
        'UPDATE sessions SET refresh_token_hash = $1, expires_at = $2 WHERE id = $3',
        [newRefreshTokenHash, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), session.id]
      );

      logger.info('Token refreshed successfully', { userId: decoded.userId, deviceId: decoded.deviceId });

      return tokens;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError(401, 'Invalid token');
      }
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, deviceId: string, refreshToken: string): Promise<void> {
    // Delete session
    await db.none(
      'DELETE FROM sessions WHERE user_id = $1 AND device_id = $2',
      [userId, deviceId]
    );

    // Invalidate token in Redis (blacklist)
    const tokenKey = `blacklist:${refreshToken}`;
    await redisClient.setEx(tokenKey, 30 * 24 * 60 * 60, 'true'); // 30 days

    // Update user status to offline if no other active sessions
    const activeSessions = await db.one(
      'SELECT COUNT(*) as count FROM sessions WHERE user_id = $1',
      [userId]
    );

    if (parseInt(activeSessions.count) === 0) {
      await db.none(
        'UPDATE users SET status = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2',
        ['offline', userId]
      );
    }

    logger.info('User logged out successfully', { userId, deviceId });
  }

  /**
   * Generate JWT tokens (access + refresh)
   */
  private async generateTokens(userId: string, deviceId: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Access token payload
    const accessPayload: JWTPayload = {
      userId,
      deviceId,
      type: 'access',
    };

    // Refresh token payload
    const refreshPayload: JWTPayload = {
      userId,
      deviceId,
      type: 'refresh',
    };

    // Generate tokens
    const accessToken = jwt.sign(
      accessPayload,
      config.jwt.secret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      refreshPayload,
      config.jwt.secret,
      { expiresIn: '30d' }
    );

    // Store refresh token hash in database
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.none(
      `INSERT INTO sessions (user_id, device_id, refresh_token_hash, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, device_id)
       DO UPDATE SET refresh_token_hash = $3, expires_at = $4, created_at = CURRENT_TIMESTAMP`,
      [userId, deviceId, refreshTokenHash, expiresAt]
    );

    return { accessToken, refreshToken };
  }

  /**
   * Verify if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenKey = `blacklist:${token}`;
    const result = await redisClient.get(tokenKey);
    return result !== null;
  }

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId: string): Promise<any> {
    const user = await db.oneOrNone(
      `SELECT id, username, email, phone, avatar_url, bio, status,
              email_verified, phone_verified, two_factor_enabled,
              last_seen, created_at, updated_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    logger.info('Current user retrieved', { userId });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      status: user.status,
      emailVerified: user.email_verified,
      phoneVerified: user.phone_verified,
      twoFactorEnabled: user.two_factor_enabled,
      lastSeen: user.last_seen,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string): Promise<any[]> {
    const sessions = await db.manyOrNone(
      `SELECT s.id, s.device_id, s.ip_address, s.user_agent, s.created_at, s.expires_at,
              ud.device_name, ud.device_type, ud.last_active
       FROM sessions s
       LEFT JOIN user_devices ud ON s.device_id = ud.device_id AND s.user_id = ud.user_id
       WHERE s.user_id = $1 AND s.expires_at > CURRENT_TIMESTAMP
       ORDER BY s.created_at DESC`,
      [userId]
    );

    return sessions.map(s => ({
      id: s.id,
      deviceId: s.device_id,
      deviceName: s.device_name,
      deviceType: s.device_type,
      ipAddress: s.ip_address,
      userAgent: s.user_agent,
      lastActive: s.last_active,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
    }));
  }

  /**
   * Revoke session by ID
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const result = await db.result(
      'DELETE FROM sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (result.rowCount === 0) {
      throw new AppError(404, 'Session not found');
    }

    logger.info('Session revoked', { userId, sessionId });
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllSessions(userId: string, exceptDeviceId?: string): Promise<void> {
    if (exceptDeviceId) {
      await db.none(
        'DELETE FROM sessions WHERE user_id = $1 AND device_id != $2',
        [userId, exceptDeviceId]
      );
    } else {
      await db.none('DELETE FROM sessions WHERE user_id = $1', [userId]);
    }

    logger.info('All sessions revoked', { userId, exceptDeviceId });
  }

  /**
   * Verify user password (for password change, etc.)
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await db.oneOrNone(
      'SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return bcrypt.compare(password, user.password_hash);
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Verify current password
    const isValid = await this.verifyPassword(userId, currentPassword);

    if (!isValid) {
      logger.warn('Invalid password during password change', { userId });
      throw new AppError(401, 'Invalid current password');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, config.bcrypt.rounds);

    // Update password
    await db.none(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    // Revoke all sessions except current (force re-login)
    await this.revokeAllSessions(userId);

    logger.info('Password changed successfully', { userId });
  }

  /**
   * Generate password reset token (future implementation)
   */
  async generatePasswordResetToken(email: string): Promise<string> {
    const user = await db.oneOrNone(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );

    if (!user) {
      // Don't reveal if user exists
      logger.warn('Password reset requested for non-existent email', { email });
      throw new AppError(404, 'User not found');
    }

    // Generate reset token (UUID)
    const resetToken = uuidv4();
    const resetTokenHash = await bcrypt.hash(resetToken, 10);

    // Store in Redis
    const tokenKey = `password_reset:${user.id}`;
    await redisClient.setEx(tokenKey, 3600, resetTokenHash);

    logger.info('Password reset token generated', { userId: user.id });

    return resetToken;
  }

  /**
   * Reset password with token
   */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    // Find user by token in Redis
    const keys = await redisClient.keys('password_reset:*');
    let userId: string | null = null;

    for (const key of keys) {
      const storedHash = await redisClient.get(key);
      if (storedHash) {
        const isValid = await bcrypt.compare(token, storedHash);
        if (isValid) {
          userId = key.split(':')[1];
          break;
        }
      }
    }

    if (!userId) {
      throw new AppError(401, 'Invalid or expired reset token');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, config.bcrypt.rounds);

    // Update password
    await db.none(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    // Delete reset token
    await redisClient.del(`password_reset:${userId}`);

    // Revoke all sessions (force re-login)
    await this.revokeAllSessions(userId);

    logger.info('Password reset successfully', { userId });
  }

  /**
   * Generate email verification token (future implementation)
   */
  async generateEmailVerificationToken(userId: string): Promise<string> {
    const verificationToken = uuidv4();
    const tokenKey = `email_verification:${userId}`;
    await redisClient.setEx(tokenKey, 24 * 3600, verificationToken); // 24 hours

    logger.info('Email verification token generated', { userId });

    return verificationToken;
  }

  /**
   * Verify email with token (future implementation)
   */
  async verifyEmail(userId: string, token: string): Promise<void> {
    const tokenKey = `email_verification:${userId}`;
    const storedToken = await redisClient.get(tokenKey);

    if (!storedToken || storedToken !== token) {
      throw new AppError(401, 'Invalid or expired verification token');
    }

    // Mark email as verified
    await db.none(
      'UPDATE users SET email_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );

    // Delete token
    await redisClient.del(tokenKey);

    logger.info('Email verified successfully', { userId });
  }

  /**
   * Enable 2FA for user
   * Generates a secret and QR code for the user to scan
   */
  async enable2FA(userId: string): Promise<{ secret: string; qrCode: string }> {
    // Get user info
    const user = await db.oneOrNone(
      'SELECT username, email, two_factor_enabled FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (user.two_factor_enabled) {
      throw new AppError(400, '2FA is already enabled for this user');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `SUP Messenger (${user.username})`,
      issuer: 'SUP Messenger',
      length: 32,
    });

    // Store secret temporarily in Redis (will be confirmed after first verification)
    const tempKey = `2fa_temp:${userId}`;
    await redisClient.setEx(tempKey, 600, secret.base32); // 10 minutes to verify

    // Generate QR code
    const qrCode = await qrcode.toDataURL(secret.otpauth_url!);

    logger.info('2FA secret generated', { userId });

    return {
      secret: secret.base32,
      qrCode,
    };
  }

  /**
   * Disable 2FA for user
   * Requires valid 2FA code to disable
   */
  async disable2FA(userId: string, code: string): Promise<void> {
    // Get user info
    const user = await db.oneOrNone(
      'SELECT two_factor_enabled, two_factor_secret FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (!user.two_factor_enabled) {
      throw new AppError(400, '2FA is not enabled for this user');
    }

    // Verify code
    const isValid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 windows (60 seconds before/after)
    });

    if (!isValid) {
      logger.warn('Invalid 2FA code during disable attempt', { userId });
      throw new AppError(401, 'Invalid 2FA code');
    }

    // Disable 2FA
    await db.none(
      'UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );

    logger.info('2FA disabled', { userId });
  }

  /**
   * Verify 2FA code and enable 2FA if this is initial setup
   */
  async verify2FACode(userId: string, code: string, isInitialSetup: boolean = false): Promise<boolean> {
    let secret: string;

    if (isInitialSetup) {
      // Get temporary secret from Redis
      const tempKey = `2fa_temp:${userId}`;
      const tempSecret = await redisClient.get(tempKey);

      if (!tempSecret) {
        throw new AppError(401, '2FA setup expired. Please start over.');
      }

      secret = tempSecret;

      // Verify code
      const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 2,
      });

      if (!isValid) {
        logger.warn('Invalid 2FA code during initial setup', { userId });
        return false;
      }

      // Save secret to database and enable 2FA
      await db.none(
        'UPDATE users SET two_factor_enabled = true, two_factor_secret = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [secret, userId]
      );

      // Delete temporary secret
      await redisClient.del(tempKey);

      logger.info('2FA enabled successfully', { userId });
      return true;
    } else {
      // Verify code for existing 2FA setup (login)
      const user = await db.oneOrNone(
        'SELECT two_factor_enabled, two_factor_secret FROM users WHERE id = $1 AND deleted_at IS NULL',
        [userId]
      );

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      if (!user.two_factor_enabled || !user.two_factor_secret) {
        throw new AppError(400, '2FA is not enabled for this user');
      }

      const isValid = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: code,
        window: 2,
      });

      if (!isValid) {
        logger.warn('Invalid 2FA code during login', { userId });
      }

      return isValid;
    }
  }
}

export const authService = new AuthService();
