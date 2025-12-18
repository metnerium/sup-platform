# WebSocket Service - API Documentation

Complete API reference for the SUP Messenger WebSocket service.

## Table of Contents

- [Connection](#connection)
- [Authentication](#authentication)
- [Message Events](#message-events)
- [Presence Events](#presence-events)
- [Call Events](#call-events)
- [Reaction Events](#reaction-events)
- [Chat Events](#chat-events)
- [Notification Events](#notification-events)
- [Error Handling](#error-handling)

## Connection

### Establishing Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: 'your_jwt_token'
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

### Connection Events

#### `connect`
Emitted when successfully connected to the server.

```javascript
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

#### `connected`
Server confirms the connection with user details.

**Response:**
```typescript
{
  userId: string;
  socketId: string;
}
```

**Example:**
```javascript
socket.on('connected', (data) => {
  console.log('User ID:', data.userId);
  console.log('Socket ID:', data.socketId);
});
```

#### `disconnect`
Emitted when disconnected from the server.

```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

## Authentication

Authentication is handled via JWT token passed during connection.

### Token Requirements

```typescript
{
  userId: string;      // User identifier
  deviceId?: string;   // Device identifier (optional)
  type: 'access';      // Token type (must be 'access')
  exp: number;         // Expiration timestamp
  iat: number;         // Issued at timestamp
}
```

### Token Placement

**Option 1: Auth Object (Recommended)**
```javascript
const socket = io(url, {
  auth: { token: 'jwt_token' }
});
```

**Option 2: Query Parameter**
```javascript
const socket = io(url, {
  query: { token: 'jwt_token' }
});
```

**Option 3: Authorization Header**
```javascript
const socket = io(url, {
  extraHeaders: {
    authorization: 'Bearer jwt_token'
  }
});
```

## Message Events

### `message:new`
Send a new message to a chat.

**Client → Server:**
```typescript
{
  chatId: string;
  encryptedContent: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice';
  replyToId?: string;
  metadata?: Record<string, any>;
  tempId?: string;  // Client-side temporary ID for tracking
}
```

**Response (Callback):**
```typescript
{
  success: boolean;
  message: {
    id: string;
    chatId: string;
    senderId: string;
    encryptedContent: string;
    messageType: string;
    replyToId?: string;
    createdAt: string;
    status: 'sent' | 'delivered' | 'read';
    tempId?: string;
  };
  sender: {
    id: string;
    username: string;
    avatar?: string;
  };
}
```

**Example:**
```javascript
socket.emit('message:new', {
  chatId: 'chat_123',
  encryptedContent: 'encrypted_message_content',
  messageType: 'text',
  tempId: 'temp_msg_456'
}, (response) => {
  if (response.success) {
    console.log('Message sent:', response.message);
  } else {
    console.error('Failed to send:', response.error);
  }
});
```

**Server → Client:**
Broadcast to all chat members except sender.

```javascript
socket.on('message:new', (data) => {
  console.log('New message:', data.message);
  console.log('From:', data.sender.username);
});
```

**Rate Limit:** 30 messages per minute

---

### `message:delivered`
Mark a message as delivered.

**Client → Server:**
```typescript
{
  messageId: string;
  chatId: string;
  deliveredAt?: string;  // ISO timestamp (optional)
}
```

**Example:**
```javascript
socket.emit('message:delivered', {
  messageId: 'msg_123',
  chatId: 'chat_456'
});
```

**Server → Client:**
```typescript
{
  messageId: string;
  userId: string;
  deliveredAt: string;
}
```

```javascript
socket.on('message:delivered', (data) => {
  console.log(`Message ${data.messageId} delivered by ${data.userId}`);
});
```

**Rate Limit:** 100 per minute

---

### `message:read`
Mark a message as read.

**Client → Server:**
```typescript
{
  messageId: string;
  chatId: string;
  readAt?: string;  // ISO timestamp (optional)
}
```

**Example:**
```javascript
socket.emit('message:read', {
  messageId: 'msg_123',
  chatId: 'chat_456'
});
```

**Server → Client:**
```typescript
{
  messageId: string;
  userId: string;
  readAt: string;
}
```

```javascript
socket.on('message:read', (data) => {
  console.log(`Message ${data.messageId} read by ${data.userId}`);
});
```

**Rate Limit:** 100 per minute

---

### `message:typing`
Indicate user is typing.

**Client → Server:**
```typescript
{
  chatId: string;
}
```

**Example:**
```javascript
socket.emit('message:typing', {
  chatId: 'chat_123'
});
```

**Server → Client:**
```typescript
{
  chatId: string;
  userId: string;
  userName: string;
}
```

```javascript
socket.on('message:typing', (data) => {
  console.log(`${data.userName} is typing in ${data.chatId}`);
});
```

**Rate Limit:** 10 per 10 seconds

---

### `message:stop-typing`
Indicate user stopped typing.

**Client → Server:**
```typescript
{
  chatId: string;
}
```

**Example:**
```javascript
socket.emit('message:stop-typing', {
  chatId: 'chat_123'
});
```

**Server → Client:**
```typescript
{
  chatId: string;
  userId: string;
}
```

```javascript
socket.on('message:stop-typing', (data) => {
  console.log(`${data.userId} stopped typing`);
});
```

## Presence Events

### `presence:update`
Update user's presence status.

**Client → Server:**
```typescript
{
  status: 'online' | 'offline' | 'away' | 'busy';
  customStatus?: string;
}
```

**Example:**
```javascript
socket.emit('presence:update', {
  status: 'online',
  customStatus: 'Working from home'
});
```

**Server → Client:**
Broadcast to subscribed users.

```typescript
{
  userId: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen?: number;  // Timestamp
  customStatus?: string;
}
```

```javascript
socket.on('presence:update', (data) => {
  console.log(`${data.userId} is now ${data.status}`);
});
```

**Rate Limit:** 20 per minute

---

### `presence:subscribe`
Subscribe to presence updates of specific users.

**Client → Server:**
```typescript
{
  userIds: string[];  // Max 100 users per request
}
```

**Example:**
```javascript
socket.emit('presence:subscribe', {
  userIds: ['user_1', 'user_2', 'user_3']
});
```

**Response:**
Immediately sends current presence status for all subscribed users.

---

### `presence:unsubscribe`
Unsubscribe from presence updates.

**Client → Server:**
```typescript
{
  userIds: string[];
}
```

**Example:**
```javascript
socket.emit('presence:unsubscribe', {
  userIds: ['user_1', 'user_2']
});
```

## Call Events

### `call:initiate`
Initiate a voice or video call.

**Client → Server:**
```typescript
{
  callId: string;
  targetUserId: string;
  callType: 'audio' | 'video';
  offer: RTCSessionDescriptionInit;
}
```

**Example:**
```javascript
socket.emit('call:initiate', {
  callId: 'call_' + Date.now(),
  targetUserId: 'user_456',
  callType: 'video',
  offer: {
    type: 'offer',
    sdp: 'offer_sdp_string'
  }
}, (response) => {
  if (response.success) {
    console.log('Call initiated:', response.callId);
  }
});
```

**Server → Client (Target User):**
```typescript
{
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
  offer: RTCSessionDescriptionInit;
  status: 'incoming';
}
```

```javascript
socket.on('call:incoming', (data) => {
  console.log(`Incoming ${data.callType} call from ${data.callerName}`);
  // Show incoming call UI
});
```

**Rate Limit:** 5 per minute

---

### `call:answer`
Answer an incoming call.

**Client → Server:**
```typescript
{
  callId: string;
  answer: RTCSessionDescriptionInit;
}
```

**Example:**
```javascript
socket.emit('call:answer', {
  callId: 'call_123',
  answer: {
    type: 'answer',
    sdp: 'answer_sdp_string'
  }
});
```

**Server → Client (Caller):**
```typescript
{
  callId: string;
  callerId: string;
  callerName: string;
  callType: string;
  answer: RTCSessionDescriptionInit;
  status: 'answered';
}
```

---

### `call:reject`
Reject an incoming call.

**Client → Server:**
```typescript
{
  callId: string;
  reason?: string;
}
```

**Example:**
```javascript
socket.emit('call:reject', {
  callId: 'call_123',
  reason: 'Busy'
});
```

**Server → Client (Caller):**
```typescript
{
  callId: string;
  status: 'rejected';
}
```

---

### `call:end`
End an active call.

**Client → Server:**
```typescript
{
  callId: string;
}
```

**Example:**
```javascript
socket.emit('call:end', {
  callId: 'call_123'
});
```

**Server → Client (Both Participants):**
```typescript
{
  callId: string;
  status: 'ended';
}
```

---

### `call:ice-candidate`
Exchange ICE candidates for WebRTC connection.

**Client → Server:**
```typescript
{
  callId: string;
  candidate: RTCIceCandidateInit;
}
```

**Example:**
```javascript
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit('call:ice-candidate', {
      callId: currentCallId,
      candidate: event.candidate
    });
  }
};
```

**Server → Client (Other Participant):**
```typescript
{
  callId: string;
  candidate: RTCIceCandidateInit;
}
```

```javascript
socket.on('call:ice-candidate', (data) => {
  peerConnection.addIceCandidate(data.candidate);
});
```

## Reaction Events

### `reaction:new`
Add a reaction to a message.

**Client → Server:**
```typescript
{
  messageId: string;
  chatId: string;
  reaction: string;  // Emoji or reaction identifier (max 10 chars)
}
```

**Example:**
```javascript
socket.emit('reaction:new', {
  messageId: 'msg_123',
  chatId: 'chat_456',
  reaction: '❤️'
});
```

**Server → Client:**
```typescript
{
  messageId: string;
  chatId: string;
  userId: string;
  userName: string;
  reaction: string;
  action: 'add';
  timestamp: string;
}
```

```javascript
socket.on('reaction:new', (data) => {
  console.log(`${data.userName} reacted with ${data.reaction}`);
});
```

**Rate Limit:** 50 per minute

---

### `reaction:remove`
Remove a reaction from a message.

**Client → Server:**
```typescript
{
  messageId: string;
  chatId: string;
  reaction: string;
}
```

**Example:**
```javascript
socket.emit('reaction:remove', {
  messageId: 'msg_123',
  chatId: 'chat_456',
  reaction: '❤️'
});
```

**Server → Client:**
```typescript
{
  messageId: string;
  chatId: string;
  userId: string;
  userName: string;
  reaction: string;
  action: 'remove';
  timestamp: string;
}
```

**Rate Limit:** 50 per minute

---

### `reaction:get`
Get all reactions for a message.

**Client → Server:**
```typescript
{
  messageId: string;
}
```

**Response (Callback):**
```typescript
{
  success: boolean;
  reactions: Array<{
    userId: string;
    reaction: string;
  }>;
}
```

**Example:**
```javascript
socket.emit('reaction:get', {
  messageId: 'msg_123'
}, (response) => {
  console.log('Reactions:', response.reactions);
});
```

## Chat Events

### `chat:join`
Join a chat room.

**Client → Server:**
```typescript
{
  chatId: string;
}
```

**Response (Callback):**
```typescript
{
  success: boolean;
  chatId: string;
}
```

**Example:**
```javascript
socket.emit('chat:join', {
  chatId: 'chat_123'
}, (response) => {
  if (response.success) {
    console.log('Joined chat:', response.chatId);
  }
});
```

---

### `chat:leave`
Leave a chat room.

**Client → Server:**
```typescript
{
  chatId: string;
}
```

**Example:**
```javascript
socket.emit('chat:leave', {
  chatId: 'chat_123'
});
```

---

### `chat:join-multiple`
Join multiple chat rooms at once.

**Client → Server:**
```typescript
{
  chatIds: string[];  // Max 100 chats
}
```

**Response (Callback):**
```typescript
{
  success: boolean;
  joinedCount: number;
}
```

**Example:**
```javascript
socket.emit('chat:join-multiple', {
  chatIds: ['chat_1', 'chat_2', 'chat_3']
}, (response) => {
  console.log(`Joined ${response.joinedCount} chats`);
});
```

---

### `chat:get-active-members`
Get currently active members in a chat.

**Client → Server:**
```typescript
{
  chatId: string;
}
```

**Response (Callback):**
```typescript
{
  success: boolean;
  chatId: string;
  activeMembers: string[];
  count: number;
}
```

**Example:**
```javascript
socket.emit('chat:get-active-members', {
  chatId: 'chat_123'
}, (response) => {
  console.log('Active members:', response.activeMembers);
});
```

---

### `chat:updated`
Broadcast when chat info or settings change.

**Server → Client:**
```typescript
{
  chatId: string;
  updatedBy: string;
  updateType: 'name' | 'avatar' | 'description' | 'settings' | 'members';
  changes: Record<string, any>;
  timestamp: string;
}
```

```javascript
socket.on('chat:updated', (data) => {
  console.log(`Chat ${data.chatId} updated:`, data.updateType);
});
```

## Notification Events

### `notification:new`
Receive a new notification.

**Server → Client:**
```typescript
{
  id: string;
  type: 'mention' | 'reply' | 'call_missed' | 'call_incoming' |
        'chat_invite' | 'chat_updated' | 'message_reaction' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  fromUserId?: string;
  chatId?: string;
  messageId?: string;
  priority: 'low' | 'normal' | 'high';
  sound: boolean;
  badge?: number;
  timestamp: string;
  read: boolean;
}
```

```javascript
socket.on('notification:new', (notification) => {
  console.log('New notification:', notification.title);
  // Show notification UI
});
```

---

### `notification:read`
Mark notification as read.

**Client → Server:**
```typescript
{
  notificationId: string;
}
```

**Example:**
```javascript
socket.emit('notification:read', {
  notificationId: 'notif_123'
});
```

---

### `notification:clear`
Clear a specific notification.

**Client → Server:**
```typescript
{
  notificationId: string;
}
```

---

### `notification:clear-all`
Clear all notifications.

**Client → Server:**
```javascript
socket.emit('notification:clear-all');
```

---

### `notification:get-pending`
Get all pending notifications.

**Client → Server:**
```javascript
socket.emit('notification:get-pending', (response) => {
  console.log('Pending notifications:', response.notifications);
});
```

**Response (Callback):**
```typescript
{
  success: boolean;
  notifications: Notification[];
}
```

## Error Handling

### Error Event

**Server → Client:**
```typescript
{
  message: string;
  code?: string;
}
```

```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error.message);

  switch (error.code) {
    case 'AUTHENTICATION_REQUIRED':
      // Handle authentication error
      break;
    case 'RATE_LIMIT_EXCEEDED':
      // Handle rate limit
      break;
    case 'INVALID_PAYLOAD':
      // Handle validation error
      break;
    default:
      // Handle generic error
  }
});
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED`: Missing or invalid token
- `INVALID_TOKEN`: Token verification failed
- `TOKEN_EXPIRED`: Token has expired
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INVALID_PAYLOAD`: Invalid event data
- `CHAT_NOT_FOUND`: Chat doesn't exist
- `PERMISSION_DENIED`: Insufficient permissions
- `CONNECTION_ERROR`: General connection error

### Connection Errors

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);

  if (error.message === 'Authentication required') {
    // Refresh token and reconnect
  }
});
```

## Best Practices

1. **Always handle callbacks** for important events
2. **Implement exponential backoff** for reconnection
3. **Validate data** before emitting events
4. **Handle rate limits** gracefully
5. **Clean up listeners** when components unmount
6. **Use TypeScript** for type safety
7. **Log errors** for debugging
8. **Test offline scenarios**
9. **Implement heartbeat monitoring**
10. **Cache frequently accessed data**

## Rate Limits Summary

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

---

For more information, see [README.md](./README.md) and [DEPLOYMENT.md](./DEPLOYMENT.md).
