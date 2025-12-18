# Media Service - Quick Start Guide

Get the Media Service up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- FFmpeg installed (for video/audio processing)
- Docker and Docker Compose (optional, recommended)

## Option 1: Docker (Recommended)

### 1. Start the services

```bash
cd /home/meit/massanger/services/media-service
docker-compose up -d
```

This will start:
- Media Service (HTTP: 3003, WebSocket: 3004)
- MinIO (S3-compatible storage: 9000, Console: 9001)

### 2. Verify services are running

```bash
# Check service health
curl http://localhost:3003/api/health

# Check MinIO console
open http://localhost:9001
# Login: minioadmin / minioadmin
```

### 3. Test file upload

```bash
# Get a JWT token (replace with your auth service)
export TOKEN="your-jwt-token-here"

# Upload an image
curl -X POST http://localhost:3003/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/image.jpg"
```

## Option 2: Local Development

### 1. Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html

### 2. Install dependencies

```bash
cd /home/meit/massanger/services/media-service
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Start MinIO (if not using Docker)

```bash
# Download MinIO binary
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio

# Start MinIO
./minio server ./data --console-address ":9001"
```

### 5. Start the service

```bash
npm run dev
```

The service will start on:
- HTTP: http://localhost:3003
- WebSocket: ws://localhost:3004

## Quick Test

### 1. Generate a Test JWT Token

For testing purposes, you can generate a simple JWT token:

```javascript
// Node.js
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: 'test-user-123' },
  'your-secret-key-change-in-production',
  { expiresIn: '1h' }
);
console.log(token);
```

### 2. Upload a Test Image

```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:3003/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-image.jpg" \
  -v
```

Expected response:
```json
{
  "success": true,
  "data": {
    "s3Key": "users/test-user-123/media/images/uuid.jpg",
    "url": "http://localhost:9000/sup-media/...",
    "thumbnailS3Key": "users/test-user-123/thumbnails/uuid-thumb.jpg",
    "thumbnailUrl": "http://localhost:9000/sup-media/...",
    "size": 245678,
    "mimeType": "image/jpeg",
    "metadata": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

### 3. Download the File

```bash
# Get download URL
curl -X GET "http://localhost:3003/api/media/download/users/test-user-123/media/images/uuid.jpg" \
  -H "Authorization: Bearer $TOKEN"

# The response contains a presigned URL you can use to download
```

### 4. Test WebSocket Connection

```javascript
const WebSocket = require('ws');

const token = 'your-jwt-token';
const ws = new WebSocket(`ws://localhost:3004?token=${token}`);

ws.on('open', () => {
  console.log('Connected to WebSocket');
});

ws.on('message', (data) => {
  console.log('Received:', JSON.parse(data));
});
```

## Common Issues

### FFmpeg not found
```
Error: Cannot find ffmpeg
```

**Solution**: Install FFmpeg or set `FFMPEG_PATH` in `.env`:
```env
FFMPEG_PATH=/usr/local/bin/ffmpeg
FFPROBE_PATH=/usr/local/bin/ffprobe
```

### Port already in use
```
Error: Port 3003 is already in use
```

**Solution**: Change the port in `.env`:
```env
PORT=3005
```

### MinIO connection refused
```
Error: Failed to upload file to S3
```

**Solution**: Ensure MinIO is running:
```bash
docker-compose ps
# or check MinIO at http://localhost:9001
```

### JWT authentication failed
```
Error: Invalid or missing token
```

**Solution**:
1. Ensure JWT_SECRET in `.env` matches your auth service
2. Check token is valid and not expired
3. Include `Authorization: Bearer TOKEN` header

## Next Steps

1. **Read the Documentation**
   - [README.md](README.md) - Full documentation
   - [EXAMPLES.md](EXAMPLES.md) - Usage examples
   - [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Technical details

2. **Configure for Production**
   - Update JWT_SECRET
   - Configure S3 credentials
   - Enable processing options
   - Set up monitoring

3. **Integrate with Your App**
   - Use the API endpoints
   - Connect WebSocket for progress
   - Handle file downloads
   - Display thumbnails

4. **Deploy**
   - Use Docker Compose
   - Configure reverse proxy (nginx)
   - Set up SSL/TLS
   - Configure CDN (optional)

## Development Workflow

### Making Changes

1. Edit source files in `src/`
2. Service auto-reloads with `npm run dev`
3. Test changes via API
4. Build for production: `npm run build`

### Adding New Features

1. Create service in `src/services/`
2. Add controller in `src/controllers/`
3. Define routes in `src/routes/`
4. Update types in `src/types/`
5. Test thoroughly

### Debugging

Enable debug logging:
```env
NODE_ENV=development
```

View logs:
```bash
# Docker
docker-compose logs -f media-service

# Local
npm run dev
```

## Performance Tips

1. **Disable Processing in Development**
   ```env
   ENABLE_VIDEO_PROCESSING=false
   ENABLE_AUDIO_PROCESSING=false
   ENABLE_IMAGE_OPTIMIZATION=false
   ```

2. **Use Chunked Upload for Large Files**
   - Files > 100MB should use chunked upload
   - 5MB chunks recommended

3. **Monitor Resource Usage**
   ```bash
   docker stats media-service
   ```

4. **Optimize for Production**
   - Enable CDN
   - Use Redis for sessions
   - Add database for file metadata
   - Implement caching

## Support

- Issues: Create an issue in the repository
- Documentation: Check README.md and EXAMPLES.md
- Logs: Check service logs for detailed errors

## Quick Reference

### Environment Variables
```env
PORT=3003                          # HTTP server port
WS_PORT=3004                       # WebSocket port
S3_ENDPOINT=http://minio:9000      # S3 endpoint
S3_BUCKET=sup-media                # S3 bucket name
JWT_SECRET=your-secret-key         # JWT secret
MAX_FILE_SIZE=2147483648           # 2GB max file size
ENABLE_VIDEO_PROCESSING=true       # Enable video processing
```

### API Endpoints
```
POST   /api/media/upload                    # Upload file
POST   /api/media/upload/multiple           # Upload multiple files
GET    /api/media/download/:s3Key           # Get download URL
GET    /api/media/stream/:s3Key             # Stream file
GET    /api/media/thumbnail/:s3Key          # Get thumbnail
DELETE /api/media/:s3Key                    # Delete file
```

### Docker Commands
```bash
docker-compose up -d              # Start services
docker-compose down               # Stop services
docker-compose logs -f            # View logs
docker-compose restart            # Restart services
docker-compose ps                 # Check status
```

---

**You're all set!** Start uploading files to your Media Service.
