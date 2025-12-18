import { db } from '../../config/database';
import { AppError } from '../../common/middleware/error.middleware';
import { logger } from '../../common/utils/logger';
import {
  RegisterKeysRequest,
  RegisterKeysResponse,
  GetPreKeyBundleRequest,
  GetPreKeyBundleResponse,
  PreKeyBundle,
  IdentityKey,
  SignedPreKey,
  OneTimePreKey,
} from '@sup/types';

export class CryptoService {
  /**
   * Register cryptographic keys for a user device (Signal Protocol)
   * Stores identity key, signed prekey, and one-time prekeys
   */
  async registerKeys(
    userId: string,
    data: RegisterKeysRequest
  ): Promise<RegisterKeysResponse> {
    const { deviceId, identityKey, signedPreKey, oneTimePreKeys } = data;

    // Validate base64 format
    this.validateBase64(identityKey, 'identityKey');
    this.validateBase64(signedPreKey.publicKey, 'signedPreKey.publicKey');
    this.validateBase64(signedPreKey.signature, 'signedPreKey.signature');

    // Validate one-time prekeys
    if (!oneTimePreKeys || oneTimePreKeys.length === 0) {
      throw new AppError(400, 'At least one one-time prekey is required');
    }

    if (oneTimePreKeys.length > 100) {
      throw new AppError(400, 'Maximum 100 one-time prekeys allowed per batch');
    }

    oneTimePreKeys.forEach((key, index) => {
      this.validateBase64(key.publicKey, `oneTimePreKeys[${index}].publicKey`);
    });

    // Check for duplicate keyIds in one-time prekeys
    const keyIds = oneTimePreKeys.map((k) => k.keyId);
    const uniqueKeyIds = new Set(keyIds);
    if (keyIds.length !== uniqueKeyIds.size) {
      throw new AppError(400, 'Duplicate keyIds found in one-time prekeys');
    }

    try {
      const result = await db.tx(async (t) => {
        // Check if device exists
        const device = await t.oneOrNone(
          'SELECT user_id FROM user_devices WHERE user_id = $1 AND device_id = $2',
          [userId, deviceId]
        );

        if (!device) {
          throw new AppError(404, 'Device not found');
        }

        // Insert or update identity key
        await t.none(
          `INSERT INTO identity_keys (user_id, device_id, identity_key)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, device_id)
           DO UPDATE SET identity_key = $3, created_at = CURRENT_TIMESTAMP`,
          [userId, deviceId, identityKey]
        );

        // Insert or update signed prekey
        await t.none(
          `INSERT INTO signed_prekeys (user_id, device_id, key_id, public_key, signature)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, device_id)
           DO UPDATE SET key_id = $3, public_key = $4, signature = $5, created_at = CURRENT_TIMESTAMP`,
          [userId, deviceId, signedPreKey.keyId, signedPreKey.publicKey, signedPreKey.signature]
        );

        // Insert one-time prekeys (ignore duplicates)
        let registeredCount = 0;
        for (const preKey of oneTimePreKeys) {
          try {
            await t.none(
              `INSERT INTO one_time_prekeys (user_id, device_id, key_id, public_key, used)
               VALUES ($1, $2, $3, $4, false)
               ON CONFLICT (user_id, device_id, key_id) DO NOTHING`,
              [userId, deviceId, preKey.keyId, preKey.publicKey]
            );
            registeredCount++;
          } catch (error) {
            // Skip duplicate keys
            logger.warn('Failed to insert one-time prekey', {
              userId,
              deviceId,
              keyId: preKey.keyId,
              error,
            });
          }
        }

        return registeredCount;
      });

      logger.info('Keys registered successfully', {
        userId,
        deviceId,
        registeredOneTimePreKeys: result,
      });

      return {
        success: true,
        registeredOneTimePreKeys: result,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to register keys', { userId, deviceId, error });
      throw new AppError(500, 'Failed to register keys');
    }
  }

  /**
   * Get PreKey bundle for initiating X3DH handshake
   * Returns identity key, signed prekey, and ONE one-time prekey (if available)
   * Automatically marks the one-time prekey as used
   */
  async getPreKeyBundle(
    requesterId: string,
    data: GetPreKeyBundleRequest
  ): Promise<GetPreKeyBundleResponse> {
    const { userId, deviceId } = data;

    try {
      const result = await db.tx(async (t) => {
        // Get identity key
        const identityKey = await t.oneOrNone<{ identity_key: string }>(
          'SELECT identity_key FROM identity_keys WHERE user_id = $1 AND device_id = $2',
          [userId, deviceId]
        );

        if (!identityKey) {
          throw new AppError(404, 'Identity key not found for this device');
        }

        // Get signed prekey
        const signedPreKey = await t.oneOrNone<{
          key_id: number;
          public_key: string;
          signature: string;
        }>(
          'SELECT key_id, public_key, signature FROM signed_prekeys WHERE user_id = $1 AND device_id = $2',
          [userId, deviceId]
        );

        if (!signedPreKey) {
          throw new AppError(404, 'Signed prekey not found for this device');
        }

        // Get one unused one-time prekey and mark it as used
        const oneTimePreKey = await t.oneOrNone<{
          id: number;
          key_id: number;
          public_key: string;
        }>(
          `UPDATE one_time_prekeys
           SET used = true, used_at = CURRENT_TIMESTAMP
           WHERE id = (
             SELECT id FROM one_time_prekeys
             WHERE user_id = $1 AND device_id = $2 AND used = false
             ORDER BY created_at ASC
             LIMIT 1
             FOR UPDATE SKIP LOCKED
           )
           RETURNING id, key_id, public_key`,
          [userId, deviceId]
        );

        const bundle: PreKeyBundle = {
          identityKey: identityKey.identity_key,
          signedPreKey: {
            keyId: signedPreKey.key_id,
            publicKey: signedPreKey.public_key,
            signature: signedPreKey.signature,
          },
          oneTimePreKey: oneTimePreKey
            ? {
                keyId: oneTimePreKey.key_id,
                publicKey: oneTimePreKey.public_key,
              }
            : undefined,
        };

        return bundle;
      });

      logger.info('PreKey bundle retrieved', {
        requesterId,
        targetUserId: userId,
        deviceId,
        hasOneTimePreKey: !!result.oneTimePreKey,
      });

      return {
        userId,
        deviceId,
        bundle: result,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to get PreKey bundle', { userId, deviceId, error });
      throw new AppError(500, 'Failed to get PreKey bundle');
    }
  }

  /**
   * Get identity key for a specific device
   */
  async getIdentityKey(userId: string, deviceId: string): Promise<IdentityKey> {
    try {
      const result = await db.oneOrNone<{
        user_id: string;
        device_id: string;
        identity_key: string;
        created_at: Date;
      }>(
        'SELECT user_id, device_id, identity_key, created_at FROM identity_keys WHERE user_id = $1 AND device_id = $2',
        [userId, deviceId]
      );

      if (!result) {
        throw new AppError(404, 'Identity key not found');
      }

      return {
        userId: result.user_id,
        deviceId: result.device_id,
        identityKey: result.identity_key,
        createdAt: result.created_at,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to get identity key', { userId, deviceId, error });
      throw new AppError(500, 'Failed to get identity key');
    }
  }

  /**
   * Refresh signed prekey (should be done periodically for forward secrecy)
   */
  async refreshSignedPreKey(
    userId: string,
    deviceId: string,
    signedPreKey: { keyId: number; publicKey: string; signature: string }
  ): Promise<void> {
    this.validateBase64(signedPreKey.publicKey, 'signedPreKey.publicKey');
    this.validateBase64(signedPreKey.signature, 'signedPreKey.signature');

    try {
      const result = await db.result(
        `UPDATE signed_prekeys
         SET key_id = $3, public_key = $4, signature = $5, created_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND device_id = $2`,
        [userId, deviceId, signedPreKey.keyId, signedPreKey.publicKey, signedPreKey.signature]
      );

      if (result.rowCount === 0) {
        // If no rows updated, insert new signed prekey
        await db.none(
          `INSERT INTO signed_prekeys (user_id, device_id, key_id, public_key, signature)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, deviceId, signedPreKey.keyId, signedPreKey.publicKey, signedPreKey.signature]
        );
      }

      logger.info('Signed prekey refreshed', { userId, deviceId, keyId: signedPreKey.keyId });
    } catch (error) {
      logger.error('Failed to refresh signed prekey', { userId, deviceId, error });
      throw new AppError(500, 'Failed to refresh signed prekey');
    }
  }

  /**
   * Generate and store new one-time prekeys (replenish the pool)
   * Note: The actual key generation happens on the client side
   * This method only stores the client-generated keys
   */
  async generateOneTimePreKeys(
    userId: string,
    deviceId: string,
    oneTimePreKeys: Array<{ keyId: number; publicKey: string }>,
    count: number
  ): Promise<{ success: boolean; registeredCount: number }> {
    if (oneTimePreKeys.length === 0) {
      throw new AppError(400, 'At least one one-time prekey is required');
    }

    if (oneTimePreKeys.length > 100) {
      throw new AppError(400, 'Maximum 100 one-time prekeys allowed per batch');
    }

    if (count < oneTimePreKeys.length) {
      throw new AppError(400, 'Count must be at least equal to number of provided keys');
    }

    // Validate all keys
    oneTimePreKeys.forEach((key, index) => {
      this.validateBase64(key.publicKey, `oneTimePreKeys[${index}].publicKey`);
    });

    try {
      let registeredCount = 0;

      await db.tx(async (t) => {
        // Check current count
        const currentCount = await t.one<{ count: string }>(
          'SELECT COUNT(*) as count FROM one_time_prekeys WHERE user_id = $1 AND device_id = $2 AND used = false',
          [userId, deviceId]
        );

        const currentUnusedCount = parseInt(currentCount.count);

        // Insert new keys
        for (const preKey of oneTimePreKeys) {
          try {
            await t.none(
              `INSERT INTO one_time_prekeys (user_id, device_id, key_id, public_key, used)
               VALUES ($1, $2, $3, $4, false)
               ON CONFLICT (user_id, device_id, key_id) DO NOTHING`,
              [userId, deviceId, preKey.keyId, preKey.publicKey]
            );
            registeredCount++;
          } catch (error) {
            logger.warn('Failed to insert one-time prekey', {
              userId,
              deviceId,
              keyId: preKey.keyId,
            });
          }
        }

        logger.info('One-time prekeys generated', {
          userId,
          deviceId,
          previousCount: currentUnusedCount,
          addedCount: registeredCount,
          totalCount: currentUnusedCount + registeredCount,
        });
      });

      return {
        success: true,
        registeredCount,
      };
    } catch (error) {
      logger.error('Failed to generate one-time prekeys', { userId, deviceId, error });
      throw new AppError(500, 'Failed to generate one-time prekeys');
    }
  }

  /**
   * Get count of remaining unused one-time prekeys
   */
  async getOneTimePreKeysCount(userId: string, deviceId: string): Promise<number> {
    try {
      const result = await db.one<{ count: string }>(
        'SELECT COUNT(*) as count FROM one_time_prekeys WHERE user_id = $1 AND device_id = $2 AND used = false',
        [userId, deviceId]
      );

      return parseInt(result.count);
    } catch (error) {
      logger.error('Failed to get one-time prekeys count', { userId, deviceId, error });
      throw new AppError(500, 'Failed to get one-time prekeys count');
    }
  }

  /**
   * Mark a specific one-time prekey as used
   * Note: This is usually done automatically in getPreKeyBundle
   */
  async markOneTimePreKeyUsed(userId: string, deviceId: string, keyId: number): Promise<void> {
    try {
      const result = await db.result(
        `UPDATE one_time_prekeys
         SET used = true, used_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND device_id = $2 AND key_id = $3 AND used = false`,
        [userId, deviceId, keyId]
      );

      if (result.rowCount === 0) {
        throw new AppError(404, 'One-time prekey not found or already used');
      }

      logger.info('One-time prekey marked as used', { userId, deviceId, keyId });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to mark one-time prekey as used', { userId, deviceId, keyId, error });
      throw new AppError(500, 'Failed to mark one-time prekey as used');
    }
  }

  /**
   * Get all devices with registered keys for a user
   */
  async getUserDevicesWithKeys(userId: string): Promise<
    Array<{
      deviceId: string;
      hasIdentityKey: boolean;
      hasSignedPreKey: boolean;
      oneTimePreKeysCount: number;
    }>
  > {
    try {
      const devices = await db.any<{
        device_id: string;
        has_identity_key: boolean;
        has_signed_prekey: boolean;
        one_time_prekeys_count: string;
      }>(
        `SELECT
          d.device_id,
          EXISTS(SELECT 1 FROM identity_keys WHERE user_id = d.user_id AND device_id = d.device_id) as has_identity_key,
          EXISTS(SELECT 1 FROM signed_prekeys WHERE user_id = d.user_id AND device_id = d.device_id) as has_signed_prekey,
          COALESCE((SELECT COUNT(*) FROM one_time_prekeys WHERE user_id = d.user_id AND device_id = d.device_id AND used = false), 0) as one_time_prekeys_count
         FROM user_devices d
         WHERE d.user_id = $1`,
        [userId]
      );

      return devices.map((device) => ({
        deviceId: device.device_id,
        hasIdentityKey: device.has_identity_key,
        hasSignedPreKey: device.has_signed_prekey,
        oneTimePreKeysCount: parseInt(device.one_time_prekeys_count),
      }));
    } catch (error) {
      logger.error('Failed to get user devices with keys', { userId, error });
      throw new AppError(500, 'Failed to get user devices with keys');
    }
  }

  /**
   * Delete all keys for a device (cleanup on device removal)
   */
  async deleteDeviceKeys(userId: string, deviceId: string): Promise<void> {
    try {
      await db.tx(async (t) => {
        await t.none('DELETE FROM one_time_prekeys WHERE user_id = $1 AND device_id = $2', [
          userId,
          deviceId,
        ]);
        await t.none('DELETE FROM signed_prekeys WHERE user_id = $1 AND device_id = $2', [
          userId,
          deviceId,
        ]);
        await t.none('DELETE FROM identity_keys WHERE user_id = $1 AND device_id = $2', [
          userId,
          deviceId,
        ]);
      });

      logger.info('Device keys deleted', { userId, deviceId });
    } catch (error) {
      logger.error('Failed to delete device keys', { userId, deviceId, error });
      throw new AppError(500, 'Failed to delete device keys');
    }
  }

  /**
   * Validate base64 string format
   */
  private validateBase64(value: string, fieldName: string): void {
    if (!value || typeof value !== 'string') {
      throw new AppError(400, `${fieldName} must be a string`);
    }

    // Check if it's valid base64
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(value)) {
      throw new AppError(400, `${fieldName} must be valid base64`);
    }

    // Check minimum length (at least 32 bytes encoded)
    if (value.length < 44) {
      // 32 bytes = 44 characters in base64
      throw new AppError(400, `${fieldName} is too short`);
    }
  }
}

export const cryptoService = new CryptoService();
