# SUP Messenger - Database Schema Documentation

## Overview

PostgreSQL 16 database with complete schema for a secure messaging platform with Signal Protocol encryption, stories, calls, and media support.

## Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CORE TABLES                                │
└─────────────────────────────────────────────────────────────────────┘

users (UUID)
├── username (unique)
├── email (unique, optional)
├── phone (unique, optional)
├── password_hash
├── avatar_url
├── bio
├── status (online/offline/away)
├── last_seen
└── settings (2FA, verification)

user_devices (UUID)
├── user_id → users.id
├── device_id (unique)
├── device_name
├── push_token
└── public_key

sessions (UUID)
├── user_id → users.id
├── device_id → user_devices.device_id
├── refresh_token_hash
├── ip_address
└── expires_at

contacts (composite PK)
├── user_id → users.id
├── contact_user_id → users.id
└── display_name

blocked_users (composite PK)
├── user_id → users.id
└── blocked_user_id → users.id

┌─────────────────────────────────────────────────────────────────────┐
│                      CRYPTOGRAPHY TABLES                             │
└─────────────────────────────────────────────────────────────────────┘

identity_keys (composite PK)
├── user_id → users.id
├── device_id → user_devices.device_id
└── identity_key (Signal Protocol)

signed_prekeys (SERIAL)
├── user_id → users.id
├── device_id → user_devices.device_id
├── key_id
├── public_key
└── signature

one_time_prekeys (SERIAL)
├── user_id → users.id
├── device_id → user_devices.device_id
├── key_id
├── public_key
├── used (boolean)
└── used_at

sessions_crypto (UUID)
├── local_user_id → users.id
├── local_device_id
├── remote_user_id → users.id
├── remote_device_id
└── session_record (encrypted)

group_sender_keys (UUID)
├── chat_id → chats.id
├── user_id → users.id
├── device_id
├── distribution_id
└── chain_key_encrypted

┌─────────────────────────────────────────────────────────────────────┐
│                         CHAT TABLES                                  │
└─────────────────────────────────────────────────────────────────────┘

chats (UUID)
├── type (direct/group/channel)
├── name (required for groups)
├── description
├── avatar_url
├── created_by → users.id
├── is_public
└── invite_link

chat_roles (UUID)
├── chat_id → chats.id
├── name
├── permissions (JSONB)
├── color
└── is_default

chat_members (composite PK)
├── chat_id → chats.id
├── user_id → users.id
├── role_id → chat_roles.id
├── joined_at
└── left_at

chat_settings (composite PK)
├── user_id → users.id
├── chat_id → chats.id
├── is_muted
├── is_pinned
├── is_archived
└── notifications_enabled

┌─────────────────────────────────────────────────────────────────────┐
│                       MESSAGE TABLES                                 │
└─────────────────────────────────────────────────────────────────────┘

messages (UUID)
├── chat_id → chats.id
├── sender_id → users.id
├── sender_device_id
├── encrypted_content
├── type (text/image/video/audio/file/voice/sticker)
├── reply_to_id → messages.id
├── forward_from_id → messages.id
├── edited_at
└── deleted_at

message_recipients (composite PK)
├── message_id → messages.id
├── user_id → users.id
├── device_id
├── delivered_at
└── read_at

message_reads (composite PK)
├── message_id → messages.id
├── user_id → users.id
└── read_at

message_reactions (UUID)
├── message_id → messages.id
├── user_id → users.id
└── emoji

message_edits (UUID)
├── message_id → messages.id
├── previous_content_encrypted
└── edited_at

┌─────────────────────────────────────────────────────────────────────┐
│                        MEDIA TABLES                                  │
└─────────────────────────────────────────────────────────────────────┘

media_files (UUID)
├── message_id → messages.id
├── file_type
├── mime_type
├── size_bytes
├── width/height (for images/videos)
├── duration_seconds (for audio/video)
├── s3_key
├── thumbnail_s3_key
└── encryption_key_encrypted

sticker_packs (UUID)
├── name
├── author
├── thumbnail_url
├── is_default
└── is_animated

stickers (UUID)
├── pack_id → sticker_packs.id
├── emoji
├── s3_key
└── order_index

user_sticker_packs (composite PK)
├── user_id → users.id
└── pack_id → sticker_packs.id

┌─────────────────────────────────────────────────────────────────────┐
│                        STORY TABLES                                  │
└─────────────────────────────────────────────────────────────────────┘

stories (UUID)
├── user_id → users.id
├── media_type (image/video/text)
├── s3_key
├── caption_encrypted
├── background_color
├── duration_seconds
└── expires_at (24h)

story_views (composite PK)
├── story_id → stories.id
├── viewer_id → users.id
└── viewed_at

story_privacy_lists (composite PK)
├── story_id → stories.id
└── allowed_user_id → users.id

┌─────────────────────────────────────────────────────────────────────┐
│                         CALL TABLES                                  │
└─────────────────────────────────────────────────────────────────────┘

calls (UUID)
├── chat_id → chats.id
├── initiator_id → users.id
├── type (audio/video)
├── status (initiated/ringing/connected/ended/missed/rejected/failed)
├── started_at
├── connected_at
├── ended_at
├── duration_seconds
└── livekit_room_name

call_participants (composite PK)
├── call_id → calls.id
├── user_id → users.id
├── joined_at
├── left_at
├── is_video_enabled
└── is_audio_enabled
```

## Table Details

### users
**Purpose:** User accounts and authentication

**Key Columns:**
- `id` (UUID, PK) - Unique user identifier
- `username` (VARCHAR(50), UNIQUE, NOT NULL) - Unique username
- `email` (VARCHAR(255), UNIQUE) - Email address
- `phone` (VARCHAR(20), UNIQUE) - Phone number
- `password_hash` (VARCHAR(255), NOT NULL) - Bcrypt hashed password
- `status` (ENUM) - Online status
- `two_factor_enabled` (BOOLEAN) - 2FA status

**Constraints:**
- At least one of `email` or `phone` must be set
- Soft delete support via `deleted_at`

**Indexes:**
- `idx_users_username` - Username lookup
- `idx_users_email` - Email lookup
- `idx_users_phone` - Phone lookup
- `idx_users_status` - Online status filtering

---

### user_devices
**Purpose:** Multi-device support for users

**Key Columns:**
- `id` (UUID, PK) - Device identifier
- `user_id` (UUID, FK → users) - Owner
- `device_id` (VARCHAR(100), UNIQUE) - Device unique ID
- `device_name` (VARCHAR(100)) - Friendly device name
- `push_token` (TEXT) - FCM/APNS token

**Constraints:**
- Unique combination of `user_id` and `device_id`

---

### sessions
**Purpose:** Session management with refresh tokens

**Key Columns:**
- `id` (UUID, PK) - Session identifier
- `user_id` (UUID, FK → users)
- `device_id` (VARCHAR(100), FK → user_devices)
- `refresh_token_hash` (VARCHAR(255), UNIQUE) - Hashed refresh token
- `expires_at` (TIMESTAMP) - Expiration time

**Indexes:**
- `idx_sessions_user_id` - User sessions lookup
- `idx_sessions_expires_at` - Cleanup expired sessions

---

### identity_keys
**Purpose:** Signal Protocol identity keys per device

**Key Columns:**
- `user_id` (UUID, FK → users)
- `device_id` (VARCHAR(100), FK → user_devices)
- `identity_key` (TEXT) - Base64 encoded identity key

**Constraints:**
- Composite primary key: (user_id, device_id)

---

### one_time_prekeys
**Purpose:** One-time prekey pool for Signal Protocol

**Key Columns:**
- `user_id` (UUID, FK → users)
- `device_id` (VARCHAR(100), FK → user_devices)
- `key_id` (INTEGER) - Sequential key ID
- `public_key` (TEXT) - Base64 encoded key
- `used` (BOOLEAN) - Whether key has been consumed

**Indexes:**
- `idx_one_time_prekeys_unused` - Find unused keys quickly

**Notes:**
- Pool should maintain ~100 unused keys per device
- Refill when count drops below 20

---

### sessions_crypto
**Purpose:** Established Signal Protocol sessions

**Key Columns:**
- `local_user_id` (UUID, FK → users)
- `local_device_id` (VARCHAR(100))
- `remote_user_id` (UUID, FK → users)
- `remote_device_id` (VARCHAR(100))
- `session_record` (TEXT) - Serialized session state

**Constraints:**
- Unique combination of local and remote user/device pairs

---

### chats
**Purpose:** Conversations (direct, group, channel)

**Key Columns:**
- `id` (UUID, PK) - Chat identifier
- `type` (ENUM: direct/group/channel) - Chat type
- `name` (VARCHAR(100)) - Chat name (required for groups)
- `is_public` (BOOLEAN) - Public channel flag
- `invite_link` (VARCHAR(100), UNIQUE) - Invite link for groups

**Constraints:**
- Groups and channels must have a name
- Soft delete support

**Indexes:**
- `idx_chats_type` - Filter by chat type
- `idx_chats_created_by` - Find chats created by user

---

### chat_members
**Purpose:** Chat participants and membership

**Key Columns:**
- `chat_id` (UUID, FK → chats)
- `user_id` (UUID, FK → users)
- `role_id` (UUID, FK → chat_roles)
- `joined_at` (TIMESTAMP)
- `left_at` (TIMESTAMP) - Leave timestamp

**Indexes:**
- `idx_chat_members_user_id` - User's chats
- `idx_chat_members_chat_id` - Chat members

---

### chat_settings
**Purpose:** Per-user chat settings

**Key Columns:**
- `user_id` (UUID, FK → users)
- `chat_id` (UUID, FK → chats)
- `is_muted` (BOOLEAN) - Mute notifications
- `is_pinned` (BOOLEAN) - Pin chat
- `is_archived` (BOOLEAN) - Archive chat

**Indexes:**
- `idx_chat_settings_pinned` - Find pinned chats
- `idx_chat_settings_archived` - Find archived chats

---

### messages
**Purpose:** All messages with encryption metadata

**Key Columns:**
- `id` (UUID, PK) - Message identifier
- `chat_id` (UUID, FK → chats)
- `sender_id` (UUID, FK → users)
- `encrypted_content` (TEXT) - Encrypted message content
- `type` (ENUM) - Message type
- `reply_to_id` (UUID, FK → messages) - Replied message
- `edited_at` (TIMESTAMP) - Last edit time

**Indexes:**
- `idx_messages_chat_created` - Messages in chat ordered by time
- `idx_messages_sender` - Messages by sender

**Notes:**
- Content is always encrypted
- Supports replies and forwards
- Soft delete preserves message in DB

---

### message_reactions
**Purpose:** Emoji reactions to messages

**Key Columns:**
- `message_id` (UUID, FK → messages)
- `user_id` (UUID, FK → users)
- `emoji` (VARCHAR(10)) - Emoji character

**Constraints:**
- One user can only react with same emoji once per message

---

### message_edits
**Purpose:** Message edit history

**Key Columns:**
- `message_id` (UUID, FK → messages)
- `previous_content_encrypted` (TEXT) - Previous encrypted content
- `edited_at` (TIMESTAMP) - When edit occurred

**Notes:**
- Maintains edit history for transparency
- All content encrypted

---

### message_reads
**Purpose:** Read receipts

**Key Columns:**
- `message_id` (UUID, FK → messages)
- `user_id` (UUID, FK → users)
- `read_at` (TIMESTAMP) - When message was read

**Indexes:**
- `idx_message_reads_user` - User's read messages
- `idx_message_reads_message` - Who read a message

---

### media_files
**Purpose:** Media attachments metadata

**Key Columns:**
- `message_id` (UUID, FK → messages)
- `file_type` (VARCHAR(50)) - File type
- `size_bytes` (BIGINT) - File size
- `s3_key` (TEXT) - MinIO/S3 object key
- `encryption_key_encrypted` (TEXT) - Encrypted file key

**Notes:**
- Files stored in MinIO/S3
- Encryption keys stored encrypted
- Thumbnails generated automatically

---

### stories
**Purpose:** 24-hour ephemeral stories

**Key Columns:**
- `user_id` (UUID, FK → users)
- `media_type` (ENUM: image/video/text)
- `s3_key` (TEXT) - Media file location
- `expires_at` (TIMESTAMP) - Auto-delete time

**Indexes:**
- `idx_stories_expires` - Find expiring stories for cleanup

**Notes:**
- Cleanup job runs hourly
- Stories auto-deleted after 24 hours

---

### calls
**Purpose:** Call history and metadata

**Key Columns:**
- `chat_id` (UUID, FK → chats)
- `initiator_id` (UUID, FK → users)
- `type` (ENUM: audio/video)
- `status` (ENUM) - Call status
- `livekit_room_name` (VARCHAR(255)) - LiveKit room

**Indexes:**
- `idx_calls_chat` - Call history per chat
- `idx_calls_status` - Active calls

---

## Functions

### update_updated_at_column()
Automatically updates `updated_at` timestamp on row modification.

**Usage:** Trigger on UPDATE

### cleanup_expired_stories()
Deletes stories older than expiration time.

**Usage:** Scheduled job (hourly)

### cleanup_expired_sessions()
Removes expired session tokens.

**Usage:** Scheduled job (hourly)

### get_unread_count(user_id, chat_id)
Returns count of unread messages for user in chat.

**Parameters:**
- `user_id` (UUID) - User ID
- `chat_id` (UUID) - Chat ID

**Returns:** INTEGER - Unread count

## Full-Text Search

### users.search_vector
Searchable fields:
- Username (weight A)
- Bio (weight B)
- Email (weight C)

### chats.search_vector
Searchable fields:
- Name (weight A)
- Description (weight B)

**Usage:**
```sql
SELECT * FROM users
WHERE search_vector @@ to_tsquery('english', 'search_term');
```

## Indexes Summary

### Performance Indexes
- User lookups: username, email, phone
- Message queries: chat_id + created_at
- Session management: expires_at
- Contact search: user_id

### Full-Text Search
- users.search_vector (GIN)
- chats.search_vector (GIN)

### Pattern Matching
- username (text_pattern_ops) - ILIKE searches
- chat name (text_pattern_ops) - ILIKE searches

## Constraints Summary

### Foreign Keys
All relationships use CASCADE DELETE or SET NULL appropriately:
- User deletion: CASCADE to devices, keys, sessions
- Chat deletion: CASCADE to members, messages
- Message deletion: CASCADE to reactions, edits

### Check Constraints
- Users must have email OR phone
- Groups/channels must have name
- Users cannot contact/block themselves

### Unique Constraints
- Username, email, phone (per user)
- Device ID (per user)
- Refresh tokens
- Chat invite links

## Data Types

### UUIDs
All primary keys use UUID v4 for:
- Distribution across shards
- Security (no enumeration)
- Global uniqueness

### Timestamps
All timestamps use `TIMESTAMP WITH TIME ZONE` for:
- Timezone awareness
- Global deployment support

### JSONB
Used for:
- Chat role permissions
- Flexible configuration storage

## Migration Strategy

### Order of Execution
1. `000_initial_functions.sql` - Functions and extensions
2. `001_init_schema.sql` - Core schema
3. `002_search_indexes.sql` - Full-text search
4. `003_chat_settings_and_edits.sql` - Additional features

### Rollback Support
Every migration has corresponding `*_down.sql` for rollback.

### Safe Migrations
- Never drop columns without backup
- Use transactions
- Test on staging first

## Performance Considerations

### Query Optimization
- Use prepared statements
- Leverage indexes
- Avoid N+1 queries
- Use EXPLAIN ANALYZE

### Connection Pooling
- Recommended pool size: 10-20 connections
- Monitor `pg_stat_activity`

### Vacuum and Analyze
- Auto-vacuum enabled
- Manual ANALYZE after bulk operations

## Security

### Encryption
- All message content encrypted
- Encryption keys never stored in plaintext
- Signal Protocol for end-to-end encryption

### Password Storage
- Bcrypt with cost factor 12
- Salted automatically

### Access Control
- Row-level security (future enhancement)
- Application-level access control

## Backup Strategy

### Full Backup
```bash
pg_dump -U sup_user -d sup > backup.sql
```

### Point-in-Time Recovery
Enable WAL archiving for production.

### Retention
- Daily backups: 7 days
- Weekly backups: 4 weeks
- Monthly backups: 12 months

---

**Last Updated:** 2025-01-18
**Database Version:** PostgreSQL 16
**Schema Version:** 3
