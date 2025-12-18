#!/bin/bash

# SUP Messenger - Production Deployment Script
# This script handles the complete deployment of SUP Messenger

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env"
BACKUP_DIR="${PROJECT_ROOT}/backups"

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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warn "This script should not be run as root. Running as $(whoami)"
    fi
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."

    local missing_tools=()

    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi

    if ! command -v docker-compose &> /dev/null; then
        missing_tools+=("docker-compose")
    fi

    if ! command -v git &> /dev/null; then
        missing_tools+=("git")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_info "Please install missing tools and try again"
        exit 1
    fi

    log_info "All prerequisites met"
}

# Check environment file
check_env_file() {
    log_step "Checking environment configuration..."

    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env file not found at $ENV_FILE"
        log_info "Copying .env.example to .env..."
        cp "${PROJECT_ROOT}/.env.example" "$ENV_FILE"
        log_warn "Please edit .env file with your configuration and run this script again"
        exit 1
    fi

    # Check critical environment variables
    source "$ENV_FILE"

    local critical_vars=(
        "DATABASE_PASSWORD"
        "JWT_SECRET"
    )

    local missing_vars=()
    for var in "${critical_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing critical environment variables: ${missing_vars[*]}"
        log_info "Please set these variables in .env file"
        exit 1
    fi

    # Warn about default passwords
    if [ "$DATABASE_PASSWORD" == "sup_secure_password" ]; then
        log_warn "Using default database password. Please change it for production!"
    fi

    if [ "$JWT_SECRET" == "your_jwt_secret_here_change_in_production" ]; then
        log_error "JWT_SECRET is still default. Please change it!"
        exit 1
    fi

    log_info "Environment configuration OK"
}

# Backup existing data
backup_data() {
    log_step "Creating backup..."

    mkdir -p "$BACKUP_DIR"

    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="${BACKUP_DIR}/backup_${timestamp}.sql"

    # Check if postgres container is running
    if docker ps | grep -q sup-postgres; then
        log_info "Backing up database to $backup_file"

        docker exec sup-postgres pg_dump -U "${DATABASE_USER:-sup_user}" "${DATABASE_NAME:-sup}" > "$backup_file"

        if [ $? -eq 0 ]; then
            log_info "Database backup created successfully"
            gzip "$backup_file"
            log_info "Backup compressed: ${backup_file}.gz"
        else
            log_warn "Database backup failed, but continuing deployment"
        fi
    else
        log_info "No existing database found, skipping backup"
    fi
}

# Build services
build_services() {
    log_step "Building services..."

    cd "$PROJECT_ROOT"

    log_info "Building Docker images..."
    docker-compose build --parallel

    if [ $? -eq 0 ]; then
        log_info "All services built successfully"
    else
        log_error "Build failed"
        exit 1
    fi
}

# Start infrastructure services first
start_infrastructure() {
    log_step "Starting infrastructure services..."

    cd "$PROJECT_ROOT"

    log_info "Starting postgres, redis, rabbitmq, kafka, minio..."
    docker-compose up -d postgres redis rabbitmq kafka minio

    # Wait for services to be healthy
    log_info "Waiting for infrastructure services to be healthy..."

    local max_wait=120
    local waited=0

    while [ $waited -lt $max_wait ]; do
        local all_healthy=true

        for service in postgres redis rabbitmq minio; do
            if ! docker-compose ps | grep "sup-${service}" | grep -q "healthy"; then
                all_healthy=false
                break
            fi
        done

        if [ "$all_healthy" = true ]; then
            log_info "All infrastructure services are healthy"
            return 0
        fi

        sleep 5
        waited=$((waited + 5))
        echo -n "."
    done

    echo ""
    log_error "Infrastructure services did not become healthy in time"
    docker-compose ps
    exit 1
}

# Run database migrations
run_migrations() {
    log_step "Running database migrations..."

    cd "$PROJECT_ROOT"

    # Wait a bit more for postgres to be fully ready
    sleep 5

    log_info "Executing migrations..."
    bash "${SCRIPT_DIR}/migrate.sh" up

    if [ $? -eq 0 ]; then
        log_info "Migrations completed successfully"
    else
        log_error "Migrations failed"
        exit 1
    fi
}

# Start application services
start_services() {
    log_step "Starting application services..."

    cd "$PROJECT_ROOT"

    log_info "Starting main-api, websocket-service, media-service, worker-service..."
    docker-compose up -d main-api websocket-service media-service worker-service

    log_info "Waiting for application services to be ready..."
    sleep 10

    # Check health of services
    local services=("main-api" "websocket-service" "media-service")

    for service in "${services[@]}"; do
        if docker ps | grep -q "sup-${service}"; then
            log_info "${service} is running"
        else
            log_error "${service} failed to start"
            docker-compose logs "${service}"
            exit 1
        fi
    done
}

# Start monitoring services
start_monitoring() {
    log_step "Starting monitoring services..."

    cd "$PROJECT_ROOT"

    log_info "Starting prometheus, grafana, loki, promtail..."
    docker-compose up -d prometheus grafana loki promtail

    log_info "Monitoring services started"
}

# Start WebRTC services
start_webrtc() {
    log_step "Starting WebRTC services..."

    cd "$PROJECT_ROOT"

    if [ -n "$LIVEKIT_API_KEY" ] && [ -n "$LIVEKIT_API_SECRET" ]; then
        log_info "Starting livekit and coturn..."
        docker-compose up -d livekit coturn
        log_info "WebRTC services started"
    else
        log_warn "LIVEKIT_API_KEY or LIVEKIT_API_SECRET not set, skipping WebRTC services"
    fi
}

# Start nginx
start_nginx() {
    log_step "Starting nginx reverse proxy..."

    cd "$PROJECT_ROOT"

    docker-compose up -d nginx

    log_info "Nginx started"
}

# Display service URLs
show_urls() {
    log_step "Deployment complete!"
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  SUP Messenger Services${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "Main API:           ${BLUE}http://localhost:3000${NC}"
    echo -e "WebSocket:          ${BLUE}http://localhost:3001${NC}"
    echo -e "Media Service:      ${BLUE}http://localhost:3003${NC}"
    echo ""
    echo -e "${GREEN}Infrastructure:${NC}"
    echo -e "PostgreSQL:         ${BLUE}localhost:5432${NC}"
    echo -e "Redis:              ${BLUE}localhost:6379${NC}"
    echo -e "RabbitMQ UI:        ${BLUE}http://localhost:15672${NC} (guest/guest)"
    echo -e "MinIO Console:      ${BLUE}http://localhost:9001${NC}"
    echo ""
    echo -e "${GREEN}Monitoring:${NC}"
    echo -e "Prometheus:         ${BLUE}http://localhost:9090${NC}"
    echo -e "Grafana:            ${BLUE}http://localhost:3002${NC} (admin/admin)"
    echo ""
    echo -e "${GREEN}Nginx Proxy:${NC}"
    echo -e "HTTP:               ${BLUE}http://localhost${NC}"
    echo -e "API:                ${BLUE}http://localhost/api/v1${NC}"
    echo -e "WebSocket:          ${BLUE}http://localhost/ws${NC}"
    echo ""
    echo -e "${YELLOW}Note: Change default passwords in production!${NC}"
    echo ""
}

# Show logs
show_logs() {
    log_step "Showing service logs (Ctrl+C to exit)..."
    cd "$PROJECT_ROOT"
    docker-compose logs -f --tail=100
}

# Health check
health_check() {
    log_step "Running health checks..."

    cd "$PROJECT_ROOT"

    echo ""
    docker-compose ps
    echo ""

    # Check main-api health endpoint
    if command -v curl &> /dev/null; then
        log_info "Checking main-api health..."
        if curl -f http://localhost:3000/health &> /dev/null; then
            log_info "main-api is healthy"
        else
            log_warn "main-api health check failed"
        fi
    fi
}

# Main deployment flow
main() {
    log_info "SUP Messenger Deployment Script"
    echo ""

    check_root
    check_prerequisites
    check_env_file

    # Parse arguments
    case "${1:-deploy}" in
        deploy)
            backup_data
            build_services
            start_infrastructure
            run_migrations
            start_services
            start_monitoring
            start_webrtc
            start_nginx
            health_check
            show_urls

            read -p "Show logs? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                show_logs
            fi
            ;;

        backup)
            backup_data
            ;;

        build)
            build_services
            ;;

        start)
            docker-compose up -d
            health_check
            show_urls
            ;;

        stop)
            log_step "Stopping all services..."
            docker-compose down
            log_info "All services stopped"
            ;;

        restart)
            log_step "Restarting services..."
            docker-compose restart
            health_check
            ;;

        logs)
            show_logs
            ;;

        status)
            health_check
            show_urls
            ;;

        clean)
            log_warn "This will remove all containers and volumes!"
            read -p "Are you sure? (yes/no) " -r
            if [[ $REPLY == "yes" ]]; then
                docker-compose down -v
                log_info "All containers and volumes removed"
            else
                log_info "Cancelled"
            fi
            ;;

        *)
            echo "Usage: $0 {deploy|backup|build|start|stop|restart|logs|status|clean}"
            echo ""
            echo "Commands:"
            echo "  deploy  - Full deployment (build, start, migrate)"
            echo "  backup  - Backup database"
            echo "  build   - Build Docker images"
            echo "  start   - Start all services"
            echo "  stop    - Stop all services"
            echo "  restart - Restart all services"
            echo "  logs    - Show service logs"
            echo "  status  - Show service status"
            echo "  clean   - Remove all containers and volumes"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
