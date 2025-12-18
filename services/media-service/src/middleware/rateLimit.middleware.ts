import rateLimit from 'express-rate-limit';
import { logger } from '../config/logger.config';

const RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || '900000'
); // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = parseInt(
  process.env.RATE_LIMIT_MAX_REQUESTS || '100'
);

export const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

export const uploadLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: 50,
  message: 'Too many upload requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many upload requests, please try again later',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

export const downloadLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: 200,
  message: 'Too many download requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Download rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many download requests, please try again later',
        code: 'DOWNLOAD_RATE_LIMIT_EXCEEDED',
      },
    });
  },
});
