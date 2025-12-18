#!/bin/bash

# Test script for media service upload
# Usage: ./test-upload.sh <file-path> <jwt-token>

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./test-upload.sh <file-path> <jwt-token>"
    exit 1
fi

FILE_PATH=$1
JWT_TOKEN=$2
BASE_URL=${BASE_URL:-http://localhost:3003}

echo "Uploading file: $FILE_PATH"
echo "To: $BASE_URL/api/media/upload"
echo ""

RESPONSE=$(curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@$FILE_PATH" \
  -F "chatId=test-chat-123" \
  "$BASE_URL/api/media/upload" \
  -w "\nHTTP Status: %{http_code}\n")

echo "$RESPONSE"
