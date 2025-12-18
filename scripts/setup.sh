#!/bin/bash

# ============================================================
# SUP Messenger - Initial Setup Script
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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

print_header() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
}

# Generate random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Generate JWT secret
generate_jwt_secret() {
    openssl rand -base64 64 | tr -d "=+/" | cut -c1-64
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    local missing_tools=()

    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi

    if ! command -v docker-compose &> /dev/null; then
        missing_tools+=("docker-compose")
    fi

    if ! command -v openssl &> /dev/null; then
        missing_tools+=("openssl")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_info "Please install missing tools and try again"
        exit 1
    fi

    print_success "All prerequisites met"
}

# Setup environment file
setup_env() {
    print_header "Environment Configuration"

    if [ -f "${PROJECT_ROOT}/.env" ]; then
        print_warning ".env file already exists"
        read -p "Do you want to overwrite it? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Keeping existing .env file"
            return
        fi
    fi

    print_info "Generating secure credentials..."

    # Generate secure credentials
    DB_PASSWORD=$(generate_password)
    REDIS_PASSWORD=$(generate_password)
    JWT_SECRET=$(generate_jwt_secret)
    SESSION_SECRET=$(generate_password)
    ENCRYPTION_KEY=$(generate_password)
    RABBITMQ_PASSWORD=$(generate_password)
    LIVEKIT_API_KEY=$(openssl rand -hex 16)
    LIVEKIT_API_SECRET=$(openssl rand -hex 32)

    # Copy template
    cp "${PROJECT_ROOT}/.env.example" "${PROJECT_ROOT}/.env"

    # Replace values
    sed -i "s/DATABASE_PASSWORD=.*/DATABASE_PASSWORD=${DB_PASSWORD}/" "${PROJECT_ROOT}/.env"
    sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=${REDIS_PASSWORD}/" "${PROJECT_ROOT}/.env"
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" "${PROJECT_ROOT}/.env"
    sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=${SESSION_SECRET}/" "${PROJECT_ROOT}/.env"
    sed -i "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=${ENCRYPTION_KEY}/" "${PROJECT_ROOT}/.env"
    sed -i "s/RABBITMQ_PASSWORD=.*/RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}/" "${PROJECT_ROOT}/.env"
    sed -i "s/LIVEKIT_API_KEY=.*/LIVEKIT_API_KEY=${LIVEKIT_API_KEY}/" "${PROJECT_ROOT}/.env"
    sed -i "s/LIVEKIT_API_SECRET=.*/LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}/" "${PROJECT_ROOT}/.env"

    print_success "Environment file created with secure credentials"
    print_warning "Please review ${PROJECT_ROOT}/.env and update any additional settings"
}

# Create necessary directories
create_directories() {
    print_header "Creating Directories"

    print_info "Creating necessary directories..."

    mkdir -p "${PROJECT_ROOT}/certbot/conf"
    mkdir -p "${PROJECT_ROOT}/certbot/www"
    mkdir -p "${PROJECT_ROOT}/backups"
    mkdir -p "${PROJECT_ROOT}/services/main-api/logs"
    mkdir -p "${PROJECT_ROOT}/services/websocket-service/logs"
    mkdir -p "${PROJECT_ROOT}/services/media-service/logs"
    mkdir -p "${PROJECT_ROOT}/services/worker-service/logs"
    mkdir -p "${PROJECT_ROOT}/config/grafana/dashboards"
    mkdir -p "${PROJECT_ROOT}/config/grafana/datasources"

    print_success "Directories created"
}

# Setup monitoring configs
setup_monitoring() {
    print_header "Setting up Monitoring"

    # Grafana datasource
    cat > "${PROJECT_ROOT}/config/grafana/datasources/datasources.yml" <<EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: true
EOF

    # Grafana dashboard provisioning
    cat > "${PROJECT_ROOT}/config/grafana/dashboards/dashboards.yml" <<EOF
apiVersion: 1

providers:
  - name: 'SUP Messenger'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF

    print_success "Monitoring configurations created"
}

# Initialize Docker volumes
init_volumes() {
    print_header "Initializing Docker Volumes"

    print_info "Creating Docker volumes..."

    docker volume create sup_postgres_data || true
    docker volume create sup_redis_data || true
    docker volume create sup_rabbitmq_data || true
    docker volume create sup_kafka_data || true
    docker volume create sup_minio_data || true
    docker volume create sup_prometheus_data || true
    docker volume create sup_grafana_data || true
    docker volume create sup_loki_data || true

    print_success "Docker volumes created"
}

# Start infrastructure
start_infrastructure() {
    print_header "Starting Infrastructure Services"

    cd "${PROJECT_ROOT}"

    print_info "Starting PostgreSQL, Redis, RabbitMQ, MinIO..."

    docker-compose up -d postgres redis rabbitmq minio

    print_info "Waiting for services to be healthy..."

    local max_wait=60
    local waited=0

    while [ $waited -lt $max_wait ]; do
        if docker-compose ps | grep -q "healthy"; then
            sleep 5
            print_success "Infrastructure services are healthy"
            return 0
        fi

        sleep 2
        waited=$((waited + 2))
        echo -n "."
    done

    echo ""
    print_warning "Some services may not be fully healthy yet, but continuing..."
}

# Run database migrations
run_migrations() {
    print_header "Running Database Migrations"

    cd "${PROJECT_ROOT}"

    print_info "Waiting for PostgreSQL to be fully ready..."
    sleep 10

    print_info "Running migrations..."

    if [ -f "${SCRIPT_DIR}/migrate.sh" ]; then
        bash "${SCRIPT_DIR}/migrate.sh" up
        print_success "Migrations completed"
    else
        print_warning "migrate.sh not found, skipping migrations"
    fi
}

# Display summary
show_summary() {
    print_header "Setup Complete"

    echo ""
    print_success "SUP Messenger has been set up successfully!"
    echo ""
    print_info "Next steps:"
    echo "  1. Review and update ${PROJECT_ROOT}/.env if needed"
    echo "  2. Run './scripts/deploy.sh' to start all services"
    echo "  3. Configure SSL certificates for production"
    echo ""
    print_info "Important credentials (saved in .env):"
    echo "  Database Password: ${DB_PASSWORD}"
    echo "  Redis Password:    ${REDIS_PASSWORD}"
    echo "  RabbitMQ Password: ${RABBITMQ_PASSWORD}"
    echo ""
    print_warning "Keep these credentials secure!"
    echo ""
}

# Main setup flow
main() {
    print_header "SUP Messenger - Initial Setup"

    print_info "This script will set up SUP Messenger for the first time"
    echo ""

    check_prerequisites
    setup_env
    create_directories
    setup_monitoring
    init_volumes
    start_infrastructure
    run_migrations
    show_summary
}

# Run main function
main "$@"
