import ffmpeg from 'fluent-ffmpeg';
import { ffmpegConfig, audioConfig, processingConfig, waveformConfig } from '../config/processing.config';
import { logger } from '../config/logger.config';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Set FFmpeg paths
ffmpeg.setFfmpegPath(ffmpegConfig.ffmpegPath);
ffmpeg.setFfprobePath(ffmpegConfig.ffprobePath);

export interface AudioMetadata {
  duration: number;
  bitrate: number;
  codec: string;
  sampleRate: number;
  channels: number;
  size: number;
}

export interface AudioProcessingResult {
  buffer: Buffer;
  metadata: AudioMetadata;
  waveform?: number[];
}

export class AudioService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'media-service-audio');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async getAudioMetadata(buffer: Buffer): Promise<AudioMetadata> {
    const tempInputPath = path.join(this.tempDir, `${uuidv4()}-input`);

    try {
      fs.writeFileSync(tempInputPath, buffer);

      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempInputPath, (err, metadata) => {
          if (err) {
            logger.error('Failed to get audio metadata', { error: err });
            reject(new Error('Failed to get audio metadata'));
            return;
          }

          const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
          if (!audioStream) {
            reject(new Error('No audio stream found'));
            return;
          }

          const result: AudioMetadata = {
            duration: metadata.format.duration || 0,
            bitrate: metadata.format.bit_rate || 0,
            codec: audioStream.codec_name || 'unknown',
            sampleRate: audioStream.sample_rate || 0,
            channels: audioStream.channels || 0,
            size: metadata.format.size || buffer.length,
          };

          resolve(result);
        });
      });
    } finally {
      this.cleanupFile(tempInputPath);
    }
  }

  async processAudio(buffer: Buffer, isVoiceMessage: boolean = false): Promise<AudioProcessingResult> {
    if (!processingConfig.enableAudioProcessing) {
      const metadata = await this.getAudioMetadata(buffer);
      return { buffer, metadata };
    }

    const tempInputPath = path.join(this.tempDir, `${uuidv4()}-input`);
    const tempOutputPath = path.join(
      this.tempDir,
      `${uuidv4()}-output.${audioConfig.format}`
    );

    try {
      fs.writeFileSync(tempInputPath, buffer);

      await this.convertAudio(tempInputPath, tempOutputPath, isVoiceMessage);

      const processedBuffer = fs.readFileSync(tempOutputPath);
      const metadata = await this.getAudioMetadata(processedBuffer);

      logger.info('Audio processed successfully', {
        originalSize: buffer.length,
        processedSize: processedBuffer.length,
        isVoiceMessage,
      });

      return {
        buffer: processedBuffer,
        metadata,
      };
    } finally {
      this.cleanupFile(tempInputPath);
      this.cleanupFile(tempOutputPath);
    }
  }

  async generateWaveform(buffer: Buffer): Promise<number[]> {
    const tempInputPath = path.join(this.tempDir, `${uuidv4()}-input`);
    const tempOutputPath = path.join(this.tempDir, `${uuidv4()}-waveform.txt`);

    try {
      fs.writeFileSync(tempInputPath, buffer);

      await this.extractWaveformData(tempInputPath, tempOutputPath);

      const waveformData = this.parseWaveformData(tempOutputPath);

      logger.info('Waveform generated', {
        samples: waveformData.length,
      });

      return waveformData;
    } finally {
      this.cleanupFile(tempInputPath);
      this.cleanupFile(tempOutputPath);
    }
  }

  async normalizeAudio(buffer: Buffer): Promise<Buffer> {
    const tempInputPath = path.join(this.tempDir, `${uuidv4()}-input`);
    const tempOutputPath = path.join(this.tempDir, `${uuidv4()}-normalized.wav`);

    try {
      fs.writeFileSync(tempInputPath, buffer);

      await this.applyNormalization(tempInputPath, tempOutputPath);

      const normalizedBuffer = fs.readFileSync(tempOutputPath);

      logger.info('Audio normalized', {
        originalSize: buffer.length,
        normalizedSize: normalizedBuffer.length,
      });

      return normalizedBuffer;
    } finally {
      this.cleanupFile(tempInputPath);
      this.cleanupFile(tempOutputPath);
    }
  }

  private convertAudio(
    inputPath: string,
    outputPath: string,
    isVoiceMessage: boolean
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const bitrate = isVoiceMessage
        ? audioConfig.voiceMessageBitrate
        : audioConfig.bitrate;
      const codec = isVoiceMessage ? audioConfig.voiceMessageCodec : audioConfig.codec;

      ffmpeg(inputPath)
        .audioCodec(codec)
        .audioBitrate(bitrate)
        .audioChannels(audioConfig.channels)
        .audioFrequency(audioConfig.sampleRate)
        .format(audioConfig.format)
        .on('start', (commandLine) => {
          logger.info('FFmpeg audio process started', { command: commandLine });
        })
        .on('progress', (progress) => {
          logger.debug('Audio processing progress', {
            percent: progress.percent,
            timemark: progress.timemark,
          });
        })
        .on('error', (err) => {
          logger.error('FFmpeg audio error', { error: err });
          reject(new Error(`Audio conversion failed: ${err.message}`));
        })
        .on('end', () => {
          logger.info('Audio conversion completed');
          resolve();
        })
        .save(outputPath);
    });
  }

  private extractWaveformData(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters([
          `aformat=channel_layouts=mono`,
          `compand=gain=-6`,
          `showwavespic=s=${waveformConfig.width}x${waveformConfig.height}:colors=${waveformConfig.color}`,
        ])
        .on('start', (commandLine) => {
          logger.info('FFmpeg waveform extraction started', { command: commandLine });
        })
        .on('error', (err) => {
          logger.error('Waveform extraction error', { error: err });
          // Fall back to simple amplitude extraction
          this.extractSimpleWaveform(inputPath, outputPath)
            .then(resolve)
            .catch(reject);
        })
        .on('end', () => {
          logger.info('Waveform extraction completed');
          resolve();
        })
        .save(outputPath);
    });
  }

  private extractSimpleWaveform(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters([
          'aresample=8000',
          'asetnsamples=n=8000',
        ])
        .format('s16le')
        .on('error', (err) => {
          logger.error('Simple waveform extraction error', { error: err });
          reject(new Error(`Waveform extraction failed: ${err.message}`));
        })
        .on('end', () => {
          logger.info('Simple waveform extraction completed');
          resolve();
        })
        .save(outputPath);
    });
  }

  private applyNormalization(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters([
          'loudnorm=I=-16:TP=-1.5:LRA=11',
        ])
        .on('error', (err) => {
          logger.error('Audio normalization error', { error: err });
          reject(new Error(`Audio normalization failed: ${err.message}`));
        })
        .on('end', () => {
          logger.info('Audio normalization completed');
          resolve();
        })
        .save(outputPath);
    });
  }

  private parseWaveformData(filePath: string): number[] {
    try {
      if (!fs.existsSync(filePath)) {
        // Return default waveform if file doesn't exist
        return this.generateDefaultWaveform();
      }

      const buffer = fs.readFileSync(filePath);
      const samples: number[] = [];
      const step = Math.floor(buffer.length / (waveformConfig.samples * 2));

      for (let i = 0; i < buffer.length; i += step) {
        if (samples.length >= waveformConfig.samples) break;

        const sample = buffer.readInt16LE(i);
        const normalized = Math.abs(sample) / 32768;
        samples.push(normalized);
      }

      return samples.length > 0 ? samples : this.generateDefaultWaveform();
    } catch (error) {
      logger.warn('Failed to parse waveform data, using default', { error });
      return this.generateDefaultWaveform();
    }
  }

  private generateDefaultWaveform(): number[] {
    const samples: number[] = [];
    for (let i = 0; i < waveformConfig.samples; i++) {
      samples.push(Math.random() * 0.5 + 0.25);
    }
    return samples;
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

export const audioService = new AudioService();
