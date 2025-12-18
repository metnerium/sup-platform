import { body, query, ValidationChain } from 'express-validator';

/**
 * Validation rules for searching users
 */
export const searchUsersValidation: ValidationChain[] = [
  body('query')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_@.]+$/)
    .withMessage('Search query contains invalid characters'),

  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  body('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
    .toInt(),
];

/**
 * Validation rules for searching chats
 */
export const searchChatsValidation: ValidationChain[] = [
  body('query')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_@.]+$/)
    .withMessage('Search query contains invalid characters'),

  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

/**
 * Validation rules for searching messages
 */
export const searchMessagesValidation: ValidationChain[] = [
  body('query')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_@.]+$/)
    .withMessage('Search query contains invalid characters'),

  body('chatId')
    .optional()
    .trim()
    .isUUID()
    .withMessage('Chat ID must be a valid UUID'),

  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

/**
 * Validation rules for global search
 */
export const globalSearchValidation: ValidationChain[] = [
  body('query')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_@.]+$/)
    .withMessage('Search query contains invalid characters'),

  body('type')
    .optional()
    .trim()
    .isIn(['users', 'chats', 'messages'])
    .withMessage('Type must be one of: users, chats, messages'),

  body('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
    .toInt(),
];
