# Media Service - SUP Messenger

Complete production-ready media service for file upload, processing, storage, and delivery with support for images, videos, audio, documents, and voice messages. Features advanced processing capabilities using Sharp for images and FFmpeg for video/audio.

## Features

### Upload Features
- **Single & Multiple File Upload**: Upload one or multiple files in a single request
- **Chunked Upload**: Support for large files up to 2GB with resumable uploads
- **Progress Tracking**: Real-time upload progress via WebSocket
- **File Type Support**: Images, videos, audio, documents, voice messages

### Processing Features

#### Image Processing (Sharp)
- Automatic optimization and compression
- HEIC/HEIF to JPEG conversion
- Multi-size thumbnail generation (150x150, 400x400, 1200x1200)
- Metadata stripping for privacy
- Auto-rotation based on EXIF orientation
- Format conversion support

#### Video Processing (FFmpeg)
- H.264/MP4 conversion and optimization
- Thumbnail extraction at specific time offset
- Resolution scaling (max 1920x1080)
- Streaming format generation (faststart)
- Duration and metadata extraction
- Configurable bitrate and quality

#### Audio Processing (FFmpeg)
- Opus codec compression for voice messages
- Waveform generation for voice messages
- Audio normalization
- Duration extraction
- Sample rate and bitrate optimization

### Security Features
- Magic number validation (file type verification)
- File size limits per file type
- MIME type validation
- Metadata stripping for privacy
- Malware scanning integration ready
- JWT authentication
- Access control and ownership validation

### Download Features
- Presigned URL generation for secure downloads
- Direct file streaming for large files
- Range request support for video streaming
- Thumbnail serving
- CDN-ready architecture

## API Endpoints

### Upload

#### Single File Upload
```bash
POST /api/media/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- file: File (required)
- chatId: string (optional)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "s3Key": "users/123/files/uuid-filename.jpg",
    "url": "presigned-url",
    "thumbnailS3Key": "users/123/thumbs/uuid-filename-thumb.jpg",
    "thumbnailUrl": "presigned-thumbnail-url",
    "size": 1234567,
    "mimeType": "image/jpeg"
  }
}
```

#### Multiple File Upload
```bash
POST /api/media/upload/multiple
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- files: File[] (required, max 10)
- chatId: string (optional)
```

#### Initialize Chunked Upload
```bash
POST /api/media/upload/chunked/init
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  "filename": "large-file.mp4",
  "mimeType": "video/mp4",
  "chatId": "chat-123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadId": "upload-id",
    "s3Key": "users/123/files/uuid-large-file.mp4"
  }
}
```

#### Upload Chunk
```bash
POST /api/media/upload/chunked/:uploadId
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- chunk: File (required)
```

#### Complete Chunked Upload
```bash
POST /api/media/upload/chunked/:uploadId/complete
Authorization: Bearer <token>
```

#### Abort Chunked Upload
```bash
DELETE /api/media/upload/chunked/:uploadId
Authorization: Bearer <token>
```

### Download

#### Get Download URL
```bash
GET /api/media/download/:s3Key
Authorization: Bearer <token>
Query:
- expiresIn: number (optional, seconds)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "s3Key": "users/123/files/uuid-filename.jpg",
    "url": "presigned-url",
    "size": 1234567,
    "mimeType": "image/jpeg",
    "expiresIn": 3600
  }
}
```

### File Management

#### Delete File
```bash
DELETE /api/media/:s3Key
Authorization: Bearer <token>
```

#### Get File Metadata
```bash
GET /api/media/metadata/:s3Key
Authorization: Bearer <token>
```

### Health

```bash
GET /api/health
GET /api/ready
```

## Environment Variables

```env
PORT=3003
NODE_ENV=development

# S3/MinIO Configuration
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=sup-media
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production

# File Upload Limits
MAX_FILE_SIZE=104857600
MAX_THUMBNAIL_SIZE=2097152

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Presigned URL
PRESIGNED_URL_EXPIRY=3600
```

## Supported File Types

### Images
- JPEG, PNG, GIF, WebP, SVG

### Videos
- MP4, MPEG, WebM, QuickTime, AVI

### Audio
- MP3, MP4, WAV, WebM, OGG, AAC

### Documents
- PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, ZIP, RAR, 7Z

## File Size Limits

- Default: 100MB per file
- Configurable via `MAX_FILE_SIZE` environment variable

## Security Features

1. **JWT Authentication**: All endpoints require valid JWT token
2. **File Ownership Verification**: Users can only access their own files
3. **MIME Type Validation**: Only allowed file types can be uploaded
4. **File Size Limits**: Prevent abuse with configurable size limits
5. **Malware Scanning**: Placeholder for future integration (ClamAV)
6. **Rate Limiting**: Prevent abuse with configurable rate limits
7. **User-based Folder Structure**: Files organized by user and chat

## Folder Structure

```
users/
  {userId}/
    files/
      {uuid}-{filename}.{ext}
    thumbs/
      {uuid}-{filename}-thumb.jpg
    chats/
      {chatId}/
        files/
          {uuid}-{filename}.{ext}
        thumbs/
          {uuid}-{filename}-thumb.jpg
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run production build
npm start

# Lint
npm run lint

# Format
npm run format
```

## Docker

```bash
# Build image
docker build -t media-service .

# Run container
docker run -p 3003:3003 --env-file .env media-service
```

## Production Considerations

1. **Malware Scanning**: Integrate ClamAV or similar service
2. **CDN**: Use CloudFront or similar for better performance
3. **Caching**: Implement Redis for upload session storage
4. **Monitoring**: Add application performance monitoring
5. **Backup**: Configure S3 versioning and backup policies
6. **Logging**: Centralized logging with ELK stack or similar
7. **Secrets**: Use AWS Secrets Manager or similar for sensitive data

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       v
┌─────────────────────────────────────┐
│         Express Server              │
│  ┌───────────────────────────────┐  │
│  │  Rate Limiting & Security     │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│  ┌───────────v───────────────────┐  │
│  │  Authentication Middleware    │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│  ┌───────────v───────────────────┐  │
│  │  Upload Controller            │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│  ┌───────────v───────────────────┐  │
│  │  S3 Service                   │  │
│  └───────────┬───────────────────┘  │
└──────────────┼───────────────────────┘
               │
               v
       ┌───────────────┐
       │  MinIO/S3     │
       └───────────────┘
```

## License

ISC
