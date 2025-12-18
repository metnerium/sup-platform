import { z } from 'zod';

/**
 * Username validation rules:
 * - 3-50 characters
 * - Alphanumeric, underscore, hyphen, and period allowed
 * - Must start with alphanumeric
 * - Cannot end with period
 */
const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must be at most 50 characters')
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/,
    'Username must start and end with alphanumeric character and contain only letters, numbers, dots, hyphens, and underscores'
  );

/**
 * Email validation
 */
const emailSchema = z.string().email('Invalid email address');

/**
 * Phone validation (E.164 format)
 */
const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format (e.g., +1234567890)');

/**
 * Bio validation
 */
const bioSchema = z
  .string()
  .max(200, 'Bio must be at most 200 characters')
  .optional();

/**
 * Avatar URL validation
 */
const avatarUrlSchema = z.string().url('Invalid avatar URL').optional();

/**
 * UUID validation
 */
const uuidSchema = z.string().uuid('Invalid user ID');

/**
 * User status validation
 */
const statusSchema = z.enum(['online', 'offline', 'away'] as const);

/**
 * Display name validation
 */
const displayNameSchema = z
  .string()
  .min(1, 'Display name cannot be empty')
  .max(100, 'Display name must be at most 100 characters')
  .optional();

/**
 * Search query validation
 */
const searchQuerySchema = z
  .string()
  .min(1, 'Search query cannot be empty')
  .max(50, 'Search query must be at most 50 characters');

/**
 * Pagination validation
 */
const limitSchema = z.coerce
  .number()
  .int()
  .min(1, 'Limit must be at least 1')
  .max(100, 'Limit must be at most 100')
  .default(20);

const offsetSchema = z.coerce
  .number()
  .int()
  .min(0, 'Offset must be at least 0')
  .default(0);

/**
 * Update user profile validation
 */
export const updateUserSchema = z
  .object({
    username: usernameSchema.optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    bio: bioSchema,
    avatarUrl: avatarUrlSchema,
  })
  .strict()
  .refine(
    (data) => {
      // At least one field must be provided
      return (
        data.username !== undefined ||
        data.email !== undefined ||
        data.phone !== undefined ||
        data.bio !== undefined ||
        data.avatarUrl !== undefined
      );
    },
    {
      message: 'At least one field must be provided for update',
    }
  );

/**
 * Update avatar validation
 */
export const updateAvatarSchema = z
  .object({
    avatarUrl: z.string().url('Invalid avatar URL'),
  })
  .strict();

/**
 * Update status validation
 */
export const updateStatusSchema = z
  .object({
    status: statusSchema,
  })
  .strict();

/**
 * Search users validation
 */
export const searchUsersSchema = z
  .object({
    query: searchQuerySchema,
    limit: limitSchema,
    offset: offsetSchema,
  })
  .strict();

/**
 * Add contact validation
 */
export const addContactSchema = z
  .object({
    contactUserId: uuidSchema,
    displayName: displayNameSchema,
  })
  .strict();

/**
 * Block user validation
 */
export const blockUserSchema = z
  .object({
    blockedUserId: uuidSchema,
  })
  .strict();

/**
 * User ID param validation
 */
export const userIdParamSchema = z.object({
  id: uuidSchema,
});

/**
 * Contact ID param validation
 */
export const contactIdParamSchema = z.object({
  contactId: uuidSchema,
});

/**
 * Blocked user ID param validation
 */
export const blockedUserIdParamSchema = z.object({
  blockedUserId: uuidSchema,
});

/**
 * Validation result types
 */
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
export type AddContactInput = z.infer<typeof addContactSchema>;
export type BlockUserInput = z.infer<typeof blockUserSchema>;

/**
 * Middleware to validate request data
 */
export const validate = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      // Determine where to look for data based on schema
      const dataSource = req.method === 'GET' ? req.query : req.body;

      // For param validation
      if (schema === userIdParamSchema ||
          schema === contactIdParamSchema ||
          schema === blockedUserIdParamSchema) {
        schema.parse(req.params);
      } else {
        const validated = schema.parse(dataSource);
        // Replace body/query with validated data
        if (req.method === 'GET') {
          req.query = validated;
        } else {
          req.body = validated;
        }
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation error',
            statusCode: 400,
            details: error.issues.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
        });
      }
      next(error);
    }
  };
};
