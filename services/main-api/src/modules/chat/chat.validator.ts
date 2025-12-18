import { body, param, query, ValidationChain } from 'express-validator';

/**
 * Validation rules for creating a chat
 */
export const createChatValidation: ValidationChain[] = [
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Chat type is required')
    .isIn(['direct', 'group', 'channel'])
    .withMessage('Invalid chat type. Must be: direct, group, or channel'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Chat name must be between 1 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),

  body('memberIds')
    .optional()
    .isArray()
    .withMessage('memberIds must be an array')
    .custom((value: any[]) => {
      if (value && value.length > 0 && !value.every((id) => typeof id === 'string')) {
        throw new Error('All member IDs must be strings');
      }
      return true;
    }),

  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),

  // Custom validator: group/channel requires name
  body().custom((value, { req }) => {
    const { type, name } = req.body;
    if ((type === 'group' || type === 'channel') && !name) {
      throw new Error(`${type} chat requires a name`);
    }
    return true;
  }),

  // Custom validator: direct chat requires exactly one member
  body().custom((value, { req }) => {
    const { type, memberIds } = req.body;
    if (type === 'direct') {
      if (!memberIds || !Array.isArray(memberIds) || memberIds.length !== 1) {
        throw new Error('Direct chat requires exactly one other member');
      }
    }
    return true;
  }),
];

/**
 * Validation rules for updating a chat
 */
export const updateChatValidation: ValidationChain[] = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Chat ID is required')
    .isUUID()
    .withMessage('Invalid chat ID format'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Chat name must be between 1 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),

  body('avatarUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Invalid avatar URL format'),

  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),

  // At least one field must be provided
  body().custom((value, { req }) => {
    const { name, description, avatarUrl, isPublic } = req.body;
    if (
      name === undefined &&
      description === undefined &&
      avatarUrl === undefined &&
      isPublic === undefined
    ) {
      throw new Error('At least one field must be provided for update');
    }
    return true;
  }),
];

/**
 * Validation rules for chat ID parameter
 */
export const chatIdValidation: ValidationChain[] = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Chat ID is required')
    .isUUID()
    .withMessage('Invalid chat ID format'),
];

/**
 * Validation rules for adding a member
 */
export const addMemberValidation: ValidationChain[] = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Chat ID is required')
    .isUUID()
    .withMessage('Invalid chat ID format'),

  body('userId')
    .trim()
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('Invalid user ID format'),

  body('roleId')
    .optional()
    .trim()
    .isUUID()
    .withMessage('Invalid role ID format'),
];

/**
 * Validation rules for removing a member
 */
export const removeMemberValidation: ValidationChain[] = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Chat ID is required')
    .isUUID()
    .withMessage('Invalid chat ID format'),

  param('userId')
    .trim()
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('Invalid user ID format'),
];

/**
 * Validation rules for updating member role
 */
export const updateMemberRoleValidation: ValidationChain[] = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Chat ID is required')
    .isUUID()
    .withMessage('Invalid chat ID format'),

  body('userId')
    .trim()
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('Invalid user ID format'),

  body('roleId')
    .trim()
    .notEmpty()
    .withMessage('Role ID is required')
    .isUUID()
    .withMessage('Invalid role ID format'),
];

/**
 * Validation rules for pagination
 */
export const paginationValidation: ValidationChain[] = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
    .toInt(),

  query('cursor')
    .optional()
    .trim()
    .isString()
    .withMessage('Cursor must be a string'),
];

/**
 * Validation rules for invite link
 */
export const inviteLinkValidation: ValidationChain[] = [
  param('link')
    .trim()
    .notEmpty()
    .withMessage('Invite link is required')
    .isLength({ min: 32, max: 32 })
    .withMessage('Invalid invite link format')
    .matches(/^[a-f0-9]{32}$/)
    .withMessage('Invite link must be a valid hex string'),
];

/**
 * Validation rules for creating a role
 */
export const createRoleValidation: ValidationChain[] = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Chat ID is required')
    .isUUID()
    .withMessage('Invalid chat ID format'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Role name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Role name must be between 1 and 50 characters'),

  body('permissions')
    .notEmpty()
    .withMessage('Permissions are required')
    .isObject()
    .withMessage('Permissions must be an object')
    .custom((value) => {
      // Validate permissions structure
      const validPermissions = [
        'manage_chat',
        'manage_members',
        'manage_roles',
        'send_messages',
        'delete_messages',
        'pin_messages',
      ];

      for (const key of Object.keys(value)) {
        if (!validPermissions.includes(key)) {
          throw new Error(`Invalid permission: ${key}`);
        }
        if (typeof value[key] !== 'boolean') {
          throw new Error(`Permission ${key} must be a boolean`);
        }
      }

      return true;
    }),

  body('color')
    .optional()
    .trim()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color (e.g., #FF0000)'),
];

/**
 * Validation rules for updating a role
 */
export const updateRoleValidation: ValidationChain[] = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Chat ID is required')
    .isUUID()
    .withMessage('Invalid chat ID format'),

  param('roleId')
    .trim()
    .notEmpty()
    .withMessage('Role ID is required')
    .isUUID()
    .withMessage('Invalid role ID format'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Role name must be between 1 and 50 characters'),

  body('permissions')
    .optional()
    .isObject()
    .withMessage('Permissions must be an object')
    .custom((value) => {
      // Validate permissions structure
      const validPermissions = [
        'manage_chat',
        'manage_members',
        'manage_roles',
        'send_messages',
        'delete_messages',
        'pin_messages',
      ];

      for (const key of Object.keys(value)) {
        if (!validPermissions.includes(key)) {
          throw new Error(`Invalid permission: ${key}`);
        }
        if (typeof value[key] !== 'boolean') {
          throw new Error(`Permission ${key} must be a boolean`);
        }
      }

      return true;
    }),

  body('color')
    .optional()
    .trim()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color (e.g., #FF0000)'),

  // At least one field must be provided
  body().custom((value, { req }) => {
    const { name, permissions, color } = req.body;
    if (name === undefined && permissions === undefined && color === undefined) {
      throw new Error('At least one field must be provided for update');
    }
    return true;
  }),
];

/**
 * Validation rules for deleting a role
 */
export const deleteRoleValidation: ValidationChain[] = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Chat ID is required')
    .isUUID()
    .withMessage('Invalid chat ID format'),

  param('roleId')
    .trim()
    .notEmpty()
    .withMessage('Role ID is required')
    .isUUID()
    .withMessage('Invalid role ID format'),
];
