import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3004', 10),
  wsPort: parseInt(process.env.WS_PORT || '3005', 10),
  metricsPort: parseInt(process.env.METRICS_PORT || '9091', 10),

  database: {
    url: process.env.DATABASE_URL || 'postgresql://sup_user:sup_secure_password@localhost:5432/sup',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_change_in_production',
  },

  livekit: {
    url: process.env.LIVEKIT_URL || 'ws://localhost:7880',
    apiKey: process.env.LIVEKIT_API_KEY || 'your_livekit_api_key',
    apiSecret: process.env.LIVEKIT_API_SECRET || 'your_livekit_api_secret',
  },

  turn: {
    urls: (process.env.TURN_SERVER_URL || 'turn:localhost:3478').split(','),
    username: process.env.TURN_USERNAME || 'supuser',
    credential: process.env.TURN_PASSWORD || 'suppassword',
  },

  stun: {
    urls: (process.env.STUN_SERVER_URL || 'stun:localhost:3478').split(','),
  },

  calls: {
    maxParticipants: parseInt(process.env.MAX_CALL_PARTICIPANTS || '8', 10),
    maxDuration: parseInt(process.env.MAX_CALL_DURATION || '14400', 10), // 4 hours
    ringingTimeout: parseInt(process.env.RINGING_TIMEOUT || '60', 10), // 60 seconds
    connectionTimeout: parseInt(process.env.CONNECTION_TIMEOUT || '30', 10), // 30 seconds
    qualityCheckInterval: parseInt(process.env.QUALITY_CHECK_INTERVAL || '5000', 10), // 5 seconds
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};
