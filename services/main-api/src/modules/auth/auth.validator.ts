import { body, ValidationChain } from 'express-validator';

/**
 * Validation rules for user registration
 */
export const registerValidation: ValidationChain[] = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .notEmpty()
    .withMessage('Username is required'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format (E.164 format required)'),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
    .notEmpty()
    .withMessage('Password is required'),

  body('deviceId')
    .trim()
    .notEmpty()
    .withMessage('Device ID is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Device ID must be between 1 and 255 characters'),

  body('deviceName')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Device name must not exceed 255 characters'),

  body('deviceType')
    .optional()
    .trim()
    .isIn(['ios', 'android', 'web', 'desktop', 'other'])
    .withMessage('Invalid device type'),

  // Custom validator: must have at least email or phone
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phone) {
      throw new Error('Either email or phone is required');
    }
    return true;
  }),
];

/**
 * Validation rules for user login
 */
export const loginValidation: ValidationChain[] = [
  body('username')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Username cannot be empty')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format (E.164 format required)'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 1, max: 128 })
    .withMessage('Password must not exceed 128 characters'),

  body('deviceId')
    .trim()
    .notEmpty()
    .withMessage('Device ID is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Device ID must be between 1 and 255 characters'),

  body('deviceName')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Device name must not exceed 255 characters'),

  body('deviceType')
    .optional()
    .trim()
    .isIn(['ios', 'android', 'web', 'desktop', 'other'])
    .withMessage('Invalid device type'),

  // Custom validator: must have at least username, email, or phone
  body().custom((value, { req }) => {
    if (!req.body.username && !req.body.email && !req.body.phone) {
      throw new Error('Username, email, or phone is required');
    }
    return true;
  }),
];

/**
 * Validation rules for token refresh
 */
export const refreshTokenValidation: ValidationChain[] = [
  body('refreshToken')
    .trim()
    .notEmpty()
    .withMessage('Refresh token is required')
    .isJWT()
    .withMessage('Invalid token format'),
];

/**
 * Validation rules for logout
 */
export const logoutValidation: ValidationChain[] = [
  body('refreshToken')
    .trim()
    .notEmpty()
    .withMessage('Refresh token is required')
    .isJWT()
    .withMessage('Invalid token format'),
];

/**
 * Validation rules for password change (future extension)
 */
export const changePasswordValidation: ValidationChain[] = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
    .notEmpty()
    .withMessage('New password is required'),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

/**
 * Validation rules for 2FA enable (future extension)
 */
export const enable2FAValidation: ValidationChain[] = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('2FA code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('2FA code must be 6 digits')
    .isNumeric()
    .withMessage('2FA code must contain only numbers'),
];

/**
 * Validation rules for 2FA verify
 */
export const verify2FAValidation: ValidationChain[] = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('2FA code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('2FA code must be 6 digits')
    .isNumeric()
    .withMessage('2FA code must contain only numbers'),

  body('isInitialSetup')
    .optional()
    .isBoolean()
    .withMessage('isInitialSetup must be a boolean'),
];
