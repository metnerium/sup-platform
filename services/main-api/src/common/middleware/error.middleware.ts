import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  public details?: any;

  constructor(
    public statusCode: number,
    public message: string,
    detailsOrOperational?: any,
    public isOperational = true
  ) {
    super(message);

    // Handle backwards compatibility - if third param is boolean, it's isOperational
    if (typeof detailsOrOperational === 'boolean') {
      this.isOperational = detailsOrOperational;
    } else if (detailsOrOperational !== undefined) {
      this.details = detailsOrOperational;
    }

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.error('Application error:', {
      statusCode: err.statusCode,
      message: err.message,
      path: req.path,
      method: req.method,
      stack: err.stack,
    });

    const errorResponse: any = {
      success: false,
      error: {
        message: err.message,
        statusCode: err.statusCode,
      },
    };

    // Add details if present
    if (err.details) {
      errorResponse.error.details = err.details;
    }

    return res.status(err.statusCode).json(errorResponse);
  }

  // Unexpected errors
  logger.error('Unexpected error:', {
    message: err.message,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  return res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      statusCode: 500,
    },
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Resource not found',
      statusCode: 404,
      path: req.path,
    },
  });
};
