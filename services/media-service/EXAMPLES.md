# Media Service - Usage Examples

This document provides practical examples for using the Media Service API.

## Prerequisites

- Media service running on `http://localhost:3003`
- Valid JWT token for authentication
- MinIO/S3 configured and accessible

## Authentication

All requests require a JWT token in the Authorization header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Upload Examples

### 1. Simple Image Upload

```bash
curl -X POST http://localhost:3003/api/media/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "chatId=chat-123"
```

Response:
```json
{
  "success": true,
  "data": {
    "s3Key": "users/user-123/chats/chat-123/media/images/uuid-image.jpg",
    "url": "https://minio:9000/sup-media/users/user-123/...",
    "thumbnailS3Key": "users/user-123/chats/chat-123/thumbnails/uuid-image-thumb.jpg",
    "thumbnailUrl": "https://minio:9000/sup-media/users/user-123/...",
    "size": 245678,
    "mimeType": "image/jpeg",
    "metadata": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

### 2. Upload Multiple Files

```bash
curl -X POST http://localhost:3003/api/media/upload/multiple \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/image2.png" \
  -F "files=@/path/to/document.pdf"
```

### 3. Video Upload with Processing

```bash
curl -X POST http://localhost:3003/api/media/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/video.mp4"
```

Response includes video metadata:
```json
{
  "success": true,
  "data": {
    "s3Key": "users/user-123/media/videos/uuid-video.mp4",
    "url": "https://...",
    "thumbnailS3Key": "users/user-123/thumbnails/uuid-video-thumb.jpg",
    "thumbnailUrl": "https://...",
    "size": 12456789,
    "mimeType": "video/mp4",
    "metadata": {
      "duration": 120.5,
      "width": 1920,
      "height": 1080
    }
  }
}
```

### 4. Voice Message Upload

```bash
curl -X POST http://localhost:3003/api/media/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/voice-message.opus"
```

Response includes waveform data:
```json
{
  "success": true,
  "data": {
    "s3Key": "users/user-123/voice/uuid-voice.opus",
    "url": "https://...",
    "size": 45678,
    "mimeType": "audio/opus",
    "metadata": {
      "duration": 15.3,
      "waveform": [0.3, 0.5, 0.7, 0.4, ...]
    }
  }
}
```

### 5. Chunked Upload for Large Files

Step 1: Initialize chunked upload
```bash
curl -X POST http://localhost:3003/api/media/upload/chunked/init \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "large-video.mp4",
    "mimeType": "video/mp4",
    "chatId": "chat-123"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "uploadId": "upload-abc-123",
    "s3Key": "users/user-123/chats/chat-123/media/videos/uuid-large-video.mp4"
  }
}
```

Step 2: Upload chunks (repeat for each chunk)
```bash
# Split file into chunks (5MB each)
split -b 5242880 large-video.mp4 chunk-

# Upload each chunk
for chunk in chunk-*; do
  curl -X POST http://localhost:3003/api/media/upload/chunked/upload-abc-123 \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -F "chunk=@$chunk"
done
```

Step 3: Complete upload
```bash
curl -X POST http://localhost:3003/api/media/upload/chunked/upload-abc-123/complete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Download Examples

### 1. Get Download URL

```bash
curl -X GET "http://localhost:3003/api/media/download/users/user-123/media/images/uuid-image.jpg" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "s3Key": "users/user-123/media/images/uuid-image.jpg",
    "url": "https://minio:9000/sup-media/...",
    "size": 245678,
    "mimeType": "image/jpeg",
    "expiresIn": 3600
  }
}
```

### 2. Get Download URL with Custom Expiry

```bash
curl -X GET "http://localhost:3003/api/media/download/users/user-123/media/images/uuid-image.jpg?expiresIn=7200" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Stream Video

```bash
curl -X GET "http://localhost:3003/api/media/stream/users/user-123/media/videos/uuid-video.mp4" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output video.mp4
```

### 4. Get Thumbnail

```bash
curl -X GET "http://localhost:3003/api/media/thumbnail/users/user-123/media/images/uuid-image.jpg" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Range Request for Streaming

```bash
curl -X GET "http://localhost:3003/api/media/stream/users/user-123/media/videos/uuid-video.mp4" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Range: bytes=0-1048575" \
  --output video-chunk.mp4
```

## File Management Examples

### 1. Get File Metadata

```bash
curl -X GET "http://localhost:3003/api/media/metadata/users/user-123/media/images/uuid-image.jpg" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Delete File

```bash
curl -X DELETE "http://localhost:3003/api/media/users/user-123/media/images/uuid-image.jpg" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## WebSocket Examples

### JavaScript/TypeScript Example

```typescript
const token = 'YOUR_JWT_TOKEN';
const ws = new WebSocket(`ws://localhost:3004?token=${token}`);

ws.onopen = () => {
  console.log('WebSocket connected');

  // Subscribe to specific upload
  ws.send(JSON.stringify({
    type: 'subscribe',
    uploadId: 'upload-abc-123'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'connected':
      console.log('Connected:', message);
      break;

    case 'upload_progress':
      const { progress, status, bytesUploaded, totalBytes } = message.data;
      console.log(`Progress: ${progress}%`);
      console.log(`Status: ${status}`);
      console.log(`Uploaded: ${bytesUploaded}/${totalBytes} bytes`);

      if (status === 'completed') {
        console.log('Upload completed!');
      } else if (status === 'error') {
        console.error('Upload failed:', message.data.message);
      }
      break;

    case 'pong':
      console.log('Pong received');
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket disconnected');
};

// Send ping every 30 seconds to keep connection alive
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping' }));
  }
}, 30000);
```

### React Hook Example

```typescript
import { useEffect, useRef, useState } from 'react';

interface UploadProgress {
  uploadId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
}

export const useUploadProgress = (token: string, uploadId?: string) => {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3004?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (uploadId) {
        ws.send(JSON.stringify({
          type: 'subscribe',
          uploadId
        }));
      }
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'upload_progress') {
        setProgress(message.data);
      }
    };

    return () => {
      ws.close();
    };
  }, [token, uploadId]);

  return progress;
};
```

## Node.js/TypeScript Client Examples

### Upload with Axios

```typescript
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

async function uploadFile(filePath: string, token: string) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  formData.append('chatId', 'chat-123');

  try {
    const response = await axios.post(
      'http://localhost:3003/api/media/upload',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('Upload successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Upload failed:', error.response?.data || error.message);
    throw error;
  }
}
```

### Chunked Upload with Progress

```typescript
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

async function chunkedUpload(
  filePath: string,
  token: string,
  onProgress?: (progress: number) => void
) {
  const fileSize = fs.statSync(filePath).size;
  const chunkSize = 5 * 1024 * 1024; // 5MB chunks
  const fileName = filePath.split('/').pop() || 'file';

  // Initialize
  const initResponse = await axios.post(
    'http://localhost:3003/api/media/upload/chunked/init',
    {
      filename: fileName,
      mimeType: 'video/mp4',
      chatId: 'chat-123'
    },
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const { uploadId, s3Key } = initResponse.data.data;
  let uploadedBytes = 0;

  // Upload chunks
  for (let start = 0; start < fileSize; start += chunkSize) {
    const end = Math.min(start + chunkSize, fileSize);
    const chunk = fs.createReadStream(filePath, { start, end: end - 1 });

    const formData = new FormData();
    formData.append('chunk', chunk);

    await axios.post(
      `http://localhost:3003/api/media/upload/chunked/${uploadId}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );

    uploadedBytes += (end - start);
    const progress = (uploadedBytes / fileSize) * 100;
    onProgress?.(progress);
  }

  // Complete
  const completeResponse = await axios.post(
    `http://localhost:3003/api/media/upload/chunked/${uploadId}/complete`,
    {},
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  return completeResponse.data;
}

// Usage
chunkedUpload('/path/to/large-video.mp4', 'YOUR_TOKEN', (progress) => {
  console.log(`Upload progress: ${progress.toFixed(2)}%`);
});
```

## Python Client Example

```python
import requests

def upload_file(file_path, token, chat_id=None):
    url = "http://localhost:3003/api/media/upload"
    headers = {"Authorization": f"Bearer {token}"}

    with open(file_path, 'rb') as f:
        files = {'file': f}
        data = {'chatId': chat_id} if chat_id else {}

        response = requests.post(url, headers=headers, files=files, data=data)
        response.raise_for_status()

        return response.json()

# Usage
result = upload_file('/path/to/image.jpg', 'YOUR_TOKEN', 'chat-123')
print(f"Upload successful: {result['data']['s3Key']}")
```

## Common Error Responses

### File Too Large
```json
{
  "success": false,
  "error": {
    "message": "File size exceeds maximum allowed size",
    "code": "VALIDATION_ERROR"
  }
}
```

### Invalid File Type
```json
{
  "success": false,
  "error": {
    "message": "File type mismatch. Expected image/jpeg, detected image/png",
    "code": "VALIDATION_ERROR"
  }
}
```

### Authentication Failed
```json
{
  "success": false,
  "error": {
    "message": "Invalid or missing token",
    "code": "AUTHENTICATION_ERROR"
  }
}
```

### File Not Found
```json
{
  "success": false,
  "error": {
    "message": "File not found",
    "code": "NOT_FOUND"
  }
}
```
