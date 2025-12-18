import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_change_in_production',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },

  // Socket.io
  socketio: {
    pingTimeout: parseInt(process.env.SOCKETIO_PING_TIMEOUT || '60000', 10), // 60 seconds
    pingInterval: parseInt(process.env.SOCKETIO_PING_INTERVAL || '25000', 10), // 25 seconds
    maxHttpBufferSize: parseInt(process.env.SOCKETIO_MAX_BUFFER_SIZE || '1048576', 10), // 1MB
    transports: ['websocket', 'polling'],
  },

  // Rate limiting
  rateLimit: {
    connectionWindow: parseInt(process.env.RATE_LIMIT_CONNECTION_WINDOW || '60000', 10), // 1 minute
    maxConnectionsPerWindow: parseInt(process.env.RATE_LIMIT_MAX_CONNECTIONS || '5', 10),
  },

  // Connection management
  connection: {
    maxIdleTime: parseInt(process.env.MAX_IDLE_TIME || '1800000', 10), // 30 minutes
    heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '30000', 10), // 30 seconds
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Metrics
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true',
    port: parseInt(process.env.METRICS_PORT || '9090', 10),
  },
} as const;

export default config;
