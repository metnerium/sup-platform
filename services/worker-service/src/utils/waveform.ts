import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import logger from './logger';

export interface WaveformData {
  samples: number[];
  duration: number;
  sampleRate: number;
}

/**
 * Generate waveform data from audio file
 * @param inputPath Path to audio file
 * @param samplesCount Number of waveform samples to generate (default: 100)
 * @returns Waveform data with normalized samples
 */
export async function generateWaveform(
  inputPath: string,
  samplesCount: number = 100
): Promise<WaveformData> {
  const tmpDir = os.tmpdir();
  const pcmPath = path.join(tmpDir, `pcm_${Date.now()}.raw`);

  try {
    // Get audio metadata
    const metadata = await getAudioMetadata(inputPath);
    const duration = metadata.duration || 0;

    // Convert audio to raw PCM format
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(8000) // Lower sample rate for waveform
        .format('s16le')
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(pcmPath);
    });

    // Read PCM data
    const pcmData = await fs.readFile(pcmPath);

    // Convert to 16-bit samples
    const samples: number[] = [];
    for (let i = 0; i < pcmData.length; i += 2) {
      const sample = pcmData.readInt16LE(i);
      samples.push(Math.abs(sample));
    }

    // Group samples into chunks and get max value from each chunk
    const chunkSize = Math.floor(samples.length / samplesCount);
    const waveformSamples: number[] = [];

    for (let i = 0; i < samplesCount; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, samples.length);
      const chunk = samples.slice(start, end);

      if (chunk.length === 0) {
        waveformSamples.push(0);
      } else {
        const maxValue = Math.max(...chunk);
        waveformSamples.push(maxValue);
      }
    }

    // Normalize waveform to 0-100 range
    const maxSample = Math.max(...waveformSamples);
    const normalizedSamples = waveformSamples.map((sample) =>
      maxSample > 0 ? Math.round((sample / maxSample) * 100) : 0
    );

    // Cleanup PCM file
    await fs.unlink(pcmPath).catch(() => {});

    return {
      samples: normalizedSamples,
      duration,
      sampleRate: 8000,
    };
  } catch (error) {
    // Cleanup on error
    await fs.unlink(pcmPath).catch(() => {});
    logger.error('Failed to generate waveform', { error, inputPath });
    throw error;
  }
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
        bitrate: metadata.format.bit_rate,
      });
    });
  });
}

/**
 * Generate waveform as SVG string
 * @param waveformData Waveform data
 * @param width SVG width
 * @param height SVG height
 * @returns SVG string
 */
export function generateWaveformSVG(
  waveformData: WaveformData,
  width: number = 800,
  height: number = 100
): string {
  const { samples } = waveformData;
  const barWidth = width / samples.length;
  const centerY = height / 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += '<g>';

  samples.forEach((sample, index) => {
    const barHeight = (sample / 100) * centerY;
    const x = index * barWidth;
    const y1 = centerY - barHeight / 2;
    const y2 = centerY + barHeight / 2;

    svg += `<rect x="${x}" y="${y1}" width="${barWidth - 1}" height="${y2 - y1}" fill="#667eea" opacity="0.8"/>`;
  });

  svg += '</g></svg>';

  return svg;
}

export default { generateWaveform, generateWaveformSVG };
