# SUP Messenger Worker Service

Production-ready background job processing service for SUP Messenger using Bull queues, RabbitMQ, and scheduled jobs.

## Features

### Media Processing Queue
- **Image Optimization**: Resize, compress, and generate thumbnails
- **Video Transcoding**: H.264 encoding with web optimization
- **Audio Processing**: Voice message transcoding to MP3
- **Waveform Generation**: Visual waveform data for audio messages
- **Metadata Extraction**: Automatic extraction of media metadata
- **Format Conversion**: Standardized output formats

### Notification Queue
- **Push Notifications**: Firebase Cloud Messaging (FCM) integration
- **Email Notifications**: HTML email templates with SMTP
- **SMS Notifications**: OTP codes, 2FA, and alerts
- **Batch Processing**: Efficient multicast notifications
- **Retry Logic**: Exponential backoff for failed deliveries
- **Priority Handling**: Urgent notifications processed first

### Cleanup Queue
- **Expired Stories**: Automatic cleanup after 24 hours
- **Old Sessions**: Remove inactive sessions (>30 days)
- **Temporary Files**: Clean up orphaned temporary files
- **Old Messages**: Archive or delete messages (>365 days)
- **Prekey Rotation**: Regenerate Signal Protocol prekeys
- **Orphaned Media**: Remove media files without references

### Scheduled Jobs (Node-Cron)
- **Hourly**: Expired stories cleanup
- **Daily**:
  - Sessions cleanup (midnight)
  - Old messages cleanup (1am)
  - Temporary files cleanup (2am)
  - Database maintenance (3am)
  - Prekey rotation (4am)
- **Every 6 hours**: User statistics aggregation
- **Every 15 minutes**: Stale websocket cleanup
- **Every 5 minutes**: Health check
- **Weekly**: Orphaned media cleanup (Sundays)

### Monitoring & Metrics
- **Queue Metrics**: Waiting, active, completed, failed jobs
- **System Metrics**: CPU, memory, process stats
- **Performance Tracking**: Job duration and success rates
- **Health Checks**: Database and service connectivity
- **HTTP Endpoints**: RESTful monitoring API

## Architecture

### Queue System
```
RabbitMQ (Message Broker)
    ↓
Bull Queues (Redis-backed)
    ↓
Worker Processors
    ↓
External Services (S3, FCM, SMTP, SMS)
```

### Job Flow
1. Jobs published to RabbitMQ topics
2. Worker consumes from RabbitMQ queues
3. Jobs added to Bull queues for processing
4. Processors handle jobs with retry logic
5. Results stored in PostgreSQL
6. Metrics collected for monitoring

## Installation

```bash
cd services/worker-service
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Required Configuration

#### Redis
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

#### RabbitMQ
```env
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=sup_exchange
```

#### PostgreSQL
```env
DATABASE_URL=postgresql://user:password@localhost:5432/sup_messenger
```

#### AWS S3
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=sup-messenger-media
```

#### Firebase (Push Notifications)
```env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_private_key
```

#### SMTP (Email)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_password
```

#### SMS (Optional)
```env
SMS_API_KEY=your_sms_api_key
SMS_API_SECRET=your_sms_api_secret
SMS_FROM_NUMBER=+1234567890
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Running Tests
```bash
npm test
```

## API Endpoints

### Health Check
```http
GET /health
```
Returns service health status and uptime.

### Queue Metrics
```http
GET /metrics/queues
```
Returns metrics for all queues (waiting, active, completed, failed).

### System Metrics
```http
GET /metrics/system
```
Returns CPU, memory, and process metrics.

### Graceful Shutdown
```http
POST /shutdown
```
Initiates graceful shutdown of the worker service.

## Queue Configuration

### Media Queue
- **Concurrency**: 2 workers
- **Timeout**: 5 minutes (video), 1 minute (others)
- **Priority**: Images (2), Others (1)
- **Retry**: 3 attempts with exponential backoff

### Notification Queue
- **Concurrency**: 5 workers
- **Timeout**: 30 seconds
- **Priority**: Push (3), Email/SMS (1)
- **Retry**: 3 attempts with exponential backoff

### Cleanup Queue
- **Concurrency**: 1 worker
- **Timeout**: 2 minutes
- **Retry**: 3 attempts with exponential backoff

## Job Types

### Media Jobs
```typescript
{
  type: 'image' | 'video' | 'audio',
  s3Key: string,
  userId: string,
  messageId: string,
  originalName?: string
}
```

### Notification Jobs
```typescript
{
  type: 'push' | 'email' | 'sms',
  userId: string,
  title: string,
  body: string,
  fcmToken?: string,
  email?: string,
  phoneNumber?: string,
  data?: Record<string, string>
}
```

### Cleanup Jobs
```typescript
{
  type: 'stories' | 'sessions' | 'messages' | 'temp_files' | 'prekeys' | 'orphaned_media',
  data?: Record<string, any>
}
```

## Error Handling

### Retry Strategy
- **Attempts**: 3 retries per job
- **Backoff**: Exponential (5s, 10s, 20s)
- **Dead Letter Queue**: Failed jobs after max retries
- **Error Logging**: Comprehensive error tracking

### Monitoring Failures
Failed jobs are automatically:
1. Retried with exponential backoff
2. Logged with full context
3. Sent to dead letter queue if max retries exceeded
4. Tracked in metrics for alerting

## Performance Optimization

### Concurrency
- Media: 2 concurrent workers (CPU-intensive)
- Notification: 5 concurrent workers (I/O-bound)
- Cleanup: 1 worker (database-intensive)

### Rate Limiting
- Automatic rate limiting via Bull queue configuration
- Configurable job timeouts
- Connection pooling for database and Redis

### Resource Management
- Automatic cleanup of temporary files
- Connection pooling for all external services
- Graceful shutdown with job completion

## Database Tables

### Required Tables
```sql
-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  sender_id UUID NOT NULL,
  chat_id UUID NOT NULL,
  content TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  media_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Stories
CREATE TABLE stories (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  media_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- User Sessions
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  device_id TEXT,
  last_active_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Prekeys (Signal Protocol)
CREATE TABLE user_prekeys (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  prekey_id INTEGER NOT NULL,
  public_key TEXT NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, prekey_id)
);

-- Notifications Log
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  body TEXT,
  success BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Temporary Files
CREATE TABLE temporary_files (
  id UUID PRIMARY KEY,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Logging

Logs are written to:
- `logs/error.log` - Error level logs
- `logs/combined.log` - All logs
- Console output (formatted with colors in development)

### Log Levels
- **error**: Critical errors requiring attention
- **warn**: Warning conditions
- **info**: Informational messages
- **debug**: Detailed debugging information

## Troubleshooting

### Common Issues

#### Queue Not Processing
1. Check Redis connection
2. Verify RabbitMQ is running
3. Check worker service logs
4. Verify queue configuration

#### Media Processing Failures
1. Ensure FFmpeg is installed
2. Check S3 credentials
3. Verify temporary directory permissions
4. Check available disk space

#### Notification Failures
1. Verify FCM credentials
2. Check SMTP configuration
3. Validate SMS provider credentials
4. Check network connectivity

#### Database Connection Issues
1. Verify PostgreSQL is running
2. Check connection string
3. Verify database permissions
4. Check connection pool settings

## Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **Credentials**: Use secrets management (AWS Secrets Manager, etc.)
3. **API Keys**: Rotate regularly
4. **Database**: Use read-only credentials where possible
5. **Network**: Restrict access to internal services only

## Production Deployment

### Docker Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

CMD ["npm", "start"]
```

### Kubernetes Deployment
- Use horizontal pod autoscaling
- Configure resource limits
- Set up liveness and readiness probes
- Use ConfigMaps for configuration

### Monitoring
- Set up alerts for failed jobs
- Monitor queue depth
- Track processing times
- Set up error notifications

## License

MIT License - SUP Messenger Team
