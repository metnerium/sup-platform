# SUP Messenger - Deployment Guide

Complete production deployment guide for SUP Messenger microservices platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Deployment Steps](#deployment-steps)
5. [Service Architecture](#service-architecture)
6. [Monitoring & Logging](#monitoring--logging)
7. [Backup & Recovery](#backup--recovery)
8. [Troubleshooting](#troubleshooting)
9. [Security Checklist](#security-checklist)

---

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows with WSL2
- **CPU**: 4+ cores recommended
- **RAM**: 8GB minimum, 16GB+ recommended
- **Storage**: 50GB+ free space
- **Network**: Open ports: 80, 443, 3000-3003, 5432, 6379, 9000-9001, 15672

### Required Software

```bash
# Docker 24.0+
docker --version

# Docker Compose 2.0+
docker-compose --version

# Git
git --version

# PostgreSQL client (for migrations)
psql --version

# Optional: Node.js 20+ (for local development)
node --version
```

### Install Docker (if needed)

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
```

---

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url> sup-messenger
cd sup-messenger
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration (IMPORTANT!)
nano .env
```

**Critical Settings to Change:**

```bash
# MUST CHANGE THESE:
DATABASE_PASSWORD=your_very_secure_password_here
JWT_SECRET=your_random_jwt_secret_min_32_chars
REDIS_PASSWORD=your_redis_password

# Recommended to change:
RABBITMQ_USER=your_rabbitmq_user
RABBITMQ_PASSWORD=your_rabbitmq_password
S3_ACCESS_KEY=your_minio_access_key
S3_SECRET_KEY=your_minio_secret_key
GRAFANA_PASSWORD=your_grafana_password
```

### 3. Deploy

```bash
# Full deployment (recommended for first time)
./scripts/deploy.sh deploy

# Or step by step:
./scripts/deploy.sh build    # Build images
./scripts/deploy.sh start    # Start services
```

### 4. Verify Deployment

```bash
# Check service status
./scripts/deploy.sh status

# View logs
./scripts/deploy.sh logs
```

---

## Configuration

### Environment Variables Reference

#### Application Settings

```bash
NODE_ENV=production              # Environment: development, production
APP_NAME=SUP                     # Application name
APP_PORT=3000                    # Main API port
```

#### Database Configuration

```bash
DATABASE_HOST=postgres           # PostgreSQL host
DATABASE_PORT=5432               # PostgreSQL port
DATABASE_NAME=sup                # Database name
DATABASE_USER=sup_user           # Database user
DATABASE_PASSWORD=               # Database password (REQUIRED)
```

#### Redis Configuration

```bash
REDIS_HOST=redis                 # Redis host
REDIS_PORT=6379                  # Redis port
REDIS_PASSWORD=                  # Redis password (optional but recommended)
```

#### JWT Configuration

```bash
JWT_SECRET=                      # JWT secret key (REQUIRED, min 32 chars)
JWT_ACCESS_EXPIRY=15m           # Access token expiry
JWT_REFRESH_EXPIRY=30d          # Refresh token expiry
```

#### S3/MinIO Configuration

```bash
S3_ENDPOINT=http://minio:9000   # MinIO endpoint
S3_ACCESS_KEY=minioadmin        # MinIO access key
S3_SECRET_KEY=minioadmin        # MinIO secret key
S3_BUCKET=sup-media             # S3 bucket name
S3_REGION=us-east-1             # S3 region
```

#### RabbitMQ Configuration

```bash
RABBITMQ_URL=                    # Full AMQP URL
RABBITMQ_USER=guest              # RabbitMQ user
RABBITMQ_PASSWORD=guest          # RabbitMQ password
```

#### Kafka Configuration

```bash
KAFKA_BROKERS=kafka:9092        # Kafka broker list
KAFKA_CLIENT_ID=sup-messenger   # Kafka client ID
```

#### WebRTC Configuration (Optional)

```bash
LIVEKIT_URL=ws://livekit:7880   # LiveKit WebSocket URL
LIVEKIT_API_KEY=                # LiveKit API key
LIVEKIT_API_SECRET=             # LiveKit API secret
TURN_SERVER_URL=                # TURN server URL
TURN_USERNAME=supuser           # TURN username
TURN_PASSWORD=suppassword       # TURN password
```

#### Email Configuration (Optional)

```bash
SMTP_HOST=smtp.gmail.com        # SMTP server
SMTP_PORT=587                   # SMTP port
SMTP_USER=                      # SMTP username
SMTP_PASSWORD=                  # SMTP password
```

#### Push Notifications (Optional)

```bash
FCM_SERVER_KEY=                 # Firebase Cloud Messaging key
VAPID_PUBLIC_KEY=               # VAPID public key
VAPID_PRIVATE_KEY=              # VAPID private key
```

#### Security Configuration

```bash
RATE_LIMIT_WINDOW_MS=900000     # Rate limit window (15 min)
RATE_LIMIT_MAX_REQUESTS=100     # Max requests per window
BCRYPT_ROUNDS=12                # BCrypt hash rounds
```

#### Domain & SSL (Production)

```bash
DOMAIN=yourdomain.com           # Your domain name
EMAIL=admin@yourdomain.com      # Admin email for SSL
```

---

## Deployment Steps

### Step 1: Infrastructure Services

Start core infrastructure first:

```bash
docker-compose up -d postgres redis rabbitmq kafka minio
```

Wait for services to be healthy:

```bash
docker-compose ps
```

### Step 2: Database Migrations

Run database migrations:

```bash
./scripts/migrate.sh up
```

Check migration status:

```bash
./scripts/migrate.sh status
```

### Step 3: Application Services

Start application services:

```bash
docker-compose up -d main-api websocket-service media-service worker-service
```

### Step 4: Reverse Proxy

Start nginx:

```bash
docker-compose up -d nginx
```

### Step 5: Monitoring (Optional)

Start monitoring stack:

```bash
docker-compose up -d prometheus grafana loki promtail
```

### Step 6: WebRTC Services (Optional)

If using video/audio calls:

```bash
docker-compose up -d livekit coturn
```

---

## Service Architecture

### Service Overview

```
┌─────────────────────────────────────────────────────┐
│                   Nginx (Port 80/443)                │
│              Reverse Proxy & Load Balancer           │
└─────┬──────────────────┬────────────────────────────┘
      │                  │
      ▼                  ▼
┌──────────┐      ┌──────────────┐
│ Main API │      │  WebSocket   │
│ (3000)   │      │  Service     │
│          │      │  (3001)      │
└────┬─────┘      └──────┬───────┘
     │                   │
     ├───────────────────┼──────────────────┐
     │                   │                  │
     ▼                   ▼                  ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Media    │      │ Worker   │      │ Postgres │
│ Service  │      │ Service  │      │ (5432)   │
│ (3003)   │      │          │      └──────────┘
└──────────┘      └──────────┘
     │                   │
     ▼                   ▼
┌──────────┐      ┌──────────┐
│  MinIO   │      │ RabbitMQ │
│ (9000)   │      │ (5672)   │
└──────────┘      └──────────┘
```

### Service Ports

| Service           | Internal Port | External Port | Protocol |
|-------------------|---------------|---------------|----------|
| Main API          | 3000          | 3000          | HTTP     |
| WebSocket         | 3001          | 3001          | WS/HTTP  |
| Media Service     | 3003          | 3003          | HTTP     |
| Worker Service    | -             | -             | -        |
| PostgreSQL        | 5432          | 5432          | TCP      |
| Redis             | 6379          | 6379          | TCP      |
| RabbitMQ          | 5672          | 5672          | AMQP     |
| RabbitMQ UI       | 15672         | 15672         | HTTP     |
| Kafka             | 9092          | 9092          | TCP      |
| MinIO API         | 9000          | 9000          | HTTP     |
| MinIO Console     | 9001          | 9001          | HTTP     |
| Prometheus        | 9090          | 9090          | HTTP     |
| Grafana           | 3000          | 3002          | HTTP     |
| Loki              | 3100          | 3100          | HTTP     |
| LiveKit           | 7880          | 7880          | WS       |
| TURN              | 3478          | 3478          | UDP/TCP  |
| Nginx             | 80/443        | 80/443        | HTTP     |

### Service Dependencies

```
main-api:
  - postgres (required)
  - redis (required)
  - rabbitmq (required)
  - minio (required)
  - kafka (optional)

websocket-service:
  - redis (required)

media-service:
  - minio (required)
  - rabbitmq (required)

worker-service:
  - postgres (required)
  - redis (required)
  - rabbitmq (required)
  - minio (required)
```

---

## Monitoring & Logging

### Access Monitoring Dashboards

**Prometheus**
- URL: http://localhost:9090
- Metrics collection and querying

**Grafana**
- URL: http://localhost:3002
- Username: `admin`
- Password: Set in `.env` (default: `admin`)
- Pre-configured dashboards for all services

**Loki**
- URL: http://localhost:3100
- Centralized logging
- Integrated with Grafana

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f main-api

# Last 100 lines
docker-compose logs --tail=100 main-api

# With timestamps
docker-compose logs -f -t main-api
```

### Log Files

Application logs are stored in:
- `/home/meit/massanger/services/main-api/logs/`
- `/home/meit/massanger/services/websocket-service/logs/`
- `/home/meit/massanger/services/media-service/logs/`
- `/home/meit/massanger/services/worker-service/logs/`

### Metrics Endpoints

Each service exposes metrics at `/metrics`:
- Main API: http://localhost:3000/metrics
- WebSocket: http://localhost:3001/metrics
- Media: http://localhost:3003/metrics

---

## Backup & Recovery

### Database Backup

#### Manual Backup

```bash
# Create backup
./scripts/deploy.sh backup

# Backups are stored in ./backups/ directory
```

#### Automated Backup

Add to crontab:

```bash
# Backup daily at 2 AM
0 2 * * * cd /path/to/sup-messenger && ./scripts/deploy.sh backup
```

#### Restore from Backup

```bash
# Stop services
docker-compose stop main-api worker-service

# Restore database
gunzip -c backups/backup_20240101_020000.sql.gz | \
  docker exec -i sup-postgres psql -U sup_user -d sup

# Start services
docker-compose start main-api worker-service
```

### Volume Backup

```bash
# Backup all volumes
docker run --rm \
  -v sup-messenger_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres_data.tar.gz -C /data .

# Similar for other volumes (redis_data, minio_data, etc.)
```

### Configuration Backup

```bash
# Backup configuration files
tar czf config_backup_$(date +%Y%m%d).tar.gz \
  .env \
  config/ \
  docker-compose.yml
```

---

## Troubleshooting

### Services Not Starting

**Check Docker:**
```bash
docker --version
docker-compose --version
sudo systemctl status docker
```

**Check Logs:**
```bash
docker-compose logs [service-name]
```

**Check Health:**
```bash
docker-compose ps
```

### Database Connection Issues

**Test Connection:**
```bash
docker exec -it sup-postgres psql -U sup_user -d sup
```

**Check Logs:**
```bash
docker-compose logs postgres
```

**Reset Database:**
```bash
docker-compose down postgres
docker volume rm sup-messenger_postgres_data
docker-compose up -d postgres
./scripts/migrate.sh up
```

### Out of Memory

**Check Container Memory:**
```bash
docker stats
```

**Increase Docker Memory:**
- Docker Desktop: Settings → Resources → Memory
- Linux: Configure in `/etc/docker/daemon.json`

### Port Conflicts

**Find Process Using Port:**
```bash
sudo lsof -i :3000
sudo netstat -tulpn | grep 3000
```

**Kill Process:**
```bash
sudo kill -9 [PID]
```

### Migration Failures

**Check Migration Status:**
```bash
./scripts/migrate.sh status
```

**Rollback Last Migration:**
```bash
./scripts/migrate.sh down
```

**Fix and Reapply:**
```bash
./scripts/migrate.sh up
```

### SSL Certificate Issues

**Initialize Let's Encrypt:**
```bash
./scripts/init-letsencrypt.sh
```

**Renew Certificates:**
```bash
docker-compose exec certbot certbot renew
```

---

## Security Checklist

### Pre-Production Checklist

- [ ] Change all default passwords in `.env`
- [ ] Set strong JWT_SECRET (min 32 random characters)
- [ ] Enable Redis password authentication
- [ ] Configure firewall (ufw/iptables)
- [ ] Enable SSL/TLS certificates
- [ ] Configure CORS whitelist
- [ ] Set up monitoring alerts
- [ ] Configure backup automation
- [ ] Enable 2FA for admin accounts
- [ ] Review nginx security headers
- [ ] Restrict database access
- [ ] Set up log rotation
- [ ] Enable rate limiting
- [ ] Configure fail2ban (optional)

### Firewall Configuration

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if needed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

### SSL/TLS Setup

#### Using Let's Encrypt (Production)

```bash
# Initialize SSL
./scripts/init-letsencrypt.sh

# Update nginx config to enable HTTPS
# Uncomment HTTPS server block in config/nginx/conf.d/default.conf
```

#### Using Self-Signed Certificate (Development)

```bash
# Generate certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout config/nginx/ssl/private.key \
  -out config/nginx/ssl/certificate.crt
```

### Regular Security Updates

```bash
# Update Docker images
docker-compose pull
docker-compose up -d

# Update system packages
sudo apt update && sudo apt upgrade
```

---

## Production Optimization

### Performance Tuning

**PostgreSQL:**
```sql
-- Increase connection pool
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
```

**Redis:**
```bash
# Add to redis config
maxmemory 256mb
maxmemory-policy allkeys-lru
```

**Nginx:**
```nginx
# Increase worker connections
worker_connections 4096;
```

### Scaling

**Horizontal Scaling:**
```bash
# Scale specific service
docker-compose up -d --scale main-api=3

# Load balance with nginx upstream
```

**Vertical Scaling:**
```yaml
# Add to docker-compose.yml
services:
  main-api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

---

## Support & Maintenance

### Health Checks

**Manual:**
```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3003/health
```

**Automated:**
```bash
# Add to monitoring
./scripts/deploy.sh status
```

### Regular Maintenance

- **Daily**: Check logs and metrics
- **Weekly**: Review disk space, backup status
- **Monthly**: Update dependencies, security patches
- **Quarterly**: Performance review, capacity planning

### Getting Help

- Documentation: `/docs`
- Issues: GitHub Issues
- Email: support@sup-messenger.com

---

## Additional Resources

- [API Documentation](./docs/API.md)
- [Database Schema](./docs/DATABASE.md)
- [Development Guide](./README.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)

---

**Last Updated**: 2024-12-18
**Version**: 1.0.0
