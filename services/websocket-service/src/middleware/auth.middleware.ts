import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { AuthenticatedSocket } from '../types/socket.types';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

interface JwtPayload {
  userId: string;
  deviceId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Authentication middleware for Socket.io
 * Verifies JWT token from query parameters or headers
 * Attaches userId and deviceId to socket instance
 */
export const authMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> => {
  try {
    // Extract token from query parameters or auth header
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      logger.warn('Connection attempt without token', {
        socketId: socket.id,
        ip: socket.handshake.address,
      });
      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token as string, JWT_SECRET) as JwtPayload;
    } catch (error) {
      logger.warn('Invalid token provided', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return next(new Error('Invalid token'));
    }

    // Validate token payload
    if (!decoded.userId) {
      logger.warn('Token missing userId', { socketId: socket.id });
      return next(new Error('Invalid token payload'));
    }

    // Attach user data to socket
    const authSocket = socket as AuthenticatedSocket;
    authSocket.userId = decoded.userId;
    authSocket.deviceId = decoded.deviceId;

    logger.info('Socket authenticated', {
      socketId: socket.id,
      userId: decoded.userId,
      deviceId: decoded.deviceId,
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      socketId: socket.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(new Error('Authentication failed'));
  }
};

/**
 * Verify token synchronously (for use in event handlers)
 */
export const verifyToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    logger.error('Token verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
};

/**
 * Generate JWT token for testing/development
 */
export const generateToken = (userId: string, deviceId?: string): string => {
  return jwt.sign({ userId, deviceId }, JWT_SECRET, {
    expiresIn: '7d',
  });
};
