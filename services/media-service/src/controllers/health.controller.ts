import { Request, Response } from 'express';
import { s3Client, bucketName } from '../config/s3.config';
import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { logger } from '../config/logger.config';

export class HealthController {
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: 'Media service is running',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Health check failed', { error });
      res.status(503).json({
        success: false,
        message: 'Service unavailable',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async readinessCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check S3 connection
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));

      res.status(200).json({
        success: true,
        message: 'Service is ready',
        checks: {
          s3: 'connected',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Readiness check failed', { error });
      res.status(503).json({
        success: false,
        message: 'Service not ready',
        checks: {
          s3: 'disconnected',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const healthController = new HealthController();
