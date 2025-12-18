# SUP Messenger - WebSocket Service

Production-ready WebSocket service for SUP Messenger, providing real-time communication capabilities using Socket.io with Redis for horizontal scaling.

## Features

### Core Features
- **JWT Authentication**: Token-based authentication for secure WebSocket connections
- **Real-time Messaging**: Instant message delivery with delivery and read receipts
- **Typing Indicators**: Real-time typing status broadcasting
- **Presence System**: Online/offline/away status tracking with last seen
- **Read Receipts**: Real-time delivery and read confirmations
- **Notifications**: Push notifications for mentions, calls, and events
- **Call Signaling**: WebRTC signaling for audio/video calls
- **Reactions**: Message reactions with real-time updates

### Scalability Features
- **Redis Adapter**: Horizontal scaling across multiple server instances
- **Room-based Architecture**: Efficient room management (user rooms, chat rooms)
- **Connection Pooling**: Optimized connection management
- **Heartbeat/Ping-Pong**: Connection health monitoring
- **Automatic Reconnection**: Client-side reconnection handling
- **Message Queue Integration**: Support for offline message delivery

### Security Features
- **JWT Verification**: Token validation on connection
- **Rate Limiting**: Per-user event rate limiting
- **Idle Timeout**: Automatic disconnection of idle connections
- **Permission Validation**: User permission checks for room access

### Monitoring Features
- **Connection Metrics**: Track active/total/peak connections
- **Event Metrics**: Monitor event counts, errors, and latency
- **Error Tracking**: Comprehensive error logging and metrics
- **Health Checks**: Service health status endpoint

## Architecture

```
┌─────────────────┐
│   Client App    │
└────────┬────────┘
         │ WebSocket
         ▼
┌─────────────────┐
│  Socket.io      │
│  + Redis        │◄──────► Redis (Pub/Sub)
│  Adapter        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Event         │
│   Handlers      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Redis         │
│   (State)       │
└─────────────────┘
```

## Events API

### Client-to-Server Events

#### Authentication
- Connection requires JWT token via query parameter, auth object, or header

#### Message Events
- `message:new` - Send a new message
  ```typescript
  {
    chatId: string;
    encryptedContent: string;
    messageType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice';
    replyToId?: string;
    metadata?: Record<string, any>;
    tempId?: string;
  }
  ```
- `message:delivered` - Mark message as delivered
- `message:read` - Mark message as read
- `message:typing` - Start typing indicator
- `message:stop-typing` - Stop typing indicator

#### Presence Events
- `presence:update` - Update user presence status
  ```typescript
  {
    status: 'online' | 'offline' | 'away' | 'busy';
    customStatus?: string;
  }
  ```
- `presence:subscribe` - Subscribe to presence updates
- `presence:unsubscribe` - Unsubscribe from presence updates

#### Call Events
- `call:initiate` - Initiate a call
- `call:answer` - Answer a call
- `call:reject` - Reject a call
- `call:end` - End a call
- `call:ice-candidate` - Exchange ICE candidates

#### Reaction Events
- `reaction:new` - Add a reaction to a message
- `reaction:remove` - Remove a reaction from a message

#### Chat Events
- `chat:join` - Join a chat room
- `chat:leave` - Leave a chat room
- `chat:join-multiple` - Join multiple chat rooms
- `chat:get-active-members` - Get active members in a chat

#### Notification Events
- `notification:read` - Mark notification as read
- `notification:clear` - Clear a notification
- `notification:clear-all` - Clear all notifications
- `notification:get-pending` - Get pending notifications

### Server-to-Client Events

#### Connection Events
- `connected` - Successful connection confirmation
- `error` - Error notification

#### Message Events
- `message:new` - New message received
- `message:delivered` - Message delivery confirmation
- `message:read` - Message read receipt
- `message:typing` - Someone is typing
- `message:stop-typing` - Someone stopped typing

#### Presence Events
- `presence:update` - User presence status changed

#### Call Events
- `call:incoming` - Incoming call notification
- `call:answer` - Call answered
- `call:reject` - Call rejected
- `call:end` - Call ended
- `call:ice-candidate` - ICE candidate received

#### Reaction Events
- `reaction:new` - New reaction added
- `reaction:remove` - Reaction removed

#### Chat Events
- `chat:updated` - Chat settings/info updated
- `chat:member-joined` - Member joined chat
- `chat:member-left` - Member left chat

#### Notification Events
- `notification:new` - New notification

## Configuration

### Environment Variables

```env
# Server Configuration
NODE_ENV=development
PORT=3001

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your_jwt_secret_here

# CORS Configuration
CORS_ORIGIN=*

# Socket.io Configuration
SOCKETIO_PING_TIMEOUT=60000
SOCKETIO_PING_INTERVAL=25000
SOCKETIO_MAX_BUFFER_SIZE=1048576

# Rate Limiting
RATE_LIMIT_CONNECTION_WINDOW=60000
RATE_LIMIT_MAX_CONNECTIONS=5

# Connection Management
MAX_IDLE_TIME=1800000
HEARTBEAT_INTERVAL=30000

# Logging
LOG_LEVEL=info

# Metrics (optional)
METRICS_ENABLED=false
METRICS_PORT=9090
```

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

## Development

```bash
# Run in development mode with auto-reload
npm run dev
```

## Production

```bash
# Build the service
npm run build

# Start the service
npm start
```

## Rate Limits

Default rate limits per user:

| Event | Limit | Window |
|-------|-------|--------|
| `message:new` | 30 | 60s |
| `message:typing` | 10 | 10s |
| `message:delivered` | 100 | 60s |
| `message:read` | 100 | 60s |
| `presence:update` | 20 | 60s |
| `call:initiate` | 5 | 60s |
| `reaction:new` | 50 | 60s |
| `reaction:remove` | 50 | 60s |

## Monitoring

### Metrics

The service tracks the following metrics:

- **Connection Metrics**: Active, total, and peak connections
- **Event Metrics**: Event counts, error rates, and latency
- **Error Metrics**: Total errors and errors by type

Metrics are logged every 5 minutes and can be accessed via the service API.

### Health Check

```typescript
// Get service health status
const health = service.getHealthStatus();
```

Returns:
```json
{
  "status": "healthy",
  "connections": {
    "active": 1234,
    "total": 5678,
    "peak": 2000
  },
  "uptime": 3600000,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Scaling

### Horizontal Scaling

The service uses Redis adapter for Socket.io, enabling horizontal scaling:

1. **Multiple Instances**: Run multiple instances behind a load balancer
2. **Redis Pub/Sub**: Events are synchronized across all instances via Redis
3. **Session Persistence**: No sticky sessions required
4. **Room Broadcasting**: Messages broadcast across all instances

### Load Balancer Configuration

Example Nginx configuration:

```nginx
upstream websocket_backend {
    least_conn;
    server ws1.example.com:3001;
    server ws2.example.com:3001;
    server ws3.example.com:3001;
}

server {
    listen 443 ssl;
    server_name ws.example.com;

    location / {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
```

## Testing

### Manual Testing with Socket.io Client

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: 'your_jwt_token_here'
  }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);

  // Send a message
  socket.emit('message:new', {
    chatId: 'chat_123',
    encryptedContent: 'Hello, World!',
    messageType: 'text'
  }, (response) => {
    console.log('Message sent:', response);
  });
});

socket.on('message:new', (data) => {
  console.log('New message:', data);
});

socket.on('presence:update', (data) => {
  console.log('Presence update:', data);
});

socket.on('error', (error) => {
  console.error('Error:', error);
});
```

## Security Best Practices

1. **Use HTTPS in Production**: Always use WSS (WebSocket Secure)
2. **Rotate JWT Secrets**: Regularly rotate JWT signing keys
3. **Configure CORS**: Restrict CORS origin to specific domains
4. **Monitor Rate Limits**: Adjust rate limits based on usage patterns
5. **Use Redis Authentication**: Enable Redis AUTH in production
6. **Implement IP Whitelisting**: Restrict access to known IPs if possible
7. **Enable TLS for Redis**: Use TLS for Redis connections in production

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if Redis is running
   - Verify Redis URL in environment variables
   - Check firewall rules

2. **Authentication Failed**
   - Verify JWT token is valid
   - Check JWT secret matches between services
   - Ensure token is passed correctly (auth, query, or header)

3. **Rate Limit Exceeded**
   - Adjust rate limits in configuration
   - Check for client-side event spam
   - Monitor Redis performance

4. **High Memory Usage**
   - Monitor Redis memory usage
   - Check for memory leaks in handlers
   - Review room subscriptions and cleanup

## Architecture Decisions

### Why Socket.io?
- Built-in reconnection handling
- Fallback to long-polling
- Room and namespace support
- Battle-tested in production

### Why Redis Adapter?
- Enables horizontal scaling
- Reliable pub/sub mechanism
- Persistent connection state
- Low latency

### Why Rate Limiting?
- Prevent abuse
- Protect server resources
- Ensure fair usage
- DoS protection

## License

Proprietary - SUP Messenger
