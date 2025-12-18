# Auth API Examples

Complete examples for testing the Auth API endpoints with curl, Postman, or any HTTP client.

## Base URL

```
http://localhost:3000/api/v1/auth
```

## 1. Register User

### Request
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "phone": "+12345678901",
    "password": "SecurePass123",
    "deviceId": "my-device-123",
    "deviceName": "iPhone 14 Pro",
    "deviceType": "ios"
  }'
```

### Success Response (201 Created)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john_doe",
      "email": "john@example.com",
      "phone": "+12345678901",
      "createdAt": "2025-12-18T12:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### Error Response (409 Conflict)
```json
{
  "success": false,
  "error": {
    "message": "Username already exists",
    "statusCode": 409
  }
}
```

### Validation Error (400 Bad Request)
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "statusCode": 400,
    "errors": [
      {
        "field": "password",
        "message": "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      }
    ]
  }
}
```

## 2. Login User

### Request (with username)
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "SecurePass123",
    "deviceId": "my-device-123",
    "deviceName": "iPhone 14 Pro",
    "deviceType": "ios"
  }'
```

### Request (with email)
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123",
    "deviceId": "my-device-123",
    "deviceName": "iPhone 14 Pro",
    "deviceType": "ios"
  }'
```

### Request (with phone)
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+12345678901",
    "password": "SecurePass123",
    "deviceId": "my-device-123",
    "deviceName": "iPhone 14 Pro",
    "deviceType": "ios"
  }'
```

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john_doe",
      "email": "john@example.com",
      "phone": "+12345678901",
      "avatarUrl": "https://cdn.example.com/avatars/john.jpg",
      "bio": "Hey there! I'm using SUP Messenger.",
      "status": "online"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### Error Response (401 Unauthorized)
```json
{
  "success": false,
  "error": {
    "message": "Invalid credentials",
    "statusCode": 401
  }
}
```

### Rate Limit Error (429 Too Many Requests)
```json
{
  "success": false,
  "error": {
    "message": "Too many authentication attempts, please try again later",
    "statusCode": 429
  }
}
```

## 3. Get Current User (Protected)

### Request
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "email": "john@example.com",
    "phone": "+12345678901",
    "avatarUrl": "https://cdn.example.com/avatars/john.jpg",
    "bio": "Hey there! I'm using SUP Messenger.",
    "status": "online",
    "emailVerified": true,
    "phoneVerified": false,
    "twoFactorEnabled": false,
    "lastSeen": "2025-12-18T12:00:00.000Z",
    "createdAt": "2025-12-18T10:00:00.000Z",
    "updatedAt": "2025-12-18T12:00:00.000Z"
  }
}
```

### Error Response (401 Unauthorized)
```json
{
  "success": false,
  "error": {
    "message": "No token provided",
    "statusCode": 401
  }
}
```

### Error Response (401 Token Expired)
```json
{
  "success": false,
  "error": {
    "message": "Token expired",
    "statusCode": 401
  }
}
```

## 4. Refresh Token

### Request
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Error Response (401 Unauthorized)
```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired session",
    "statusCode": 401
  }
}
```

### Error Response (401 Blacklisted)
```json
{
  "success": false,
  "error": {
    "message": "Token has been revoked",
    "statusCode": 401
  }
}
```

## 5. Logout (Protected)

### Request
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## 6. Change Password (Protected) - Future

### Request
```bash
curl -X POST http://localhost:3000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "currentPassword": "SecurePass123",
    "newPassword": "NewSecurePass456",
    "confirmPassword": "NewSecurePass456"
  }'
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

## 7. Forgot Password - Future

### Request
```bash
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

## 8. Reset Password - Future

### Request
```bash
curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset-token-from-email",
    "newPassword": "NewSecurePass456"
  }'
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

## Testing Flow

### Complete Authentication Flow

```bash
# 1. Register a new user
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "email": "test@example.com",
    "password": "TestPass123",
    "deviceId": "test-device-1",
    "deviceName": "Test Device",
    "deviceType": "web"
  }')

# Extract tokens
ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.tokens.accessToken')
REFRESH_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.tokens.refreshToken')

echo "Access Token: $ACCESS_TOKEN"
echo "Refresh Token: $REFRESH_TOKEN"

# 2. Get current user
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 3. Refresh token (after access token expires)
REFRESH_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

# Extract new tokens
NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.data.accessToken')
NEW_REFRESH_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.data.refreshToken')

# 4. Logout
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
  -d "{\"refreshToken\": \"$NEW_REFRESH_TOKEN\"}"

# 5. Try to use old token (should fail)
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN"
```

## Postman Collection

Import this JSON into Postman:

```json
{
  "info": {
    "name": "SUP Messenger Auth API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Register",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"username\": \"john_doe\",\n  \"email\": \"john@example.com\",\n  \"password\": \"SecurePass123\",\n  \"deviceId\": \"postman-device\",\n  \"deviceName\": \"Postman\",\n  \"deviceType\": \"web\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/auth/register",
          "host": ["{{baseUrl}}"],
          "path": ["auth", "register"]
        }
      }
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"username\": \"john_doe\",\n  \"password\": \"SecurePass123\",\n  \"deviceId\": \"postman-device\",\n  \"deviceName\": \"Postman\",\n  \"deviceType\": \"web\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/auth/login",
          "host": ["{{baseUrl}}"],
          "path": ["auth", "login"]
        }
      }
    },
    {
      "name": "Get Me",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{accessToken}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/auth/me",
          "host": ["{{baseUrl}}"],
          "path": ["auth", "me"]
        }
      }
    },
    {
      "name": "Refresh Token",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"refreshToken\": \"{{refreshToken}}\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/auth/refresh",
          "host": ["{{baseUrl}}"],
          "path": ["auth", "refresh"]
        }
      }
    },
    {
      "name": "Logout",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{accessToken}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"refreshToken\": \"{{refreshToken}}\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/auth/logout",
          "host": ["{{baseUrl}}"],
          "path": ["auth", "logout"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api/v1"
    },
    {
      "key": "accessToken",
      "value": ""
    },
    {
      "key": "refreshToken",
      "value": ""
    }
  ]
}
```

## Common Error Scenarios

### 1. Missing Required Field
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "statusCode": 400,
    "errors": [
      {
        "field": "username",
        "message": "Username is required"
      }
    ]
  }
}
```

### 2. Invalid Email Format
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "statusCode": 400,
    "errors": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### 3. Weak Password
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "statusCode": 400,
    "errors": [
      {
        "field": "password",
        "message": "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      }
    ]
  }
}
```

### 4. Username Already Exists
```json
{
  "success": false,
  "error": {
    "message": "Username already exists",
    "statusCode": 409
  }
}
```

### 5. Invalid Credentials
```json
{
  "success": false,
  "error": {
    "message": "Invalid credentials",
    "statusCode": 401
  }
}
```

### 6. Expired Token
```json
{
  "success": false,
  "error": {
    "message": "Token expired",
    "statusCode": 401
  }
}
```

### 7. Rate Limit Exceeded
```json
{
  "success": false,
  "error": {
    "message": "Too many authentication attempts, please try again later",
    "statusCode": 429
  }
}
```

## Notes

- Replace `http://localhost:3000` with your actual API URL
- Access tokens expire after 15 minutes (default)
- Refresh tokens expire after 30 days (default)
- Rate limiting: 5 attempts per 15 minutes for auth endpoints
- All timestamps are in ISO 8601 format
- Phone numbers must be in E.164 format (+[country code][number])
