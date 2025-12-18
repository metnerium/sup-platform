# Call Service - Quick Start Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis
- LiveKit server running
- Coturn server (for TURN/STUN)

## Setup

### 1. Install Dependencies

```bash
cd services/call-service
npm install
```

### 2. Environment Configuration

Create `.env` file from example:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Required settings
DATABASE_URL=postgresql://sup_user:password@localhost:5432/sup
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here

# LiveKit (get these from your LiveKit server)
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# TURN/STUN servers
TURN_SERVER_URL=turn:localhost:3478
TURN_USERNAME=supuser
TURN_PASSWORD=suppassword
```

### 3. Run Database Migrations

```bash
# From main project root
cd ../main-api
npm run migrate

# This will create all necessary tables including call tables
```

### 4. Start the Service

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

The service will start on:
- HTTP API: `http://localhost:3004`
- WebSocket: `ws://localhost:3004`

## Docker Deployment

### Using Docker Compose

From project root:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f call-service

# Stop services
docker-compose down
```

### Individual Container

```bash
# Build
docker build -t sup-call-service .

# Run
docker run -p 3004:3004 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -e LIVEKIT_URL=ws://... \
  -e LIVEKIT_API_KEY=... \
  -e LIVEKIT_API_SECRET=... \
  sup-call-service
```

## Testing

### 1. Health Check

```bash
curl http://localhost:3004/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "call-service",
  "timestamp": "2025-01-02T10:00:00.000Z"
}
```

### 2. Get Metrics

```bash
curl http://localhost:3004/monitoring/metrics
```

### 3. Start a Call

First, get a JWT token from the main API (login/register).

```bash
# Start a video call
curl -X POST http://localhost:3004/api/v1/calls/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "video",
    "participantIds": ["user-uuid-2"],
    "videoEnabled": true,
    "audioEnabled": true
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "call": {
      "id": "call-uuid",
      "roomId": "room_...",
      "type": "video",
      "state": "ringing",
      ...
    },
    "token": {
      "token": "eyJ...",
      "url": "ws://localhost:7880",
      "roomName": "room_...",
      "identity": "user-id"
    },
    "iceServers": [
      { "urls": ["stun:localhost:3478"] },
      {
        "urls": ["turn:localhost:3478"],
        "username": "supuser",
        "credential": "suppassword"
      }
    ]
  }
}
```

### 4. WebSocket Connection

```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3004', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('Connected!');
});

socket.on('call:incoming', (data) => {
  console.log('Incoming call:', data);
});
```

## Common Tasks

### View Active Calls

```bash
curl http://localhost:3004/api/v1/calls/active \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Call History

```bash
curl http://localhost:3004/api/v1/calls/history?limit=20 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### End a Call

```bash
curl -X POST http://localhost:3004/api/v1/calls/CALL_ID/end \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "normal"}'
```

## Integration with Client

### Using LiveKit Client SDK

Install LiveKit client:

```bash
npm install livekit-client
```

Connect to call:

```javascript
import { Room } from 'livekit-client';

// 1. Start or join call via API (get token)
const response = await fetch('http://localhost:3004/api/v1/calls/start', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'video',
    participantIds: ['user-2']
  })
});

const { data } = await response.json();
const { token: livekitToken, url } = data.token;

// 2. Connect to LiveKit room
const room = new Room();
await room.connect(url, livekitToken.token);

// 3. Enable camera and microphone
await room.localParticipant.setCameraEnabled(true);
await room.localParticipant.setMicrophoneEnabled(true);

// 4. Handle remote participants
room.on('trackSubscribed', (track, publication, participant) => {
  const element = track.attach();
  document.body.appendChild(element);
});
```

## Monitoring

### View Logs

```bash
# Docker
docker-compose logs -f call-service

# Local
tail -f logs/all.log
```

### Prometheus Metrics

The service exposes metrics at:
```
GET /monitoring/metrics
```

Configure Prometheus to scrape this endpoint.

### Grafana Dashboard

Import the provided dashboard from `config/grafana/dashboards/calls.json` (to be created).

## Troubleshooting

### Service won't start

1. Check database connection:
   ```bash
   psql postgresql://sup_user:password@localhost:5432/sup -c "SELECT 1"
   ```

2. Check Redis connection:
   ```bash
   redis-cli ping
   ```

3. Check LiveKit server:
   ```bash
   curl http://localhost:7881/
   ```

### WebSocket connection fails

1. Check CORS settings in `.env`
2. Verify JWT token is valid
3. Check firewall/network settings

### Calls fail to connect

1. Verify TURN/STUN server is running:
   ```bash
   netstat -ln | grep 3478
   ```

2. Test STUN server:
   ```bash
   npm install -g stun
   stun stun://localhost:3478
   ```

3. Check LiveKit logs for errors

### Database errors

1. Run migrations:
   ```bash
   cd ../main-api
   npm run migrate
   ```

2. Check migration status:
   ```bash
   npm run migrate:status
   ```

## Performance Tuning

### Database Connections

Adjust PostgreSQL connection pool in `src/config/database.ts`:

```typescript
export const db = pgp({
  connectionString: config.database.url,
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
});
```

### Redis Configuration

For production, use Redis Cluster or Sentinel:

```env
REDIS_URL=redis://sentinel1:26379,sentinel2:26379,sentinel3:26379
```

### Call Limits

Adjust in `.env`:

```env
MAX_CALL_PARTICIPANTS=8
MAX_CALL_DURATION=14400  # 4 hours in seconds
RINGING_TIMEOUT=60       # 60 seconds
CONNECTION_TIMEOUT=30    # 30 seconds
```

## Security Checklist

- [ ] Change JWT_SECRET in production
- [ ] Use HTTPS/WSS in production
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Use secure TURN credentials
- [ ] Enable database SSL
- [ ] Configure Redis password
- [ ] Set up firewall rules
- [ ] Use environment-specific configs

## Next Steps

1. **Configure LiveKit** - Follow LiveKit documentation to set up production server
2. **Set up Coturn** - Configure TURN server for NAT traversal
3. **Integrate with Client** - Use examples in `examples/` directory
4. **Run Integration Tests** - Execute `examples/integration-test.ts`
5. **Set up Monitoring** - Configure Prometheus + Grafana
6. **Deploy to Production** - Use Docker Compose or Kubernetes

## Support

For issues or questions:
1. Check logs: `logs/all.log`
2. Review documentation: `README.md`
3. See implementation details: `IMPLEMENTATION.md`
4. Check examples: `examples/`

## Useful Commands

```bash
# Development
npm run dev              # Start in dev mode
npm run build            # Build TypeScript
npm run lint             # Run linter

# Database
npm run migrate          # Run migrations
npm run migrate:rollback # Rollback last migration
npm run migrate:status   # Check migration status

# Docker
docker-compose up -d call-service    # Start call service
docker-compose restart call-service  # Restart call service
docker-compose logs -f call-service  # View logs
docker-compose down                  # Stop all services

# Testing
curl localhost:3004/health           # Health check
curl localhost:3004/monitoring/metrics  # Get metrics
```

## Ready to Go!

Your Call Service is now ready. Start making calls! 📞🎥
