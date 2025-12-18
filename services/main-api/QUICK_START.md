# SUP Messenger Main API - Quick Start Guide

## Installation & Setup

### 1. Install Dependencies
```bash
cd services/main-api
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

**Minimum required configuration**:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://sup_user:sup_secure_password@localhost:5432/sup
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-change-this
```

### 3. Run Database Migrations
```bash
# From the database package
cd ../../packages/database
npm run migrate
```

### 4. Start the Server

**Development mode (with auto-reload)**:
```bash
npm run dev
```

**Production mode**:
```bash
npm run build
npm start
```

The API will be available at `http://localhost:3000/api/v1`

---

## Testing the API

### Health Check
```bash
curl http://localhost:3000/health
```

### Register a User
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123456",
    "deviceId": "device-123",
    "deviceName": "Test Device",
    "deviceType": "ios"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test123456",
    "deviceId": "device-123",
    "deviceName": "Test Device",
    "deviceType": "ios"
  }'
```

**Response** includes `accessToken` - use this for authenticated requests.

### Get Current User (Authenticated)
```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Common API Patterns

### Authentication
All protected endpoints require JWT token:
```bash
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Pagination
List endpoints support pagination:
```bash
GET /api/v1/chats?limit=50&offset=0
GET /api/v1/users/search?query=john&limit=20&offset=0
```

### Cursor-Based Pagination (Messages)
```bash
GET /api/v1/chats/{chatId}/messages?cursor=2024-01-01T00:00:00.000Z&limit=50
```

### Error Responses
All errors follow this format:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400,
    "details": [...]
  }
}
```

---

## Module Overview

### 1. Authentication (`/auth`)
- Register, login, logout
- JWT token management
- 2FA setup and verification
- Password reset
- Session management

### 2. User Management (`/users`)
- User profiles
- Contacts
- Blocking
- Search

### 3. Cryptography (`/crypto`)
- Signal Protocol key management
- X3DH key exchange
- Identity keys, signed prekeys, one-time prekeys

### 4. Chats (`/chats`)
- Create/manage chats (direct, group, channel)
- Member management
- Invite links
- Chat settings

### 5. Messages (`/chats/{id}/messages` and `/messages`)
- Send/receive encrypted messages
- Edit/delete messages
- Reactions
- Read receipts
- Forward/reply

### 6. Stories (`/stories`)
- Create 24-hour stories
- View stories
- Privacy settings
- View tracking

### 7. Search (`/search`)
- Search users
- Search chats
- Search messages (metadata)
- Global search

---

## Development Workflow

### 1. Make Changes
Edit TypeScript files in `src/`

### 2. Auto-reload (Development)
```bash
npm run dev
# Server automatically reloads on file changes
```

### 3. Type Checking
```bash
npm run build
# Checks for TypeScript errors
```

### 4. View Logs
Logs are written to:
- Console (development)
- `logs/error.log` (errors only)
- `logs/combined.log` (all logs)

---

## Common Tasks

### Enable 2FA for a User

1. **Get 2FA QR code**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/2fa/enable \
  -H "Authorization: Bearer YOUR_TOKEN"
```

2. **Scan QR code with authenticator app**

3. **Verify with code**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/2fa/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456",
    "isInitialSetup": true
  }'
```

### Create a Chat

```bash
curl -X POST http://localhost:3000/api/v1/chats \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "group",
    "name": "My Group",
    "memberIds": ["user-uuid-1", "user-uuid-2"]
  }'
```

### Send a Message

```bash
curl -X POST http://localhost:3000/api/v1/chats/{chatId}/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "encryptedContent": "base64-encrypted-message",
    "type": "text"
  }'
```

### Search Users

```bash
curl "http://localhost:3000/api/v1/search/users?query=john&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Debugging

### Enable Debug Logs
```env
LOG_LEVEL=debug
```

### Check Database Connection
```bash
# In the application
curl http://localhost:3000/health
```

### Check Redis Connection
```bash
redis-cli ping
# Should return: PONG
```

### View Real-time Logs
```bash
tail -f logs/combined.log
```

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment (development/production) |
| `PORT` | `3000` | Server port |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `DB_POOL_SIZE` | `20` | Database connection pool size |
| `REDIS_URL` | - | Redis connection string |
| `JWT_SECRET` | - | Secret for JWT signing |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token expiry |
| `JWT_REFRESH_EXPIRY` | `30d` | Refresh token expiry |
| `BCRYPT_ROUNDS` | `12` | Bcrypt hashing rounds |
| `CORS_ORIGIN` | `*` | CORS allowed origins |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `LOG_LEVEL` | `info` | Logging level |

---

## Rate Limits

- **Global API**: 100 requests per 15 minutes per IP
- **Auth endpoints**: 5 requests per 15 minutes per IP

When rate limited, you'll receive:
```json
{
  "success": false,
  "error": {
    "message": "Too many requests",
    "statusCode": 429
  }
}
```

Headers in response:
- `X-RateLimit-Limit`: Maximum allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

---

## Troubleshooting

### "Connection refused" on startup
- **Check**: PostgreSQL is running on port 5432
- **Check**: Redis is running on port 6379

### "JWT secret not configured"
- **Solution**: Set `JWT_SECRET` in `.env`

### "Database migration failed"
- **Solution**: Run migrations from database package
```bash
cd packages/database
npm run migrate
```

### "Port already in use"
- **Solution**: Change `PORT` in `.env` or kill process on port 3000
```bash
lsof -ti:3000 | xargs kill -9
```

### TypeScript build errors
- **Solution**: Check for syntax errors
```bash
npm run build
```

---

## Next Steps

1. **Read the full API documentation**: `API_DOCUMENTATION.md`
2. **Understand implementation details**: `IMPLEMENTATION_SUMMARY.md`
3. **Set up WebSocket service** for real-time features
4. **Configure S3** for media uploads
5. **Set up email service** for verification emails
6. **Add monitoring** (Prometheus, Grafana)
7. **Write tests** (unit, integration, e2e)

---

## Support & Resources

- **API Documentation**: `API_DOCUMENTATION.md`
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`
- **Database Schema**: `../../packages/database/migrations/`
- **Type Definitions**: `../../packages/types/`

For questions or issues, refer to the main project documentation.
