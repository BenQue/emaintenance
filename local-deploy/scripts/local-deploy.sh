#!/bin/bash

# Local Deployment Management Script
# This script manages the local testing environment

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOCAL_DEPLOY_DIR="${PROJECT_DIR}/local-deploy"
DOCKER_COMPOSE_FILE="${LOCAL_DEPLOY_DIR}/docker-compose/docker-compose.local.yml"
ENV_FILE="${LOCAL_DEPLOY_DIR}/configs/.env.local"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

Local deployment management for E-Maintenance system

COMMANDS:
    up              Start all local services
    down            Stop all local services
    restart         Restart all local services
    logs            Show logs for all or specific service
    status          Show status of all services
    clean           Clean up local environment (remove containers, volumes, images)
    reset           Full reset (clean + rebuild)
    build           Build images before starting
    shell           Open shell in running container
    db              Database management commands
    test            Run health checks and tests

OPTIONS:
    -h, --help      Show this help message
    -f, --force     Force operation (for clean/reset)
    -b, --build     Build images before starting (for up command)
    -d, --detach    Run in detached mode
    --service NAME  Target specific service
    --no-logs       Don't follow logs (for up command)

DATABASE COMMANDS:
    $0 db migrate   Run database migrations
    $0 db seed      Seed database with test data
    $0 db reset     Reset database (drop and recreate)
    $0 db backup    Create database backup
    $0 db restore   Restore database from backup

EXAMPLES:
    $0 up                           # Start all services
    $0 up --build                   # Build and start all services
    $0 logs --service web-local     # Show logs for web service
    $0 shell --service user-service-local  # Open shell in user service
    $0 clean --force                # Force clean all local resources
    $0 test                         # Run health checks

EOF
}

# Check prerequisites
check_prerequisites() {
    local missing=0
    
    if ! command -v docker >/dev/null 2>&1; then
        error "Docker is not installed or not in PATH"
        missing=1
    fi
    
    if ! command -v docker-compose >/dev/null 2>&1; then
        error "Docker Compose is not installed or not in PATH"
        missing=1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running"
        missing=1
    fi
    
    if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
        error "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
        missing=1
    fi
    
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Environment file not found: $ENV_FILE"
        missing=1
    fi
    
    if [[ $missing -eq 1 ]]; then
        exit 1
    fi
}

# Create required directories
create_directories() {
    local base_dir="${LOCAL_DEPLOY_DIR}"
    
    log "Creating required directories..."
    
    # Data directories
    mkdir -p "${base_dir}/local-data/postgres"
    mkdir -p "${base_dir}/local-data/redis"
    mkdir -p "${base_dir}/local-data/uploads/work-orders"
    mkdir -p "${base_dir}/local-data/uploads/assets"
    
    # Log directories
    mkdir -p "${base_dir}/local-logs/postgres"
    mkdir -p "${base_dir}/local-logs/redis"
    mkdir -p "${base_dir}/local-logs/user-service"
    mkdir -p "${base_dir}/local-logs/work-order-service"
    mkdir -p "${base_dir}/local-logs/asset-service"
    mkdir -p "${base_dir}/local-logs/web"
    mkdir -p "${base_dir}/local-logs/nginx"
    
    # Backup directories
    mkdir -p "${base_dir}/local-backups"
    
    # Set permissions
    chmod -R 755 "${base_dir}/local-data"
    chmod -R 755 "${base_dir}/local-logs"
    chmod -R 755 "${base_dir}/local-backups"
    
    success "Directories created successfully"
}

# Docker Compose wrapper
docker_compose() {
    docker-compose -f "$DOCKER_COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

# Start services
start_services() {
    local build=false
    local detach=true
    local follow_logs=true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --build|-b)
                build=true
                shift
                ;;
            --no-logs)
                follow_logs=false
                shift
                ;;
            --attach)
                detach=false
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
    
    log "Starting local deployment..."
    
    create_directories
    
    if [[ "$build" == "true" ]]; then
        log "Building images first..."
        "${SCRIPT_DIR}/build-images.sh" all
    fi
    
    # Start services
    if [[ "$detach" == "true" ]]; then
        docker_compose up -d
        
        if [[ "$follow_logs" == "true" ]]; then
            log "Services started. Following logs (Ctrl+C to stop following)..."
            sleep 2
            docker_compose logs -f
        else
            success "Services started in detached mode"
            show_status
        fi
    else
        docker_compose up
    fi
}

# Stop services
stop_services() {
    log "Stopping local deployment..."
    docker_compose down
    success "Services stopped"
}

# Restart services
restart_services() {
    log "Restarting local deployment..."
    docker_compose restart
    success "Services restarted"
    show_status
}

# Show logs
show_logs() {
    local service=""
    local follow=true
    local tail=100
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --service)
                service="$2"
                shift 2
                ;;
            --no-follow)
                follow=false
                shift
                ;;
            --tail)
                tail="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done
    
    if [[ -n "$service" ]]; then
        if [[ "$follow" == "true" ]]; then
            docker_compose logs -f --tail="$tail" "$service"
        else
            docker_compose logs --tail="$tail" "$service"
        fi
    else
        if [[ "$follow" == "true" ]]; then
            docker_compose logs -f --tail="$tail"
        else
            docker_compose logs --tail="$tail"
        fi
    fi
}

# Show status
show_status() {
    log "Local deployment status:"
    echo
    docker_compose ps
    echo
    
    # Check service health
    log "Health check summary:"
    
    local services=("postgres-local" "redis-local" "user-service-local" "work-order-service-local" "asset-service-local" "web-local" "nginx-local")
    
    for service in "${services[@]}"; do
        local container_name="${PROJECT_NAME:-emaintenance}_${service/_/-}"
        local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "unknown")
        
        case $health_status in
            "healthy")
                echo -e "  ${GREEN}✓${NC} $service: healthy"
                ;;
            "unhealthy")
                echo -e "  ${RED}✗${NC} $service: unhealthy"
                ;;
            "starting")
                echo -e "  ${YELLOW}⟳${NC} $service: starting"
                ;;
            *)
                echo -e "  ${YELLOW}?${NC} $service: $health_status"
                ;;
        esac
    done
    
    echo
    log "Access URLs:"
    echo "  Web Application: http://localhost:4000"
    echo "  Nginx Proxy:     http://localhost:4030"
    echo "  User Service:    http://localhost:4001"
    echo "  Work Orders:     http://localhost:4002"
    echo "  Asset Service:   http://localhost:4003"
    echo "  PostgreSQL:      localhost:5434"
    echo "  Redis:           localhost:6380"
}

# Clean up
clean_environment() {
    local force=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force|-f)
                force=true
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
    
    if [[ "$force" != "true" ]]; then
        echo -n "This will remove all local containers, volumes, and images. Are you sure? (y/N): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log "Clean operation cancelled"
            return 0
        fi
    fi
    
    warning "Cleaning local deployment environment..."
    
    # Stop and remove containers
    docker_compose down -v --remove-orphans
    
    # Remove images
    log "Removing local images..."
    docker images --format "table {{.Repository}}:{{.Tag}}" | grep "local/emaintenance" | awk '{print $1}' | xargs -r docker rmi -f
    
    # Clean up directories
    log "Cleaning local data directories..."
    rm -rf "${LOCAL_DEPLOY_DIR}/local-data"
    rm -rf "${LOCAL_DEPLOY_DIR}/local-logs"
    rm -rf "${LOCAL_DEPLOY_DIR}/local-backups"
    
    success "Local environment cleaned"
}

# Reset environment
reset_environment() {
    log "Resetting local deployment environment..."
    clean_environment --force
    
    log "Rebuilding images..."
    "${SCRIPT_DIR}/build-images.sh" all
    
    log "Starting fresh environment..."
    start_services --no-logs
    
    success "Environment reset complete"
}

# Open shell in container
open_shell() {
    local service=""
    local shell="/bin/bash"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --service)
                service="$2"
                shift 2
                ;;
            --shell)
                shell="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done
    
    if [[ -z "$service" ]]; then
        error "Please specify a service with --service"
        exit 1
    fi
    
    log "Opening shell in $service..."
    docker_compose exec "$service" "$shell"
}

# Database management
manage_database() {
    local command="$1"
    shift
    
    case $command in
        "migrate")
            log "Running database migrations..."
            docker_compose run --rm migrations-local sh -c "npm run db:generate && npm run db:migrate"
            ;;
        "seed")
            log "Seeding database..."
            docker_compose run --rm migrations-local npm run db:seed
            ;;
        "reset")
            warning "Resetting database..."
            docker_compose run --rm migrations-local npm run db:reset
            ;;
        "backup")
            local backup_file="${LOCAL_DEPLOY_DIR}/local-backups/db_backup_$(date +%Y%m%d_%H%M%S).sql"
            log "Creating database backup: $backup_file"
            docker_compose exec postgres-local pg_dump -U postgres emaintenance_local > "$backup_file"
            success "Database backup created: $backup_file"
            ;;
        "restore")
            local backup_file="$1"
            if [[ -z "$backup_file" ]]; then
                error "Please specify backup file"
                exit 1
            fi
            log "Restoring database from: $backup_file"
            docker_compose exec -T postgres-local psql -U postgres emaintenance_local < "$backup_file"
            success "Database restored"
            ;;
        *)
            error "Unknown database command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run health checks and tests
run_tests() {
    log "Running health checks and tests..."
    
    # Check if services are running
    if ! docker_compose ps | grep -q "Up"; then
        error "Services are not running. Start them first with: $0 up"
        exit 1
    fi
    
    # Health check endpoints
    local endpoints=(
        "http://localhost:4030/health|Nginx"
        "http://localhost:4000/api/health|Web App"
        "http://localhost:4001/health|User Service"
        "http://localhost:4002/health|Work Order Service"
        "http://localhost:4003/health|Asset Service"
    )
    
    local failed=0
    
    for endpoint_info in "${endpoints[@]}"; do
        local url=$(echo "$endpoint_info" | cut -d'|' -f1)
        local name=$(echo "$endpoint_info" | cut -d'|' -f2)
        
        log "Testing $name: $url"
        
        if curl -f -s -m 10 "$url" >/dev/null; then
            success "$name is healthy"
        else
            error "$name health check failed"
            failed=$((failed + 1))
        fi
    done
    
    # Database connectivity test
    log "Testing database connectivity..."
    if docker_compose exec postgres-local pg_isready -U postgres -d emaintenance_local >/dev/null 2>&1; then
        success "Database is healthy"
    else
        error "Database connectivity failed"
        failed=$((failed + 1))
    fi
    
    # Redis connectivity test
    log "Testing Redis connectivity..."
    if docker_compose exec redis-local redis-cli ping >/dev/null 2>&1; then
        success "Redis is healthy"
    else
        error "Redis connectivity failed"
        failed=$((failed + 1))
    fi
    
    if [[ $failed -eq 0 ]]; then
        success "All health checks passed!"
    else
        error "$failed health checks failed"
        exit 1
    fi
}

# Main command processing
main() {
    if [[ $# -eq 0 ]]; then
        show_help
        exit 0
    fi
    
    local command="$1"
    shift
    
    # Check prerequisites for most commands
    case $command in
        "help"|"-h"|"--help")
            show_help
            exit 0
            ;;
        *)
            check_prerequisites
            ;;
    esac
    
    case $command in
        "up")
            start_services "$@"
            ;;
        "down")
            stop_services "$@"
            ;;
        "restart")
            restart_services "$@"
            ;;
        "logs")
            show_logs "$@"
            ;;
        "status")
            show_status "$@"
            ;;
        "clean")
            clean_environment "$@"
            ;;
        "reset")
            reset_environment "$@"
            ;;
        "build")
            "${SCRIPT_DIR}/build-images.sh" "$@"
            ;;
        "shell")
            open_shell "$@"
            ;;
        "db")
            manage_database "$@"
            ;;
        "test")
            run_tests "$@"
            ;;
        *)
            error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"