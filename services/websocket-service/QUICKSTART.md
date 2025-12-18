# WebSocket Service - Quick Start Guide

Get the SUP Messenger WebSocket service up and running in 5 minutes.

## Prerequisites

- Node.js 20.x
- Redis 7.x
- npm or yarn

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

### 3. Start Redis

**Option A: Using Docker (Recommended)**
```bash
docker run -d -p 6379:6379 --name sup-redis redis:7-alpine
```

**Option B: Local Installation**
```bash
# macOS
brew install redis && brew services start redis

# Ubuntu/Debian
sudo apt install redis-server && sudo systemctl start redis
```

### 4. Generate JWT Secret (for testing)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Update `.env` with the generated secret:
```env
JWT_SECRET=<generated_secret_here>
```

### 5. Start the Service

**Development Mode (with hot-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm run build
npm start
```

The service will start on http://localhost:3001

### 6. Verify It's Running

Check health endpoint:
```bash
curl http://localhost:9091/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "websocket-service",
  "connections": {
    "active": 0,
    "total": 0,
    "peak": 0
  },
  "uptime": 1234,
  "dependencies": {
    "redis": "connected"
  }
}
```

## Test the Service

### Generate a Test JWT Token

```javascript
// test-token.js
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    userId: 'test_user_123',
    deviceId: 'test_device_456',
    type: 'access'
  },
  process.env.JWT_SECRET || 'your_jwt_secret_here',
  { expiresIn: '7d' }
);

console.log('Test Token:', token);
```

Run:
```bash
node test-token.js
```

### Connect Using Test Client

```bash
cd examples
npm install socket.io-client
JWT_TOKEN=<your_test_token> node test-client.js
```

### Manual Test with Browser Console

```javascript
// In browser console
const socket = io('http://localhost:3001', {
  auth: { token: 'your_test_token_here' }
});

socket.on('connect', () => {
  console.log('Connected!', socket.id);
});

socket.on('connected', (data) => {
  console.log('Connection confirmed:', data);
});

// Send a test message
socket.emit('message:new', {
  chatId: 'test_chat_123',
  encryptedContent: 'Hello World!',
  messageType: 'text'
}, (response) => {
  console.log('Response:', response);
});

// Listen for messages
socket.on('message:new', (data) => {
  console.log('New message:', data);
});
```

## Common Commands

```bash
# Development
npm run dev              # Start with hot-reload

# Production
npm run build            # Build TypeScript
npm start                # Start production server

# Docker
docker-compose up -d     # Start with Docker Compose
docker-compose logs -f   # View logs
docker-compose down      # Stop services

# Testing
npm test                 # Run tests (if configured)
```

## Verify Features

### 1. Connection & Authentication
```bash
# Should authenticate successfully
curl -X GET http://localhost:9091/health
```

### 2. Real-time Messaging
Connect two clients and send messages between them

### 3. Presence System
```javascript
socket.emit('presence:update', {
  status: 'online',
  customStatus: 'Available'
});
```

### 4. Typing Indicators
```javascript
socket.emit('message:typing', { chatId: 'test_chat_123' });
// Wait 3 seconds
socket.emit('message:stop-typing', { chatId: 'test_chat_123' });
```

### 5. Call Signaling
```javascript
socket.emit('call:initiate', {
  callId: 'call_' + Date.now(),
  targetUserId: 'user_456',
  callType: 'audio',
  offer: { type: 'offer', sdp: 'test_sdp' }
}, (response) => {
  console.log(response);
});
```

## Troubleshooting

### Port Already in Use
```bash
# Find and kill process using port 3001
lsof -ti:3001 | xargs kill -9
```

### Redis Connection Failed
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not running, start Redis
docker start sup-redis
# or
brew services start redis
```

### Authentication Error
- Verify JWT_SECRET matches between services
- Check token expiration
- Ensure token includes userId and type='access'

### CORS Error
Update CORS_ORIGIN in .env:
```env
CORS_ORIGIN=http://localhost:3000
```

## Next Steps

- Read [README.md](./README.md) for complete documentation
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- Review [examples/test-client.js](./examples/test-client.js) for integration examples
- Configure rate limits and security settings
- Set up monitoring and logging

## Support

For issues:
1. Check logs: `docker-compose logs -f websocket`
2. Review metrics: `curl http://localhost:9091/metrics`
3. Check Redis: `redis-cli ping`
4. Verify environment variables: `cat .env`

## Key Endpoints

- WebSocket: `ws://localhost:3001`
- Health Check: `http://localhost:9091/health`
- Readiness Check: `http://localhost:9091/ready`
- Metrics: `http://localhost:9091/metrics`

---

**You're all set!** The WebSocket service is now running and ready to handle real-time connections.
