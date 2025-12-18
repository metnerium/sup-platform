#!/usr/bin/env node

/**
 * Generate a test JWT token
 * Usage: node generate-jwt.js <userId>
 */

const jwt = require('jsonwebtoken');

const userId = process.argv[2] || 'test-user-123';
const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const payload = {
  userId,
  email: `${userId}@example.com`,
};

const token = jwt.sign(payload, secret, { expiresIn: '24h' });

console.log('Generated JWT Token:');
console.log(token);
console.log('');
console.log('User ID:', userId);
console.log('Expires in: 24 hours');
console.log('');
console.log('Use this token in Authorization header:');
console.log(`Authorization: Bearer ${token}`);
