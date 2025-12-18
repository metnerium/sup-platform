import { Response } from 'express';
import { ApiResponse } from '@sup/types';

/**
 * Utility functions for standardized API responses
 */
export class ResponseUtil {
  /**
   * Send success response
   */
  static success<T>(res: Response, data: T, statusCode: number = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Send created response (201)
   */
  static created<T>(res: Response, data: T): Response {
    return ResponseUtil.success(res, data, 201);
  }

  /**
   * Send no content response (204)
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    details?: any
  ): Response {
    const response: ApiResponse = {
      success: false,
      error: {
        message,
        statusCode,
        details,
      },
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Send bad request response (400)
   */
  static badRequest(res: Response, message: string, details?: any): Response {
    return ResponseUtil.error(res, message, 400, details);
  }

  /**
   * Send unauthorized response (401)
   */
  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return ResponseUtil.error(res, message, 401);
  }

  /**
   * Send forbidden response (403)
   */
  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return ResponseUtil.error(res, message, 403);
  }

  /**
   * Send not found response (404)
   */
  static notFound(res: Response, message: string = 'Resource not found'): Response {
    return ResponseUtil.error(res, message, 404);
  }

  /**
   * Send conflict response (409)
   */
  static conflict(res: Response, message: string): Response {
    return ResponseUtil.error(res, message, 409);
  }
}
