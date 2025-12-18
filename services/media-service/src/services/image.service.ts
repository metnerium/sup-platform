import sharp from 'sharp';
import { imageConfig, processingConfig } from '../config/processing.config';
import { logger } from '../config/logger.config';

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
  orientation?: number;
}

export interface ImageProcessingResult {
  buffer: Buffer;
  metadata: ImageMetadata;
  thumbnails?: Map<string, Buffer>;
}

export interface ThumbnailSize {
  name: string;
  width: number;
  height: number;
}

export class ImageService {
  async getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
    try {
      const metadata = await sharp(buffer).metadata();

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
        hasAlpha: metadata.hasAlpha || false,
        orientation: metadata.orientation,
      };
    } catch (error) {
      logger.error('Failed to get image metadata', { error });
      throw new Error('Failed to get image metadata');
    }
  }

  async processImage(buffer: Buffer): Promise<ImageProcessingResult> {
    try {
      const originalMetadata = await this.getImageMetadata(buffer);

      if (!processingConfig.enableImageOptimization) {
        return { buffer, metadata: originalMetadata };
      }

      // Check if conversion from HEIC/HEIF is needed
      const needsConversion = ['heic', 'heif'].includes(
        originalMetadata.format.toLowerCase()
      );

      let processedBuffer: Buffer;

      if (needsConversion) {
        processedBuffer = await this.convertToJpeg(buffer);
      } else {
        processedBuffer = await this.optimizeImage(buffer);
      }

      const metadata = await this.getImageMetadata(processedBuffer);

      logger.info('Image processed successfully', {
        originalSize: buffer.length,
        processedSize: processedBuffer.length,
        originalFormat: originalMetadata.format,
        processedFormat: metadata.format,
      });

      return {
        buffer: processedBuffer,
        metadata,
      };
    } catch (error) {
      logger.error('Failed to process image', { error });
      throw new Error('Failed to process image');
    }
  }

  async generateThumbnails(
    buffer: Buffer,
    sizes?: ThumbnailSize[]
  ): Promise<Map<string, Buffer>> {
    const thumbnailSizes = sizes || imageConfig.thumbnailSizes;
    const thumbnails = new Map<string, Buffer>();

    try {
      for (const size of thumbnailSizes) {
        const thumbnail = await this.generateThumbnail(buffer, size.width, size.height);
        thumbnails.set(size.name, thumbnail);

        logger.info('Thumbnail generated', {
          name: size.name,
          width: size.width,
          height: size.height,
          size: thumbnail.length,
        });
      }

      return thumbnails;
    } catch (error) {
      logger.error('Failed to generate thumbnails', { error });
      throw new Error('Failed to generate thumbnails');
    }
  }

  async generateThumbnail(
    buffer: Buffer,
    width: number,
    height: number
  ): Promise<Buffer> {
    try {
      const thumbnail = await sharp(buffer)
        .rotate() // Auto-rotate based on EXIF orientation
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: imageConfig.quality,
          progressive: imageConfig.optimizationOptions.progressive,
        })
        .toBuffer();

      return thumbnail;
    } catch (error) {
      logger.error('Failed to generate thumbnail', { error, width, height });
      throw new Error('Failed to generate thumbnail');
    }
  }

  async optimizeImage(buffer: Buffer): Promise<Buffer> {
    try {
      const metadata = await sharp(buffer).metadata();

      let pipeline = sharp(buffer).rotate(); // Auto-rotate based on EXIF

      // Strip metadata if configured
      if (imageConfig.optimizationOptions.stripMetadata) {
        pipeline = pipeline.withMetadata({
          exif: {},
          icc: 'srgb',
        });
      }

      // Optimize based on format
      switch (metadata.format) {
        case 'jpeg':
        case 'jpg':
          pipeline = pipeline.jpeg({
            quality: imageConfig.quality,
            progressive: imageConfig.optimizationOptions.progressive,
          });
          break;

        case 'png':
          pipeline = pipeline.png({
            quality: imageConfig.quality,
            compressionLevel: imageConfig.optimizationOptions.compressionLevel,
            progressive: imageConfig.optimizationOptions.progressive,
          });
          break;

        case 'webp':
          pipeline = pipeline.webp({
            quality: imageConfig.quality,
          });
          break;

        case 'gif':
          // For GIFs, convert to WebP for better compression while maintaining animation
          pipeline = pipeline.webp({
            quality: imageConfig.quality,
          });
          break;

        default:
          // Convert unsupported formats to JPEG
          pipeline = pipeline.jpeg({
            quality: imageConfig.quality,
            progressive: imageConfig.optimizationOptions.progressive,
          });
      }

      const optimized = await pipeline.toBuffer();

      logger.info('Image optimized', {
        originalSize: buffer.length,
        optimizedSize: optimized.length,
        reduction: ((1 - optimized.length / buffer.length) * 100).toFixed(2) + '%',
      });

      return optimized;
    } catch (error) {
      logger.error('Failed to optimize image', { error });
      throw new Error('Failed to optimize image');
    }
  }

  async convertToJpeg(buffer: Buffer): Promise<Buffer> {
    try {
      const converted = await sharp(buffer)
        .rotate()
        .jpeg({
          quality: imageConfig.quality,
          progressive: imageConfig.optimizationOptions.progressive,
        })
        .toBuffer();

      logger.info('Image converted to JPEG', {
        originalSize: buffer.length,
        convertedSize: converted.length,
      });

      return converted;
    } catch (error) {
      logger.error('Failed to convert image to JPEG', { error });
      throw new Error('Failed to convert image to JPEG');
    }
  }

  async resizeImage(
    buffer: Buffer,
    width?: number,
    height?: number,
    fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' = 'inside'
  ): Promise<Buffer> {
    try {
      const resized = await sharp(buffer)
        .rotate()
        .resize(width, height, {
          fit,
          withoutEnlargement: true,
        })
        .toBuffer();

      logger.info('Image resized', {
        width,
        height,
        fit,
        originalSize: buffer.length,
        resizedSize: resized.length,
      });

      return resized;
    } catch (error) {
      logger.error('Failed to resize image', { error, width, height });
      throw new Error('Failed to resize image');
    }
  }

  async cropImage(
    buffer: Buffer,
    left: number,
    top: number,
    width: number,
    height: number
  ): Promise<Buffer> {
    try {
      const cropped = await sharp(buffer)
        .extract({ left, top, width, height })
        .toBuffer();

      logger.info('Image cropped', {
        left,
        top,
        width,
        height,
        originalSize: buffer.length,
        croppedSize: cropped.length,
      });

      return cropped;
    } catch (error) {
      logger.error('Failed to crop image', { error, left, top, width, height });
      throw new Error('Failed to crop image');
    }
  }

  async blurImage(buffer: Buffer, sigma: number = 5): Promise<Buffer> {
    try {
      const blurred = await sharp(buffer).blur(sigma).toBuffer();

      logger.info('Image blurred', {
        sigma,
        originalSize: buffer.length,
        blurredSize: blurred.length,
      });

      return blurred;
    } catch (error) {
      logger.error('Failed to blur image', { error, sigma });
      throw new Error('Failed to blur image');
    }
  }

  async convertFormat(
    buffer: Buffer,
    format: 'jpeg' | 'png' | 'webp' | 'avif'
  ): Promise<Buffer> {
    try {
      let pipeline = sharp(buffer).rotate();

      switch (format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality: imageConfig.quality });
          break;
        case 'png':
          pipeline = pipeline.png({ quality: imageConfig.quality });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality: imageConfig.quality });
          break;
        case 'avif':
          pipeline = pipeline.avif({ quality: imageConfig.quality });
          break;
      }

      const converted = await pipeline.toBuffer();

      logger.info('Image format converted', {
        format,
        originalSize: buffer.length,
        convertedSize: converted.length,
      });

      return converted;
    } catch (error) {
      logger.error('Failed to convert image format', { error, format });
      throw new Error('Failed to convert image format');
    }
  }
}

export const imageService = new ImageService();
