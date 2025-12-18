#!/bin/bash

# Test script for chunked upload
# Usage: ./test-chunked-upload.sh <file-path> <jwt-token>

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./test-chunked-upload.sh <file-path> <jwt-token>"
    exit 1
fi

FILE_PATH=$1
JWT_TOKEN=$2
BASE_URL=${BASE_URL:-http://localhost:3003}
CHUNK_SIZE=5242880  # 5MB chunks

echo "Starting chunked upload for: $FILE_PATH"
echo ""

# Get file info
FILENAME=$(basename "$FILE_PATH")
MIMETYPE=$(file -b --mime-type "$FILE_PATH")

echo "File: $FILENAME"
echo "MIME Type: $MIMETYPE"
echo ""

# Step 1: Initialize upload
echo "Step 1: Initializing chunked upload..."
INIT_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"filename\":\"$FILENAME\",\"mimeType\":\"$MIMETYPE\",\"chatId\":\"test-chat-123\"}" \
  "$BASE_URL/api/media/upload/chunked/init")

echo "$INIT_RESPONSE"
echo ""

UPLOAD_ID=$(echo "$INIT_RESPONSE" | grep -o '"uploadId":"[^"]*"' | cut -d'"' -f4)
S3_KEY=$(echo "$INIT_RESPONSE" | grep -o '"s3Key":"[^"]*"' | cut -d'"' -f4)

if [ -z "$UPLOAD_ID" ]; then
    echo "Failed to initialize upload"
    exit 1
fi

echo "Upload ID: $UPLOAD_ID"
echo "S3 Key: $S3_KEY"
echo ""

# Step 2: Upload chunks
echo "Step 2: Uploading chunks..."
FILE_SIZE=$(stat -f%z "$FILE_PATH" 2>/dev/null || stat -c%s "$FILE_PATH" 2>/dev/null)
TOTAL_CHUNKS=$(( ($FILE_SIZE + $CHUNK_SIZE - 1) / $CHUNK_SIZE ))

echo "File size: $FILE_SIZE bytes"
echo "Total chunks: $TOTAL_CHUNKS"
echo ""

for i in $(seq 1 $TOTAL_CHUNKS); do
    SKIP=$(( ($i - 1) * $CHUNK_SIZE ))

    echo "Uploading chunk $i/$TOTAL_CHUNKS..."

    # Extract chunk
    dd if="$FILE_PATH" of="/tmp/chunk_$i" bs=$CHUNK_SIZE skip=$(($i - 1)) count=1 2>/dev/null

    # Upload chunk
    CHUNK_RESPONSE=$(curl -s -X POST \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -F "chunk=@/tmp/chunk_$i" \
      "$BASE_URL/api/media/upload/chunked/$UPLOAD_ID")

    echo "$CHUNK_RESPONSE"

    # Clean up
    rm "/tmp/chunk_$i"
done

echo ""

# Step 3: Complete upload
echo "Step 3: Completing upload..."
COMPLETE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  "$BASE_URL/api/media/upload/chunked/$UPLOAD_ID/complete")

echo "$COMPLETE_RESPONSE"
echo ""

echo "Chunked upload completed!"
