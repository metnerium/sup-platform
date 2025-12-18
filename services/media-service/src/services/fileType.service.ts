import fileType from 'file-type';
import { logger } from '../config/logger.config';

export interface FileTypeInfo {
  ext: string;
  mime: string;
  category: 'image' | 'video' | 'audio' | 'document' | 'archive' | 'unknown';
}

export class FileTypeService {
  async detectFileType(buffer: Buffer): Promise<FileTypeInfo | null> {
    try {
      const detectedType = await fileType.fromBuffer(buffer);

      if (!detectedType) {
        logger.warn('Could not detect file type from buffer');
        return null;
      }

      const category = this.categorizeFileType(detectedType.mime);

      return {
        ext: detectedType.ext,
        mime: detectedType.mime,
        category,
      };
    } catch (error) {
      logger.error('Failed to detect file type', { error });
      return null;
    }
  }

  async validateFileType(
    buffer: Buffer,
    expectedMimeType: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const detected = await this.detectFileType(buffer);

      if (!detected) {
        return {
          valid: false,
          error: 'Could not detect file type',
        };
      }

      // Normalize MIME types for comparison
      const normalizedExpected = this.normalizeMimeType(expectedMimeType);
      const normalizedDetected = this.normalizeMimeType(detected.mime);

      if (normalizedExpected !== normalizedDetected) {
        logger.warn('File type mismatch', {
          expected: expectedMimeType,
          detected: detected.mime,
        });

        return {
          valid: false,
          error: `File type mismatch. Expected ${expectedMimeType}, detected ${detected.mime}`,
        };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Failed to validate file type', { error });
      return {
        valid: false,
        error: 'File type validation failed',
      };
    }
  }

  private categorizeFileType(
    mimeType: string
  ): 'image' | 'video' | 'audio' | 'document' | 'archive' | 'unknown' {
    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    if (mimeType.startsWith('video/')) {
      return 'video';
    }
    if (mimeType.startsWith('audio/')) {
      return 'audio';
    }
    if (
      mimeType.startsWith('application/pdf') ||
      mimeType.includes('document') ||
      mimeType.includes('word') ||
      mimeType.includes('excel') ||
      mimeType.includes('powerpoint') ||
      mimeType.startsWith('text/')
    ) {
      return 'document';
    }
    if (
      mimeType.includes('zip') ||
      mimeType.includes('rar') ||
      mimeType.includes('7z') ||
      mimeType.includes('tar') ||
      mimeType.includes('gzip')
    ) {
      return 'archive';
    }
    return 'unknown';
  }

  private normalizeMimeType(mimeType: string): string {
    const normalized = mimeType.toLowerCase().trim();

    // Handle common variations
    const mimeMap: Record<string, string> = {
      'image/jpg': 'image/jpeg',
      'audio/x-m4a': 'audio/mp4',
      'video/x-m4v': 'video/mp4',
    };

    return mimeMap[normalized] || normalized;
  }

  isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  isVideoFile(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  isAudioFile(mimeType: string): boolean {
    return mimeType.startsWith('audio/');
  }

  isDocumentFile(mimeType: string): boolean {
    return (
      mimeType.startsWith('application/pdf') ||
      mimeType.includes('document') ||
      mimeType.includes('word') ||
      mimeType.includes('excel') ||
      mimeType.includes('powerpoint') ||
      mimeType.startsWith('text/')
    );
  }
}

export const fileTypeService = new FileTypeService();
