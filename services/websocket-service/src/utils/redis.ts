import { createClient } from 'redis';
import logger from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis client
export const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis reconnection failed after 10 attempts');
        return new Error('Redis reconnection limit exceeded');
      }
      const delay = Math.min(retries * 100, 3000);
      logger.info(`Reconnecting to Redis in ${delay}ms...`);
      return delay;
    },
  },
});

// Create Redis client for pub/sub (Socket.io adapter)
export const redisSubClient = redisClient.duplicate();

// Connection event handlers
redisClient.on('connect', () => {
  logger.info('Redis client connecting...');
});

redisClient.on('ready', () => {
  logger.info('Redis client connected and ready');
});

redisClient.on('error', (err) => {
  logger.error('Redis client error:', err);
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis client reconnecting...');
});

redisSubClient.on('connect', () => {
  logger.info('Redis sub client connecting...');
});

redisSubClient.on('ready', () => {
  logger.info('Redis sub client connected and ready');
});

redisSubClient.on('error', (err) => {
  logger.error('Redis sub client error:', err);
});

// Connect to Redis
export async function connectRedis(): Promise<void> {
  try {
    await Promise.all([redisClient.connect(), redisSubClient.connect()]);
    logger.info('All Redis clients connected successfully');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

// Disconnect from Redis
export async function disconnectRedis(): Promise<void> {
  try {
    await Promise.all([
      redisClient.quit(),
      redisSubClient.quit(),
    ]);
    logger.info('Redis clients disconnected');
  } catch (error) {
    logger.error('Error disconnecting Redis clients:', error);
    throw error;
  }
}

// Utility functions for presence management
export async function setUserOnline(userId: string, socketId: string): Promise<void> {
  const key = `presence:${userId}`;
  await redisClient.hSet(key, {
    status: 'online',
    socketId,
    lastSeen: Date.now().toString(),
  });
  await redisClient.expire(key, 86400); // 24 hours TTL
}

export async function setUserOffline(userId: string): Promise<void> {
  const key = `presence:${userId}`;
  await redisClient.hSet(key, {
    status: 'offline',
    lastSeen: Date.now().toString(),
  });
  await redisClient.expire(key, 86400);
}

export async function getUserPresence(userId: string): Promise<{
  status: string;
  lastSeen?: number;
} | null> {
  const key = `presence:${userId}`;
  const data = await redisClient.hGetAll(key);
  if (!data || Object.keys(data).length === 0) {
    return null;
  }
  return {
    status: data.status || 'offline',
    lastSeen: data.lastSeen ? parseInt(data.lastSeen, 10) : undefined,
  };
}

// Rate limiting utilities
export async function checkRateLimit(
  userId: string,
  event: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const key = `ratelimit:${userId}:${event}`;
  const current = await redisClient.incr(key);

  if (current === 1) {
    await redisClient.pExpire(key, windowMs);
  }

  return current <= limit;
}

// Socket mapping utilities
export async function addSocketMapping(userId: string, socketId: string): Promise<void> {
  await redisClient.sAdd(`sockets:${userId}`, socketId);
  await redisClient.expire(`sockets:${userId}`, 86400);
}

export async function removeSocketMapping(userId: string, socketId: string): Promise<void> {
  await redisClient.sRem(`sockets:${userId}`, socketId);
}

export async function getUserSockets(userId: string): Promise<string[]> {
  return redisClient.sMembers(`sockets:${userId}`);
}

export async function getUserSocketCount(userId: string): Promise<number> {
  return redisClient.sCard(`sockets:${userId}`);
}
