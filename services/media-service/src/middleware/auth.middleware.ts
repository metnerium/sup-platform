import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { logger } from '../config/logger.config';

export interface JWTPayload {
  userId: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const authMiddleware = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('No authorization header provided');
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    if (!decoded.userId) {
      throw new UnauthorizedError('Invalid token payload');
    }

    req.user = decoded;

    logger.debug('User authenticated', { userId: decoded.userId });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('JWT verification failed', { error: error.message });
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      logger.warn('JWT token expired');
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
};

export const verifyFileOwnership = (s3Key: string, userId: string): boolean => {
  // Check if the s3Key belongs to the user
  const userPath = `users/${userId}/`;
  return s3Key.startsWith(userPath);
};

export const ownershipMiddleware = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const { s3Key } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    if (!s3Key) {
      next();
      return;
    }

    if (!verifyFileOwnership(s3Key, userId)) {
      logger.warn('User attempted to access file they do not own', {
        userId,
        s3Key,
      });
      throw new ForbiddenError('You do not have access to this file');
    }

    next();
  } catch (error) {
    next(error);
  }
};
