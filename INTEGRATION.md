# SUP Messenger - Service Integration Guide

Complete guide for understanding how SUP Messenger microservices communicate and integrate with each other.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Shared Types System](#shared-types-system)
3. [Service Communication Patterns](#service-communication-patterns)
4. [API Integration](#api-integration)
5. [WebSocket Integration](#websocket-integration)
6. [Message Queue Integration](#message-queue-integration)
7. [Database Integration](#database-integration)
8. [Storage Integration](#storage-integration)
9. [Authentication Flow](#authentication-flow)
10. [Message Flow](#message-flow)
11. [Media Upload Flow](#media-upload-flow)

---

## Architecture Overview

### Service Responsibilities

**Main API (Port 3000)**
- REST API endpoints
- Authentication & authorization
- User management
- Chat management
- Message persistence
- Story management
- Search functionality

**WebSocket Service (Port 3001)**
- Real-time messaging
- Online presence tracking
- Typing indicators
- Message delivery notifications
- Read receipts

**Media Service (Port 3003)**
- File uploads
- Thumbnail generation
- Media processing
- S3/MinIO integration
- File downloads

**Worker Service (Background)**
- Media processing jobs
- Email notifications
- Push notifications
- Cleanup tasks
- Scheduled jobs

---

## Shared Types System

### Package Structure

Location: `/packages/types/src/`

All services import shared types using workspace resolution:

```typescript
import { User, Chat, Message } from '@sup/types';
```

### Available Types

**User Types** (`user.types.ts`)
```typescript
interface User {
  id: UUID;
  username: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  status: UserStatus;
  lastSeen?: Date;
  createdAt: Date;
}

type UserStatus = 'online' | 'offline' | 'away';
```

**Chat Types** (`chat.types.ts`)
```typescript
interface Chat {
  id: UUID;
  type: ChatType;
  name?: string;
  avatarUrl?: string;
  isPublic: boolean;
  createdBy: UUID;
  createdAt: Date;
}

type ChatType = 'direct' | 'group' | 'channel';
```

**Message Types** (`message.types.ts`)
```typescript
interface Message {
  id: UUID;
  chatId: UUID;
  senderId: UUID;
  encryptedContent: string;
  type: MessageType;
  replyToId?: UUID;
  createdAt: Date;
}

type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice' | 'sticker';
```

**Crypto Types** (`crypto.types.ts`)
```typescript
interface IdentityKey {
  userId: UUID;
  deviceId: string;
  identityKey: string;
}

interface PreKey {
  keyId: number;
  publicKey: string;
  signature?: string;
}
```

---

## Service Communication Patterns

### Synchronous Communication (REST)

**Main API → Media Service**
```typescript
// Upload file
POST http://media-service:3003/api/v1/media/upload
Authorization: Bearer <jwt>
Content-Type: multipart/form-data

// Download file
GET http://media-service:3003/api/v1/media/download/:fileId
Authorization: Bearer <jwt>
```

### Asynchronous Communication (RabbitMQ)

**Main API → Worker Service**
```typescript
// Queue structure
Queue: 'media-processing'
Exchange: 'sup-exchange'
Routing Key: 'media.process'

// Message format
{
  type: 'process-video',
  fileId: 'uuid',
  userId: 'uuid',
  metadata: { ... }
}
```

### Real-time Communication (Redis Pub/Sub)

**WebSocket Service ↔ Main API**
```typescript
// Channel pattern
Channel: 'chat:{chatId}'
Channel: 'user:{userId}'

// Message format
{
  type: 'new-message',
  chatId: 'uuid',
  message: { ... }
}
```

---

## API Integration

### Authentication Header

All authenticated requests must include JWT token:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Standard Request Format

```typescript
interface ApiRequest {
  headers: {
    'Content-Type': 'application/json';
    'Authorization': `Bearer ${token}`;
  };
  body: RequestBody;
}
```

### Standard Response Format

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
```

### Error Codes

```typescript
const ErrorCodes = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Permissions
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
};
```

---

## WebSocket Integration

### Connection Setup

**Client → WebSocket Service**

```javascript
// Connect
const socket = io('http://localhost:3001', {
  auth: {
    token: 'jwt-token-here'
  }
});

// Authenticate
socket.on('connect', () => {
  console.log('Connected to WebSocket');
});

socket.on('authenticated', (data) => {
  console.log('Authenticated as:', data.userId);
});
```

### Event Structure

**Client Events (Emit)**

```typescript
// Send message
socket.emit('message', {
  chatId: 'uuid',
  encryptedContent: 'encrypted-data',
  type: 'text',
  replyToId?: 'uuid'
});

// Typing indicator
socket.emit('typing', {
  chatId: 'uuid',
  isTyping: true
});

// Read receipt
socket.emit('read', {
  messageId: 'uuid'
});
```

**Server Events (Listen)**

```typescript
// New message
socket.on('message', (message: Message) => {
  console.log('New message:', message);
});

// Typing indicator
socket.on('typing', (data: { userId: string, chatId: string, isTyping: boolean }) => {
  console.log('User typing:', data);
});

// Presence update
socket.on('presence', (data: { userId: string, status: UserStatus }) => {
  console.log('User status:', data);
});

// Delivery confirmation
socket.on('delivered', (data: { messageId: string }) => {
  console.log('Message delivered:', data);
});
```

### Redis Pub/Sub Integration

**WebSocket Service → Redis**

```typescript
// Publish message to chat channel
redisPublisher.publish(
  `chat:${chatId}`,
  JSON.stringify({
    type: 'new-message',
    message: messageData
  })
);

// Subscribe to chat channel
redisSubscriber.subscribe(`chat:${chatId}`);

redisSubscriber.on('message', (channel, message) => {
  const data = JSON.parse(message);
  // Broadcast to connected clients in this chat
  io.to(channel).emit('message', data.message);
});
```

---

## Message Queue Integration

### RabbitMQ Setup

**Queue Definitions**

```typescript
const QUEUES = {
  MEDIA_PROCESSING: 'media-processing',
  NOTIFICATIONS: 'notifications',
  CLEANUP: 'cleanup',
  EMAILS: 'emails'
};

const EXCHANGES = {
  MAIN: 'sup-exchange'
};
```

### Publishing Messages

**Main API → RabbitMQ**

```typescript
import amqp from 'amqplib';

// Connect
const connection = await amqp.connect(process.env.RABBITMQ_URL);
const channel = await connection.createChannel();

// Assert exchange and queue
await channel.assertExchange(EXCHANGES.MAIN, 'topic', { durable: true });
await channel.assertQueue(QUEUES.MEDIA_PROCESSING, { durable: true });
await channel.bindQueue(QUEUES.MEDIA_PROCESSING, EXCHANGES.MAIN, 'media.*');

// Publish message
channel.publish(
  EXCHANGES.MAIN,
  'media.process',
  Buffer.from(JSON.stringify({
    type: 'process-video',
    fileId: 'uuid',
    userId: 'uuid',
    operations: ['thumbnail', 'compress']
  })),
  { persistent: true }
);
```

### Consuming Messages

**Worker Service ← RabbitMQ**

```typescript
// Consumer
await channel.consume(QUEUES.MEDIA_PROCESSING, async (msg) => {
  if (!msg) return;

  const data = JSON.parse(msg.content.toString());

  try {
    await processMedia(data);
    channel.ack(msg); // Acknowledge success
  } catch (error) {
    console.error('Processing failed:', error);
    channel.nack(msg, false, true); // Requeue on failure
  }
});
```

### Bull Queues (Alternative)

**Worker Service**

```typescript
import Bull from 'bull';

// Create queue
const mediaQueue = new Bull('media-processing', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

// Add job
await mediaQueue.add('process-video', {
  fileId: 'uuid',
  userId: 'uuid'
}, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  }
});

// Process job
mediaQueue.process('process-video', async (job) => {
  const { fileId, userId } = job.data;
  await processVideo(fileId, userId);
});
```

---

## Database Integration

### Connection Setup

**Using pg-promise**

```typescript
import pgPromise from 'pg-promise';

const pgp = pgPromise();

const db = pgp({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  max: 30, // Connection pool size
});
```

### Query Patterns

**Parameterized Queries**

```typescript
// Select
const user = await db.oneOrNone(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// Insert
const newUser = await db.one(
  `INSERT INTO users (username, email, password_hash)
   VALUES ($1, $2, $3)
   RETURNING *`,
  [username, email, passwordHash]
);

// Update
await db.none(
  'UPDATE users SET status = $1, last_seen = NOW() WHERE id = $2',
  [status, userId]
);

// Transactions
await db.tx(async (t) => {
  const chat = await t.one('INSERT INTO chats (...) VALUES (...) RETURNING *', [...]);
  await t.none('INSERT INTO chat_members (...) VALUES (...)', [...]);
  return chat;
});
```

### Connection Sharing

All services connect to the same PostgreSQL database but use different connection pools:

- Main API: 30 connections
- Worker Service: 10 connections

---

## Storage Integration

### MinIO/S3 Setup

**Configuration**

```typescript
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
  },
  forcePathStyle: true // Required for MinIO
});
```

### Upload File

**Media Service**

```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';

async function uploadFile(file: Buffer, key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: file,
    ContentType: contentType,
    ACL: 'public-read'
  });

  await s3Client.send(command);

  return {
    url: `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`,
    key
  };
}
```

### Generate Pre-signed URL

```typescript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

async function getDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key
  });

  return await getSignedUrl(s3Client, command, {
    expiresIn: 3600 // 1 hour
  });
}
```

---

## Authentication Flow

### Registration & Login

```mermaid
sequenceDiagram
    Client->>Main API: POST /api/v1/auth/register
    Main API->>PostgreSQL: Insert user
    Main API->>Redis: Store session
    Main API-->>Client: Access + Refresh tokens

    Client->>Main API: POST /api/v1/auth/login
    Main API->>PostgreSQL: Verify credentials
    Main API->>Redis: Create session
    Main API-->>Client: Access + Refresh tokens
```

### Token Refresh

```mermaid
sequenceDiagram
    Client->>Main API: POST /api/v1/auth/refresh
    Note right of Client: Refresh token
    Main API->>Redis: Verify refresh token
    Main API->>PostgreSQL: Get user data
    Main API->>Redis: Store new session
    Main API-->>Client: New access token
```

### WebSocket Authentication

```mermaid
sequenceDiagram
    Client->>WebSocket: Connect with JWT
    WebSocket->>Main API: Verify JWT
    Main API-->>WebSocket: User data
    WebSocket->>Redis: Subscribe to user channel
    WebSocket-->>Client: Authenticated event
```

---

## Message Flow

### Complete Message Lifecycle

```mermaid
sequenceDiagram
    participant C1 as Client 1
    participant WS as WebSocket
    participant API as Main API
    participant DB as PostgreSQL
    participant Redis
    participant C2 as Client 2

    C1->>WS: Send message (encrypted)
    WS->>API: Store message (REST)
    API->>DB: INSERT message
    API->>Redis: Publish to chat channel
    API-->>WS: Message stored
    WS-->>C1: Delivery confirmation
    Redis->>WS: New message notification
    WS->>C2: Deliver message
    C2->>WS: Read receipt
    WS->>API: Update read status
    API->>DB: UPDATE message_recipients
```

### Detailed Steps

1. **Client 1 sends encrypted message via WebSocket**
   ```typescript
   socket.emit('message', {
     chatId: 'chat-uuid',
     encryptedContent: 'base64-encrypted-content',
     type: 'text'
   });
   ```

2. **WebSocket forwards to Main API for persistence**
   ```typescript
   const response = await axios.post('http://main-api:3000/api/v1/messages', {
     chatId,
     encryptedContent,
     type
   }, {
     headers: { Authorization: `Bearer ${userToken}` }
   });
   ```

3. **Main API stores in database**
   ```typescript
   const message = await db.one(
     `INSERT INTO messages (chat_id, sender_id, encrypted_content, type)
      VALUES ($1, $2, $3, $4) RETURNING *`,
     [chatId, senderId, encryptedContent, type]
   );
   ```

4. **Main API publishes to Redis**
   ```typescript
   await redis.publish(`chat:${chatId}`, JSON.stringify({
     type: 'new-message',
     message
   }));
   ```

5. **WebSocket receives from Redis and broadcasts**
   ```typescript
   redis.on('message', (channel, data) => {
     const { message } = JSON.parse(data);
     io.to(channel).emit('message', message);
   });
   ```

---

## Media Upload Flow

### File Upload Process

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Main API
    participant Media as Media Service
    participant S3 as MinIO/S3
    participant Worker as Worker Service
    participant RMQ as RabbitMQ

    C->>API: Request upload URL
    API->>Media: POST /upload (multipart)
    Media->>S3: Store file
    S3-->>Media: File URL
    Media->>API: File metadata
    API->>RMQ: Queue processing job
    API-->>C: File ID + URL
    RMQ->>Worker: Process media
    Worker->>S3: Get file
    Worker->>Worker: Generate thumbnail
    Worker->>S3: Store thumbnail
    Worker->>API: Update metadata
```

### Implementation

**1. Client requests upload**
```typescript
const formData = new FormData();
formData.append('file', fileBlob);
formData.append('type', 'image');

const response = await fetch('http://localhost:3003/api/v1/media/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const { fileId, url } = await response.json();
```

**2. Media Service uploads to S3**
```typescript
// Generate unique key
const key = `media/${userId}/${uuid()}.${ext}`;

// Upload to S3
await s3Client.send(new PutObjectCommand({
  Bucket: process.env.S3_BUCKET,
  Key: key,
  Body: fileBuffer,
  ContentType: mimeType
}));

// Store metadata in database
const file = await db.one(
  `INSERT INTO media_files (id, user_id, file_type, mime_type, s3_key, size_bytes)
   VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
  [fileId, userId, fileType, mimeType, key, size]
);
```

**3. Queue processing job**
```typescript
await rabbitmq.publish('media-processing', {
  type: 'generate-thumbnail',
  fileId,
  s3Key: key
});
```

**4. Worker processes media**
```typescript
// Worker service
mediaQueue.process(async (job) => {
  const { fileId, s3Key } = job.data;

  // Download from S3
  const file = await s3.getObject(s3Key);

  // Generate thumbnail with Sharp
  const thumbnail = await sharp(file.Body)
    .resize(200, 200, { fit: 'cover' })
    .toBuffer();

  // Upload thumbnail
  const thumbnailKey = `thumbnails/${fileId}.jpg`;
  await s3.putObject(thumbnailKey, thumbnail);

  // Update database
  await db.none(
    'UPDATE media_files SET thumbnail_s3_key = $1 WHERE id = $2',
    [thumbnailKey, fileId]
  );
});
```

---

## Redis Usage Patterns

### Session Storage

```typescript
// Store session
await redis.setex(
  `session:${sessionId}`,
  86400, // 24 hours
  JSON.stringify({ userId, deviceId, createdAt: Date.now() })
);

// Get session
const session = await redis.get(`session:${sessionId}`);
const data = JSON.parse(session);
```

### User Presence

```typescript
// Set user online
await redis.setex(`presence:${userId}`, 300, 'online'); // 5 min TTL

// Check if online
const presence = await redis.get(`presence:${userId}`);
const isOnline = presence === 'online';
```

### Caching

```typescript
// Cache user profile
await redis.setex(
  `user:${userId}`,
  3600, // 1 hour
  JSON.stringify(userProfile)
);

// Get cached profile
const cached = await redis.get(`user:${userId}`);
if (cached) {
  return JSON.parse(cached);
}
```

---

## Error Handling

### Service-to-Service Errors

**Main API calling Media Service**

```typescript
try {
  const response = await axios.post('http://media-service:3003/api/v1/media/upload', data);
  return response.data;
} catch (error) {
  if (error.response) {
    // Service returned an error
    logger.error('Media service error:', error.response.data);
    throw new Error('Failed to upload file');
  } else if (error.request) {
    // Service not responding
    logger.error('Media service not responding');
    throw new Error('Media service unavailable');
  } else {
    // Other error
    logger.error('Upload error:', error.message);
    throw error;
  }
}
```

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailTime > 60000) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    if (this.failures >= 5) {
      this.state = 'open';
    }
  }
}
```

---

## Health Checks

### Service Health Endpoints

Each service exposes a `/health` endpoint:

```typescript
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'main-api',
    version: '1.0.0',
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      rabbitmq: await checkRabbitMQ()
    }
  };

  const isHealthy = Object.values(health.checks).every(check => check === 'ok');

  res.status(isHealthy ? 200 : 503).json(health);
});
```

### Dependency Checks

```typescript
async function checkDatabase(): Promise<'ok' | 'error'> {
  try {
    await db.one('SELECT 1');
    return 'ok';
  } catch (error) {
    logger.error('Database health check failed:', error);
    return 'error';
  }
}

async function checkRedis(): Promise<'ok' | 'error'> {
  try {
    await redis.ping();
    return 'ok';
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return 'error';
  }
}
```

---

## Monitoring Integration

### Prometheus Metrics

**Exposing Metrics**

```typescript
import prometheus from 'prom-client';

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new prometheus.Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections'
});

// Expose endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

### Logging

**Winston Configuration**

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

---

## Summary

This integration guide covers:

- Complete service communication patterns
- Shared type system usage
- Authentication and authorization flows
- Real-time messaging implementation
- File upload and processing
- Database and storage integration
- Error handling and monitoring

All services are designed to be loosely coupled, communicate through well-defined interfaces, and can scale independently.

---

**Last Updated**: 2024-12-18
**Version**: 1.0.0
