import ffmpeg from 'fluent-ffmpeg';
import { ffmpegConfig, videoConfig, processingConfig } from '../config/processing.config';
import { logger } from '../config/logger.config';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Set FFmpeg paths
ffmpeg.setFfmpegPath(ffmpegConfig.ffmpegPath);
ffmpeg.setFfprobePath(ffmpegConfig.ffprobePath);

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  bitrate: number;
  codec: string;
  fps: number;
  size: number;
}

export interface VideoProcessingResult {
  buffer: Buffer;
  metadata: VideoMetadata;
  thumbnailBuffer?: Buffer;
}

export class VideoService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'media-service-video');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async getVideoMetadata(buffer: Buffer): Promise<VideoMetadata> {
    const tempInputPath = path.join(this.tempDir, `${uuidv4()}-input`);

    try {
      fs.writeFileSync(tempInputPath, buffer);

      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempInputPath, (err, metadata) => {
          if (err) {
            logger.error('Failed to get video metadata', { error: err });
            reject(new Error('Failed to get video metadata'));
            return;
          }

          const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
          if (!videoStream) {
            reject(new Error('No video stream found'));
            return;
          }

          const result: VideoMetadata = {
            duration: metadata.format.duration || 0,
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            bitrate: metadata.format.bit_rate || 0,
            codec: videoStream.codec_name || 'unknown',
            fps: this.parseFps(videoStream.r_frame_rate || '0/1'),
            size: metadata.format.size || buffer.length,
          };

          resolve(result);
        });
      });
    } finally {
      this.cleanupFile(tempInputPath);
    }
  }

  async processVideo(buffer: Buffer): Promise<VideoProcessingResult> {
    if (!processingConfig.enableVideoProcessing) {
      const metadata = await this.getVideoMetadata(buffer);
      return { buffer, metadata };
    }

    const tempInputPath = path.join(this.tempDir, `${uuidv4()}-input`);
    const tempOutputPath = path.join(this.tempDir, `${uuidv4()}-output.mp4`);

    try {
      fs.writeFileSync(tempInputPath, buffer);

      const metadata = await this.getVideoMetadata(buffer);

      // Calculate target dimensions
      const targetDimensions = this.calculateTargetDimensions(
        metadata.width,
        metadata.height
      );

      await this.convertVideo(tempInputPath, tempOutputPath, targetDimensions);

      const processedBuffer = fs.readFileSync(tempOutputPath);
      const processedMetadata = await this.getVideoMetadata(processedBuffer);

      logger.info('Video processed successfully', {
        originalSize: buffer.length,
        processedSize: processedBuffer.length,
        dimensions: targetDimensions,
      });

      return {
        buffer: processedBuffer,
        metadata: processedMetadata,
      };
    } finally {
      this.cleanupFile(tempInputPath);
      this.cleanupFile(tempOutputPath);
    }
  }

  async generateThumbnail(buffer: Buffer, timeOffset: number = 1): Promise<Buffer> {
    const tempInputPath = path.join(this.tempDir, `${uuidv4()}-input`);
    const tempOutputPath = path.join(this.tempDir, `${uuidv4()}-thumbnail.jpg`);

    try {
      fs.writeFileSync(tempInputPath, buffer);

      await this.extractThumbnail(tempInputPath, tempOutputPath, timeOffset);

      const thumbnailBuffer = fs.readFileSync(tempOutputPath);

      logger.info('Video thumbnail generated', {
        size: thumbnailBuffer.length,
        timeOffset,
      });

      return thumbnailBuffer;
    } finally {
      this.cleanupFile(tempInputPath);
      this.cleanupFile(tempOutputPath);
    }
  }

  async generateStreamingFormats(buffer: Buffer): Promise<{
    mp4: Buffer;
    hls?: Buffer;
  }> {
    const tempInputPath = path.join(this.tempDir, `${uuidv4()}-input`);
    const tempOutputPath = path.join(this.tempDir, `${uuidv4()}-streaming.mp4`);

    try {
      fs.writeFileSync(tempInputPath, buffer);

      await this.convertToStreamingFormat(tempInputPath, tempOutputPath);

      const mp4Buffer = fs.readFileSync(tempOutputPath);

      logger.info('Streaming format generated', {
        size: mp4Buffer.length,
      });

      return { mp4: mp4Buffer };
    } finally {
      this.cleanupFile(tempInputPath);
      this.cleanupFile(tempOutputPath);
    }
  }

  private convertVideo(
    inputPath: string,
    outputPath: string,
    dimensions: { width: number; height: number }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec(videoConfig.codec)
        .audioCodec(videoConfig.audioCodec)
        .size(`${dimensions.width}x${dimensions.height}`)
        .videoBitrate(videoConfig.maxBitrate)
        .outputOptions([
          `-preset ${videoConfig.preset}`,
          `-crf ${videoConfig.crf}`,
          '-movflags +faststart', // Enable streaming
        ])
        .format(videoConfig.format)
        .on('start', (commandLine) => {
          logger.info('FFmpeg process started', { command: commandLine });
        })
        .on('progress', (progress) => {
          logger.debug('Video processing progress', {
            percent: progress.percent,
            timemark: progress.timemark,
          });
        })
        .on('error', (err) => {
          logger.error('FFmpeg error', { error: err });
          reject(new Error(`Video conversion failed: ${err.message}`));
        })
        .on('end', () => {
          logger.info('Video conversion completed');
          resolve();
        })
        .save(outputPath);
    });
  }

  private extractThumbnail(
    inputPath: string,
    outputPath: string,
    timeOffset: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: [timeOffset],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: `${videoConfig.thumbnailSize.width}x${videoConfig.thumbnailSize.height}`,
        })
        .on('error', (err) => {
          logger.error('Thumbnail extraction error', { error: err });
          reject(new Error(`Thumbnail extraction failed: ${err.message}`));
        })
        .on('end', () => {
          logger.info('Thumbnail extraction completed');
          resolve();
        });
    });
  }

  private convertToStreamingFormat(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec(videoConfig.codec)
        .audioCodec(videoConfig.audioCodec)
        .outputOptions([
          `-preset ${videoConfig.preset}`,
          `-crf ${videoConfig.crf}`,
          '-movflags +faststart',
          '-profile:v baseline',
          '-level 3.0',
        ])
        .format(videoConfig.format)
        .on('error', (err) => {
          logger.error('Streaming format conversion error', { error: err });
          reject(new Error(`Streaming format conversion failed: ${err.message}`));
        })
        .on('end', () => {
          logger.info('Streaming format conversion completed');
          resolve();
        })
        .save(outputPath);
    });
  }

  private calculateTargetDimensions(
    width: number,
    height: number
  ): { width: number; height: number } {
    const maxWidth = videoConfig.maxResolution.width;
    const maxHeight = videoConfig.maxResolution.height;

    if (width <= maxWidth && height <= maxHeight) {
      return { width, height };
    }

    const aspectRatio = width / height;

    if (aspectRatio > maxWidth / maxHeight) {
      return {
        width: maxWidth,
        height: Math.round(maxWidth / aspectRatio),
      };
    } else {
      return {
        width: Math.round(maxHeight * aspectRatio),
        height: maxHeight,
      };
    }
  }

  private parseFps(fpsString: string): number {
    const parts = fpsString.split('/');
    if (parts.length === 2) {
      const numerator = parseInt(parts[0]);
      const denominator = parseInt(parts[1]);
      return denominator > 0 ? numerator / denominator : 0;
    }
    return parseFloat(fpsString) || 0;
  }

  private cleanupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      logger.warn('Failed to cleanup temporary file', { filePath, error });
    }
  }
}

export const videoService = new VideoService();
