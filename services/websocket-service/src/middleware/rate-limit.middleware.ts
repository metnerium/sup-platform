import { Socket } from 'socket.io';
import logger from '../utils/logger';
import { checkRateLimit } from '../utils/redis';
import { AuthenticatedSocket, RateLimitConfig } from '../types/socket.types';

// Rate limit configurations for different events
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'message:new': {
    event: 'message:new',
    limit: 30, // 30 messages
    windowMs: 60000, // per minute
  },
  'message:typing': {
    event: 'message:typing',
    limit: 10,
    windowMs: 10000, // 10 per 10 seconds
  },
  'message:delivered': {
    event: 'message:delivered',
    limit: 100,
    windowMs: 60000,
  },
  'message:read': {
    event: 'message:read',
    limit: 100,
    windowMs: 60000,
  },
  'presence:update': {
    event: 'presence:update',
    limit: 20,
    windowMs: 60000,
  },
  'call:initiate': {
    event: 'call:initiate',
    limit: 5,
    windowMs: 60000,
  },
  'reaction:new': {
    event: 'reaction:new',
    limit: 50,
    windowMs: 60000,
  },
  'reaction:remove': {
    event: 'reaction:remove',
    limit: 50,
    windowMs: 60000,
  },
};

/**
 * Create rate limiting middleware for specific event
 */
export const createRateLimitMiddleware = (eventName: string) => {
  return async (
    socket: AuthenticatedSocket,
    args: any[],
    next: (err?: Error) => void
  ): Promise<void> => {
    try {
      const config = RATE_LIMITS[eventName];

      if (!config) {
        // No rate limit configured for this event
        return next();
      }

      const userId = socket.userId;
      if (!userId) {
        logger.warn('Rate limit check: userId not found on socket', {
          socketId: socket.id,
          event: eventName,
        });
        return next(new Error('Authentication required'));
      }

      // Check rate limit
      const allowed = await checkRateLimit(
        userId,
        eventName,
        config.limit,
        config.windowMs
      );

      if (!allowed) {
        logger.warn('Rate limit exceeded', {
          userId,
          socketId: socket.id,
          event: eventName,
          limit: config.limit,
          windowMs: config.windowMs,
        });
        return next(new Error('Rate limit exceeded. Please slow down.'));
      }

      next();
    } catch (error) {
      logger.error('Rate limit middleware error', {
        socketId: socket.id,
        event: eventName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // In case of error, allow the request to proceed
      next();
    }
  };
};

/**
 * Apply rate limiting to socket events
 */
export const applyRateLimits = (socket: AuthenticatedSocket): void => {
  Object.keys(RATE_LIMITS).forEach((eventName) => {
    socket.use(async ([event, ...args], next) => {
      if (event === eventName) {
        await createRateLimitMiddleware(eventName)(socket, args, next);
      } else {
        next();
      }
    });
  });
};

/**
 * Get rate limit info for an event
 */
export const getRateLimitInfo = (eventName: string): RateLimitConfig | null => {
  return RATE_LIMITS[eventName] || null;
};

/**
 * Update rate limit configuration (useful for dynamic adjustments)
 */
export const updateRateLimit = (
  eventName: string,
  limit: number,
  windowMs: number
): void => {
  RATE_LIMITS[eventName] = {
    event: eventName,
    limit,
    windowMs,
  };
  logger.info('Rate limit updated', { eventName, limit, windowMs });
};
