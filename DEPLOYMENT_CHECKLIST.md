# SUP Messenger - Deployment Checklist

## Pre-Deployment

### Environment Setup
- [ ] Copy `.env.example` to `.env`
- [ ] Generate secure `DATABASE_PASSWORD`
- [ ] Generate secure `JWT_SECRET` (64+ characters)
- [ ] Generate secure `SESSION_SECRET`
- [ ] Generate secure `ENCRYPTION_KEY`
- [ ] Set `REDIS_PASSWORD`
- [ ] Set `RABBITMQ_PASSWORD`
- [ ] Configure `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`
- [ ] Set `DOMAIN` for production
- [ ] Set `ADMIN_EMAIL`

### Email Configuration
- [ ] Configure `SMTP_HOST`
- [ ] Configure `SMTP_USER`
- [ ] Configure `SMTP_PASSWORD`
- [ ] Test email sending

### Push Notifications
- [ ] Set up Firebase project
- [ ] Configure `FCM_SERVER_KEY`
- [ ] Configure `FCM_PROJECT_ID`
- [ ] Add `FCM_CREDENTIALS_PATH`
- [ ] Generate `VAPID_PUBLIC_KEY`
- [ ] Generate `VAPID_PRIVATE_KEY`

### Infrastructure
- [ ] Install Docker (20.10+)
- [ ] Install Docker Compose (2.0+)
- [ ] Verify disk space (minimum 50GB recommended)
- [ ] Verify RAM (minimum 8GB recommended)
- [ ] Configure firewall rules
- [ ] Set up backup storage

## Initial Setup

### Run Setup Script
```bash
./scripts/setup.sh
```

This script will:
- [ ] Generate secure credentials
- [ ] Create `.env` file
- [ ] Create necessary directories
- [ ] Initialize Docker volumes
- [ ] Start infrastructure services
- [ ] Run database migrations

### Verify Services
```bash
docker-compose ps
```

Check that all services show as "healthy":
- [ ] PostgreSQL
- [ ] Redis
- [ ] RabbitMQ
- [ ] MinIO
- [ ] Kafka (optional)

## Database Setup

### Run Migrations
```bash
./scripts/migrate.sh up
```

Verify migrations:
- [ ] 000_initial_functions.sql
- [ ] 001_init_schema.sql
- [ ] 002_search_indexes.sql
- [ ] 003_chat_settings_and_edits.sql

### Verify Database
```bash
docker exec -it sup-postgres psql -U sup_user -d sup
```

Check tables:
```sql
\dt
SELECT COUNT(*) FROM users;
```

## Application Deployment

### Build Services
```bash
./scripts/deploy.sh build
```

### Deploy All Services
```bash
./scripts/deploy.sh deploy
```

### Verify Deployment
- [ ] Main API: http://localhost:3000/health
- [ ] WebSocket: http://localhost:3001/health
- [ ] Media Service: http://localhost:3003/health
- [ ] Nginx: http://localhost/health

## SSL/TLS Setup (Production Only)

### Let's Encrypt Certificate
```bash
./scripts/init-letsencrypt.sh
```

### Update Nginx Configuration
- [ ] Uncomment HTTPS server block in `config/nginx/conf.d/default.conf`
- [ ] Update `server_name` with your domain
- [ ] Restart nginx: `docker-compose restart nginx`

### Verify SSL
- [ ] Test HTTPS: https://yourdomain.com
- [ ] Check certificate validity
- [ ] Verify auto-renewal is configured

## Monitoring Setup

### Access Monitoring Services
- [ ] Prometheus: http://localhost:9090
- [ ] Grafana: http://localhost:3002 (admin/admin)
- [ ] Loki: http://localhost:3100

### Configure Grafana
- [ ] Log in to Grafana
- [ ] Change default admin password
- [ ] Verify Prometheus datasource
- [ ] Verify Loki datasource
- [ ] Import SUP Messenger dashboard
- [ ] Set up alert notifications

### Configure Alerts
- [ ] Review alert rules in `config/prometheus/alerts/alerts.yml`
- [ ] Set up Alertmanager (optional)
- [ ] Configure email/Slack notifications
- [ ] Test alerts

## Security Hardening

### Network Security
- [ ] Configure firewall to only expose necessary ports:
  - 80 (HTTP)
  - 443 (HTTPS)
  - 3478 (TURN/STUN)
  - 49152-49200 (TURN media)
- [ ] Block direct access to internal services (5432, 6379, 5672, etc.)
- [ ] Set up VPN for administrative access

### Application Security
- [ ] Change all default passwords
- [ ] Enable rate limiting in nginx
- [ ] Configure CORS properly for your domain
- [ ] Review and update CSP headers
- [ ] Enable 2FA for admin accounts
- [ ] Set up fail2ban or similar

### Database Security
- [ ] Use strong PostgreSQL password
- [ ] Disable remote access to PostgreSQL (use internal network only)
- [ ] Enable SSL for database connections in production
- [ ] Regular security audits

### Secrets Management
- [ ] Never commit `.env` to version control
- [ ] Rotate secrets regularly
- [ ] Use secret management service in production (e.g., HashiCorp Vault)
- [ ] Limit access to production secrets

## Backup Configuration

### Set Up Automated Backups
```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/massanger/scripts/backup.sh >> /var/log/sup-backup.log 2>&1
```

### Test Backup and Restore
```bash
# Create backup
./scripts/backup.sh

# Test restore
./scripts/restore.sh
```

### Backup Verification
- [ ] Database backups created daily
- [ ] MinIO backups created daily
- [ ] Backups stored in secure location
- [ ] Backup retention policy configured (default: 7 days)
- [ ] Test restore procedure

### Off-Site Backup
- [ ] Configure off-site backup storage
- [ ] Set up automated sync to off-site location
- [ ] Encrypt backups before uploading
- [ ] Test off-site restore

## Performance Tuning

### Database Optimization
- [ ] Configure connection pooling (default: 10 connections)
- [ ] Enable query logging for slow queries
- [ ] Set up pgBouncer if needed
- [ ] Monitor `pg_stat_activity`

### Redis Optimization
- [ ] Configure maxmemory policy
- [ ] Set appropriate maxmemory limit
- [ ] Enable persistence if needed
- [ ] Monitor memory usage

### Application Optimization
- [ ] Configure worker processes
- [ ] Set appropriate memory limits
- [ ] Enable HTTP/2 in nginx
- [ ] Configure caching headers

### CDN Setup (Optional)
- [ ] Set up CloudFlare or similar CDN
- [ ] Configure media file caching
- [ ] Set up DDoS protection

## Logging

### Log Configuration
- [ ] Configure log rotation
- [ ] Set appropriate log levels (INFO for production)
- [ ] Configure Loki log aggregation
- [ ] Set up log retention policy

### Log Monitoring
- [ ] Set up alerts for error logs
- [ ] Monitor application logs regularly
- [ ] Configure log analysis (optional)

## Testing

### Smoke Tests
- [ ] User registration works
- [ ] User login works
- [ ] Send text message
- [ ] Send image
- [ ] Create group chat
- [ ] Make voice call
- [ ] Make video call
- [ ] Create story
- [ ] WebSocket connection stable

### Load Testing
- [ ] Run load tests with realistic traffic
- [ ] Monitor resource usage during load test
- [ ] Verify auto-scaling works (if configured)
- [ ] Test failover scenarios

### Security Testing
- [ ] Run security audit
- [ ] Test authentication flows
- [ ] Verify encryption works
- [ ] Test rate limiting
- [ ] SQL injection testing
- [ ] XSS testing

## Documentation

### Update Documentation
- [ ] Document custom configurations
- [ ] Update API documentation
- [ ] Create runbook for common issues
- [ ] Document deployment process
- [ ] Create incident response plan

### Team Training
- [ ] Train team on deployment process
- [ ] Train team on monitoring tools
- [ ] Train team on backup/restore procedures
- [ ] Train team on incident response

## Go-Live

### Final Checks
- [ ] All services running and healthy
- [ ] SSL certificates valid
- [ ] Backups configured and tested
- [ ] Monitoring and alerts working
- [ ] DNS configured correctly
- [ ] Load balancer configured (if applicable)

### Deployment
- [ ] Announce maintenance window
- [ ] Deploy to production
- [ ] Verify all services
- [ ] Monitor for issues
- [ ] Announce completion

### Post-Deployment
- [ ] Monitor logs for 24 hours
- [ ] Check metrics and dashboards
- [ ] Verify backups are running
- [ ] Document any issues encountered
- [ ] Create post-mortem if needed

## Maintenance

### Daily
- [ ] Check service status
- [ ] Review error logs
- [ ] Check disk space
- [ ] Monitor resource usage

### Weekly
- [ ] Review metrics and trends
- [ ] Check backup integrity
- [ ] Update dependencies
- [ ] Security patches

### Monthly
- [ ] Review and rotate secrets
- [ ] Database optimization (VACUUM, ANALYZE)
- [ ] Review and update documentation
- [ ] Capacity planning review

### Quarterly
- [ ] Security audit
- [ ] Disaster recovery test
- [ ] Performance review
- [ ] Cost optimization review

## Rollback Plan

### If Deployment Fails
```bash
# Stop new services
docker-compose down

# Restore from backup
./scripts/restore.sh

# Start previous version
git checkout <previous-tag>
docker-compose up -d
```

### Rollback Checklist
- [ ] Document rollback reason
- [ ] Stop affected services
- [ ] Restore database from backup
- [ ] Restore media files if needed
- [ ] Start previous version
- [ ] Verify functionality
- [ ] Notify users
- [ ] Create incident report

## Support Contacts

### Internal Team
- DevOps: devops@yourdomain.com
- Backend: backend@yourdomain.com
- Security: security@yourdomain.com

### External Services
- Domain Registrar: [Contact Info]
- Hosting Provider: [Contact Info]
- CDN Provider: [Contact Info]

## Quick Commands Reference

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f main-api

# Restart service
docker-compose restart main-api

# Check service status
docker-compose ps

# Run migrations
./scripts/migrate.sh up

# Create backup
./scripts/backup.sh

# Restore backup
./scripts/restore.sh

# Full deployment
./scripts/deploy.sh deploy

# Stop all services
./scripts/deploy.sh stop

# Check health
curl http://localhost/health
```

## Success Criteria

Deployment is successful when:
- [ ] All services show as "healthy"
- [ ] Users can register and login
- [ ] Messages can be sent and received
- [ ] WebSocket connections are stable
- [ ] Media upload/download works
- [ ] Calls can be initiated and answered
- [ ] Monitoring shows normal metrics
- [ ] No critical errors in logs
- [ ] Backups are running successfully
- [ ] SSL certificate is valid
- [ ] Performance meets SLA requirements

---

**Remember:** Always test in staging environment first!

**Last Updated:** 2025-01-18
