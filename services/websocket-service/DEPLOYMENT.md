# WebSocket Service - Deployment Guide

This guide covers deploying the SUP Messenger WebSocket service in various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)

## Prerequisites

- Node.js 20.x or higher
- Redis 7.x or higher
- TypeScript 5.x
- Docker (for containerized deployment)
- Kubernetes (for K8s deployment)

## Local Development

### 1. Install Dependencies

```bash
cd services/websocket-service
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=development
PORT=3001
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_development_secret
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
```

### 3. Start Redis

Using Docker:
```bash
docker run -d -p 6379:6379 --name sup-redis redis:7-alpine
```

Or install locally:
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis
```

### 4. Run Development Server

```bash
npm run dev
```

The service will start on `http://localhost:3001` with hot-reload enabled.

### 5. Test the Service

Run the test client:
```bash
# Install socket.io-client globally or in examples directory
cd examples
npm install socket.io-client
JWT_TOKEN=your_test_token node test-client.js
```

## Docker Deployment

### Single Instance Deployment

#### 1. Build the Image

```bash
# From project root
docker build -f services/websocket-service/Dockerfile -t sup-websocket:latest .
```

#### 2. Run with Docker Compose

```bash
cd services/websocket-service
docker-compose up -d
```

This starts both WebSocket service and Redis.

#### 3. Check Health

```bash
curl http://localhost:9091/health
```

#### 4. View Logs

```bash
docker-compose logs -f websocket
```

#### 5. Stop Services

```bash
docker-compose down
```

### Multi-Instance Deployment (Load Balanced)

For horizontal scaling, use multiple instances with a load balancer:

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  websocket:
    build:
      context: ../..
      dockerfile: services/websocket-service/Dockerfile
    restart: unless-stopped
    environment:
      NODE_ENV: production
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - redis
    networks:
      - sup-network

  nginx:
    image: nginx:alpine
    ports:
      - "3001:3001"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - websocket
    networks:
      - sup-network

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis-data:/data
    networks:
      - sup-network

networks:
  sup-network:

volumes:
  redis-data:
```

Scale the service:
```bash
docker-compose -f docker-compose.scale.yml up -d --scale websocket=3
```

### Nginx Configuration for Load Balancing

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream websocket_backend {
        least_conn;
        server websocket:3001;
    }

    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    server {
        listen 3001;

        location / {
            proxy_pass http://websocket_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_read_timeout 86400;
        }
    }
}
```

## Production Deployment

### Environment Configuration

Create a production `.env` file:

```env
NODE_ENV=production
PORT=3001

# Redis with authentication
REDIS_URL=redis://:your_redis_password@redis-host:6379

# Strong JWT secret (generate with: openssl rand -base64 32)
JWT_SECRET=your_production_jwt_secret_here

# Restrict CORS
CORS_ORIGIN=https://yourdomain.com

# Socket.io Configuration
SOCKETIO_PING_TIMEOUT=60000
SOCKETIO_PING_INTERVAL=25000
SOCKETIO_MAX_BUFFER_SIZE=1048576

# Rate Limiting
RATE_LIMIT_CONNECTION_WINDOW=60000
RATE_LIMIT_MAX_CONNECTIONS=5

# Connection Management
MAX_IDLE_TIME=1800000
HEARTBEAT_INTERVAL=30000

# Logging
LOG_LEVEL=info

# Metrics
METRICS_ENABLED=true
METRICS_PORT=9090
```

### SSL/TLS Configuration

For production, always use SSL/TLS:

```nginx
server {
    listen 443 ssl http2;
    server_name ws.yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name ws.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### Process Management with PM2

#### Install PM2

```bash
npm install -g pm2
```

#### Create PM2 Ecosystem File

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'sup-websocket',
    script: './dist/server.js',
    instances: 4,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    autorestart: true,
    watch: false,
  }]
};
```

#### Start with PM2

```bash
# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

#### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs sup-websocket

# Restart
pm2 restart sup-websocket

# Stop
pm2 stop sup-websocket

# Monitor
pm2 monit
```

## Kubernetes Deployment

### 1. Create ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: websocket-config
  namespace: sup-messenger
data:
  NODE_ENV: "production"
  PORT: "3001"
  LOG_LEVEL: "info"
  SOCKETIO_PING_TIMEOUT: "60000"
  SOCKETIO_PING_INTERVAL: "25000"
```

### 2. Create Secret

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: websocket-secret
  namespace: sup-messenger
type: Opaque
stringData:
  JWT_SECRET: "your_jwt_secret_here"
  REDIS_URL: "redis://:password@redis-service:6379"
```

### 3. Create Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: websocket-deployment
  namespace: sup-messenger
spec:
  replicas: 3
  selector:
    matchLabels:
      app: websocket
  template:
    metadata:
      labels:
        app: websocket
    spec:
      containers:
      - name: websocket
        image: sup-websocket:latest
        ports:
        - containerPort: 3001
          name: websocket
        - containerPort: 9091
          name: health
        envFrom:
        - configMapRef:
            name: websocket-config
        - secretRef:
            name: websocket-secret
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 9091
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 9091
          initialDelaySeconds: 5
          periodSeconds: 10
```

### 4. Create Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: websocket-service
  namespace: sup-messenger
spec:
  type: LoadBalancer
  selector:
    app: websocket
  ports:
  - name: websocket
    port: 3001
    targetPort: 3001
  - name: health
    port: 9091
    targetPort: 9091
```

### 5. Create HorizontalPodAutoscaler

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: websocket-hpa
  namespace: sup-messenger
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: websocket-deployment
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 6. Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace sup-messenger

# Apply configurations
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml

# Check status
kubectl get all -n sup-messenger

# View logs
kubectl logs -f deployment/websocket-deployment -n sup-messenger

# Scale manually
kubectl scale deployment/websocket-deployment --replicas=5 -n sup-messenger
```

## Monitoring & Maintenance

### Health Checks

```bash
# Liveness check
curl http://localhost:9091/health

# Readiness check
curl http://localhost:9091/ready

# Metrics
curl http://localhost:9091/metrics
```

### Log Monitoring

Logs are written to:
- Console output (Docker/K8s)
- `logs/error.log` (errors only)
- `logs/combined.log` (all logs)

### Performance Monitoring

Monitor these metrics:
- Active connections
- Event throughput
- Error rates
- Memory usage
- CPU usage
- Redis connection health

### Backup & Recovery

#### Redis Backup

```bash
# Save Redis snapshot
docker exec sup-redis redis-cli BGSAVE

# Copy backup
docker cp sup-redis:/data/dump.rdb ./backup/
```

### Troubleshooting

#### High Memory Usage

```bash
# Check memory usage
docker stats sup-websocket

# Restart service
docker-compose restart websocket
```

#### Connection Issues

1. Check Redis connection
2. Verify JWT secret matches
3. Check CORS configuration
4. Review firewall rules
5. Check load balancer configuration

#### Performance Issues

1. Scale horizontally (add more instances)
2. Optimize Redis configuration
3. Review rate limits
4. Check network latency
5. Monitor event handlers performance

## Security Checklist

- [ ] Use HTTPS/WSS in production
- [ ] Strong JWT secret (32+ characters)
- [ ] Redis authentication enabled
- [ ] CORS restricted to specific domains
- [ ] Rate limiting configured
- [ ] Firewall rules configured
- [ ] Regular security updates
- [ ] Log monitoring enabled
- [ ] Backup strategy in place

## Support

For issues or questions:
- Check logs: `docker-compose logs -f websocket`
- Review metrics: `curl http://localhost:9091/metrics`
- Contact: dev-team@supmessenger.com
