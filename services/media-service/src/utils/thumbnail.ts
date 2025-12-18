import sharp from 'sharp';
import { logger } from '../config/logger.config';
import { imageConfig } from '../config/processing.config';
import { videoService } from '../services/video.service';
import { fileConfig } from '../config/s3.config';

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

const DEFAULT_THUMBNAIL_OPTIONS: ThumbnailOptions = {
  width: 300,
  height: 300,
  quality: imageConfig.quality,
  format: 'jpeg',
};

export async function generateImageThumbnail(
  buffer: Buffer,
  options: ThumbnailOptions = {}
): Promise<Buffer> {
  try {
    const opts = { ...DEFAULT_THUMBNAIL_OPTIONS, ...options };

    let sharpInstance = sharp(buffer)
      .rotate() // Auto-rotate based on EXIF
      .resize(opts.width, opts.height, {
        fit: 'inside',
        withoutEnlargement: true,
      });

    // Strip metadata for privacy
    if (imageConfig.optimizationOptions.stripMetadata) {
      sharpInstance = sharpInstance.withMetadata({
        exif: {},
        icc: 'srgb',
      });
    }

    switch (opts.format) {
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({
          quality: opts.quality,
          progressive: imageConfig.optimizationOptions.progressive,
        });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({
          quality: opts.quality,
          compressionLevel: imageConfig.optimizationOptions.compressionLevel,
        });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality: opts.quality });
        break;
    }

    const thumbnailBuffer = await sharpInstance.toBuffer();

    logger.info('Generated image thumbnail', {
      originalSize: buffer.length,
      thumbnailSize: thumbnailBuffer.length,
      options: opts,
    });

    return thumbnailBuffer;
  } catch (error) {
    logger.error('Failed to generate image thumbnail', { error });
    throw new Error('Failed to generate thumbnail');
  }
}

export async function generateVideoThumbnail(
  videoBuffer: Buffer,
  timeOffset: number = 1
): Promise<Buffer> {
  try {
    const thumbnailBuffer = await videoService.generateThumbnail(videoBuffer, timeOffset);

    logger.info('Generated video thumbnail', {
      videoSize: videoBuffer.length,
      thumbnailSize: thumbnailBuffer.length,
      timeOffset,
    });

    return thumbnailBuffer;
  } catch (error) {
    logger.warn('Failed to generate video thumbnail, creating placeholder', { error });

    // Create a placeholder image on failure
    const placeholderBuffer = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 4,
        background: { r: 60, g: 60, b: 60, alpha: 1 },
      },
    })
      .jpeg({ quality: 80 })
      .toBuffer();

    return placeholderBuffer;
  }
}

export function shouldGenerateThumbnail(mimeType: string): boolean {
  return (
    fileConfig.imageMimeTypes.includes(mimeType) ||
    fileConfig.videoMimeTypes.includes(mimeType)
  );
}

export function getThumbnailExtension(format: string = 'jpeg'): string {
  const extensionMap: Record<string, string> = {
    jpeg: 'jpg',
    jpg: 'jpg',
    png: 'png',
    webp: 'webp',
  };
  return extensionMap[format] || 'jpg';
}
