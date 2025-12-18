# SUP Messenger - Call Service

Real-time audio/video calling service powered by LiveKit with WebRTC support.

## Features

### Core Calling
- **1-on-1 Calls**: Direct audio/video calls between two users
- **Group Calls**: Multi-participant calls (up to 8 participants)
- **Call Types**: Audio-only or video calls
- **Call States**: Proper state management (initiating, ringing, connecting, connected, ended, etc.)

### Real-time Signaling
- **WebSocket Support**: Real-time call events and notifications
- **WebRTC Signaling**: Offer/answer exchange and ICE candidate handling
- **Push Notifications**: Incoming call notifications via WebSocket
- **Call Events**: Real-time updates on participant join/leave, state changes

### Media Features
- **Audio Controls**: Mute/unmute microphone
- **Video Controls**: Enable/disable camera
- **Screen Sharing**: Share screen with participants
- **Quality Monitoring**: Track connection quality metrics (jitter, packet loss, latency)

### LiveKit Integration
- **Room Management**: Automatic room creation and cleanup
- **Token Generation**: Secure JWT tokens for LiveKit access
- **Participant Management**: Track and manage call participants
- **Recording Support**: Optional call recording (infrastructure ready)

### TURN/STUN Support
- **NAT Traversal**: Coturn server integration
- **ICE Servers**: STUN/TURN configuration for reliable connections
- **Firewall Support**: Works behind restrictive firewalls

### Database Tracking
- **Call History**: Complete call log with duration and participants
- **Quality Metrics**: Store connection quality data
- **Call Analytics**: Statistics and success rates
- **Participant Tracking**: Join/leave times and durations

## Architecture

```
┌─────────────┐     WebSocket      ┌──────────────┐
│   Client    │ ◄─────────────────► │    Call      │
│             │                     │   Service    │
└─────────────┘                     └──────────────┘
       │                                    │
       │ WebRTC Media                       │
       ▼                                    ▼
┌─────────────┐                     ┌──────────────┐
│   LiveKit   │ ◄───────────────── │  PostgreSQL  │
│   Server    │                     │   Database   │
└─────────────┘                     └──────────────┘
       │
       │ TURN/STUN
       ▼
┌─────────────┐
│   Coturn    │
│   Server    │
└─────────────┘
```

## API Endpoints

### Call Management

#### Start Call
```http
POST /api/v1/calls/start
Authorization: Bearer {token}

{
  "type": "video",
  "participantIds": ["user-uuid-1", "user-uuid-2"],
  "chatId": "chat-uuid", // optional
  "videoEnabled": true,
  "audioEnabled": true
}

Response:
{
  "success": true,
  "data": {
    "call": { ... },
    "token": {
      "token": "jwt-token",
      "url": "ws://livekit:7880",
      "roomName": "room_...",
      "identity": "user-id"
    },
    "iceServers": [...]
  }
}
```

#### Join Call
```http
POST /api/v1/calls/:callId/join
Authorization: Bearer {token}

{
  "videoEnabled": true,
  "audioEnabled": true
}

Response:
{
  "success": true,
  "data": {
    "call": { ... },
    "token": { ... },
    "iceServers": [...],
    "participants": [...]
  }
}
```

#### End Call
```http
POST /api/v1/calls/:callId/end
Authorization: Bearer {token}

{
  "reason": "normal" // normal, timeout, declined, etc.
}

Response:
{
  "success": true,
  "message": "Call ended successfully"
}
```

#### Get Call Token (Reconnection)
```http
POST /api/v1/calls/:callId/token
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "token": { ... },
    "iceServers": [...]
  }
}
```

### Call Information

#### Get Call Details
```http
GET /api/v1/calls/:callId
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "call": { ... },
    "participants": [...]
  }
}
```

#### Get Call History
```http
GET /api/v1/calls/history?limit=50&offset=0
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "calls": [...],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 150
    }
  }
}
```

#### Get Active Calls
```http
GET /api/v1/calls/active
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "calls": [...]
  }
}
```

### Participant Management

#### Update Participant Settings
```http
PATCH /api/v1/calls/:callId/participant
Authorization: Bearer {token}

{
  "audioEnabled": false,
  "videoEnabled": true,
  "screenShareEnabled": false
}

Response:
{
  "success": true,
  "message": "Participant settings updated"
}
```

### Monitoring

#### Get Statistics
```http
GET /api/v1/calls/stats
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "totalCalls": 1234,
    "activeCalls": 5,
    "completedCalls": 1200,
    "failedCalls": 29
  }
}
```

#### Health Check
```http
GET /health

Response:
{
  "status": "ok",
  "service": "call-service",
  "timestamp": "2025-01-02T10:00:00.000Z"
}
```

#### Metrics
```http
GET /monitoring/metrics

Response:
{
  "calls": {
    "total": 1234,
    "active": 5,
    "completed": 1200,
    "failed": 29
  },
  "livekit": {
    "activeRooms": 5
  },
  "performance": {
    "successRate": "97.35%"
  },
  "timestamp": "2025-01-02T10:00:00.000Z"
}
```

## WebSocket Events

### Client → Server Events

```javascript
// Invite users to call
socket.emit('call:invite', {
  callId: 'call-uuid',
  invitation: { ... }
});

// Accept incoming call
socket.emit('call:accept', {
  callId: 'call-uuid'
});

// Decline incoming call
socket.emit('call:decline', {
  callId: 'call-uuid'
});

// End call
socket.emit('call:end', {
  callId: 'call-uuid',
  reason: 'normal'
});

// Toggle audio
socket.emit('call:toggle_audio', {
  callId: 'call-uuid',
  enabled: false
});

// Toggle video
socket.emit('call:toggle_video', {
  callId: 'call-uuid',
  enabled: false
});

// Toggle screen share
socket.emit('call:toggle_screen_share', {
  callId: 'call-uuid',
  enabled: true
});

// Send quality metrics
socket.emit('call:quality_update', {
  callId: 'call-uuid',
  jitter: 15.5,
  packetLoss: 0.5,
  roundTripTime: 120,
  bandwidth: 1500
});

// WebRTC signaling
socket.emit('webrtc:offer', {
  callId: 'call-uuid',
  targetUserId: 'user-uuid',
  offer: { ... }
});

socket.emit('webrtc:answer', {
  callId: 'call-uuid',
  targetUserId: 'user-uuid',
  answer: { ... }
});

socket.emit('webrtc:ice_candidate', {
  callId: 'call-uuid',
  targetUserId: 'user-uuid',
  candidate: { ... }
});
```

### Server → Client Events

```javascript
// Incoming call notification
socket.on('call:incoming', (data) => {
  // data.callId, data.invitation
});

// Call accepted by participant
socket.on('call:accepted', (data) => {
  // data.callId, data.userId
});

// Call declined by participant
socket.on('call:declined', (data) => {
  // data.callId, data.userId
});

// Call ended
socket.on('call:ended', (data) => {
  // data.callId, data.userId, data.reason
});

// Participant joined
socket.on('call:participant_joined', (data) => {
  // data.callId, data.userId
});

// Participant left
socket.on('call:participant_left', (data) => {
  // data.callId, data.userId
});

// Participant updated (audio/video/screen share)
socket.on('call:participant_updated', (data) => {
  // data.callId, data.userId, data.participant
});

// Call state changed
socket.on('call:state_changed', (data) => {
  // data.callId, data.state
});

// Error occurred
socket.on('call:error', (data) => {
  // data.error
});

// WebRTC signaling
socket.on('webrtc:offer', (data) => {
  // data.callId, data.fromUserId, data.offer
});

socket.on('webrtc:answer', (data) => {
  // data.callId, data.fromUserId, data.answer
});

socket.on('webrtc:ice_candidate', (data) => {
  // data.callId, data.fromUserId, data.candidate
});
```

## Database Schema

### Tables

#### calls
- `id` - Unique call identifier
- `room_id` - LiveKit room ID
- `type` - Call type (audio/video)
- `state` - Current call state
- `initiator_id` - User who started the call
- `chat_id` - Associated chat (optional)
- `is_group` - Group or 1-on-1 call
- `max_participants` - Maximum allowed participants
- `started_at` - When call actually connected
- `ended_at` - When call ended
- `duration` - Call duration in seconds
- `end_reason` - Why call ended
- `recording_enabled` - Is recording enabled
- `recording_url` - Recording URL (if available)

#### call_participants
- `id` - Unique participant identifier
- `call_id` - Associated call
- `user_id` - User identifier
- `role` - Initiator or participant
- `joined_at` - When user joined
- `left_at` - When user left
- `duration` - Time in call (seconds)
- `connection_state` - Participant's connection state
- `audio_enabled` - Is audio enabled
- `video_enabled` - Is video enabled
- `screen_share_enabled` - Is screen sharing enabled

#### call_quality_metrics
- `id` - Unique metric identifier
- `call_id` - Associated call
- `participant_id` - Associated participant
- `timestamp` - When metric was recorded
- `jitter` - Jitter in milliseconds
- `packet_loss` - Packet loss percentage
- `round_trip_time` - RTT in milliseconds
- `bandwidth` - Bandwidth in kbps
- `fps` - Frame rate (video)
- `resolution` - Video resolution
- `codec` - Audio/video codec
- `quality` - Overall quality rating

#### call_recordings
- `id` - Unique recording identifier
- `call_id` - Associated call
- `started_at` - Recording start time
- `ended_at` - Recording end time
- `duration` - Recording duration
- `file_size` - File size in bytes
- `s3_key` - S3 storage key
- `url` - Public URL (if available)
- `status` - Recording status

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=3003
WS_PORT=3004

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sup

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret

# LiveKit
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# TURN/STUN
TURN_SERVER_URL=turn:localhost:3478
TURN_USERNAME=supuser
TURN_PASSWORD=suppassword
STUN_SERVER_URL=stun:localhost:3478

# Call Configuration
MAX_CALL_PARTICIPANTS=8
MAX_CALL_DURATION=14400
RINGING_TIMEOUT=60
CONNECTION_TIMEOUT=30
QUALITY_CHECK_INTERVAL=5000

# Monitoring
METRICS_PORT=9091

# Logging
LOG_LEVEL=info
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run in production
npm start

# Run database migrations
npm run migrate
```

## Docker

```bash
# Build image
docker build -t sup-call-service .

# Run container
docker run -p 3003:3003 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -e LIVEKIT_URL=ws://... \
  sup-call-service
```

## Testing

Example client connection:

```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3003', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Listen for incoming calls
socket.on('call:incoming', (data) => {
  console.log('Incoming call:', data);
  // Show call UI and accept/decline
});

// Start a call
fetch('http://localhost:3003/api/v1/calls/start', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-jwt-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'video',
    participantIds: ['user-uuid']
  })
})
.then(res => res.json())
.then(data => {
  // Use LiveKit token to connect
  const { token, url, roomName } = data.data.token;
  // Connect to LiveKit...
});
```

## Production Considerations

1. **Scaling**: Use Redis adapter for horizontal scaling
2. **Load Balancing**: Sticky sessions required for WebSocket
3. **Monitoring**: Set up Prometheus metrics collection
4. **Logging**: Configure centralized logging (Loki)
5. **Security**: Use HTTPS/WSS in production
6. **TURN Server**: Ensure Coturn is properly configured
7. **Database**: Set up read replicas for call history
8. **Cleanup**: Run periodic jobs to clean up stale calls

## License

Proprietary - SUP Messenger
