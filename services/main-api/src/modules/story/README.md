# Story Module

Production-ready implementation of Instagram-style stories functionality for SUP Messenger.

## Features

- Create stories with image, video, or text content
- Privacy settings: all users, contacts only, or selected users
- 24-hour story expiration (TTL)
- View tracking with viewer list
- Friends story feed with unviewed indicators
- End-to-end encrypted captions

## Database Schema

### Tables

#### `stories`
- `id` - UUID, primary key
- `user_id` - UUID, references users
- `media_type` - ENUM (image, video, text)
- `s3_key` - TEXT, S3 object key for media
- `caption_encrypted` - TEXT, optional encrypted caption
- `privacy` - ENUM (all, contacts, selected)
- `expires_at` - TIMESTAMP, automatic expiration after 24h
- `created_at` - TIMESTAMP

#### `story_views`
- `story_id` - UUID, references stories
- `viewer_id` - UUID, references users
- `viewed_at` - TIMESTAMP
- Primary key: (story_id, viewer_id)

#### `story_privacy_lists`
- `story_id` - UUID, references stories
- `allowed_user_id` - UUID, references users
- Primary key: (story_id, allowed_user_id)

## API Endpoints

All endpoints require authentication via Bearer token.

### POST /api/v1/stories
Create a new story.

**Request Body:**
```json
{
  "mediaType": "image" | "video" | "text",
  "s3Key": "string",
  "captionEncrypted": "string (optional)",
  "privacy": "all" | "contacts" | "selected",
  "allowedUserIds": ["uuid"] (required if privacy is 'selected')
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "mediaType": "image",
    "s3Key": "string",
    "captionEncrypted": "string",
    "privacy": "contacts",
    "expiresAt": "2025-12-19T16:00:00Z",
    "createdAt": "2025-12-18T16:00:00Z"
  }
}
```

### GET /api/v1/stories
Get my stories (stories created by the authenticated user).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "mediaType": "image",
      "s3Key": "string",
      "captionEncrypted": "string",
      "privacy": "contacts",
      "expiresAt": "2025-12-19T16:00:00Z",
      "createdAt": "2025-12-18T16:00:00Z",
      "viewsCount": 42
    }
  ]
}
```

### GET /api/v1/stories/feed
Get stories from contacts (friends story feed).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "userId": "uuid",
      "username": "john_doe",
      "avatarUrl": "https://...",
      "stories": [
        {
          "id": "uuid",
          "userId": "uuid",
          "mediaType": "image",
          "s3Key": "string",
          "captionEncrypted": "string",
          "privacy": "contacts",
          "expiresAt": "2025-12-19T16:00:00Z",
          "createdAt": "2025-12-18T16:00:00Z",
          "viewsCount": 42,
          "hasViewed": false
        }
      ],
      "hasUnviewed": true
    }
  ]
}
```

### GET /api/v1/stories/:id
Get a specific story with privacy checks.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "mediaType": "image",
    "s3Key": "string",
    "captionEncrypted": "string",
    "privacy": "contacts",
    "expiresAt": "2025-12-19T16:00:00Z",
    "createdAt": "2025-12-18T16:00:00Z",
    "viewsCount": 42,
    "hasViewed": true
  }
}
```

### DELETE /api/v1/stories/:id
Delete a story (only the owner can delete).

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Story deleted successfully"
  }
}
```

### POST /api/v1/stories/:id/view
View a story (records view in database).

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Story viewed successfully"
  }
}
```

### GET /api/v1/stories/:id/views
Get story viewers (only the story owner can access).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "viewerId": "uuid",
      "username": "jane_smith",
      "avatarUrl": "https://...",
      "viewedAt": "2025-12-18T16:30:00Z"
    }
  ]
}
```

## Privacy Settings

### `all`
Story is visible to all users who can discover the story owner's profile.

### `contacts`
Story is visible only to users who are in the story owner's contact list.

### `selected`
Story is visible only to specific users listed in `story_privacy_lists` table.

## Privacy Checks

The system performs the following checks before allowing story access:

1. **Expired Check**: Story must not be expired (expires_at > NOW())
2. **Block Check**: Viewer must not be blocked by story owner and vice versa
3. **Privacy Check**:
   - If privacy is `all`: Anyone can view
   - If privacy is `contacts`: Viewer must be in owner's contacts
   - If privacy is `selected`: Viewer must be in privacy list

## Story Expiration

- Stories automatically expire 24 hours after creation
- `expires_at` is set to `created_at + 24 hours`
- Expired stories are not returned in any queries
- A background worker service should periodically delete expired stories to clean up:
  ```sql
  DELETE FROM stories WHERE expires_at < NOW() - INTERVAL '1 day';
  ```

## View Tracking

- Each view is recorded in `story_views` table
- Duplicate views from the same user update the `viewed_at` timestamp
- Only the story owner can see who viewed their story
- View count is included in story responses

## Service Layer

### `StoryService`

#### Methods

- `createStory(userId, mediaType, s3Key, captionEncrypted, privacy, allowedUserIds)` - Create a new story
- `getMyStories(userId)` - Get stories created by the user
- `getFriendsStories(userId)` - Get stories from user's contacts with privacy filtering
- `getStory(storyId, userId)` - Get a specific story with privacy checks
- `deleteStory(storyId, userId)` - Delete a story (owner only)
- `viewStory(storyId, viewerId)` - Record a story view
- `getStoryViews(storyId, userId)` - Get story viewers (owner only)
- `getActiveStories(userId)` - Get all active (non-expired) stories for a user

## Validation

### Create Story
- `mediaType`: Required, must be 'image', 'video', or 'text'
- `s3Key`: Required, max 500 characters
- `captionEncrypted`: Optional, max 5000 characters
- `privacy`: Required, must be 'all', 'contacts', or 'selected'
- `allowedUserIds`: Required if privacy is 'selected', must be array of UUIDs

### View Story
- `storyId`: Required, must be valid UUID

## Error Handling

The module uses standard error handling with appropriate HTTP status codes:

- `400`: Validation errors
- `403`: Permission denied (privacy violation, not owner)
- `404`: Story not found or expired
- `500`: Internal server errors

## Integration

The story module is registered in the main application:

```typescript
// In app.ts
import storyRoutes from './modules/story/story.routes';
apiV1.use('/stories', storyRoutes);
```

## Migration

Run the migration to add the privacy column:

```bash
# Apply migration
psql -d your_database -f migrations/002_add_story_privacy.sql

# Rollback migration (if needed)
psql -d your_database -f migrations/002_add_story_privacy_down.sql
```

## Future Enhancements

- Story highlights (save stories permanently)
- Story replies (direct message in response to story)
- Story reactions (emoji reactions)
- Story mentions (@username in caption)
- Story analytics (view duration, interaction rate)
- Story polls and questions
- Multiple media in single story (carousel)
