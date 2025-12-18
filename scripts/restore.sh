#!/bin/bash

# ============================================================
# SUP Messenger - Database Restore Script
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

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
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

# Check if backup directory exists
if [ ! -d "${BACKUP_DIR}" ]; then
    print_error "Backup directory not found: ${BACKUP_DIR}"
    exit 1
fi

# List available backups
print_info "Available database backups:"
echo ""

BACKUPS=($(ls -t "${BACKUP_DIR}"/sup_backup_*.sql.gz 2>/dev/null))

if [ ${#BACKUPS[@]} -eq 0 ]; then
    print_error "No backups found in ${BACKUP_DIR}"
    exit 1
fi

for i in "${!BACKUPS[@]}"; do
    SIZE=$(du -h "${BACKUPS[$i]}" | cut -f1)
    FILENAME=$(basename "${BACKUPS[$i]}")
    echo "  [$i] ${FILENAME} (${SIZE})"
done

echo ""

# Select backup to restore
if [ -z "$1" ]; then
    read -p "Enter backup number to restore (or 'q' to quit): " SELECTION

    if [ "$SELECTION" = "q" ]; then
        print_info "Cancelled"
        exit 0
    fi

    if ! [[ "$SELECTION" =~ ^[0-9]+$ ]] || [ "$SELECTION" -ge "${#BACKUPS[@]}" ]; then
        print_error "Invalid selection"
        exit 1
    fi

    BACKUP_FILE="${BACKUPS[$SELECTION]}"
else
    # Backup file provided as argument
    if [ ! -f "$1" ]; then
        print_error "Backup file not found: $1"
        exit 1
    fi
    BACKUP_FILE="$1"
fi

print_warning "This will REPLACE the current database with the backup!"
print_warning "Backup file: $(basename ${BACKUP_FILE})"
echo ""
read -p "Are you sure? Type 'yes' to continue: " CONFIRMATION

if [ "$CONFIRMATION" != "yes" ]; then
    print_info "Cancelled"
    exit 0
fi

# Check if PostgreSQL container is running
if ! docker ps | grep -q "sup-postgres"; then
    print_error "PostgreSQL container is not running"
    print_info "Start it with: docker-compose up -d postgres"
    exit 1
fi

print_info "Starting database restore..."

# Create a backup of current database first
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PRE_RESTORE_BACKUP="${BACKUP_DIR}/pre_restore_backup_${TIMESTAMP}.sql"

print_info "Creating safety backup of current database..."

docker exec sup-postgres pg_dump \
    -U "${DATABASE_USER:-sup_user}" \
    -d "${DATABASE_NAME:-sup}" \
    --no-owner \
    --no-acl \
    > "${PRE_RESTORE_BACKUP}" 2>/dev/null || true

if [ -f "${PRE_RESTORE_BACKUP}" ]; then
    gzip "${PRE_RESTORE_BACKUP}"
    print_success "Safety backup created: ${PRE_RESTORE_BACKUP}.gz"
fi

# Decompress backup if needed
RESTORE_FILE="${BACKUP_FILE}"
if [[ "${BACKUP_FILE}" == *.gz ]]; then
    print_info "Decompressing backup..."
    RESTORE_FILE="${BACKUP_DIR}/temp_restore.sql"
    gunzip -c "${BACKUP_FILE}" > "${RESTORE_FILE}"
fi

# Restore database
print_info "Restoring database from backup..."

docker exec -i sup-postgres psql \
    -U "${DATABASE_USER:-sup_user}" \
    -d "${DATABASE_NAME:-sup}" \
    < "${RESTORE_FILE}"

if [ $? -eq 0 ]; then
    print_success "Database restored successfully!"

    # Clean up temp file
    if [ "${RESTORE_FILE}" != "${BACKUP_FILE}" ]; then
        rm -f "${RESTORE_FILE}"
    fi

    # Ask about MinIO restore
    MINIO_BACKUP="${BACKUP_FILE%.sql.gz}"
    MINIO_BACKUP="${MINIO_BACKUP/sup_backup/minio_backup}.tar.gz"

    if [ -f "${MINIO_BACKUP}" ]; then
        echo ""
        print_info "MinIO backup found: $(basename ${MINIO_BACKUP})"
        read -p "Restore MinIO data as well? (y/n): " -n 1 -r
        echo

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if docker ps | grep -q "sup-minio"; then
                print_info "Restoring MinIO data..."

                docker exec -i sup-minio sh -c "cd /data && tar xzf -" < "${MINIO_BACKUP}"

                if [ $? -eq 0 ]; then
                    print_success "MinIO data restored successfully!"
                else
                    print_error "MinIO restore failed"
                fi
            else
                print_error "MinIO container is not running"
            fi
        fi
    fi

    print_success "Restore completed!"
    print_warning "You may need to restart application services:"
    print_info "docker-compose restart main-api websocket-service media-service worker-service"

else
    print_error "Database restore failed"

    # Clean up temp file
    if [ "${RESTORE_FILE}" != "${BACKUP_FILE}" ]; then
        rm -f "${RESTORE_FILE}"
    fi

    exit 1
fi
