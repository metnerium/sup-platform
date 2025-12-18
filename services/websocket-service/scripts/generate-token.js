#!/usr/bin/env node
/**
 * Generate JWT token for testing WebSocket service
 *
 * Usage:
 *   node scripts/generate-token.js
 *   node scripts/generate-token.js user_123 device_456
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_change_in_production';

// Get userId and deviceId from command line args or use defaults
const userId = process.argv[2] || `user_${Date.now()}`;
const deviceId = process.argv[3] || `device_${Date.now()}`;

// Generate token
const token = jwt.sign(
  {
    userId,
    deviceId,
    type: 'access',
  },
  JWT_SECRET,
  {
    expiresIn: '7d',
  }
);

console.log('\n=== JWT Token Generated ===\n');
console.log('User ID:', userId);
console.log('Device ID:', deviceId);
console.log('Expires In: 7 days');
console.log('\nToken:');
console.log(token);
console.log('\n=== Usage ===\n');
console.log('Test client:');
console.log(`  JWT_TOKEN="${token}" node examples/test-client.js`);
console.log('\nSocket.io client:');
console.log(`  socket = io('http://localhost:3001', { auth: { token: '${token}' } })`);
console.log('\n');

// Verify the token to show payload
const decoded = jwt.verify(token, JWT_SECRET);
console.log('Token Payload:', JSON.stringify(decoded, null, 2));
console.log('');
