import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AppError } from '../middleware/error.middleware';

/**
 * Middleware to handle validation results from express-validator
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.type === 'field' ? (err as any).path : 'unknown',
      message: err.msg,
    }));

    return next(
      new AppError(400, 'Validation failed', errorMessages)
    );
  }

  next();
};

/**
 * Custom validators
 */
export const customValidators = {
  /**
   * Check if at least one of the fields is provided
   */
  atLeastOne: (fields: string[]) => {
    return (req: Request) => {
      const hasAtLeastOne = fields.some(field => {
        const value = req.body[field];
        return value !== undefined && value !== null && value !== '';
      });

      if (!hasAtLeastOne) {
        throw new Error(`At least one of ${fields.join(', ')} is required`);
      }

      return true;
    };
  },

  /**
   * Validate UUID format
   */
  isUUID: (value: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  /**
   * Validate base64 string
   */
  isBase64: (value: string) => {
    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
    return base64Regex.test(value);
  },
};
