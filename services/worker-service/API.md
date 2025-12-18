# Worker Service API Documentation

## Overview

The Worker Service provides background job processing for SUP Messenger. Jobs can be submitted via RabbitMQ or directly to Bull queues.

## Job Submission Methods

### Method 1: Via RabbitMQ (Recommended for Microservices)

Publish messages to RabbitMQ exchange with appropriate routing keys.

#### Exchange Configuration
- **Exchange Name**: `sup_exchange`
- **Exchange Type**: `topic`
- **Durable**: `true`

#### Routing Keys
- `media.image` - Image processing jobs
- `media.video` - Video processing jobs
- `media.audio` - Audio/voice processing jobs
- `notification.push` - Push notifications
- `notification.email` - Email notifications
- `notification.sms` - SMS notifications
- `cleanup.stories` - Expired stories cleanup
- `cleanup.sessions` - Old sessions cleanup
- `cleanup.messages` - Old messages cleanup
- `cleanup.temp_files` - Temporary files cleanup
- `cleanup.prekeys` - Prekey rotation
- `cleanup.orphaned_media` - Orphaned media cleanup

#### Example: Publishing a Media Job (Node.js)

```javascript
const amqp = require('amqplib');

async function publishMediaJob() {
  const connection = await amqp.connect('amqp://localhost:5672');
  const channel = await connection.createChannel();

  await channel.assertExchange('sup_exchange', 'topic', { durable: true });

  const job = {
    type: 'image',
    s3Key: 'uploads/user123/image.jpg',
    userId: 'user-uuid-123',
    messageId: 'message-uuid-456',
    originalName: 'vacation.jpg'
  };

  channel.publish(
    'sup_exchange',
    'media.image',
    Buffer.from(JSON.stringify(job)),
    { persistent: true, contentType: 'application/json' }
  );

  console.log('Job published successfully');

  await channel.close();
  await connection.close();
}
```

### Method 2: Direct Queue Access (For Internal Use)

Import queue functions directly in your Node.js application.

```javascript
import { addImageProcessingJob } from './queues/media.queue';
import { addPushNotificationJob } from './queues/notification.queue';

// Add media processing job
const job = await addImageProcessingJob(
  's3Key',
  'userId',
  'messageId',
  'originalName'
);

// Add notification job
const notifJob = await addPushNotificationJob(
  'userId',
  'fcmToken',
  'New Message',
  'You have a new message from John',
  { chatId: 'chat-123', type: 'message' }
);
```

## Job Types Reference

### Media Jobs

#### Image Processing
```json
{
  "type": "image",
  "s3Key": "uploads/user123/photo.jpg",
  "userId": "user-uuid",
  "messageId": "message-uuid",
  "originalName": "vacation.jpg"
}
```

**Processing Steps:**
1. Download from S3
2. Extract metadata (dimensions, format)
3. Resize if needed (max 2048x2048)
4. Compress with quality optimization
5. Generate thumbnail (200x200)
6. Upload processed files to S3
7. Update message record in database

**Output:**
- Processed image URL
- Thumbnail URL
- Metadata (width, height, size, format)

#### Video Processing
```json
{
  "type": "video",
  "s3Key": "uploads/user123/video.mp4",
  "userId": "user-uuid",
  "messageId": "message-uuid",
  "originalName": "clip.mp4"
}
```

**Processing Steps:**
1. Download from S3
2. Extract metadata (dimensions, duration, format)
3. Transcode to H.264/AAC
4. Optimize for streaming (faststart)
5. Generate thumbnail from frame at 1 second
6. Upload processed files to S3
7. Update message record

**Output:**
- Processed video URL (MP4)
- Thumbnail URL
- Metadata (width, height, duration, size, format)

#### Audio Processing
```json
{
  "type": "audio",
  "s3Key": "uploads/user123/voice.ogg",
  "userId": "user-uuid",
  "messageId": "message-uuid",
  "originalName": "voice-message.ogg"
}
```

**Processing Steps:**
1. Download from S3
2. Extract metadata (duration, format)
3. Generate waveform data (100 samples)
4. Transcode to MP3 (128k bitrate)
5. Upload processed file to S3
6. Update message record

**Output:**
- Processed audio URL (MP3)
- Waveform data (array of 100 values, 0-100)
- Metadata (duration, size, format)

### Notification Jobs

#### Push Notification
```json
{
  "type": "push",
  "userId": "user-uuid",
  "fcmToken": "firebase-token",
  "title": "New Message",
  "body": "John: Hey, how are you?",
  "data": {
    "type": "message",
    "chatId": "chat-uuid",
    "senderId": "sender-uuid"
  }
}
```

**Features:**
- Firebase Cloud Messaging integration
- Platform-specific configuration (Android/iOS)
- Custom notification sound
- Click action handling
- Delivery tracking

#### Email Notification
```json
{
  "type": "email",
  "userId": "user-uuid",
  "email": "user@example.com",
  "title": "Password Reset",
  "body": "Click the link below to reset your password",
  "data": {
    "resetLink": "https://app.supmessenger.com/reset/token123",
    "expiresIn": "1 hour"
  }
}
```

**Features:**
- HTML email templates
- Custom styling
- Responsive design
- Delivery tracking

#### SMS Notification
```json
{
  "type": "sms",
  "userId": "user-uuid",
  "phoneNumber": "+1234567890",
  "title": "OTP Code",
  "body": "Your verification code is: 123456"
}
```

**Use Cases:**
- OTP verification codes
- 2FA authentication
- Password reset codes
- Account alerts

### Cleanup Jobs

#### Expired Stories
```json
{
  "type": "stories"
}
```

Cleans up stories older than 24 hours:
- Deletes media files from S3
- Soft deletes story records
- Updates user statistics

#### Old Sessions
```json
{
  "type": "sessions"
}
```

Removes sessions inactive for 30+ days:
- Deletes session records
- Updates device status
- Cleans up related data

#### Old Messages
```json
{
  "type": "messages"
}
```

Archives or deletes messages older than 365 days:
- Removes media files from S3
- Clears media URLs in database
- Maintains message metadata

#### Temporary Files
```json
{
  "type": "temp_files"
}
```

Deletes temporary files older than 24 hours:
- Removes files from S3
- Deletes database records
- Frees up storage

#### Prekey Rotation
```json
{
  "type": "prekeys"
}
```

Rotates Signal Protocol prekeys:
- Deletes used prekeys (30+ days)
- Generates new prekeys for users
- Maintains minimum prekey count (10)

#### Orphaned Media
```json
{
  "type": "orphaned_media"
}
```

Cleans up media files without references:
- Identifies orphaned files
- Deletes from S3
- Updates cleanup logs

## Monitoring API

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-18T12:00:00Z",
  "uptime": 3600.5
}
```

### Queue Metrics

```http
GET /metrics/queues
```

**Response:**
```json
{
  "queues": [
    {
      "name": "media",
      "waiting": 5,
      "active": 2,
      "completed": 1523,
      "failed": 12,
      "delayed": 0,
      "paused": false
    },
    {
      "name": "notification",
      "waiting": 15,
      "active": 5,
      "completed": 8234,
      "failed": 45,
      "delayed": 0,
      "paused": false
    },
    {
      "name": "cleanup",
      "waiting": 0,
      "active": 0,
      "completed": 342,
      "failed": 2,
      "delayed": 0,
      "paused": false
    }
  ],
  "timestamp": "2025-12-18T12:00:00Z"
}
```

### System Metrics

```http
GET /metrics/system
```

**Response:**
```json
{
  "cpu": {
    "usage": 45.2,
    "count": 8
  },
  "memory": {
    "total": 16777216000,
    "free": 8388608000,
    "used": 8388608000,
    "usagePercent": 50.0
  },
  "process": {
    "uptime": 3600.5,
    "memoryUsage": {
      "rss": 104857600,
      "heapTotal": 83886080,
      "heapUsed": 62914560,
      "external": 2097152
    },
    "pid": 1234
  }
}
```

## Error Handling

### Retry Logic

All jobs use exponential backoff retry strategy:

```javascript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000  // 5s, 10s, 20s
  }
}
```

### Error Responses

When a job fails after all retries:

1. **Dead Letter Queue**: Job moved to `{queue_name}.dead`
2. **Error Logging**: Full error details logged
3. **Notification**: Alert sent to monitoring system
4. **Metrics**: Failure counter incremented

### Common Errors

#### Media Processing Errors

```
MediaProcessingError: Failed to download file from S3
- Cause: Invalid S3 key or permissions
- Solution: Verify S3 key and AWS credentials
```

```
FFmpegError: Transcoding failed
- Cause: Corrupted media file or unsupported format
- Solution: Validate file before upload
```

#### Notification Errors

```
FCMError: Invalid FCM token
- Cause: Token expired or revoked
- Solution: Update user's FCM token
```

```
SMTPError: Email sending failed
- Cause: Invalid email address or SMTP credentials
- Solution: Verify email and SMTP configuration
```

## Rate Limits

### Queue-Specific Limits

- **Media Queue**: 2 concurrent jobs
- **Notification Queue**: 5 concurrent jobs
- **Cleanup Queue**: 1 concurrent job

### External Service Limits

- **FCM**: 500 messages/second (configurable)
- **SMTP**: Based on provider limits
- **S3**: No hard limits, but may throttle

## Best Practices

### 1. Job Submission

- Always validate input data before submitting
- Include all required fields
- Use descriptive job IDs for tracking
- Set appropriate priority levels

### 2. Error Handling

- Implement retry logic in client applications
- Monitor dead letter queues regularly
- Set up alerts for high failure rates
- Log all job submissions for debugging

### 3. Performance

- Batch notifications when possible
- Optimize media files before upload
- Use appropriate priority levels
- Monitor queue depth and adjust concurrency

### 4. Security

- Validate all user inputs
- Sanitize file names and paths
- Use signed URLs for S3 access
- Encrypt sensitive notification data

## Code Examples

### Complete Media Upload Flow

```javascript
// 1. Upload file to S3
const s3Key = await uploadToS3(file);

// 2. Submit processing job
const job = {
  type: file.mimetype.startsWith('image/') ? 'image' : 'video',
  s3Key: s3Key,
  userId: userId,
  messageId: messageId,
  originalName: file.originalname
};

// 3. Publish to RabbitMQ
channel.publish(
  'sup_exchange',
  `media.${job.type}`,
  Buffer.from(JSON.stringify(job)),
  { persistent: true }
);

// 4. Return job ID to client
return { jobId: messageId, status: 'processing' };
```

### Batch Notification Sending

```javascript
import { sendBatchNotifications } from './processors/notification.processor';

const userIds = ['user1', 'user2', 'user3'];
const result = await sendBatchNotifications(
  userIds,
  'Group Message',
  'New message in Tech Team',
  { groupId: 'group-123', type: 'group_message' }
);

console.log(`Sent: ${result.successCount}, Failed: ${result.failureCount}`);
```

## Support

For issues or questions:
- Check logs: `logs/error.log` and `logs/combined.log`
- Monitor metrics: `GET /metrics/queues`
- Review dead letter queues
- Contact: support@supmessenger.com
