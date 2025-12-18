# User Module

Production-ready user management module for SUP messenger with comprehensive profile, contact, and privacy features.

## Features

### Profile Management
- Get user profile (public and private views)
- Update profile information (username, email, phone, bio)
- Update avatar
- Update online status (online/offline/away)

### Contact Management
- Get user contacts
- Add contact with optional display name
- Remove contact
- Search users by username

### Privacy & Blocking
- Block users (prevents viewing profile and sending messages)
- Unblock users
- Get list of blocked users
- Privacy checks in all operations

## API Endpoints

All endpoints require authentication via Bearer token in the Authorization header.

### Current User

#### GET `/api/v1/users/me`
Get current authenticated user's full profile.

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
    "bio": "Hello!",
    "status": "online",
    "lastSeen": "2025-01-01T12:00:00Z",
    "emailVerified": true,
    "phoneVerified": true,
    "twoFactorEnabled": false,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T12:00:00Z"
  }
}
```

#### PUT `/api/v1/users/me`
Update current user's profile.

**Request Body:**
```json
{
  "username": "new_username",
  "email": "new@example.com",
  "phone": "+9876543210",
  "bio": "New bio"
}
```

**Validation:**
- `username`: 3-50 characters, alphanumeric with dots, hyphens, underscores
- `email`: Valid email format
- `phone`: E.164 format (e.g., +1234567890)
- `bio`: Max 200 characters
- At least one field must be provided

**Notes:**
- Changing email/phone resets verification status
- Username, email, and phone must be unique

#### PATCH `/api/v1/users/me/avatar`
Update current user's avatar.

**Request Body:**
```json
{
  "avatarUrl": "https://cdn.example.com/avatar.jpg"
}
```

#### PATCH `/api/v1/users/me/status`
Update current user's online status.

**Request Body:**
```json
{
  "status": "online"
}
```

**Valid statuses:** `online`, `offline`, `away`

### User Profiles

#### GET `/api/v1/users/:id`
Get public profile of any user by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "jane_doe",
    "avatarUrl": "https://...",
    "bio": "Hello!",
    "status": "online",
    "lastSeen": "2025-01-01T12:00:00Z"
  }
}
```

**Privacy:**
- Returns 403 if user is blocked (either direction)
- Only shows public profile information

### Search

#### POST `/api/v1/users/search`
Search users by username.

**Request Body:**
```json
{
  "query": "john",
  "limit": 20,
  "offset": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [...],
    "total": 42,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

**Features:**
- Searches only by username (not email/phone for privacy)
- Excludes blocked users (both directions)
- Excludes current user from results
- Prioritizes exact matches at the start of username
- Paginated results (max 100 per page)

### Contacts

#### GET `/api/v1/users/contacts`
Get current user's contact list.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "userId": "uuid",
      "contactUserId": "uuid",
      "displayName": "John",
      "addedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### POST `/api/v1/users/contacts`
Add a user to contacts.

**Request Body:**
```json
{
  "contactUserId": "uuid",
  "displayName": "John"
}
```

**Validation:**
- `contactUserId`: Valid UUID
- `displayName`: Optional, 1-100 characters

**Errors:**
- 400: Cannot add yourself as contact
- 404: Contact user not found
- 403: Cannot add blocked user
- 409: User already in contacts

#### DELETE `/api/v1/users/contacts/:contactId`
Remove a user from contacts.

### Blocking

#### POST `/api/v1/users/block`
Block a user.

**Request Body:**
```json
{
  "blockedUserId": "uuid"
}
```

**Effects:**
- Prevents both users from viewing each other's profiles
- Prevents sending messages
- Automatically removes from contacts
- Blocks in both directions for privacy

**Errors:**
- 400: Cannot block yourself
- 404: User not found
- 409: User already blocked

#### DELETE `/api/v1/users/block/:blockedUserId`
Unblock a user.

**Errors:**
- 404: User is not blocked

#### GET `/api/v1/users/blocked`
Get list of blocked users.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "blocked_user",
      "avatarUrl": "https://...",
      "bio": "...",
      "status": "offline",
      "lastSeen": "2025-01-01T00:00:00Z"
    }
  ]
}
```

## Database Schema

### Users Table
```sql
- id (UUID, PK)
- username (VARCHAR, UNIQUE, NOT NULL)
- email (VARCHAR, UNIQUE)
- phone (VARCHAR, UNIQUE)
- password_hash (VARCHAR, NOT NULL)
- avatar_url (TEXT)
- bio (TEXT)
- status (ENUM: online/offline/away)
- last_seen (TIMESTAMP)
- email_verified (BOOLEAN)
- phone_verified (BOOLEAN)
- two_factor_enabled (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- deleted_at (TIMESTAMP)
```

### Contacts Table
```sql
- user_id (UUID, FK, PK)
- contact_user_id (UUID, FK, PK)
- display_name (VARCHAR)
- added_at (TIMESTAMP)
```

### Blocked Users Table
```sql
- user_id (UUID, FK, PK)
- blocked_user_id (UUID, FK, PK)
- blocked_at (TIMESTAMP)
```

## Service Methods

### UserService

```typescript
// Get user data
getUserById(userId: string): Promise<User | null>
getUserByUsername(username: string): Promise<User | null>
getUserProfile(userId: string, requesterId: string): Promise<UserProfile | null>

// Update user
updateUser(userId: string, data: UpdateUserRequest): Promise<User>
updateAvatar(userId: string, avatarUrl: string): Promise<User>
updateStatus(userId: string, status: UserStatus): Promise<void>

// Search
searchUsers(query: string, requesterId: string, limit?: number, offset?: number): Promise<{users: UserProfile[], total: number}>

// Contacts
getContacts(userId: string): Promise<Contact[]>
addContact(userId: string, contactUserId: string, displayName?: string): Promise<Contact>
removeContact(userId: string, contactUserId: string): Promise<void>

// Blocking
blockUser(userId: string, blockedUserId: string): Promise<void>
unblockUser(userId: string, blockedUserId: string): Promise<void>
getBlockedUsers(userId: string): Promise<UserProfile[]>
```

## Validation

All input is validated using Zod schemas:

- **Username**: 3-50 chars, alphanumeric + dots/hyphens/underscores, must start/end with alphanumeric
- **Email**: Valid email format
- **Phone**: E.164 format (+1234567890)
- **Bio**: Max 200 characters
- **Display Name**: 1-100 characters
- **Search Query**: 1-50 characters
- **Limit**: 1-100 (default 20)
- **Offset**: ≥0 (default 0)

## Error Handling

All errors follow the standard API error format:

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

### Common Error Codes

- **400**: Bad request (validation failed)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (blocked user, insufficient permissions)
- **404**: Not found (user, contact, etc.)
- **409**: Conflict (duplicate username/email/phone, already in contacts, already blocked)
- **500**: Internal server error

## Logging

All operations are logged with appropriate context:

```typescript
logger.info('User profile updated', { userId });
logger.error('Error getting user by ID:', { userId, error });
```

## Security Features

1. **Authentication**: All endpoints require valid JWT access token
2. **Privacy**: Blocked users cannot view each other's profiles
3. **Validation**: Strict input validation on all fields
4. **Data Sanitization**: No sensitive data (password, 2FA secret) in responses
5. **Rate Limiting**: Applied via API-level middleware
6. **Logging**: All operations logged for audit trail

## Performance Considerations

- **Database Indexes**: Username, email, phone, status
- **Pagination**: Search results limited to 100 per page
- **Efficient Queries**: Optimized SQL with proper joins
- **Privacy Checks**: Efficient blocking checks with EXISTS clauses

## Usage Example

```typescript
import { userService } from './modules/user';

// Get user
const user = await userService.getUserById('uuid');

// Update profile
const updated = await userService.updateUser('uuid', {
  username: 'new_username',
  bio: 'New bio'
});

// Search users
const results = await userService.searchUsers('john', 'requesterId', 20, 0);

// Add contact
await userService.addContact('userId', 'contactId', 'John Doe');

// Block user
await userService.blockUser('userId', 'blockedUserId');
```

## Future Enhancements

- User presence/typing indicators
- Custom privacy settings
- Profile visibility controls
- Mutual contacts feature
- User verification badges
- Profile analytics
