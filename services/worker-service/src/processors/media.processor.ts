import Queue from 'bull';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { MediaJob } from '../queues';
import s3Service from '../services/s3.service';
import database from '../utils/database';
import logger from '../utils/logger';
import { config } from '../config';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { generateWaveform } from '../utils/waveform';
import { metricsCollector } from '../monitoring/metrics';

// Configure ffmpeg paths
ffmpeg.setFfmpegPath(ffmpegStatic as string);
ffmpeg.setFfprobePath(ffprobeStatic.path);

interface ProcessedMedia {
  originalUrl: string;
  processedUrl?: string;
  thumbnailUrl?: string;
  waveform?: number[];
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    size: number;
    format: string;
  };
}

export async function processMediaJob(job: Queue.Job<MediaJob>): Promise<ProcessedMedia> {
  const { type, s3Key, userId, messageId } = job.data;
  const startTime = Date.now();

  logger.info('Processing media job', {
    jobId: job.id,
    type,
    s3Key,
    userId,
    messageId,
  });

  try {
    let result: ProcessedMedia;

    switch (type) {
      case 'image':
        result = await processImage(job);
        break;
      case 'video':
        result = await processVideo(job);
        break;
      case 'audio':
        result = await processAudio(job);
        break;
      default:
        throw new Error(`Unsupported media type: ${type}`);
    }

    // Update database with processed media URLs
    await updateMediaRecord(messageId, result);

    // Record metrics
    const duration = Date.now() - startTime;
    metricsCollector.recordJobDuration('media', duration);
    metricsCollector.recordJobSuccess('media');

    logger.info('Media processing completed', {
      jobId: job.id,
      type,
      duration,
      result,
    });

    return result;
  } catch (error) {
    metricsCollector.recordJobFailure('media');
    logger.error('Media processing failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : error,
      data: job.data,
    });
    throw error;
  }
}

async function processImage(job: Queue.Job<MediaJob>): Promise<ProcessedMedia> {
  const { s3Key } = job.data;

  try {
    // Download image from S3
    const imageBuffer = await s3Service.getFile(s3Key);

    // Get original metadata
    const metadata = await sharp(imageBuffer).metadata();
    const originalSize = imageBuffer.length;

    job.progress(20);

    // Process image: resize if needed, compress
    let processedBuffer = imageBuffer;
    const needsResize =
      (metadata.width && metadata.width > config.media.maxImageWidth) ||
      (metadata.height && metadata.height > config.media.maxImageHeight);

    if (needsResize) {
      processedBuffer = await sharp(imageBuffer)
        .resize(config.media.maxImageWidth, config.media.maxImageHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
    } else {
      processedBuffer = await sharp(imageBuffer)
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
    }

    job.progress(50);

    // Generate thumbnail
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(config.media.thumbnailSize, config.media.thumbnailSize, {
        fit: 'cover',
      })
      .jpeg({ quality: 70 })
      .toBuffer();

    job.progress(70);

    // Upload processed image and thumbnail to S3
    const processedKey = s3Key.replace(/(\.[^.]+)$/, '_processed$1');
    const thumbnailKey = s3Key.replace(/(\.[^.]+)$/, '_thumbnail.jpg');

    const [processedUrl, thumbnailUrl] = await Promise.all([
      s3Service.uploadFile(processedKey, processedBuffer, 'image/jpeg'),
      s3Service.uploadFile(thumbnailKey, thumbnailBuffer, 'image/jpeg'),
    ]);

    job.progress(100);

    const processedMetadata = await sharp(processedBuffer).metadata();

    return {
      originalUrl: await s3Service.getSignedUrl(s3Key),
      processedUrl,
      thumbnailUrl,
      metadata: {
        width: processedMetadata.width,
        height: processedMetadata.height,
        size: processedBuffer.length,
        format: processedMetadata.format || 'jpeg',
      },
    };
  } catch (error) {
    logger.error('Image processing failed', { error, s3Key });
    throw error;
  }
}

async function processVideo(job: Queue.Job<MediaJob>): Promise<ProcessedMedia> {
  const { s3Key } = job.data;
  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `input_${Date.now()}_${path.basename(s3Key)}`);
  const outputPath = path.join(tmpDir, `output_${Date.now()}.mp4`);
  const thumbnailPath = path.join(tmpDir, `thumb_${Date.now()}.jpg`);

  try {
    // Download video from S3
    const videoBuffer = await s3Service.getFile(s3Key);
    await fs.writeFile(inputPath, videoBuffer);

    job.progress(20);

    // Get video metadata
    const metadata = await getVideoMetadata(inputPath);

    job.progress(30);

    // Transcode video (H.264 codec, optimized for web)
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(config.media.videoMaxBitrate)
        .audioBitrate(config.media.audioBitrate)
        .format('mp4')
        .outputOptions([
          '-preset fast',
          '-movflags +faststart', // Enable streaming
          '-pix_fmt yuv420p',
        ])
        .on('progress', (progress) => {
          const percent = Math.floor(30 + (progress.percent || 0) * 0.4);
          job.progress(percent);
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(outputPath);
    });

    job.progress(70);

    // Generate thumbnail (1 second into video)
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: ['1'],
          filename: path.basename(thumbnailPath),
          folder: path.dirname(thumbnailPath),
          size: `${config.media.thumbnailSize}x${config.media.thumbnailSize}`,
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    job.progress(80);

    // Upload processed video and thumbnail to S3
    const processedBuffer = await fs.readFile(outputPath);
    const thumbnailBuffer = await fs.readFile(thumbnailPath);

    const processedKey = s3Key.replace(/(\.[^.]+)$/, '_processed.mp4');
    const thumbnailKey = s3Key.replace(/(\.[^.]+)$/, '_thumbnail.jpg');

    const [processedUrl, thumbnailUrl] = await Promise.all([
      s3Service.uploadFile(processedKey, processedBuffer, 'video/mp4'),
      s3Service.uploadFile(thumbnailKey, thumbnailBuffer, 'image/jpeg'),
    ]);

    job.progress(95);

    // Cleanup temp files
    await Promise.all([
      fs.unlink(inputPath).catch(() => {}),
      fs.unlink(outputPath).catch(() => {}),
      fs.unlink(thumbnailPath).catch(() => {}),
    ]);

    job.progress(100);

    return {
      originalUrl: await s3Service.getSignedUrl(s3Key),
      processedUrl,
      thumbnailUrl,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
        size: processedBuffer.length,
        format: 'mp4',
      },
    };
  } catch (error) {
    // Cleanup temp files on error
    await Promise.all([
      fs.unlink(inputPath).catch(() => {}),
      fs.unlink(outputPath).catch(() => {}),
      fs.unlink(thumbnailPath).catch(() => {}),
    ]);

    logger.error('Video processing failed', { error, s3Key });
    throw error;
  }
}

async function processAudio(job: Queue.Job<MediaJob>): Promise<ProcessedMedia> {
  const { s3Key } = job.data;
  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `input_${Date.now()}_${path.basename(s3Key)}`);
  const outputPath = path.join(tmpDir, `output_${Date.now()}.mp3`);

  try {
    // Download audio from S3
    const audioBuffer = await s3Service.getFile(s3Key);
    await fs.writeFile(inputPath, audioBuffer);

    job.progress(20);

    // Get audio metadata
    const metadata = await getAudioMetadata(inputPath);

    job.progress(30);

    // Generate waveform data for voice messages
    let waveformData: number[] | undefined;
    try {
      const waveform = await generateWaveform(inputPath, 100);
      waveformData = waveform.samples;
      logger.info('Waveform generated successfully', { samples: waveformData.length });
    } catch (error) {
      logger.warn('Failed to generate waveform, continuing without it', { error });
    }

    job.progress(50);

    // Convert to MP3 format
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('libmp3lame')
        .audioBitrate(config.media.audioBitrate)
        .format('mp3')
        .on('progress', (progress) => {
          const percent = Math.floor(50 + (progress.percent || 0) * 0.4);
          job.progress(percent);
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(outputPath);
    });

    job.progress(90);

    // Upload processed audio to S3
    const processedBuffer = await fs.readFile(outputPath);
    const processedKey = s3Key.replace(/(\.[^.]+)$/, '_processed.mp3');

    const processedUrl = await s3Service.uploadFile(processedKey, processedBuffer, 'audio/mpeg');

    job.progress(95);

    // Cleanup temp files
    await Promise.all([
      fs.unlink(inputPath).catch(() => {}),
      fs.unlink(outputPath).catch(() => {}),
    ]);

    job.progress(100);

    return {
      originalUrl: await s3Service.getSignedUrl(s3Key),
      processedUrl,
      waveform: waveformData,
      metadata: {
        duration: metadata.duration,
        size: processedBuffer.length,
        format: 'mp3',
      },
    };
  } catch (error) {
    // Cleanup temp files on error
    await Promise.all([
      fs.unlink(inputPath).catch(() => {}),
      fs.unlink(outputPath).catch(() => {}),
    ]);

    logger.error('Audio processing failed', { error, s3Key });
    throw error;
  }
}

function getVideoMetadata(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      resolve({
        width: videoStream?.width,
        height: videoStream?.height,
        duration: metadata.format.duration,
        format: metadata.format.format_name,
      });
    });
  });
}

function getAudioMetadata(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      resolve({
        duration: metadata.format.duration,
        format: metadata.format.format_name,
      });
    });
  });
}

async function updateMediaRecord(messageId: string, result: ProcessedMedia): Promise<void> {
  try {
    const metadata = {
      ...result.metadata,
      waveform: result.waveform,
    };

    await database.query(
      `UPDATE messages
       SET media_url = $1,
           thumbnail_url = $2,
           media_metadata = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [result.processedUrl || result.originalUrl, result.thumbnailUrl, JSON.stringify(metadata), messageId]
    );
  } catch (error) {
    logger.error('Failed to update media record', { error, messageId });
    throw error;
  }
}

export default processMediaJob;
