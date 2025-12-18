FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy shared packages
COPY packages ./packages

# Copy service package files
COPY services/websocket-service/package*.json ./services/websocket-service/
COPY services/websocket-service/tsconfig.json ./services/websocket-service/

# Install dependencies for workspace
RUN npm ci

# Copy service source code
COPY services/websocket-service/src ./services/websocket-service/src

# Build TypeScript
WORKDIR /app/services/websocket-service
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY services/websocket-service/package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/services/websocket-service/dist ./dist

# Create logs directory
RUN mkdir -p logs && chmod 777 logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/server.js"]
