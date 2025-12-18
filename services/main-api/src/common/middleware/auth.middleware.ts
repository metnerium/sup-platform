import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { AppError } from './error.middleware';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    deviceId: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided');
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: string;
      deviceId: string;
      type: string;
    };

    if (decoded.type !== 'access') {
      throw new AppError(401, 'Invalid token type');
    }

    // Attach user to request
    req.user = {
      id: decoded.userId,
      deviceId: decoded.deviceId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid token:', { error: error.message });
      return next(new AppError(401, 'Invalid token'));
    }

    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Token expired');
      return next(new AppError(401, 'Token expired'));
    }

    next(error);
  }
};

export const optionalAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwt.secret) as {
        userId: string;
        deviceId: string;
        type: string;
      };

      if (decoded.type === 'access') {
        req.user = {
          id: decoded.userId,
          deviceId: decoded.deviceId,
        };
      }
    }

    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};
