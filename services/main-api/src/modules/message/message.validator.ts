import { body, param, query, ValidationChain } from 'express-validator';

/**
 * Validation rules for sending a message
 */
export const sendMessageValidation: ValidationChain[] = [
  param('chatId')
    .trim()
    .notEmpty()
    .withMessage('Chat ID is required')
    .isUUID()
    .withMessage('Chat ID must be a valid UUID'),

  body('encryptedContent')
    .trim()
    .notEmpty()
    .withMessage('Encrypted content is required')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Encrypted content must be between 1 and 10000 characters'),

  body('type')
    .trim()
    .notEmpty()
    .withMessage('Message type is required')
    .isIn(['text', 'image', 'video', 'audio', 'file', 'voice', 'sticker'])
    .withMessage('Invalid message type'),

  body('replyToId')
    .optional()
    .trim()
    .isUUID()
    .withMessage('Reply to ID must be a valid UUID'),

  body('forwardFromId')
    .optional()
    .trim()
    .isUUID()
    .withMessage('Forward from ID must be a valid UUID'),

  body('recipientDeviceIds')
    .optional()
    .isObject()
    .withMessage('Recipient device IDs must be an object'),

  // Validate recipientDeviceIds structure if provided
  body('recipientDeviceIds').custom((value) => {
    if (value) {
      for (const userId in value) {
        if (!Array.isArray(value[userId])) {
          throw new Error('Each recipient device ID entry must be an array');
        }
        for (const deviceId of value[userId]) {
          if (typeof deviceId !== 'string' || deviceId.trim().length === 0) {
            throw new Error('Device IDs must be non-empty strings');
          }
        }
      }
    }
    return true;
  }),
];

/**
 * Validation rules for getting messages
 */
export const getMessagesValidation: ValidationChain[] = [
  param('chatId')
    .trim()
    .notEmpty()
    .withMessage('Chat ID is required')
    .isUUID()
    .withMessage('Chat ID must be a valid UUID'),

  query('cursor')
    .optional()
    .trim()
    .isISO8601()
    .withMessage('Cursor must be a valid ISO 8601 date'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

/**
 * Validation rules for getting a single message
 */
export const getMessageValidation: ValidationChain[] = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Message ID is required')
    .isUUID()
    .withMessage('Message ID must be a valid UUID'),
];

/**
 * Validation rules for editing a message
 */
export const editMessageValidation: ValidationChain[] = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Message ID is required')
    .isUUID()
    .withMessage('Message ID must be a valid UUID'),

  body('encryptedContent')
    .trim()
    .notEmpty()
    .withMessage('Encrypted content is required')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Encrypted content must be between 1 and 10000 characters'),
];

/**
 * Validation rules for deleting a message
 */
export const deleteMessageValidation: ValidationChain[] = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Message ID is required')
    .isUUID()
    .withMessage('Message ID must be a valid UUID'),

  body('forEveryone')
    .optional()
    .isBoolean()
    .withMessage('forEveryone must be a boolean')
    .toBoolean(),
];

/**
 * Validation rules for marking message as delivered
 */
export const markAsDeliveredValidation: ValidationChain[] = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Message ID is required')
    .isUUID()
    .withMessage('Message ID must be a valid UUID'),
];

/**
 * Validation rules for marking messages as read
 */
export const markAsReadValidation: ValidationChain[] = [
  body('messageIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('Message IDs must be an array with 1-100 items'),

  body('messageIds.*')
    .trim()
    .isUUID()
    .withMessage('Each message ID must be a valid UUID'),
];

/**
 * Validation rules for adding a reaction
 */
export const addReactionValidation: ValidationChain[] = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Message ID is required')
    .isUUID()
    .withMessage('Message ID must be a valid UUID'),

  body('emoji')
    .trim()
    .notEmpty()
    .withMessage('Emoji is required')
    .isLength({ min: 1, max: 10 })
    .withMessage('Emoji must be between 1 and 10 characters')
    .matches(/^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{231A}-\u{23FF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2B50}\u{2763}\u{2764}\u{2665}\u{1F004}\u{1F0CF}\u{1F18E}\u{3030}\u{303D}\u{3297}\u{3299}\u{1F170}-\u{1F251}\u{203C}\u{2049}\u{20E3}\u{2122}\u{2139}\u{2194}-\u{2199}\u{21A9}-\u{21AA}\u{23E9}-\u{23EF}\u{23F0}\u{23F3}\u{24C2}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2600}-\u{2604}\u{260E}\u{2611}\u{2614}-\u{2615}\u{2618}\u{261D}\u{2620}\u{2622}-\u{2623}\u{2626}\u{262A}\u{262E}-\u{262F}\u{2638}-\u{263A}\u{2640}\u{2642}\u{2648}-\u{2653}\u{265F}-\u{2660}\u{2663}\u{2665}-\u{2666}\u{2668}\u{267B}\u{267E}-\u{267F}\u{2692}-\u{2697}\u{2699}\u{269B}-\u{269C}\u{26A0}-\u{26A1}\u{26A7}\u{26AA}-\u{26AB}\u{26B0}-\u{26B1}\u{26BD}-\u{26BE}\u{26C4}-\u{26C5}\u{26C8}\u{26CE}-\u{26CF}\u{26D1}\u{26D3}-\u{26D4}\u{26E9}-\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2728}\u{2733}-\u{2734}\u{2744}\u{2747}\u{274C}\u{274E}\u{2753}-\u{2755}\u{2757}\u{2763}-\u{2764}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{E0020}-\u{E007F}]+$/u)
    .withMessage('Invalid emoji format'),
];

/**
 * Validation rules for removing a reaction
 */
export const removeReactionValidation: ValidationChain[] = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Message ID is required')
    .isUUID()
    .withMessage('Message ID must be a valid UUID'),

  param('emoji')
    .trim()
    .notEmpty()
    .withMessage('Emoji is required')
    .isLength({ min: 1, max: 10 })
    .withMessage('Emoji must be between 1 and 10 characters'),
];

/**
 * Validation rules for getting reactions
 */
export const getReactionsValidation: ValidationChain[] = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Message ID is required')
    .isUUID()
    .withMessage('Message ID must be a valid UUID'),
];

/**
 * Validation rules for searching messages
 */
export const searchMessagesValidation: ValidationChain[] = [
  body('query')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Query must be between 1 and 100 characters'),

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
 * Validation rules for getting unread count
 */
export const getUnreadCountValidation: ValidationChain[] = [
  // No specific validation needed for this endpoint
  // User ID and device ID come from auth middleware
];
