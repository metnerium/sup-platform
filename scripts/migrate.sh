#!/bin/bash

# SUP Messenger - Database migration script

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

# Configuration
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-sup}"
DB_USER="${DATABASE_USER:-sup_user}"
MIGRATIONS_DIR="services/main-api/migrations"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if psql is available
if ! command -v psql &> /dev/null; then
    log_error "psql command not found. Please install PostgreSQL client."
    exit 1
fi

# Wait for database to be ready
wait_for_db() {
    log_info "Waiting for database to be ready..."
    for i in {1..30}; do
        if PGPASSWORD=$DATABASE_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c '\q' 2>/dev/null; then
            log_info "Database is ready!"
            return 0
        fi
        log_warn "Database not ready, waiting... ($i/30)"
        sleep 2
    done
    log_error "Database did not become ready in time"
    exit 1
}

# Create migrations table if not exists
init_migrations_table() {
    log_info "Initializing migrations table..."
    PGPASSWORD=$DATABASE_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            version VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
EOF
}

# Get applied migrations
get_applied_migrations() {
    PGPASSWORD=$DATABASE_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
        "SELECT version FROM schema_migrations ORDER BY version;"
}

# Apply migration
apply_migration() {
    local migration_file=$1
    local version=$(basename $migration_file | cut -d'_' -f1)
    local name=$(basename $migration_file .sql | cut -d'_' -f2-)

    log_info "Applying migration: $migration_file"

    PGPASSWORD=$DATABASE_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $migration_file

    if [ $? -eq 0 ]; then
        PGPASSWORD=$DATABASE_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
            INSERT INTO schema_migrations (version, name) VALUES ('$version', '$name');
EOF
        log_info "Migration $version applied successfully"
    else
        log_error "Failed to apply migration $migration_file"
        exit 1
    fi
}

# Rollback migration
rollback_migration() {
    local migration_file=$1
    local version=$(basename $migration_file | cut -d'_' -f1)

    log_warn "Rolling back migration: $migration_file"

    PGPASSWORD=$DATABASE_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $migration_file

    if [ $? -eq 0 ]; then
        PGPASSWORD=$DATABASE_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
            DELETE FROM schema_migrations WHERE version = '$version';
EOF
        log_info "Migration $version rolled back successfully"
    else
        log_error "Failed to rollback migration $migration_file"
        exit 1
    fi
}

# Main logic
case "${1:-up}" in
    up)
        wait_for_db
        init_migrations_table

        applied_migrations=$(get_applied_migrations)

        for migration in $(ls $MIGRATIONS_DIR/*[0-9]*.sql | grep -v "_down.sql" | sort); do
            version=$(basename $migration | cut -d'_' -f1)

            if echo "$applied_migrations" | grep -q "^ *$version\$"; then
                log_info "Migration $version already applied, skipping..."
            else
                apply_migration $migration
            fi
        done

        log_info "All migrations applied successfully!"
        ;;

    down)
        wait_for_db

        # Get last applied migration
        last_version=$(PGPASSWORD=$DATABASE_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
            "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;")

        if [ -z "$last_version" ]; then
            log_warn "No migrations to rollback"
            exit 0
        fi

        last_version=$(echo $last_version | xargs)
        down_file="$MIGRATIONS_DIR/${last_version}_*_down.sql"

        if ls $down_file 1> /dev/null 2>&1; then
            rollback_migration $(ls $down_file | head -n 1)
        else
            log_error "Rollback file not found for migration $last_version"
            exit 1
        fi
        ;;

    status)
        wait_for_db
        init_migrations_table

        log_info "Applied migrations:"
        PGPASSWORD=$DATABASE_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \
            "SELECT version, name, applied_at FROM schema_migrations ORDER BY version;"
        ;;

    *)
        echo "Usage: $0 {up|down|status}"
        echo "  up     - Apply all pending migrations"
        echo "  down   - Rollback last migration"
        echo "  status - Show applied migrations"
        exit 1
        ;;
esac
