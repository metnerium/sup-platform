import rateLimit from 'express-rate-limit';
import { redisClient } from '../../config/redis';
import { config } from '../../config';
import { logger } from '../utils/logger';

// Redis store for rate limiting (distributed)
class RedisStore {
  prefix: string;

  constructor(prefix: string = 'rl:') {
    this.prefix = prefix;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date | undefined }> {
    const redisKey = `${this.prefix}${key}`;
    const windowMs = config.rateLimit.windowMs;

    try {
      const current = await redisClient.get(redisKey);

      if (current === null) {
        // First request in window
        await redisClient.set(redisKey, '1', {
          PX: windowMs,
        });
        return {
          totalHits: 1,
          resetTime: new Date(Date.now() + windowMs),
        };
      }

      // Increment counter
      const totalHits = await redisClient.incr(redisKey);
      const ttl = await redisClient.pTTL(redisKey);

      return {
        totalHits,
        resetTime: ttl > 0 ? new Date(Date.now() + ttl) : undefined,
      };
    } catch (error) {
      logger.error('Redis rate limit error:', error);
      // Fallback: allow request if Redis fails
      return { totalHits: 0, resetTime: undefined };
    }
  }

  async decrement(key: string): Promise<void> {
    const redisKey = `${this.prefix}${key}`;
    try {
      await redisClient.decr(redisKey);
    } catch (error) {
      logger.error('Redis decrement error:', error);
    }
  }

  async resetKey(key: string): Promise<void> {
    const redisKey = `${this.prefix}${key}`;
    try {
      await redisClient.del(redisKey);
    } catch (error) {
      logger.error('Redis reset key error:', error);
    }
  }
}

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded:', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests, please try again later',
        statusCode: 429,
      },
    });
  },
});

// Strict rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded:', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many authentication attempts, please try again later',
        statusCode: 429,
      },
    });
  },
});

// Upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded:', {
      ip: req.ip,
      userId: (req as any).user?.id,
    });
    res.status(429).json({
      success: false,
      error: {
        message: 'Upload limit exceeded, please try again later',
        statusCode: 429,
      },
    });
  },
});
