# SUP Messenger - Main API Service - Complete API Documentation

## Overview

The Main API Service is the core backend for SUP Messenger, providing all essential endpoints for user management, authentication, messaging, cryptography, stories, and search functionality.

**Base URL**: `http://localhost:3000/api/v1`

**Authentication**: Most endpoints require JWT Bearer token authentication via `Authorization: Bearer <token>` header.

---

## Table of Contents

1. [Authentication Module](#authentication-module)
2. [User Module](#user-module)
3. [Crypto Module](#crypto-module)
4. [Chat Module](#chat-module)
5. [Message Module](#message-module)
6. [Story Module](#story-module)
7. [Search Module](#search-module)

---

## Authentication Module

### 1. Register User
**POST** `/auth/register`

Register a new user with phone/email verification support.

**Request Body**:
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123",
  "deviceId": "device-uuid-123",
  "deviceName": "iPhone 14 Pro",
  "deviceType": "ios"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token"
    }
  }
}
```

---

### 2. Login User
**POST** `/auth/login`

Login with username, email, or phone.

**Request Body**:
```json
{
  "username": "john_doe",
  "password": "SecurePass123",
  "deviceId": "device-uuid-123",
  "deviceName": "iPhone 14 Pro",
  "deviceType": "ios"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "avatarUrl": "https://...",
      "bio": "Hello World",
      "status": "online"
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token"
    }
  }
}
```

---

### 3. Refresh Token
**POST** `/auth/refresh`

Refresh access token using refresh token.

**Request Body**:
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "accessToken": "new-jwt-access-token",
    "refreshToken": "new-jwt-refresh-token"
  }
}
```

---

### 4. Get Current User
**GET** `/auth/me`

Get current authenticated user profile.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "avatarUrl": "https://...",
    "bio": "Hello World",
    "status": "online",
    "emailVerified": true,
    "phoneVerified": true,
    "twoFactorEnabled": false,
    "lastSeen": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 5. Get User Sessions
**GET** `/auth/sessions`

Get all active sessions for current user.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "session-uuid",
      "deviceId": "device-uuid-123",
      "deviceName": "iPhone 14 Pro",
      "deviceType": "ios",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "lastActive": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "expiresAt": "2024-02-01T00:00:00.000Z"
    }
  ]
}
```

---

### 6. Revoke Session
**DELETE** `/auth/sessions/:sessionId`

Revoke a specific session.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

---

### 7. Revoke All Sessions
**POST** `/auth/sessions/revoke-all`

Revoke all sessions except current.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "message": "All other sessions revoked successfully"
}
```

---

### 8. Logout
**POST** `/auth/logout`

Logout user from current device.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 9. Change Password
**POST** `/auth/change-password`

Change user password.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "currentPassword": "OldPass123",
  "newPassword": "NewPass123",
  "confirmPassword": "NewPass123"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Password changed successfully. Please log in again."
}
```

---

### 10. Forgot Password
**POST** `/auth/forgot-password`

Request password reset token.

**Request Body**:
```json
{
  "email": "john@example.com"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Password reset token generated. Check your email.",
  "data": {
    "resetToken": "uuid-token"
  }
}
```

---

### 11. Reset Password
**POST** `/auth/reset-password`

Reset password with token.

**Request Body**:
```json
{
  "token": "uuid-token",
  "newPassword": "NewPass123"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Password reset successfully. Please log in with your new password."
}
```

---

### 12. Enable 2FA
**POST** `/auth/2fa/enable`

Generate 2FA secret and QR code.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "message": "Scan the QR code with your authenticator app and verify with a code",
  "data": {
    "secret": "BASE32ENCODEDSECRET",
    "qrCode": "data:image/png;base64,..."
  }
}
```

---

### 13. Verify 2FA Code
**POST** `/auth/2fa/verify`

Verify 2FA code (for initial setup or login).

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "code": "123456",
  "isInitialSetup": true
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "2FA enabled successfully"
}
```

---

### 14. Disable 2FA
**POST** `/auth/2fa/disable`

Disable 2FA for user.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "code": "123456"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

---

## User Module

### 1. Get User Profile
**GET** `/users/:userId`

Get user profile by ID.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "john_doe",
    "avatarUrl": "https://...",
    "bio": "Hello World",
    "status": "online",
    "lastSeen": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 2. Update User Profile
**PUT** `/users/me`

Update current user profile.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "username": "new_username",
  "bio": "Updated bio",
  "avatarUrl": "https://..."
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "new_username",
    "email": "john@example.com",
    "bio": "Updated bio",
    "avatarUrl": "https://...",
    "status": "online"
  }
}
```

---

### 3. Search Users
**GET** `/users/search?query=john&limit=20&offset=0`

Search users by username.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `query`: Search query (min 2 characters)
- `limit`: Results per page (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "username": "john_doe",
        "avatarUrl": "https://...",
        "bio": "Hello World",
        "status": "online"
      }
    ],
    "total": 42
  }
}
```

---

### 4. Get Contacts
**GET** `/users/me/contacts`

Get user's contacts list.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "userId": "uuid",
      "contactUserId": "contact-uuid",
      "displayName": "John Doe",
      "addedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 5. Add Contact
**POST** `/users/me/contacts`

Add a user to contacts.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "contactUserId": "user-uuid",
  "displayName": "John Doe"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "contactUserId": "contact-uuid",
    "displayName": "John Doe",
    "addedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 6. Remove Contact
**DELETE** `/users/me/contacts/:contactUserId`

Remove a user from contacts.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "message": "Contact removed successfully"
}
```

---

### 7. Block User
**POST** `/users/me/blocked`

Block a user.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "blockedUserId": "user-uuid"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "User blocked successfully"
}
```

---

### 8. Unblock User
**DELETE** `/users/me/blocked/:blockedUserId`

Unblock a user.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "message": "User unblocked successfully"
}
```

---

### 9. Get Blocked Users
**GET** `/users/me/blocked`

Get list of blocked users.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "blocked_user",
      "avatarUrl": "https://...",
      "bio": "...",
      "status": "offline"
    }
  ]
}
```

---

### 10. Update Status
**POST** `/users/me/status`

Update user online status.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "status": "online"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Status updated successfully"
}
```

---

## Crypto Module (Signal Protocol)

### 1. Register Keys
**POST** `/crypto/keys`

Register identity key, signed prekey, and one-time prekeys.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "deviceId": "device-uuid",
  "identityKey": "base64-encoded-identity-key",
  "signedPreKey": {
    "keyId": 1,
    "publicKey": "base64-encoded-public-key",
    "signature": "base64-encoded-signature"
  },
  "oneTimePreKeys": [
    {
      "keyId": 1,
      "publicKey": "base64-encoded-public-key"
    }
  ]
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "success": true,
    "registeredOneTimePreKeys": 100
  }
}
```

---

### 2. Get PreKey Bundle
**POST** `/crypto/prekey-bundle`

Get prekey bundle for initiating X3DH handshake.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "userId": "target-user-uuid",
  "deviceId": "target-device-uuid"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "userId": "target-user-uuid",
    "deviceId": "target-device-uuid",
    "bundle": {
      "identityKey": "base64-encoded",
      "signedPreKey": {
        "keyId": 1,
        "publicKey": "base64-encoded",
        "signature": "base64-encoded"
      },
      "oneTimePreKey": {
        "keyId": 42,
        "publicKey": "base64-encoded"
      }
    }
  }
}
```

---

### 3. Get Identity Key
**GET** `/crypto/identity-key/:userId/:deviceId`

Get identity key for a specific device.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "deviceId": "device-uuid",
    "identityKey": "base64-encoded",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 4. Refresh Signed PreKey
**PUT** `/crypto/signed-prekey`

Refresh signed prekey for forward secrecy.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "deviceId": "device-uuid",
  "signedPreKey": {
    "keyId": 2,
    "publicKey": "base64-encoded-public-key",
    "signature": "base64-encoded-signature"
  }
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Signed prekey refreshed successfully"
}
```

---

### 5. Generate One-Time PreKeys
**POST** `/crypto/one-time-prekeys`

Upload new one-time prekeys.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "deviceId": "device-uuid",
  "oneTimePreKeys": [
    {
      "keyId": 101,
      "publicKey": "base64-encoded-public-key"
    }
  ],
  "count": 100
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "success": true,
    "registeredCount": 100
  }
}
```

---

### 6. Get One-Time PreKeys Count
**GET** `/crypto/one-time-prekeys/count`

Get count of remaining unused one-time prekeys.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `deviceId`: Device ID

**Response** (200):
```json
{
  "success": true,
  "data": {
    "count": 87
  }
}
```

---

## Chat Module

### 1. Create Chat
**POST** `/chats`

Create a new chat (direct, group, or channel).

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "type": "group",
  "name": "My Group",
  "description": "Group description",
  "memberIds": ["user-uuid-1", "user-uuid-2"],
  "isPublic": false
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "chat": {
      "id": "chat-uuid",
      "type": "group",
      "name": "My Group",
      "description": "Group description",
      "avatarUrl": null,
      "createdBy": "creator-uuid",
      "isPublic": false,
      "inviteLink": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "members": [
      {
        "chatId": "chat-uuid",
        "userId": "user-uuid",
        "roleId": "role-uuid",
        "joinedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### 2. Get Chat
**GET** `/chats/:chatId`

Get chat details.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "chat-uuid",
    "type": "group",
    "name": "My Group",
    "description": "Group description",
    "avatarUrl": "https://...",
    "createdBy": "creator-uuid",
    "isPublic": false,
    "inviteLink": "invite-code",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 3. Update Chat
**PUT** `/chats/:chatId`

Update chat details (admins/owners only).

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Updated Group Name",
  "description": "Updated description",
  "avatarUrl": "https://...",
  "isPublic": true
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "chat-uuid",
    "type": "group",
    "name": "Updated Group Name",
    ...
  }
}
```

---

### 4. Delete Chat
**DELETE** `/chats/:chatId`

Delete chat (owner only).

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "message": "Chat deleted successfully"
}
```

---

### 5. Get User Chats
**GET** `/chats?limit=50&offset=0`

Get all chats for current user.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `limit`: Results per page (default: 50, max: 100)
- `offset`: Pagination offset

**Response** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "chat-uuid",
        "type": "direct",
        "name": null,
        "description": null,
        ...
      }
    ],
    "total": 42,
    "hasMore": true,
    "nextCursor": "50"
  }
}
```

---

### 6. Add Member
**POST** `/chats/:chatId/members`

Add member to chat.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "userId": "new-member-uuid",
  "roleId": "role-uuid"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "chatId": "chat-uuid",
    "userId": "new-member-uuid",
    "roleId": "role-uuid",
    "joinedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 7. Remove Member
**DELETE** `/chats/:chatId/members/:userId`

Remove member from chat.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

---

### 8. Get Chat Members
**GET** `/chats/:chatId/members`

Get all members of a chat.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "chatId": "chat-uuid",
      "userId": "user-uuid",
      "roleId": "role-uuid",
      "joinedAt": "2024-01-01T00:00:00.000Z",
      "leftAt": null,
      "invitedBy": "inviter-uuid"
    }
  ]
}
```

---

### 9. Leave Chat
**POST** `/chats/:chatId/leave`

Leave a chat.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "message": "Left chat successfully"
}
```

---

### 10. Generate Invite Link
**POST** `/chats/:chatId/invite-link`

Generate invite link for chat.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "inviteLink": "unique-invite-code"
  }
}
```

---

### 11. Join by Invite Link
**POST** `/chats/join`

Join chat using invite link.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "inviteLink": "unique-invite-code"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "chat-uuid",
    "type": "group",
    ...
  }
}
```

---

## Message Module

### 1. Send Message
**POST** `/chats/:chatId/messages`

Send a message to a chat.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "encryptedContent": "base64-encrypted-content",
  "type": "text",
  "replyToId": "message-uuid",
  "forwardFromId": "message-uuid",
  "recipientDeviceIds": {
    "user-uuid-1": ["device-1", "device-2"],
    "user-uuid-2": ["device-3"]
  }
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "message": {
      "id": "message-uuid",
      "chatId": "chat-uuid",
      "senderId": "sender-uuid",
      "senderDeviceId": "device-uuid",
      "encryptedContent": "base64-encrypted-content",
      "type": "text",
      "replyToId": null,
      "forwardFromId": null,
      "editedAt": null,
      "deletedAt": null,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "recipients": [
      {
        "messageId": "message-uuid",
        "userId": "recipient-uuid",
        "deviceId": "device-uuid",
        "deliveredAt": null,
        "readAt": null
      }
    ]
  }
}
```

---

### 2. Get Messages
**GET** `/chats/:chatId/messages?cursor=timestamp&limit=50`

Get messages for a chat (cursor-based pagination).

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `cursor`: Timestamp cursor for pagination
- `limit`: Messages per page (default: 50)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "message-uuid",
        "chatId": "chat-uuid",
        "senderId": "sender-uuid",
        "encryptedContent": "base64-encrypted-content",
        "type": "text",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "nextCursor": "2024-01-01T00:00:00.000Z",
    "hasMore": true
  }
}
```

---

### 3. Get Message
**GET** `/messages/:id`

Get a single message by ID.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "message-uuid",
    "chatId": "chat-uuid",
    "senderId": "sender-uuid",
    "encryptedContent": "base64-encrypted-content",
    "type": "text",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 4. Edit Message
**PUT** `/messages/:id`

Edit a message (within 48 hours).

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "encryptedContent": "base64-new-encrypted-content"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "message-uuid",
    "encryptedContent": "base64-new-encrypted-content",
    "editedAt": "2024-01-01T01:00:00.000Z",
    ...
  }
}
```

---

### 5. Delete Message
**DELETE** `/messages/:id`

Delete a message.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "forEveryone": false
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

---

### 6. Mark as Delivered
**POST** `/messages/:id/delivered`

Mark message as delivered.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "message": "Message marked as delivered"
}
```

---

### 7. Mark as Read
**POST** `/messages/read`

Mark multiple messages as read.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "messageIds": ["msg-uuid-1", "msg-uuid-2"]
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Messages marked as read"
}
```

---

### 8. Add Reaction
**POST** `/messages/:id/reactions`

Add emoji reaction to message.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "emoji": "👍"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "reaction-uuid",
    "messageId": "message-uuid",
    "userId": "user-uuid",
    "emoji": "👍",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 9. Remove Reaction
**DELETE** `/messages/:id/reactions/:emoji`

Remove emoji reaction from message.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "message": "Reaction removed successfully"
}
```

---

### 10. Get Reactions
**GET** `/messages/:id/reactions`

Get all reactions for a message.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "reaction-uuid",
      "messageId": "message-uuid",
      "userId": "user-uuid",
      "emoji": "👍",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 11. Get Unread Count
**GET** `/messages/unread`

Get unread message count for current user.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "count": 42
  }
}
```

---

## Story Module

### 1. Create Story
**POST** `/stories`

Create a 24-hour story.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "mediaType": "image",
  "s3Key": "stories/uuid/image.jpg",
  "captionEncrypted": "base64-encrypted-caption",
  "privacy": "contacts",
  "allowedUserIds": ["user-uuid-1", "user-uuid-2"]
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "story-uuid",
    "userId": "creator-uuid",
    "mediaType": "image",
    "s3Key": "stories/uuid/image.jpg",
    "captionEncrypted": "base64-encrypted-caption",
    "privacy": "contacts",
    "expiresAt": "2024-01-02T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 2. Get My Stories
**GET** `/stories/me`

Get stories created by current user.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "story-uuid",
      "userId": "user-uuid",
      "mediaType": "image",
      "s3Key": "stories/uuid/image.jpg",
      "privacy": "contacts",
      "viewsCount": 42,
      "expiresAt": "2024-01-02T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 3. Get Friends Stories
**GET** `/stories`

Get stories from contacts (feed).

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "userId": "friend-uuid",
      "username": "friend_user",
      "avatarUrl": "https://...",
      "stories": [
        {
          "id": "story-uuid",
          "userId": "friend-uuid",
          "mediaType": "image",
          "s3Key": "stories/uuid/image.jpg",
          "privacy": "contacts",
          "viewsCount": 15,
          "hasViewed": false,
          "expiresAt": "2024-01-02T00:00:00.000Z",
          "createdAt": "2024-01-01T00:00:00.000Z"
        }
      ],
      "hasUnviewed": true
    }
  ]
}
```

---

### 4. Get Story
**GET** `/stories/:storyId`

Get a specific story.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "story-uuid",
    "userId": "creator-uuid",
    "mediaType": "image",
    "s3Key": "stories/uuid/image.jpg",
    "captionEncrypted": "base64-encrypted-caption",
    "privacy": "contacts",
    "viewsCount": 42,
    "hasViewed": true,
    "expiresAt": "2024-01-02T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 5. Delete Story
**DELETE** `/stories/:storyId`

Delete a story (owner only).

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "message": "Story deleted successfully"
}
```

---

### 6. View Story
**POST** `/stories/:storyId/view`

Record story view.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "message": "Story view recorded"
}
```

---

### 7. Get Story Views
**GET** `/stories/:storyId/views`

Get viewers of a story (owner only).

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "viewerId": "viewer-uuid",
      "username": "viewer_user",
      "avatarUrl": "https://...",
      "viewedAt": "2024-01-01T00:30:00.000Z"
    }
  ]
}
```

---

## Search Module

### 1. Search Users
**GET** `/search/users?query=john&limit=20&offset=0`

Search users with full-text search.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `query`: Search query (min 2 characters)
- `limit`: Results per page (default: 20)
- `offset`: Pagination offset (default: 0)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-uuid",
        "username": "john_doe",
        "email": "john@example.com",
        "avatarUrl": "https://...",
        "bio": "Hello World",
        "status": "online"
      }
    ],
    "total": 42
  }
}
```

---

### 2. Search Chats
**GET** `/search/chats?query=group&limit=20`

Search user's chats.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `query`: Search query (min 2 characters)
- `limit`: Results per page (default: 20)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "chats": [
      {
        "id": "chat-uuid",
        "type": "group",
        "name": "My Group",
        "description": "Group description",
        "avatarUrl": "https://...",
        "lastMessageAt": "2024-01-01T00:00:00.000Z",
        "membersCount": 15
      }
    ],
    "total": 5
  }
}
```

---

### 3. Search Messages
**GET** `/search/messages?query=hello&chatId=chat-uuid&limit=50`

Search messages (metadata only, content is encrypted).

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `query`: Search query (min 2 characters)
- `chatId`: Optional chat ID to search within
- `limit`: Results per page (default: 50)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "message-uuid",
        "chatId": "chat-uuid",
        "senderId": "sender-uuid",
        "senderUsername": "john_doe",
        "type": "text",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "chatName": "My Group"
      }
    ],
    "total": 10
  }
}
```

---

### 4. Global Search
**GET** `/search?query=john&type=users&limit=10`

Combined search across users, chats, and messages.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `query`: Search query (min 2 characters)
- `type`: Optional filter (`users`, `chats`, `messages`)
- `limit`: Results per type (default: 10)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "users": [...],
    "chats": [...],
    "messages": [...],
    "total": 57
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "statusCode": 400,
    "details": [
      {
        "field": "username",
        "message": "Username is required"
      }
    ]
  }
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## Rate Limiting

- **Global API Rate Limit**: 100 requests per 15 minutes per IP
- **Auth Endpoints Rate Limit**: 5 requests per 15 minutes per IP
- Rate limit headers are included in responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets

---

## Security Features

1. **JWT Authentication**: Access tokens (15 min) + Refresh tokens (30 days)
2. **2FA Support**: TOTP-based two-factor authentication
3. **Rate Limiting**: Protection against abuse
4. **Password Hashing**: bcrypt with configurable rounds
5. **SQL Injection Prevention**: Parameterized queries
6. **CORS Configuration**: Configurable cross-origin policies
7. **Helmet Security**: Security headers via Helmet.js
8. **Session Management**: Multi-device support with session tracking
9. **Token Blacklisting**: Redis-based token revocation

---

## Database Transactions

All multi-step operations use database transactions to ensure data consistency:
- User registration (user + device creation)
- Chat creation (chat + members + roles)
- Message sending (message + recipients)
- Key registration (identity + signed prekey + one-time prekeys)

---

## WebSocket Integration

While this API provides RESTful endpoints, real-time features are handled by the WebSocket service:
- Real-time message delivery
- Typing indicators
- Online status updates
- Read receipts

The Main API Service coordinates with the WebSocket service for event publishing.

---

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Run migrations
npm run migrate

# Rollback migrations
npm run migrate:rollback
```

---

## Environment Variables

See `.env.example` for required environment variables:
- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_ACCESS_EXPIRY`
- `JWT_REFRESH_EXPIRY`
- `BCRYPT_ROUNDS`
- `CORS_ORIGIN`

---

## Support

For issues or questions, please refer to the main project documentation or contact the development team.
