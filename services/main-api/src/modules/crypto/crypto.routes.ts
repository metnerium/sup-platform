import { Router } from 'express';
import { cryptoController } from './crypto.controller';
import { CryptoValidator } from './crypto.validator';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import rateLimit from 'express-rate-limit';
import { logger } from '../../common/utils/logger';

const router = Router();

/**
 * Rate limiter for crypto key operations
 * More restrictive than general API limiter to prevent abuse
 */
const cryptoRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Crypto rate limit exceeded:', {
      ip: req.ip,
      userId: (req as any).user?.id,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many crypto operations, please try again later',
        statusCode: 429,
      },
    });
  },
});

/**
 * Stricter rate limiter for key registration and generation
 */
const keyGenerationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 key registrations per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Key generation rate limit exceeded:', {
      ip: req.ip,
      userId: (req as any).user?.id,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many key generation requests, please try again later',
        statusCode: 429,
      },
    });
  },
});

/**
 * All crypto routes require authentication
 */
router.use(authMiddleware);

/**
 * POST /api/v1/crypto/keys
 * Register cryptographic keys for a device
 *
 * Request body:
 * {
 *   deviceId: string,
 *   identityKey: string (base64),
 *   signedPreKey: {
 *     keyId: number,
 *     publicKey: string (base64),
 *     signature: string (base64)
 *   },
 *   oneTimePreKeys: Array<{
 *     keyId: number,
 *     publicKey: string (base64)
 *   }>
 * }
 */
router.post(
  '/keys',
  keyGenerationRateLimiter,
  CryptoValidator.validateRegisterKeys,
  cryptoController.registerKeys.bind(cryptoController)
);

/**
 * GET /api/v1/crypto/keys/:userId/:deviceId
 * Get PreKey bundle for initiating encrypted session
 *
 * Response:
 * {
 *   userId: string,
 *   deviceId: string,
 *   bundle: {
 *     identityKey: string,
 *     signedPreKey: { keyId, publicKey, signature },
 *     oneTimePreKey?: { keyId, publicKey }
 *   }
 * }
 */
router.get(
  '/keys/:userId/:deviceId',
  cryptoRateLimiter,
  CryptoValidator.validateGetPreKeyBundle,
  cryptoController.getPreKeyBundle.bind(cryptoController)
);

/**
 * GET /api/v1/crypto/identity/:userId/:deviceId
 * Get identity key for a specific device
 *
 * Response:
 * {
 *   userId: string,
 *   deviceId: string,
 *   identityKey: string,
 *   createdAt: Date
 * }
 */
router.get(
  '/identity/:userId/:deviceId',
  cryptoRateLimiter,
  CryptoValidator.validateGetPreKeyBundle,
  cryptoController.getIdentityKey.bind(cryptoController)
);

/**
 * POST /api/v1/crypto/keys/refresh
 * Refresh signed prekey (should be done periodically)
 *
 * Request body:
 * {
 *   deviceId: string,
 *   signedPreKey: {
 *     keyId: number,
 *     publicKey: string (base64),
 *     signature: string (base64)
 *   }
 * }
 */
router.post(
  '/keys/refresh',
  cryptoRateLimiter,
  CryptoValidator.validateRefreshSignedPreKey,
  cryptoController.refreshSignedPreKey.bind(cryptoController)
);

/**
 * POST /api/v1/crypto/keys/generate
 * Generate and store new one-time prekeys
 *
 * Request body:
 * {
 *   deviceId: string,
 *   count: number (1-100),
 *   oneTimePreKeys: Array<{
 *     keyId: number,
 *     publicKey: string (base64)
 *   }>
 * }
 */
router.post(
  '/keys/generate',
  keyGenerationRateLimiter,
  CryptoValidator.validateGenerateOneTimePreKeys,
  cryptoController.generateOneTimePreKeys.bind(cryptoController)
);

/**
 * GET /api/v1/crypto/keys/count/:deviceId
 * Get count of remaining unused one-time prekeys
 *
 * Response:
 * {
 *   deviceId: string,
 *   count: number
 * }
 */
router.get(
  '/keys/count/:deviceId',
  cryptoRateLimiter,
  CryptoValidator.validateGetOneTimePreKeysCount,
  cryptoController.getOneTimePreKeysCount.bind(cryptoController)
);

/**
 * GET /api/v1/crypto/devices
 * Get all devices with registered keys for the authenticated user
 *
 * Response:
 * {
 *   devices: Array<{
 *     deviceId: string,
 *     hasIdentityKey: boolean,
 *     hasSignedPreKey: boolean,
 *     oneTimePreKeysCount: number
 *   }>
 * }
 */
router.get(
  '/devices',
  cryptoRateLimiter,
  CryptoValidator.validateGetUserDevices,
  cryptoController.getUserDevices.bind(cryptoController)
);

/**
 * DELETE /api/v1/crypto/keys/:deviceId
 * Delete all cryptographic keys for a device
 *
 * Response:
 * {
 *   message: "Device keys deleted successfully"
 * }
 */
router.delete(
  '/keys/:deviceId',
  cryptoRateLimiter,
  CryptoValidator.validateDeleteDeviceKeys,
  cryptoController.deleteDeviceKeys.bind(cryptoController)
);

export default router;
