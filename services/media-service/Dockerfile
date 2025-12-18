# Multi-stage build for production
FROM node:20-alpine AS builder

# Install build dependencies for native modules (sharp, etc.)
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy shared packages
COPY packages ./packages

# Copy service package files
COPY services/media-service/package*.json ./services/media-service/
COPY services/media-service/tsconfig.json ./services/media-service/

# Install dependencies for workspace
RUN npm ci

# Build shared types package first
RUN npm run build --workspace=@sup/types

# Copy service source code
COPY services/media-service/src ./services/media-service/src

# Build TypeScript
WORKDIR /app/services/media-service
RUN npm run build

# Production stage
FROM node:20-alpine

# Install runtime dependencies for sharp and FFmpeg
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    ffmpeg \
    ffmpeg-libs

WORKDIR /app

# Copy package files and built packages
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/services/media-service/package*.json ./services/media-service/

# Copy node_modules from builder (includes workspace dependencies)
COPY --from=builder /app/node_modules ./node_modules

# Copy service-specific node_modules (some packages may not be hoisted)
COPY --from=builder /app/services/media-service/node_modules ./services/media-service/node_modules

# Copy built files from builder
COPY --from=builder /app/services/media-service/dist ./services/media-service/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Fix permissions for packages and create directories
RUN chmod -R a+r packages && \
    chmod -R a+r services/media-service/node_modules && \
    mkdir -p /app/uploads /app/logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set working directory to service
WORKDIR /app/services/media-service

# Expose ports
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]
