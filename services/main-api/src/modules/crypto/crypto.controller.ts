import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { cryptoService } from './crypto.service';
import { logger } from '../../common/utils/logger';
import {
  RegisterKeysRequest,
  GetPreKeyBundleRequest,
} from '@sup/types';

/**
 * Controller for cryptographic key management (Signal Protocol)
 * Handles REST API endpoints for E2E encryption keys
 */
export class CryptoController {
  /**
   * POST /api/v1/crypto/keys
   * Register cryptographic keys for the authenticated user's device
   */
  async registerKeys(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const data: RegisterKeysRequest = req.body;

      const result = await cryptoService.registerKeys(userId, data);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/crypto/keys/:userId/:deviceId
   * Get PreKey bundle for initiating encrypted session with a user's device
   */
  async getPreKeyBundle(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const requesterId = req.user!.id;
      const { userId, deviceId } = req.params;

      const data: GetPreKeyBundleRequest = {
        userId,
        deviceId,
      };

      const result = await cryptoService.getPreKeyBundle(requesterId, data);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/crypto/identity/:userId/:deviceId
   * Get identity key for a specific device
   */
  async getIdentityKey(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, deviceId } = req.params;

      const result = await cryptoService.getIdentityKey(userId, deviceId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/crypto/keys/refresh
   * Refresh signed prekey for forward secrecy
   */
  async refreshSignedPreKey(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { deviceId, signedPreKey } = req.body;

      await cryptoService.refreshSignedPreKey(userId, deviceId, signedPreKey);

      res.status(200).json({
        success: true,
        data: {
          message: 'Signed prekey refreshed successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/crypto/keys/generate
   * Generate and store new one-time prekeys (replenish the pool)
   */
  async generateOneTimePreKeys(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { deviceId, oneTimePreKeys, count } = req.body;

      const result = await cryptoService.generateOneTimePreKeys(
        userId,
        deviceId,
        oneTimePreKeys,
        count
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/crypto/keys/count/:deviceId
   * Get count of remaining unused one-time prekeys for a device
   */
  async getOneTimePreKeysCount(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { deviceId } = req.params;

      const count = await cryptoService.getOneTimePreKeysCount(userId, deviceId);

      res.status(200).json({
        success: true,
        data: {
          deviceId,
          count,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/crypto/devices
   * Get all devices with registered keys for the authenticated user
   */
  async getUserDevices(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const devices = await cryptoService.getUserDevicesWithKeys(userId);

      res.status(200).json({
        success: true,
        data: {
          devices,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/crypto/keys/:deviceId
   * Delete all cryptographic keys for a specific device
   */
  async deleteDeviceKeys(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { deviceId } = req.params;

      await cryptoService.deleteDeviceKeys(userId, deviceId);

      res.status(200).json({
        success: true,
        data: {
          message: 'Device keys deleted successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const cryptoController = new CryptoController();
