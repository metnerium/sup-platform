import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../common/middleware/error.middleware';

/**
 * Validation middleware for crypto endpoints
 * Validates request body structure and data types
 */

export class CryptoValidator {
  /**
   * Validate registerKeys request body
   */
  static validateRegisterKeys(req: Request, res: Response, next: NextFunction): void {
    const { deviceId, identityKey, signedPreKey, oneTimePreKeys } = req.body;

    try {
      // Validate deviceId
      if (!deviceId || typeof deviceId !== 'string') {
        throw new AppError(400, 'deviceId is required and must be a string');
      }

      if (deviceId.length < 1 || deviceId.length > 255) {
        throw new AppError(400, 'deviceId must be between 1 and 255 characters');
      }

      // Validate identityKey
      if (!identityKey || typeof identityKey !== 'string') {
        throw new AppError(400, 'identityKey is required and must be a string');
      }

      // Validate signedPreKey
      if (!signedPreKey || typeof signedPreKey !== 'object') {
        throw new AppError(400, 'signedPreKey is required and must be an object');
      }

      if (typeof signedPreKey.keyId !== 'number') {
        throw new AppError(400, 'signedPreKey.keyId is required and must be a number');
      }

      if (signedPreKey.keyId < 0) {
        throw new AppError(400, 'signedPreKey.keyId must be non-negative');
      }

      if (!signedPreKey.publicKey || typeof signedPreKey.publicKey !== 'string') {
        throw new AppError(400, 'signedPreKey.publicKey is required and must be a string');
      }

      if (!signedPreKey.signature || typeof signedPreKey.signature !== 'string') {
        throw new AppError(400, 'signedPreKey.signature is required and must be a string');
      }

      // Validate oneTimePreKeys
      if (!Array.isArray(oneTimePreKeys)) {
        throw new AppError(400, 'oneTimePreKeys is required and must be an array');
      }

      if (oneTimePreKeys.length === 0) {
        throw new AppError(400, 'At least one one-time prekey is required');
      }

      if (oneTimePreKeys.length > 100) {
        throw new AppError(400, 'Maximum 100 one-time prekeys allowed per batch');
      }

      // Validate each one-time prekey
      oneTimePreKeys.forEach((preKey: any, index: number) => {
        if (!preKey || typeof preKey !== 'object') {
          throw new AppError(400, `oneTimePreKeys[${index}] must be an object`);
        }

        if (typeof preKey.keyId !== 'number') {
          throw new AppError(400, `oneTimePreKeys[${index}].keyId is required and must be a number`);
        }

        if (preKey.keyId < 0) {
          throw new AppError(400, `oneTimePreKeys[${index}].keyId must be non-negative`);
        }

        if (!preKey.publicKey || typeof preKey.publicKey !== 'string') {
          throw new AppError(
            400,
            `oneTimePreKeys[${index}].publicKey is required and must be a string`
          );
        }
      });

      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate getPreKeyBundle params
   */
  static validateGetPreKeyBundle(req: Request, res: Response, next: NextFunction): void {
    const { userId, deviceId } = req.params;

    try {
      // Validate userId
      if (!userId || typeof userId !== 'string') {
        throw new AppError(400, 'userId is required and must be a string');
      }

      // Validate deviceId
      if (!deviceId || typeof deviceId !== 'string') {
        throw new AppError(400, 'deviceId is required and must be a string');
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate refreshSignedPreKey request body
   */
  static validateRefreshSignedPreKey(req: Request, res: Response, next: NextFunction): void {
    const { deviceId, signedPreKey } = req.body;

    try {
      // Validate deviceId
      if (!deviceId || typeof deviceId !== 'string') {
        throw new AppError(400, 'deviceId is required and must be a string');
      }

      if (deviceId.length < 1 || deviceId.length > 255) {
        throw new AppError(400, 'deviceId must be between 1 and 255 characters');
      }

      // Validate signedPreKey
      if (!signedPreKey || typeof signedPreKey !== 'object') {
        throw new AppError(400, 'signedPreKey is required and must be an object');
      }

      if (typeof signedPreKey.keyId !== 'number') {
        throw new AppError(400, 'signedPreKey.keyId is required and must be a number');
      }

      if (signedPreKey.keyId < 0) {
        throw new AppError(400, 'signedPreKey.keyId must be non-negative');
      }

      if (!signedPreKey.publicKey || typeof signedPreKey.publicKey !== 'string') {
        throw new AppError(400, 'signedPreKey.publicKey is required and must be a string');
      }

      if (!signedPreKey.signature || typeof signedPreKey.signature !== 'string') {
        throw new AppError(400, 'signedPreKey.signature is required and must be a string');
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate generateOneTimePreKeys request body
   */
  static validateGenerateOneTimePreKeys(req: Request, res: Response, next: NextFunction): void {
    const { deviceId, oneTimePreKeys, count } = req.body;

    try {
      // Validate deviceId
      if (!deviceId || typeof deviceId !== 'string') {
        throw new AppError(400, 'deviceId is required and must be a string');
      }

      if (deviceId.length < 1 || deviceId.length > 255) {
        throw new AppError(400, 'deviceId must be between 1 and 255 characters');
      }

      // Validate count
      if (typeof count !== 'number') {
        throw new AppError(400, 'count is required and must be a number');
      }

      if (count < 1 || count > 100) {
        throw new AppError(400, 'count must be between 1 and 100');
      }

      // Validate oneTimePreKeys
      if (!Array.isArray(oneTimePreKeys)) {
        throw new AppError(400, 'oneTimePreKeys is required and must be an array');
      }

      if (oneTimePreKeys.length === 0) {
        throw new AppError(400, 'At least one one-time prekey is required');
      }

      if (oneTimePreKeys.length > 100) {
        throw new AppError(400, 'Maximum 100 one-time prekeys allowed per batch');
      }

      if (oneTimePreKeys.length > count) {
        throw new AppError(400, 'Number of provided keys cannot exceed count');
      }

      // Validate each one-time prekey
      oneTimePreKeys.forEach((preKey: any, index: number) => {
        if (!preKey || typeof preKey !== 'object') {
          throw new AppError(400, `oneTimePreKeys[${index}] must be an object`);
        }

        if (typeof preKey.keyId !== 'number') {
          throw new AppError(400, `oneTimePreKeys[${index}].keyId is required and must be a number`);
        }

        if (preKey.keyId < 0) {
          throw new AppError(400, `oneTimePreKeys[${index}].keyId must be non-negative`);
        }

        if (!preKey.publicKey || typeof preKey.publicKey !== 'string') {
          throw new AppError(
            400,
            `oneTimePreKeys[${index}].publicKey is required and must be a string`
          );
        }
      });

      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate getOneTimePreKeysCount params
   */
  static validateGetOneTimePreKeysCount(req: Request, res: Response, next: NextFunction): void {
    const { deviceId } = req.params;

    try {
      // Validate deviceId
      if (!deviceId || typeof deviceId !== 'string') {
        throw new AppError(400, 'deviceId is required and must be a string');
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate deleteDeviceKeys params
   */
  static validateDeleteDeviceKeys(req: Request, res: Response, next: NextFunction): void {
    const { deviceId } = req.params;

    try {
      // Validate deviceId
      if (!deviceId || typeof deviceId !== 'string') {
        throw new AppError(400, 'deviceId is required and must be a string');
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate getUserDevices (no additional validation needed)
   */
  static validateGetUserDevices(req: Request, res: Response, next: NextFunction): void {
    // No additional validation needed for this endpoint
    // userId comes from auth middleware
    next();
  }
}
