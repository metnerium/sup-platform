FROM node:20-alpine AS builder

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy shared packages
COPY packages ./packages

# Copy service package files
COPY services/call-service/package*.json ./services/call-service/
COPY services/call-service/tsconfig.json ./services/call-service/

# Install dependencies for workspace
RUN npm ci

# Build shared types package first
RUN npm run build --workspace=@sup/types

# Copy service source code
COPY services/call-service/src ./services/call-service/src

# Build TypeScript
WORKDIR /app/services/call-service
RUN npm run build

# Production image
FROM node:20-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 callservice

# Copy package files and built packages
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/services/call-service/package*.json ./services/call-service/

# Copy node_modules from builder (includes workspace dependencies)
COPY --from=builder /app/node_modules ./node_modules

# Copy service-specific node_modules (some packages may not be hoisted)
COPY --from=builder /app/services/call-service/node_modules ./services/call-service/node_modules

# Copy built application
COPY --from=builder /app/services/call-service/dist ./services/call-service/dist

# Fix permissions for packages and create logs directory
RUN chmod -R a+r packages && \
    chmod -R a+r services/call-service/node_modules && \
    mkdir -p /app/logs && \
    chown -R callservice:nodejs /app

USER callservice

# Set working directory to service
WORKDIR /app/services/call-service

EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]
