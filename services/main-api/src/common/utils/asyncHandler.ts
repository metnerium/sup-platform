import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrapper for async route handlers to catch errors
 * Eliminates need for try-catch in every controller method
 */
export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
