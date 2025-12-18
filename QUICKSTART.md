# SUP Messenger - Quick Start Guide

Get SUP Messenger running in 5 minutes.

## Prerequisites

- Docker 24.0+ and Docker Compose 2.0+
- 8GB RAM minimum
- 50GB disk space

## Installation

### 1. Clone or Extract Project

```bash
cd /home/meit/massanger
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit configuration (REQUIRED!)
nano .env
```

**MUST CHANGE:**
```bash
DATABASE_PASSWORD=create_strong_password_here
JWT_SECRET=create_random_32_char_secret_here
```

**Optional but Recommended:**
```bash
REDIS_PASSWORD=create_redis_password
RABBITMQ_USER=your_user
RABBITMQ_PASSWORD=your_password
```

### 3. Deploy Everything

```bash
# Make script executable (if needed)
chmod +x scripts/deploy.sh

# Deploy all services
./scripts/deploy.sh deploy
```

This will:
- Build all Docker images
- Start infrastructure (PostgreSQL, Redis, RabbitMQ, MinIO, Kafka)
- Run database migrations
- Start application services
- Start monitoring services
- Verify health of all services

**Deployment takes 5-10 minutes on first run.**

### 4. Verify Installation

```bash
# Check service status
./scripts/deploy.sh status

# View logs
./scripts/deploy.sh logs
```

## Access Services

Once deployed, access services at:

**Application:**
- Main API: http://localhost:3000
- API (via Nginx): http://localhost/api/v1
- WebSocket: http://localhost/ws

**Infrastructure UI:**
- RabbitMQ Management: http://localhost:15672 (guest/guest)
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)

**Monitoring:**
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3002 (admin/admin)

## Test the API

### Register a User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

**Save the returned `accessToken` for subsequent requests.**

### Create a Chat

```bash
curl -X POST http://localhost:3000/api/v1/chats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "type": "group",
    "name": "Test Group",
    "memberIds": ["user-id-1", "user-id-2"]
  }'
```

### Send a Message

```bash
curl -X POST http://localhost:3000/api/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "chatId": "chat-id-here",
    "encryptedContent": "base64-encrypted-content",
    "type": "text"
  }'
```

## Common Commands

### Start/Stop Services

```bash
# Start all services
./scripts/deploy.sh start

# Stop all services
./scripts/deploy.sh stop

# Restart all services
./scripts/deploy.sh restart

# Restart specific service
docker-compose restart main-api
```

### View Logs

```bash
# All services
./scripts/deploy.sh logs

# Specific service
docker-compose logs -f main-api

# Last 100 lines
docker-compose logs --tail=100 main-api
```

### Database Operations

```bash
# Run migrations
./scripts/migrate.sh up

# Check migration status
./scripts/migrate.sh status

# Rollback last migration
./scripts/migrate.sh down
```

### Backup & Restore

```bash
# Create backup
./scripts/deploy.sh backup

# Backups stored in: ./backups/

# Restore from backup
gunzip -c backups/backup_20240101_020000.sql.gz | \
  docker exec -i sup-postgres psql -U sup_user -d sup
```

### Monitoring

```bash
# Check service health
curl http://localhost:3000/health

# View metrics
curl http://localhost:3000/metrics

# Container stats
docker stats
```

## Troubleshooting

### Services Not Starting

```bash
# Check Docker
docker --version
docker-compose --version
sudo systemctl status docker

# Check logs for errors
docker-compose logs [service-name]

# Restart Docker
sudo systemctl restart docker
```

### Database Connection Issues

```bash
# Test connection
docker exec -it sup-postgres psql -U sup_user -d sup

# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Port Conflicts

```bash
# Check what's using a port
sudo lsof -i :3000
sudo netstat -tulpn | grep 3000

# Kill process using port
sudo kill -9 [PID]
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a
docker volume prune
```

### Reset Everything

```bash
# WARNING: This deletes all data!
./scripts/deploy.sh clean

# Then redeploy
./scripts/deploy.sh deploy
```

## Development Mode

### Run Services Locally (without Docker)

```bash
# Install dependencies
npm install

# Start infrastructure only
docker-compose up -d postgres redis rabbitmq minio

# Run migrations
./scripts/migrate.sh up

# Start services in development mode
npm run dev
```

This starts:
- Main API on port 3000
- WebSocket Service on port 3001

### Build Services

```bash
# Build all services
./scripts/deploy.sh build

# Build specific service
docker-compose build main-api
```

## Production Deployment

### Pre-Production Checklist

1. **Security:**
   - [ ] Change DATABASE_PASSWORD
   - [ ] Generate strong JWT_SECRET (min 32 chars)
   - [ ] Set REDIS_PASSWORD
   - [ ] Change RabbitMQ credentials
   - [ ] Update MinIO credentials

2. **Configuration:**
   - [ ] Set up SMTP for emails
   - [ ] Configure FCM for push notifications
   - [ ] Set DOMAIN and EMAIL for SSL
   - [ ] Configure LIVEKIT for video calls

3. **Infrastructure:**
   - [ ] Set up firewall rules
   - [ ] Configure SSL certificates
   - [ ] Set up backup automation
   - [ ] Configure monitoring alerts

### Generate SSL Certificates

```bash
# Initialize Let's Encrypt
./scripts/init-letsencrypt.sh

# Update nginx config
# Uncomment HTTPS server block in:
# config/nginx/conf.d/default.conf
```

### Set Up Firewall

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if needed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

### Configure Automated Backups

```bash
# Add to crontab
crontab -e

# Backup daily at 2 AM
0 2 * * * cd /home/meit/massanger && ./scripts/deploy.sh backup
```

## Scaling

### Horizontal Scaling

```bash
# Scale specific service to 3 instances
docker-compose up -d --scale main-api=3

# Load balancing is handled by nginx
```

### Vertical Scaling

Edit `docker-compose.yml`:

```yaml
services:
  main-api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Environment Variables Reference

### Critical Variables

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_PASSWORD | PostgreSQL password | `strong_password_123` |
| JWT_SECRET | JWT signing secret | `random_32_char_string` |
| REDIS_PASSWORD | Redis password | `redis_password` |
| RABBITMQ_USER | RabbitMQ username | `sup_user` |
| RABBITMQ_PASSWORD | RabbitMQ password | `rmq_password` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment | `production` |
| JWT_ACCESS_EXPIRY | Access token expiry | `15m` |
| JWT_REFRESH_EXPIRY | Refresh token expiry | `30d` |
| RATE_LIMIT_MAX_REQUESTS | Max requests per window | `100` |
| MAX_FILE_SIZE | Max upload size (bytes) | `104857600` (100MB) |

Full reference: See `.env.example`

## Next Steps

1. **Read Full Documentation:**
   - [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
   - [ORCHESTRATOR.md](./ORCHESTRATOR.md) - System architecture
   - [INTEGRATION.md](./INTEGRATION.md) - Service integration
   - [README.md](./README.md) - Project overview

2. **Configure Optional Services:**
   - Set up email (SMTP)
   - Configure push notifications (FCM)
   - Enable video calls (LiveKit)

3. **Monitor Your System:**
   - Set up Grafana dashboards
   - Configure Prometheus alerts
   - Review logs regularly

4. **Develop Clients:**
   - Build web client (React)
   - Build mobile app (React Native)
   - Implement E2E encryption (Signal Protocol)

## Getting Help

- **Documentation:** Check `/docs` directory
- **Logs:** `./scripts/deploy.sh logs`
- **Status:** `./scripts/deploy.sh status`
- **Issues:** GitHub Issues
- **Email:** support@sup-messenger.com

## Summary

You now have a complete, production-ready messaging platform running with:

- User authentication and authorization
- End-to-end encryption support
- Real-time messaging via WebSockets
- File uploads and media handling
- Story feature (24h posts)
- Full-text search
- Monitoring and logging
- Automated backups

**The platform is ready for client development and testing!**

---

**Quick Reference Card:**

```bash
# Deploy everything
./scripts/deploy.sh deploy

# Check status
./scripts/deploy.sh status

# View logs
./scripts/deploy.sh logs

# Stop services
./scripts/deploy.sh stop

# Start services
./scripts/deploy.sh start

# Backup database
./scripts/deploy.sh backup

# Run migrations
./scripts/migrate.sh up
```

---

**Last Updated**: 2024-12-18
**Version**: 1.0.0
