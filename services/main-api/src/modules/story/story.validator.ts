import { z } from 'zod';

/**
 * UUID validation
 */
const uuidSchema = z.string().uuid('Invalid ID');

/**
 * Story media type validation
 */
const mediaTypeSchema = z.enum(['image', 'video', 'text'], {
  message: 'Media type must be image, video, or text',
});

/**
 * Story privacy validation
 */
const privacySchema = z.enum(['all', 'contacts', 'selected'], {
  message: 'Privacy must be all, contacts, or selected',
});

/**
 * S3 key validation
 */
const s3KeySchema = z
  .string()
  .min(1, 'S3 key cannot be empty')
  .max(500, 'S3 key is too long');

/**
 * Caption validation (optional)
 */
const captionEncryptedSchema = z
  .string()
  .max(5000, 'Caption is too long')
  .optional();

/**
 * Create story validation
 */
export const createStorySchema = z
  .object({
    mediaType: mediaTypeSchema,
    s3Key: s3KeySchema,
    captionEncrypted: captionEncryptedSchema,
    privacy: privacySchema,
    allowedUserIds: z.array(uuidSchema).optional(),
  })
  .strict()
  .refine(
    (data) => {
      // If privacy is 'selected', allowedUserIds must be provided and not empty
      if (data.privacy === 'selected') {
        return data.allowedUserIds && data.allowedUserIds.length > 0;
      }
      return true;
    },
    {
      message: 'allowedUserIds is required when privacy is set to selected',
      path: ['allowedUserIds'],
    }
  );

/**
 * View story validation
 */
export const viewStorySchema = z
  .object({
    storyId: uuidSchema,
  })
  .strict();

/**
 * Story ID param validation
 */
export const storyIdParamSchema = z.object({
  id: uuidSchema,
});

/**
 * Validation result types
 */
export type CreateStoryInput = z.infer<typeof createStorySchema>;
export type ViewStoryInput = z.infer<typeof viewStorySchema>;

/**
 * Middleware to validate request data
 */
export const validate = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      // Determine where to look for data based on schema
      const dataSource = req.method === 'GET' ? req.query : req.body;

      // For param validation
      if (schema === storyIdParamSchema) {
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
