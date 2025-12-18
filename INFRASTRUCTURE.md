# SUP Messenger - Infrastructure Documentation

## Overview

Complete infrastructure setup for SUP Messenger with production-ready configurations for database, caching, message queuing, storage, WebRTC, monitoring, and deployment.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Nginx (Reverse Proxy)                │
│                    SSL/TLS Termination & Load Balancing      │
└───────────┬─────────────────────────────────────────────────┘
            │
    ┌───────┴──────┬──────────────┬──────────────┐
    │              │              │              │
┌───▼────┐   ┌────▼─────┐   ┌───▼─────┐   ┌────▼────┐
│Main API│   │WebSocket │   │  Media  │   │ Worker  │
│        │   │ Service  │   │ Service │   │ Service │
└───┬────┘   └────┬─────┘   └───┬─────┘   └────┬────┘
    │             │             │              │
    └─────────────┴─────────────┴──────────────┘
                  │
    ┌─────────────┼─────────────────────────┐
    │             │                         │
┌───▼───┐   ┌────▼────┐   ┌────────┐   ┌──▼──────┐
│Postgre│   │  Redis  │   │RabbitMQ│   │  MinIO  │
│SQL    │   │         │   │        │   │   S3    │
└───────┘   └─────────┘   └────────┘   └─────────┘
                  │
    ┌─────────────┼─────────────────────────┐
    │             │                         │
┌───▼────┐   ┌───▼────┐   ┌────────┐   ┌──▼────┐
│LiveKit │   │ Coturn │   │Promethe│   │Grafana│
│        │   │  TURN  │   │us      │   │       │
└────────┘   └────────┘   └────────┘   └───────┘
```

## Components

### Application Services

#### Main API (Port 3000)
- REST API for all core operations
- User authentication and authorization
- Chat management
- Message handling
- Encryption key management

#### WebSocket Service (Port 3001)
- Real-time message delivery
- Online presence
- Typing indicators
- Read receipts

#### Media Service (Port 3003)
- File upload/download
- Image processing
- Video transcoding
- Thumbnail generation

#### Worker Service
- Background job processing
- Email notifications
- Push notifications
- Story cleanup
- Session cleanup

### Infrastructure Services

#### PostgreSQL 16
- Primary database
- User data, messages, chats
- Full-text search
- JSONB support
- **Port:** 5432
- **Default User:** sup_user
- **Default DB:** sup

#### Redis 7
- Session storage
- Caching layer
- Rate limiting
- Online presence
- **Port:** 6379

#### RabbitMQ 3
- Message queue
- Event bus
- Async job processing
- **Ports:** 5672 (AMQP), 15672 (Management UI)

#### Kafka 3.6 (Optional)
- Event streaming
- Message logs
- Analytics
- **Ports:** 9092, 9094

#### MinIO
- S3-compatible object storage
- Media files (images, videos, audio)
- Profile pictures
- Stickers
- **Ports:** 9000 (API), 9001 (Console)

### WebRTC Services

#### LiveKit
- Video/Audio calls
- Screen sharing
- WebRTC signaling
- **Ports:** 7880 (WebSocket), 7881 (HTTP), 7882 (RTP/UDP)

#### Coturn
- TURN/STUN server
- NAT traversal
- **Ports:** 3478 (TCP/UDP), 49152-49200 (Media)

### Monitoring Services

#### Prometheus
- Metrics collection
- Time-series database
- Alerting
- **Port:** 9090

#### Grafana
- Dashboards
- Visualization
- Analytics
- **Port:** 3002
- **Default:** admin/admin

#### Loki
- Log aggregation
- Centralized logging
- **Port:** 3100

#### Promtail
- Log shipping
- Log parsing

## Database Schema

### Core Tables

#### users
- User accounts and profiles
- Authentication credentials
- Settings and preferences

#### sessions
- Multi-device session management
- Refresh tokens
- IP tracking

#### contacts
- User contact relationships
- Custom display names

#### blocked_users
- Blocking relationships
- Privacy enforcement

### Cryptography Tables

#### identity_keys
- Signal Protocol identity keys
- Per-device keys

#### signed_prekeys
- Signed prekeys with rotation
- Key rotation support

#### one_time_prekeys
- One-time prekey pool
- Automatic refilling

#### sessions_crypto
- Established encryption sessions
- Signal Protocol sessions

### Chat Tables

#### chats
- Direct chats, groups, channels
- Chat metadata and settings

#### chat_members
- Chat participants
- Roles and permissions

#### chat_settings
- Per-user chat settings
- Mute, pin, archive

### Message Tables

#### messages
- All messages
- Encryption metadata
- Reply and forward chains

#### message_reactions
- Emoji reactions
- User reactions

#### message_edits
- Edit history
- Previous content

#### message_reads
- Read receipts
- Per-user read status

### Story Tables

#### stories
- 24-hour stories
- Media content
- Expiration tracking

#### story_views
- View tracking
- Viewer information

#### story_privacy_lists
- Custom privacy lists
- View restrictions

### Call Tables

#### calls
- Call history
- Call metadata
- LiveKit integration

#### call_participants
- Call participants
- Join/leave tracking

### Media Tables

#### media_files
- File metadata
- Encryption keys
- S3 references

#### stickers
- Sticker packs
- Sticker metadata

## Quick Start

### 1. Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd massanger

# Run initial setup
./scripts/setup.sh
```

This will:
- Generate secure credentials
- Create .env file
- Set up directories
- Initialize Docker volumes
- Start infrastructure services
- Run database migrations

### 2. Configure Environment

Edit `.env` file and update:
```bash
# Domain (for production)
DOMAIN=yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Push Notifications
FCM_SERVER_KEY=your_fcm_server_key
```

### 3. Deploy

```bash
# Full deployment
./scripts/deploy.sh

# Or specific commands
./scripts/deploy.sh build   # Build images
./scripts/deploy.sh start   # Start services
./scripts/deploy.sh logs    # View logs
./scripts/deploy.sh status  # Check status
```

## Management Scripts

### deploy.sh
Complete deployment management:
```bash
./scripts/deploy.sh deploy   # Full deployment
./scripts/deploy.sh build    # Build Docker images
./scripts/deploy.sh start    # Start all services
./scripts/deploy.sh stop     # Stop all services
./scripts/deploy.sh restart  # Restart all services
./scripts/deploy.sh logs     # Show service logs
./scripts/deploy.sh status   # Show service status
./scripts/deploy.sh clean    # Remove all containers and volumes
```

### setup.sh
Initial system setup:
```bash
./scripts/setup.sh
```

### migrate.sh
Database migrations:
```bash
./scripts/migrate.sh up      # Run all migrations
./scripts/migrate.sh down    # Rollback last migration
./scripts/migrate.sh status  # Show migration status
```

### backup.sh
Database backup:
```bash
./scripts/backup.sh
```
- Creates PostgreSQL dump
- Backs up MinIO data
- Compresses backups
- Keeps last 7 backups

### restore.sh
Database restore:
```bash
./scripts/restore.sh
```
- Lists available backups
- Interactive restore
- Safety backup before restore

## Migrations

### Migration Files

Location: `services/main-api/migrations/`

Migration order:
1. `000_initial_functions.sql` - Database functions and extensions
2. `001_init_schema.sql` - Core schema and tables
3. `002_search_indexes.sql` - Full-text search
4. `003_chat_settings_and_edits.sql` - Additional features

### Creating Migrations

1. Create new migration file:
```sql
-- Migration: 004_your_migration_name
-- Description: What this migration does
-- Created: YYYY-MM-DD
-- Dependencies: 003_chat_settings_and_edits.sql

BEGIN;

-- Your SQL here

COMMIT;
```

2. Create corresponding down migration:
```sql
-- Migration: 004_your_migration_name (DOWN)

BEGIN;

-- Rollback SQL here

COMMIT;
```

3. Run migration:
```bash
./scripts/migrate.sh up
```

## Monitoring

### Prometheus Metrics

Access: http://localhost:9090

Key metrics:
- `http_requests_total` - HTTP request count
- `http_request_duration_seconds` - Request latency
- `websocket_connections_active` - Active WebSocket connections
- `messages_sent_total` - Messages sent
- `pg_stat_activity_count` - Database connections

### Grafana Dashboards

Access: http://localhost:3002
Default credentials: admin/admin

Pre-configured dashboards:
- SUP Messenger Overview
- API Performance
- Database Metrics
- WebSocket Metrics

### Logs

View logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f main-api

# Last 100 lines
docker-compose logs -f --tail=100 main-api
```

Loki: http://localhost:3100

## SSL/TLS Setup

### Development (HTTP)
Services run on HTTP by default.

### Production (HTTPS)

1. Update `.env`:
```bash
DOMAIN=yourdomain.com
EMAIL=admin@yourdomain.com
SSL_ENABLED=true
```

2. Obtain SSL certificate:
```bash
./scripts/init-letsencrypt.sh
```

3. Uncomment HTTPS server block in `config/nginx/conf.d/default.conf`

4. Restart nginx:
```bash
docker-compose restart nginx
```

## Backup Strategy

### Automated Backups

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/massanger/scripts/backup.sh >> /var/log/sup-backup.log 2>&1
```

### Manual Backup
```bash
./scripts/backup.sh
```

Backups stored in: `backups/`

### Restore from Backup
```bash
./scripts/restore.sh
```

## Security Checklist

### Production Deployment

- [ ] Change all default passwords in `.env`
- [ ] Generate strong JWT_SECRET (64+ characters)
- [ ] Enable SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set secure Redis password
- [ ] Update RabbitMQ credentials
- [ ] Review and restrict exposed ports
- [ ] Enable monitoring and alerts
- [ ] Set up log rotation
- [ ] Configure email SMTP
- [ ] Set up push notifications

### Environment Variables

Critical variables to change:
- `DATABASE_PASSWORD`
- `JWT_SECRET`
- `SESSION_SECRET`
- `ENCRYPTION_KEY`
- `REDIS_PASSWORD`
- `RABBITMQ_PASSWORD`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

## Troubleshooting

### Service won't start
```bash
# Check logs
docker-compose logs [service-name]

# Check health
docker-compose ps

# Restart service
docker-compose restart [service-name]
```

### Database connection issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Test connection
docker exec -it sup-postgres psql -U sup_user -d sup

# Check migrations
./scripts/migrate.sh status
```

### Out of disk space
```bash
# Clean up Docker
docker system prune -a

# Remove old logs
docker-compose logs --tail=0

# Check disk usage
df -h
```

### High memory usage
```bash
# Check container stats
docker stats

# Restart high-memory service
docker-compose restart [service-name]
```

## Performance Tuning

### PostgreSQL
Edit `docker-compose.yml`:
```yaml
postgres:
  environment:
    POSTGRES_INITDB_ARGS: "-E UTF8 --locale=en_US.UTF-8"
  command:
    - "postgres"
    - "-c"
    - "max_connections=200"
    - "-c"
    - "shared_buffers=256MB"
    - "-c"
    - "effective_cache_size=1GB"
```

### Redis
Increase memory limit in `docker-compose.yml`:
```yaml
redis:
  command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru
```

### Nginx
Increase worker connections in `config/nginx/nginx.conf`:
```nginx
events {
    worker_connections 4096;
}
```

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Documentation: [repository-url]/wiki
- Email: support@yourdomain.com

## License

[Your License]

---

**SUP Messenger** - Secure, Private, Production-Ready Messaging Platform
