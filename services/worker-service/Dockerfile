FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy shared packages
COPY packages ./packages

# Copy service package files
COPY services/worker-service/package*.json ./services/worker-service/
COPY services/worker-service/tsconfig.json ./services/worker-service/

# Install dependencies for workspace
RUN npm ci

# Copy service source code
COPY services/worker-service/src ./services/worker-service/src

# Build TypeScript
WORKDIR /app/services/worker-service
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies for media processing
RUN apk add --no-cache \
    ffmpeg \
    imagemagick \
    python3 \
    make \
    g++

# Copy package files
COPY services/worker-service/package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/services/worker-service/dist ./dist

# Create logs directory
RUN mkdir -p logs && chmod 777 logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

CMD ["node", "dist/index.js"]
