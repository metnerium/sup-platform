import dotenv from 'dotenv';

dotenv.config();

export const processingConfig = {
  enableVideoProcessing: process.env.ENABLE_VIDEO_PROCESSING === 'true',
  enableAudioProcessing: process.env.ENABLE_AUDIO_PROCESSING === 'true',
  enableImageOptimization: process.env.ENABLE_IMAGE_OPTIMIZATION === 'true',
};

export const ffmpegConfig = {
  ffmpegPath: process.env.FFMPEG_PATH || '/usr/bin/ffmpeg',
  ffprobePath: process.env.FFPROBE_PATH || '/usr/bin/ffprobe',
};

export const videoConfig = {
  maxBitrate: process.env.VIDEO_MAX_BITRATE || '2000k',
  codec: 'libx264',
  audioCodec: 'aac',
  format: 'mp4',
  preset: 'medium',
  crf: 23, // Constant Rate Factor (lower = better quality, 23 is default)
  maxResolution: {
    width: 1920,
    height: 1080,
  },
  thumbnailSize: {
    width: 400,
    height: 400,
  },
};

export const audioConfig = {
  bitrate: process.env.AUDIO_BITRATE || '128k',
  codec: 'libopus',
  format: 'opus',
  channels: 2,
  sampleRate: 48000,
  voiceMessageCodec: 'libopus',
  voiceMessageBitrate: '64k',
};

export const imageConfig = {
  quality: parseInt(process.env.IMAGE_QUALITY || '85'),
  thumbnailSizes: [
    { name: 'small', width: 150, height: 150 },
    { name: 'medium', width: 400, height: 400 },
    { name: 'large', width: 1200, height: 1200 },
  ],
  optimizationOptions: {
    stripMetadata: true,
    progressive: true,
    compressionLevel: 6,
  },
};

export const waveformConfig = {
  width: 200,
  height: 60,
  samples: 100,
  color: '#3b82f6',
};
