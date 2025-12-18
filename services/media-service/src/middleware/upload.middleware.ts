import multer from 'multer';
import { Request } from 'express';
import { fileConfig } from '../config/s3.config';
import { ValidationError } from '../utils/errors';
import { logger } from '../config/logger.config';

const storage = multer.memoryStorage();

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  logger.debug('Filtering file', {
    filename: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  });

  if (!fileConfig.allowedMimeTypes.includes(file.mimetype)) {
    logger.warn('File type not allowed', {
      filename: file.originalname,
      mimeType: file.mimetype,
    });
    cb(new ValidationError(`File type ${file.mimetype} is not allowed`));
    return;
  }

  cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: fileConfig.maxFileSize,
    files: 1,
  },
  fileFilter,
});

export const uploadMultipleMiddleware = multer({
  storage,
  limits: {
    fileSize: fileConfig.maxFileSize,
    files: 10,
  },
  fileFilter,
});

export const handleMulterError = (
  err: any,
  req: Request,
  res: any,
  next: any
): void => {
  if (err instanceof multer.MulterError) {
    logger.warn('Multer error', { error: err.message, code: err.code });

    if (err.code === 'LIMIT_FILE_SIZE') {
      next(
        new ValidationError(
          `File size exceeds maximum allowed size of ${fileConfig.maxFileSize} bytes`
        )
      );
      return;
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      next(new ValidationError('Too many files uploaded'));
      return;
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      next(new ValidationError('Unexpected file field'));
      return;
    }

    next(new ValidationError(err.message));
    return;
  }

  next(err);
};
