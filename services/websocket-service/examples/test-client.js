/**
 * Test client for WebSocket service
 *
 * Usage:
 *   node examples/test-client.js
 *
 * Make sure to install socket.io-client first:
 *   npm install socket.io-client
 */

const { io } = require('socket.io-client');

// Configuration
const WEBSOCKET_URL = process.env.WEBSOCKET_URL || 'http://localhost:3001';
const JWT_TOKEN = process.env.JWT_TOKEN || 'your_test_token_here';

console.log('Connecting to WebSocket server...');
console.log('URL:', WEBSOCKET_URL);

// Create socket connection
const socket = io(WEBSOCKET_URL, {
  auth: {
    token: JWT_TOKEN,
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

// Connection events
socket.on('connect', () => {
  console.log('\n✅ Connected to server');
  console.log('Socket ID:', socket.id);
  console.log('\n--- Available Commands ---');
  console.log('Press 1: Send a test message');
  console.log('Press 2: Update presence to online');
  console.log('Press 3: Start typing indicator');
  console.log('Press 4: Join a test chat');
  console.log('Press 5: Initiate a test call');
  console.log('Press 6: Add a reaction');
  console.log('Press q: Disconnect\n');
});

socket.on('connected', (data) => {
  console.log('✅ Connection confirmed by server:', data);
});

socket.on('disconnect', (reason) => {
  console.log('\n❌ Disconnected from server');
  console.log('Reason:', reason);
});

socket.on('connect_error', (error) => {
  console.error('\n❌ Connection error:', error.message);
});

socket.on('error', (error) => {
  console.error('\n❌ Socket error:', error);
});

// Message events
socket.on('message:new', (data) => {
  console.log('\n📨 New message received:', {
    messageId: data.message.id,
    senderId: data.sender.id,
    content: data.message.encryptedContent.substring(0, 50) + '...',
    type: data.message.messageType,
  });
});

socket.on('message:delivered', (data) => {
  console.log('\n✅ Message delivered:', {
    messageId: data.messageId,
    userId: data.userId,
  });
});

socket.on('message:read', (data) => {
  console.log('\n👁️ Message read:', {
    messageId: data.messageId,
    userId: data.userId,
  });
});

socket.on('message:typing', (data) => {
  console.log('\n⌨️ User is typing:', {
    chatId: data.chatId,
    userId: data.userId,
    userName: data.userName,
  });
});

socket.on('message:stop-typing', (data) => {
  console.log('\n⌨️ User stopped typing:', {
    chatId: data.chatId,
    userId: data.userId,
  });
});

// Presence events
socket.on('presence:update', (data) => {
  console.log('\n👤 Presence update:', {
    userId: data.userId,
    status: data.status,
    lastSeen: data.lastSeen ? new Date(data.lastSeen).toISOString() : undefined,
  });
});

// Call events
socket.on('call:incoming', (data) => {
  console.log('\n📞 Incoming call:', {
    callId: data.callId,
    callerId: data.callerId,
    callerName: data.callerName,
    callType: data.callType,
    status: data.status,
  });
});

socket.on('call:answer', (data) => {
  console.log('\n✅ Call answered:', {
    callId: data.callId,
    status: data.status,
  });
});

socket.on('call:reject', (data) => {
  console.log('\n❌ Call rejected:', {
    callId: data.callId,
    status: data.status,
  });
});

socket.on('call:end', (data) => {
  console.log('\n📞 Call ended:', {
    callId: data.callId,
    status: data.status,
  });
});

// Reaction events
socket.on('reaction:new', (data) => {
  console.log('\n❤️ New reaction:', {
    messageId: data.messageId,
    userId: data.userId,
    reaction: data.reaction,
  });
});

socket.on('reaction:remove', (data) => {
  console.log('\n💔 Reaction removed:', {
    messageId: data.messageId,
    userId: data.userId,
    reaction: data.reaction,
  });
});

// Notification events
socket.on('notification:new', (data) => {
  console.log('\n🔔 New notification:', {
    id: data.id,
    type: data.type,
    title: data.title,
    message: data.message,
  });
});

// Chat events
socket.on('chat:updated', (data) => {
  console.log('\n💬 Chat updated:', {
    chatId: data.chatId,
    updateType: data.updateType,
    updatedBy: data.updatedBy,
  });
});

// Keyboard input handling
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (key) => {
    if (key === '\u0003' || key === 'q') {
      // Ctrl+C or 'q' pressed
      console.log('\n\nDisconnecting...');
      socket.disconnect();
      process.exit();
    }

    switch (key) {
      case '1':
        console.log('\n📤 Sending test message...');
        socket.emit('message:new', {
          chatId: 'test_chat_123',
          encryptedContent: 'Hello from test client! ' + new Date().toISOString(),
          messageType: 'text',
        }, (response) => {
          console.log('Response:', response);
        });
        break;

      case '2':
        console.log('\n👤 Updating presence to online...');
        socket.emit('presence:update', {
          status: 'online',
          customStatus: 'Testing WebSocket',
        });
        break;

      case '3':
        console.log('\n⌨️ Starting typing indicator...');
        socket.emit('message:typing', {
          chatId: 'test_chat_123',
        });
        setTimeout(() => {
          console.log('⌨️ Stopping typing indicator...');
          socket.emit('message:stop-typing', {
            chatId: 'test_chat_123',
          });
        }, 3000);
        break;

      case '4':
        console.log('\n💬 Joining test chat...');
        socket.emit('chat:join', {
          chatId: 'test_chat_123',
        }, (response) => {
          console.log('Response:', response);
        });
        break;

      case '5':
        console.log('\n📞 Initiating test call...');
        const callId = 'call_' + Date.now();
        socket.emit('call:initiate', {
          callId,
          targetUserId: 'test_user_456',
          callType: 'audio',
          offer: {
            type: 'offer',
            sdp: 'test_sdp_offer',
          },
        }, (response) => {
          console.log('Response:', response);
        });
        break;

      case '6':
        console.log('\n❤️ Adding reaction...');
        socket.emit('reaction:new', {
          messageId: 'test_message_123',
          chatId: 'test_chat_123',
          reaction: '❤️',
        });
        break;

      default:
        // Ignore other keys
        break;
    }
  });
}

// Keep the script running
console.log('\nTest client ready. Press numbers 1-6 to test features, or "q" to quit.\n');
