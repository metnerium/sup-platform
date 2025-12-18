import { Router } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { authLimiter } from '../../common/middleware/ratelimit.middleware';
import {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  logoutValidation,
  changePasswordValidation,
  enable2FAValidation,
  verify2FAValidation,
} from './auth.validator';

const router = Router();

/**
 * Public routes (no authentication required)
 */

// Register new user
router.post(
  '/register',
  authLimiter, // Rate limiting for auth endpoints
  registerValidation,
  authController.register.bind(authController)
);

// Login user
router.post(
  '/login',
  authLimiter, // Rate limiting for auth endpoints
  loginValidation,
  authController.login.bind(authController)
);

// Refresh access token
router.post(
  '/refresh',
  refreshTokenValidation,
  authController.refresh.bind(authController)
);

/**
 * Protected routes (authentication required)
 */

// Get current user profile
router.get(
  '/me',
  authMiddleware,
  authController.getCurrentUser.bind(authController)
);

// Get user sessions
router.get(
  '/sessions',
  authMiddleware,
  authController.getSessions.bind(authController)
);

// Revoke a specific session
router.delete(
  '/sessions/:sessionId',
  authMiddleware,
  authController.revokeSession.bind(authController)
);

// Revoke all sessions except current
router.post(
  '/sessions/revoke-all',
  authMiddleware,
  authController.revokeAllSessions.bind(authController)
);

// Logout user
router.post(
  '/logout',
  authMiddleware,
  logoutValidation,
  authController.logout.bind(authController)
);

/**
 * Future extension routes (placeholders)
 */

// Email verification
router.post(
  '/verify-email',
  authController.verifyEmail.bind(authController)
);

// Phone verification
router.post(
  '/verify-phone',
  authController.verifyPhone.bind(authController)
);

// Forgot password
router.post(
  '/forgot-password',
  authLimiter,
  authController.forgotPassword.bind(authController)
);

// Reset password
router.post(
  '/reset-password',
  authLimiter,
  authController.resetPassword.bind(authController)
);

// Change password (protected)
router.post(
  '/change-password',
  authMiddleware,
  changePasswordValidation,
  authController.changePassword.bind(authController)
);

/**
 * 2FA routes (future extension)
 */

// Enable 2FA (protected)
router.post(
  '/2fa/enable',
  authMiddleware,
  enable2FAValidation,
  authController.enable2FA.bind(authController)
);

// Disable 2FA (protected)
router.post(
  '/2fa/disable',
  authMiddleware,
  verify2FAValidation,
  authController.disable2FA.bind(authController)
);

// Verify 2FA code (requires auth)
router.post(
  '/2fa/verify',
  authMiddleware,
  verify2FAValidation,
  authController.verify2FA.bind(authController)
);

export default router;
