import { fileConfig } from '../config/s3.config';
import { logger } from '../config/logger.config';
import { fileTypeService } from '../services/fileType.service';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFileSize(size: number, mimeType?: string): ValidationResult {
  const maxSize = getMaxSizeForMimeType(mimeType || '');

  if (size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSize} bytes`,
    };
  }
  return { valid: true };
}

function getMaxSizeForMimeType(mimeType: string): number {
  if (fileConfig.imageMimeTypes.includes(mimeType)) {
    return fileConfig.maxImageSize;
  }
  if (fileConfig.videoMimeTypes.includes(mimeType)) {
    return fileConfig.maxVideoSize;
  }
  if (fileConfig.audioMimeTypes.includes(mimeType)) {
    return fileConfig.maxAudioSize;
  }
  if (fileConfig.documentMimeTypes.includes(mimeType)) {
    return fileConfig.maxDocumentSize;
  }
  return fileConfig.maxFileSize;
}

export function validateMimeType(mimeType: string): ValidationResult {
  if (!fileConfig.allowedMimeTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `File type ${mimeType} is not allowed`,
    };
  }
  return { valid: true };
}

export async function validateFile(file: Express.Multer.File): Promise<ValidationResult> {
  // Check file size with type-specific limits
  const sizeValidation = validateFileSize(file.size, file.mimetype);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  // Check MIME type
  const mimeValidation = validateMimeType(file.mimetype);
  if (!mimeValidation.valid) {
    return mimeValidation;
  }

  // Validate file type using magic number checking
  const fileTypeValidation = await fileTypeService.validateFileType(
    file.buffer,
    file.mimetype
  );
  if (!fileTypeValidation.valid) {
    logger.warn('File type validation failed', {
      filename: file.originalname,
      declaredMimeType: file.mimetype,
      error: fileTypeValidation.error,
    });
    return fileTypeValidation;
  }

  return { valid: true };
}

export function sanitizeFilename(filename: string): string {
  // Remove any path separators and dangerous characters
  return filename
    .replace(/[\/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 255);
}

export function getFileExtension(filename: string): string {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : '';
}

export function getMimeTypeCategory(mimeType: string): string {
  if (fileConfig.imageMimeTypes.includes(mimeType)) {
    return 'image';
  }
  if (fileConfig.videoMimeTypes.includes(mimeType)) {
    return 'video';
  }
  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }
  if (mimeType.startsWith('application/') || mimeType.startsWith('text/')) {
    return 'document';
  }
  return 'other';
}

export async function scanForMalware(buffer: Buffer): Promise<ValidationResult> {
  // Placeholder for malware scanning
  // In production, integrate with ClamAV or similar service
  logger.info('Malware scan placeholder - implement in production');

  // Basic checks for suspicious patterns
  const suspiciousPatterns = [
    /eval\(/gi,
    /<script/gi,
    /javascript:/gi,
  ];

  const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 1024));

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      logger.warn('Suspicious pattern detected in file', { pattern: pattern.source });
      return {
        valid: false,
        error: 'File contains suspicious content',
      };
    }
  }

  return { valid: true };
}
