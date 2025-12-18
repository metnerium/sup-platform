import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { authService } from './auth.service';
import { AppError } from '../../common/middleware/error.middleware';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { logger } from '../../common/utils/logger';
import {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  LogoutRequest,
} from '@sup/types';
import { db } from '../../config/database';

export class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Registration validation failed', {
          errors: errors.array(),
          body: { ...req.body, password: '[REDACTED]' },
        });
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            errors: errors.array(),
          },
        });
        return;
      }

      const data: RegisterRequest = {
        username: req.body.username,
        email: req.body.email,
        phone: req.body.phone,
        password: req.body.password,
        deviceId: req.body.deviceId,
        deviceName: req.body.deviceName,
        deviceType: req.body.deviceType,
      };

      logger.info('Registration attempt', {
        username: data.username,
        email: data.email,
        phone: data.phone,
        deviceId: data.deviceId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      const result = await authService.register(data);

      logger.info('User registered successfully', {
        userId: result.user.id,
        username: result.user.username,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Login validation failed', {
          errors: errors.array(),
          body: { ...req.body, password: '[REDACTED]' },
        });
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            errors: errors.array(),
          },
        });
        return;
      }

      const data: LoginRequest = {
        username: req.body.username,
        email: req.body.email,
        phone: req.body.phone,
        password: req.body.password,
        deviceId: req.body.deviceId,
        deviceName: req.body.deviceName,
        deviceType: req.body.deviceType,
      };

      logger.info('Login attempt', {
        username: data.username,
        email: data.email,
        phone: data.phone,
        deviceId: data.deviceId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      const result = await authService.login(data);

      logger.info('User logged in successfully', {
        userId: result.user.id,
        username: result.user.username,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Refresh token validation failed', {
          errors: errors.array(),
        });
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            errors: errors.array(),
          },
        });
        return;
      }

      const data: RefreshTokenRequest = {
        refreshToken: req.body.refreshToken,
      };

      // Check if token is blacklisted
      const isBlacklisted = await authService.isTokenBlacklisted(data.refreshToken);
      if (isBlacklisted) {
        logger.warn('Attempted to use blacklisted token', {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });
        throw new AppError(401, 'Token has been revoked');
      }

      logger.info('Token refresh attempt', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      const result = await authService.refreshToken(data);

      logger.info('Token refreshed successfully');

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Logout validation failed', {
          errors: errors.array(),
        });
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            errors: errors.array(),
          },
        });
        return;
      }

      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const data: LogoutRequest = {
        refreshToken: req.body.refreshToken,
      };

      logger.info('Logout attempt', {
        userId: req.user.id,
        deviceId: req.user.deviceId,
        ip: req.ip,
      });

      await authService.logout(req.user.id, req.user.deviceId, data.refreshToken);

      logger.info('User logged out successfully', {
        userId: req.user.id,
        deviceId: req.user.deviceId,
      });

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  async getCurrentUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      logger.info('Get current user request', { userId: req.user.id });

      const user = await authService.getCurrentUser(req.user.id);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user sessions
   * GET /api/auth/sessions
   */
  async getSessions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      logger.info('Get sessions request', { userId: req.user.id });

      const sessions = await authService.getUserSessions(req.user.id);

      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke a specific session
   * DELETE /api/auth/sessions/:sessionId
   */
  async revokeSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const { sessionId } = req.params;

      logger.info('Revoke session request', { userId: req.user.id, sessionId });

      await authService.revokeSession(req.user.id, sessionId);

      logger.info('Session revoked', { userId: req.user.id, sessionId });

      res.status(200).json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke all sessions except current
   * POST /api/auth/sessions/revoke-all
   */
  async revokeAllSessions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      logger.info('Revoke all sessions request', { userId: req.user.id });

      await authService.revokeAllSessions(req.user.id, req.user.deviceId);

      logger.info('All sessions revoked', { userId: req.user.id });

      res.status(200).json({
        success: true,
        message: 'All other sessions revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email (future extension)
   * POST /api/auth/verify-email
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        throw new AppError(400, 'Verification token is required');
      }

      logger.info('Email verification attempt', { token: token.substring(0, 10) + '...' });

      // TODO: Implement email verification logic
      throw new AppError(501, 'Email verification not implemented yet');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify phone (future extension)
   * POST /api/auth/verify-phone
   */
  async verifyPhone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.body;

      if (!code) {
        throw new AppError(400, 'Verification code is required');
      }

      logger.info('Phone verification attempt');

      // TODO: Implement phone verification logic
      throw new AppError(501, 'Phone verification not implemented yet');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError(400, 'Email is required');
      }

      logger.info('Password reset request', { email });

      try {
        const resetToken = await authService.generatePasswordResetToken(email);

        logger.info('Password reset token generated', { email });

        // In production, this token should be sent via email
        // For now, we return it in the response (NOT SECURE FOR PRODUCTION)
        res.status(200).json({
          success: true,
          message: 'Password reset token generated. Check your email.',
          data: {
            resetToken, // Remove this in production
          },
        });
      } catch (error) {
        // Always return success to prevent email enumeration
        logger.warn('Password reset failed', { email, error });
        res.status(200).json({
          success: true,
          message: 'If the email exists, a reset link will be sent.',
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password with token
   * POST /api/auth/reset-password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw new AppError(400, 'Token and new password are required');
      }

      logger.info('Password reset attempt', { token: token.substring(0, 10) + '...' });

      await authService.resetPasswordWithToken(token, newPassword);

      logger.info('Password reset successfully');

      res.status(200).json({
        success: true,
        message: 'Password reset successfully. Please log in with your new password.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   * POST /api/auth/change-password
   */
  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Change password validation failed', {
          errors: errors.array(),
        });
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            errors: errors.array(),
          },
        });
        return;
      }

      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const { currentPassword, newPassword } = req.body;

      logger.info('Password change attempt', { userId: req.user.id });

      await authService.changePassword(req.user.id, currentPassword, newPassword);

      logger.info('Password changed successfully', { userId: req.user.id });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please log in again.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enable 2FA - Generate secret and QR code
   * POST /api/auth/2fa/enable
   */
  async enable2FA(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      logger.info('2FA enable attempt', { userId: req.user.id });

      const result = await authService.enable2FA(req.user.id);

      logger.info('2FA secret generated', { userId: req.user.id });

      res.status(200).json({
        success: true,
        message: 'Scan the QR code with your authenticator app and verify with a code',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disable 2FA
   * POST /api/auth/2fa/disable
   */
  async disable2FA(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('2FA disable validation failed', {
          errors: errors.array(),
        });
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            errors: errors.array(),
          },
        });
        return;
      }

      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const { code } = req.body;

      logger.info('2FA disable attempt', { userId: req.user.id });

      await authService.disable2FA(req.user.id, code);

      logger.info('2FA disabled successfully', { userId: req.user.id });

      res.status(200).json({
        success: true,
        message: '2FA disabled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify 2FA code (for initial setup or login)
   * POST /api/auth/2fa/verify
   */
  async verify2FA(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('2FA verification validation failed', {
          errors: errors.array(),
        });
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            errors: errors.array(),
          },
        });
        return;
      }

      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      const { code, isInitialSetup } = req.body;

      logger.info('2FA verification attempt', { userId: req.user.id, isInitialSetup });

      const isValid = await authService.verify2FACode(
        req.user.id,
        code,
        isInitialSetup || false
      );

      if (!isValid) {
        throw new AppError(401, 'Invalid 2FA code');
      }

      logger.info('2FA verification successful', { userId: req.user.id });

      res.status(200).json({
        success: true,
        message: isInitialSetup ? '2FA enabled successfully' : '2FA code verified',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
