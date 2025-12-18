/**
 * Integration test example for Call Service
 * This demonstrates how to test the call service end-to-end
 */

import io from 'socket.io-client';

interface TestConfig {
  apiUrl: string;
  wsUrl: string;
  token1: string; // JWT for user 1
  token2: string; // JWT for user 2
  userId1: string;
  userId2: string;
}

async function runIntegrationTest(config: TestConfig) {
  console.log('Starting Call Service Integration Test...\n');

  // Create two socket connections (two users)
  const socket1 = io(config.wsUrl, {
    auth: { token: config.token1 },
    transports: ['websocket'],
  });

  const socket2 = io(config.wsUrl, {
    auth: { token: config.token2 },
    transports: ['websocket'],
  });

  // Wait for connections
  await Promise.all([
    new Promise((resolve) => socket1.on('connect', resolve)),
    new Promise((resolve) => socket2.on('connect', resolve)),
  ]);

  console.log('✓ Both users connected to WebSocket\n');

  // Set up listeners for User 2 (receiver)
  const incomingCallPromise = new Promise((resolve) => {
    socket2.on('call:incoming', (data) => {
      console.log('✓ User 2 received incoming call notification');
      console.log('  Call ID:', data.callId);
      console.log('  From:', data.invitation.initiatorName);
      console.log('  Type:', data.invitation.type);
      resolve(data);
    });
  });

  // User 1 starts a call to User 2
  console.log('User 1 starting video call to User 2...');
  const startResponse = await fetch(`${config.apiUrl}/api/v1/calls/start`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'video',
      participantIds: [config.userId2],
      videoEnabled: true,
      audioEnabled: true,
    }),
  });

  const startResult = await startResponse.json();

  if (!startResult.success) {
    throw new Error('Failed to start call: ' + startResult.error);
  }

  console.log('✓ Call started successfully');
  console.log('  Call ID:', startResult.data.call.id);
  console.log('  Room ID:', startResult.data.call.roomId);
  console.log('  LiveKit Token received:', !!startResult.data.token.token);
  console.log('  ICE Servers:', startResult.data.iceServers.length, '\n');

  const callId = startResult.data.call.id;

  // Wait for User 2 to receive invitation
  const incomingCall = (await incomingCallPromise) as any;

  // User 2 accepts the call
  console.log('User 2 accepting call...');
  const acceptPromise = new Promise((resolve) => {
    socket1.on('call:accepted', (data) => {
      console.log('✓ User 1 notified that User 2 accepted');
      resolve(data);
    });
  });

  const joinResponse = await fetch(
    `${config.apiUrl}/api/v1/calls/${callId}/join`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token2}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoEnabled: true,
        audioEnabled: true,
      }),
    }
  );

  const joinResult = await joinResponse.json();

  if (!joinResult.success) {
    throw new Error('Failed to join call: ' + joinResult.error);
  }

  console.log('✓ User 2 joined call successfully');
  console.log('  Participants in call:', joinResult.data.participants.length, '\n');

  await acceptPromise;

  // Test participant updates
  console.log('Testing participant updates...');
  const updatePromise = new Promise((resolve) => {
    socket2.on('call:participant_updated', (data) => {
      console.log('✓ User 2 notified of User 1 audio mute');
      console.log('  Audio enabled:', data.participant.audioEnabled);
      resolve(data);
    });
  });

  // User 1 mutes audio
  socket1.emit('call:toggle_audio', {
    callId,
    enabled: false,
  });

  await updatePromise;
  console.log();

  // Get call details
  console.log('Fetching call details...');
  const detailsResponse = await fetch(
    `${config.apiUrl}/api/v1/calls/${callId}`,
    {
      headers: {
        Authorization: `Bearer ${config.token1}`,
      },
    }
  );

  const detailsResult = await detailsResponse.json();
  console.log('✓ Call details retrieved');
  console.log('  State:', detailsResult.data.call.state);
  console.log('  Participants:', detailsResult.data.participants.length, '\n');

  // End call
  console.log('User 1 ending call...');
  const endPromise = new Promise((resolve) => {
    socket2.on('call:ended', (data) => {
      console.log('✓ User 2 notified that call ended');
      console.log('  Reason:', data.reason);
      resolve(data);
    });
  });

  const endResponse = await fetch(
    `${config.apiUrl}/api/v1/calls/${callId}/end`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'normal',
      }),
    }
  );

  const endResult = await endResponse.json();
  console.log('✓ Call ended successfully\n');

  await endPromise;

  // Check call history
  console.log('Checking call history...');
  const historyResponse = await fetch(
    `${config.apiUrl}/api/v1/calls/history?limit=10`,
    {
      headers: {
        Authorization: `Bearer ${config.token1}`,
      },
    }
  );

  const historyResult = await historyResponse.json();
  console.log('✓ Call history retrieved');
  console.log('  Total calls:', historyResult.data.calls.length);

  const lastCall = historyResult.data.calls[0];
  if (lastCall) {
    console.log('  Last call ID:', lastCall.id);
    console.log('  Last call state:', lastCall.state);
    console.log('  Last call duration:', lastCall.duration, 'seconds');
  }

  console.log();

  // Get statistics
  console.log('Fetching call statistics...');
  const statsResponse = await fetch(`${config.apiUrl}/api/v1/calls/stats`, {
    headers: {
      Authorization: `Bearer ${config.token1}`,
    },
  });

  const statsResult = await statsResponse.json();
  console.log('✓ Statistics retrieved');
  console.log('  Total calls:', statsResult.data.totalCalls);
  console.log('  Active calls:', statsResult.data.activeCalls);
  console.log('  Completed calls:', statsResult.data.completedCalls);
  console.log('  Failed calls:', statsResult.data.failedCalls);
  console.log();

  // Cleanup
  socket1.disconnect();
  socket2.disconnect();

  console.log('✓ Integration test completed successfully!\n');
}

// Example usage
if (require.main === module) {
  const config: TestConfig = {
    apiUrl: process.env.API_URL || 'http://localhost:3003',
    wsUrl: process.env.WS_URL || 'ws://localhost:3003',
    token1: process.env.TOKEN_1 || 'your-jwt-token-user-1',
    token2: process.env.TOKEN_2 || 'your-jwt-token-user-2',
    userId1: process.env.USER_1 || 'user-uuid-1',
    userId2: process.env.USER_2 || 'user-uuid-2',
  };

  runIntegrationTest(config)
    .then(() => {
      console.log('All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { runIntegrationTest };
