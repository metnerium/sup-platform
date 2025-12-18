#!/bin/bash

# ============================================================
# SUP Messenger - Database Backup Script
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_ROOT}/backups"

# Print functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment
if [ -f "${PROJECT_ROOT}/.env" ]; then
    source "${PROJECT_ROOT}/.env"
else
    print_error ".env file not found"
    exit 1
fi

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/sup_backup_${TIMESTAMP}.sql"

print_info "Starting database backup..."

# Check if PostgreSQL container is running
if ! docker ps | grep -q "sup-postgres"; then
    print_error "PostgreSQL container is not running"
    exit 1
fi

# Perform backup
print_info "Backing up database to ${BACKUP_FILE}"

docker exec sup-postgres pg_dump \
    -U "${DATABASE_USER:-sup_user}" \
    -d "${DATABASE_NAME:-sup}" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    > "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    print_success "Database backup created successfully"

    # Compress backup
    print_info "Compressing backup..."
    gzip "${BACKUP_FILE}"

    print_success "Backup compressed: ${BACKUP_FILE}.gz"

    # Get file size
    SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    print_info "Backup size: ${SIZE}"

    # Also backup MinIO data
    print_info "Backing up MinIO data..."
    MINIO_BACKUP="${BACKUP_DIR}/minio_backup_${TIMESTAMP}.tar.gz"

    docker exec sup-minio sh -c "cd /data && tar czf - ." > "${MINIO_BACKUP}"

    if [ $? -eq 0 ]; then
        MINIO_SIZE=$(du -h "${MINIO_BACKUP}" | cut -f1)
        print_success "MinIO backup created: ${MINIO_BACKUP} (${MINIO_SIZE})"
    else
        print_error "MinIO backup failed"
    fi

    # Keep only last N backups
    KEEP_BACKUPS=7
    print_info "Keeping last ${KEEP_BACKUPS} backups..."

    cd "${BACKUP_DIR}"
    ls -t sup_backup_*.sql.gz 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm
    ls -t minio_backup_*.tar.gz 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm

    print_success "Backup completed successfully!"
    print_info "Backup location: ${BACKUP_FILE}.gz"

else
    print_error "Database backup failed"
    exit 1
fi
