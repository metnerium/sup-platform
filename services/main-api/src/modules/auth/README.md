# Auth Module - SUP Messenger

Complete authentication module for SUP Messenger with JWT tokens, session management, and security best practices.

## Features

- User registration with email/phone
- User login with multiple identifiers (username/email/phone)
- JWT-based authentication (access + refresh tokens)
- Session management with device tracking
- Token refresh mechanism
- Secure logout with token blacklisting
- Rate limiting on auth endpoints
- Comprehensive validation
- Password security (bcrypt)
- Detailed logging

## Structure

```
auth/
├── auth.service.ts      # Core business logic
├── auth.controller.ts   # Request handlers
├── auth.routes.ts       # Route definitions
├── auth.validator.ts    # Input validation rules
├── index.ts            # Module exports
└── README.md           # This file
```

## API Endpoints

### Public Endpoints

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123",
  "deviceId": "unique-device-id",
  "deviceName": "iPhone 14",
  "deviceType": "ios"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "createdAt": "2025-12-18T12:00:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

#### POST /api/auth/login
Login existing user.

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "SecurePass123",
  "deviceId": "unique-device-id",
  "deviceName": "iPhone 14",
  "deviceType": "ios"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "avatarUrl": "https://...",
      "bio": "Hey there!",
      "status": "online"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

#### POST /api/auth/refresh
Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### Protected Endpoints

These endpoints require `Authorization: Bearer {accessToken}` header.

#### GET /api/auth/me
Get current user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "avatarUrl": "https://...",
    "bio": "Hey there!",
    "status": "online",
    "emailVerified": true,
    "phoneVerified": false,
    "twoFactorEnabled": false,
    "lastSeen": "2025-12-18T12:00:00Z",
    "createdAt": "2025-12-18T12:00:00Z",
    "updatedAt": "2025-12-18T12:00:00Z"
  }
}
```

#### POST /api/auth/logout
Logout user and invalidate session.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Future Extension Endpoints

These endpoints are placeholders for future implementation:

- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/verify-phone` - Phone verification
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/change-password` - Change password (protected)
- `POST /api/auth/2fa/enable` - Enable 2FA (protected)
- `POST /api/auth/2fa/disable` - Disable 2FA (protected)
- `POST /api/auth/2fa/verify` - Verify 2FA code

## Validation Rules

### Registration
- **username**: 3-30 characters, alphanumeric + underscore
- **email**: Valid email format (optional)
- **phone**: E.164 format (optional)
- **password**: 8-128 characters, must contain uppercase, lowercase, and number
- **deviceId**: Required, 1-255 characters
- **deviceName**: Optional, max 255 characters
- **deviceType**: One of: ios, android, web, desktop, other

**Note**: Either email or phone is required.

### Login
- **username/email/phone**: At least one required
- **password**: Required
- **deviceId**: Required

### Refresh Token
- **refreshToken**: Required, must be valid JWT

### Logout
- **refreshToken**: Required, must be valid JWT

## Security Features

### Password Security
- Bcrypt hashing with configurable rounds (default: 12)
- Minimum 8 characters
- Password complexity requirements

### Token Security
- Access tokens: Short-lived (15 minutes default)
- Refresh tokens: Long-lived (30 days default)
- Token blacklisting on logout
- Session-based refresh token validation

### Rate Limiting
- Auth endpoints (register/login): 5 requests per 15 minutes
- General API endpoints: 100 requests per 15 minutes

### Input Validation
- Express-validator for all inputs
- SQL injection prevention (parameterized queries)
- XSS prevention
- Proper error messages without information leakage

### Logging
- All authentication attempts logged
- Failed login attempts tracked
- Sensitive data redacted (passwords never logged)

## Database Schema

### users
```sql
- id (uuid, primary key)
- username (varchar, unique)
- email (varchar, unique, nullable)
- phone (varchar, unique, nullable)
- password_hash (varchar)
- avatar_url (varchar, nullable)
- bio (text, nullable)
- status (varchar, default: 'offline')
- email_verified (boolean, default: false)
- phone_verified (boolean, default: false)
- two_factor_enabled (boolean, default: false)
- last_seen (timestamp, nullable)
- created_at (timestamp)
- updated_at (timestamp)
- deleted_at (timestamp, nullable)
```

### user_devices
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- device_id (varchar)
- device_name (varchar, nullable)
- device_type (varchar, nullable)
- push_token (varchar, nullable)
- public_key (text, nullable)
- last_active (timestamp)
- created_at (timestamp)
```

### sessions
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- device_id (varchar)
- refresh_token_hash (varchar)
- ip_address (varchar, nullable)
- user_agent (text, nullable)
- expires_at (timestamp)
- created_at (timestamp)
```

## Service Methods

### AuthService

#### Core Methods
- `register(data)` - Register new user
- `login(data)` - Login user
- `refreshToken(data)` - Refresh access token
- `logout(userId, deviceId, refreshToken)` - Logout user
- `getCurrentUser(userId)` - Get user by ID

#### Session Management
- `getUserSessions(userId)` - Get all active sessions
- `revokeSession(userId, sessionId)` - Revoke specific session
- `revokeAllSessions(userId, exceptDeviceId?)` - Revoke all sessions

#### Password Management
- `verifyPassword(userId, password)` - Verify user password
- `changePassword(userId, currentPassword, newPassword)` - Change password
- `generatePasswordResetToken(email)` - Generate reset token
- `resetPasswordWithToken(token, newPassword)` - Reset password

#### Token Management
- `isTokenBlacklisted(token)` - Check if token is blacklisted
- `generateTokens(userId, deviceId)` - Generate JWT tokens (private)

#### Future Extensions
- `generateEmailVerificationToken(userId)` - Generate verification token
- `verifyEmail(userId, token)` - Verify email
- `enable2FA(userId)` - Enable 2FA
- `disable2FA(userId, code)` - Disable 2FA
- `verify2FACode(userId, code)` - Verify 2FA code

## Error Handling

All errors follow consistent format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400,
    "errors": [] // Optional validation errors
  }
}
```

### Common Status Codes
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials, expired token)
- `404` - Not Found (user/resource not found)
- `409` - Conflict (username/email already exists)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `501` - Not Implemented (future features)

## Usage Example

```typescript
import express from 'express';
import authRoutes from './modules/auth';

const app = express();

// Register auth routes
app.use('/api/auth', authRoutes);

// Protected route example
import { authMiddleware } from './common/middleware/auth.middleware';

app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ userId: req.user.id });
});
```

## Configuration

Environment variables in `.env`:

```env
# JWT
JWT_SECRET=your_jwt_secret_change_in_production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# Bcrypt
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Testing

Example test flow:

1. Register user
2. Login with credentials
3. Use access token for protected endpoints
4. Refresh token when expired
5. Logout to invalidate session

## Future Enhancements

- [ ] Email verification
- [ ] Phone verification (SMS)
- [ ] Password reset flow
- [ ] Two-factor authentication (2FA)
- [ ] OAuth/Social login
- [ ] Device management UI
- [ ] Session management UI
- [ ] Login history
- [ ] Suspicious activity detection
- [ ] Account recovery

## Dependencies

- `express` - Web framework
- `express-validator` - Input validation
- `jsonwebtoken` - JWT tokens
- `bcrypt` - Password hashing
- `uuid` - Unique ID generation
- `pg-promise` - PostgreSQL client
- `redis` - Caching and blacklisting
- `winston` - Logging
- `express-rate-limit` - Rate limiting

## License

Proprietary - SUP Messenger
