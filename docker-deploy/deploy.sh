#!/bin/bash

# E-Maintenance Production Deployment Script
# Target Server: 10.163.144.13 (Ubuntu Linux)
# Version: 1.0
# Date: 2025-08-19

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"
PROJECT_NAME="emaintenance-prod"
BACKUP_DIR="/opt/emaintenance/backups"
LOG_FILE="/opt/emaintenance/logs/deploy-$(date +%Y%m%d-%H%M%S).log"
LOCAL_REGISTRY="10.163.144.13:5000"

# Functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# Check if running as root or with sudo
check_privileges() {
    if [[ $EUID -eq 0 ]]; then
        warning "Running as root. Consider using a dedicated user for deployment."
    fi
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check available disk space (minimum 10GB)
    AVAILABLE_SPACE=$(df / | tail -1 | awk '{print $4}')
    if [[ $AVAILABLE_SPACE -lt 10485760 ]]; then
        warning "Available disk space is less than 10GB. Consider freeing up space."
    fi
    
    # Check available memory (minimum 4GB)
    AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [[ $AVAILABLE_MEM -lt 4096 ]]; then
        warning "Available memory is less than 4GB. Performance may be affected."
    fi
    
    log "System requirements check completed."
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    sudo mkdir -p "$BACKUP_DIR"
    sudo mkdir -p "/opt/emaintenance/logs"
    sudo mkdir -p "/opt/emaintenance/uploads"
    sudo mkdir -p "/opt/emaintenance/data/postgres"
    sudo mkdir -p "/opt/emaintenance/data/redis"
    
    # Set permissions
    sudo chown -R $USER:$USER "/opt/emaintenance"
    sudo chmod -R 755 "/opt/emaintenance"
    
    log "Directories created successfully."
}

# Load environment variables
load_environment() {
    log "Loading environment configuration..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Environment file $ENV_FILE not found."
    fi
    
    set -a  # Automatically export all variables
    source "$ENV_FILE"
    set +a
    
    log "Environment configuration loaded."
}

# Backup existing data
backup_data() {
    log "Creating backup of existing data..."
    
    BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$BACKUP_TIMESTAMP"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup database if container exists
    if docker ps -a --format 'table {{.Names}}' | grep -q "emaintenance-db"; then
        info "Backing up database..."
        docker exec emaintenance-db pg_dump -U postgres emaintenance > "$BACKUP_PATH/database_backup.sql" || warning "Database backup failed"
    fi
    
    # Backup uploads directory
    if [[ -d "/opt/emaintenance/uploads" ]]; then
        info "Backing up uploads..."
        cp -r "/opt/emaintenance/uploads" "$BACKUP_PATH/" || warning "Uploads backup failed"
    fi
    
    log "Backup created at $BACKUP_PATH"
}

# Configure local Docker registry
configure_local_registry() {
    log "Configuring local Docker registry..."
    
    # Check if local registry is accessible
    if curl -f http://$LOCAL_REGISTRY/v2/ >/dev/null 2>&1; then
        log "Local registry $LOCAL_REGISTRY is accessible"
    else
        warning "Local registry $LOCAL_REGISTRY is not accessible, using default Docker Hub"
        return 0
    fi
    
    # Configure Docker daemon to use local registry
    info "Configuring Docker to use local registry..."
    
    # Create or backup daemon.json
    if [[ -f "/etc/docker/daemon.json" ]]; then
        sudo cp /etc/docker/daemon.json "/etc/docker/daemon.json.backup.$(date +%Y%m%d_%H%M%S)"
        info "Backed up existing Docker daemon configuration"
    fi
    
    # Create new daemon.json with local registry configuration
    cat > /tmp/daemon.json << EOF
{
  "insecure-registries": ["$LOCAL_REGISTRY"],
  "registry-mirrors": ["http://$LOCAL_REGISTRY"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
    
    sudo mv /tmp/daemon.json /etc/docker/daemon.json
    
    # Restart Docker daemon
    info "Restarting Docker daemon to apply registry configuration..."
    sudo systemctl restart docker
    
    # Wait for Docker to restart
    sleep 15
    
    if systemctl is-active --quiet docker; then
        log "Docker daemon restarted successfully with local registry configuration"
    else
        error "Failed to restart Docker daemon"
    fi
}

# Pre-pull images from local registry
pull_local_images() {
    log "Pre-pulling images from local registry..."
    
    # List of base images to pre-pull
    local_images=(
        "$LOCAL_REGISTRY/postgres:16-alpine"
        "$LOCAL_REGISTRY/redis:7-alpine"
        "$LOCAL_REGISTRY/nginx:alpine"
    )
    
    for image in "${local_images[@]}"; do
        info "Pulling image: $image"
        if docker pull "$image" 2>/dev/null; then
            log "Successfully pulled: $image"
        else
            warning "Failed to pull: $image (will fallback to Docker Hub)"
        fi
    done
    
    log "Image pre-pull completed"
}

# Pull latest images
pull_images() {
    log "Pulling latest Docker images..."
    
    docker-compose -f "$COMPOSE_FILE" pull || error "Failed to pull Docker images"
    
    log "Docker images pulled successfully."
}

# Build custom images
build_images() {
    log "Building custom Docker images..."
    
    docker-compose -f "$COMPOSE_FILE" build --no-cache || error "Failed to build Docker images"
    
    log "Docker images built successfully."
}

# Stop existing containers
stop_containers() {
    log "Stopping existing containers..."
    
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans || warning "Some containers might not have stopped gracefully"
    
    log "Containers stopped."
}

# Start services
start_services() {
    log "Starting E-Maintenance services..."
    
    # Start infrastructure services first
    docker-compose -f "$COMPOSE_FILE" up -d database redis
    
    # Wait for database to be ready
    info "Waiting for database to be ready..."
    sleep 30
    
    # Start API services
    docker-compose -f "$COMPOSE_FILE" up -d user-service work-order-service asset-service
    
    # Wait for API services to be ready
    info "Waiting for API services to be ready..."
    sleep 30
    
    # Start web application and nginx
    docker-compose -f "$COMPOSE_FILE" up -d web nginx
    
    log "All services started successfully."
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Wait for user service to be ready
    info "Waiting for user service to be fully ready..."
    sleep 15
    
    # Run migrations through user service container
    docker exec emaintenance-user-service npm run db:generate || error "Failed to generate Prisma client"
    docker exec emaintenance-user-service npm run db:push || error "Failed to run database migrations"
    
    log "Database migrations completed."
}

# Seed database with initial data
seed_database() {
    log "Seeding database with initial data..."
    
    docker exec emaintenance-user-service npm run db:seed || warning "Database seeding failed"
    
    log "Database seeding completed."
}

# Health checks
perform_health_checks() {
    log "Performing health checks..."
    
    # Check service health
    services=("database" "redis" "user-service" "work-order-service" "asset-service" "web" "nginx")
    
    for service in "${services[@]}"; do
        info "Checking $service health..."
        
        # Wait up to 60 seconds for service to be healthy
        for i in {1..12}; do
            if docker-compose -f "$COMPOSE_FILE" ps | grep "$service" | grep -q "healthy\|Up"; then
                info "$service is healthy"
                break
            fi
            
            if [[ $i -eq 12 ]]; then
                error "$service failed health check"
            fi
            
            sleep 5
        done
    done
    
    # Test API endpoints
    info "Testing API endpoints..."
    
    sleep 10  # Give services more time to fully start
    
    # Test endpoints with timeout
    timeout 10s curl -f http://localhost:3001/health || warning "User service health check failed"
    timeout 10s curl -f http://localhost:3002/health || warning "Work order service health check failed"
    timeout 10s curl -f http://localhost:3003/health || warning "Asset service health check failed"
    timeout 10s curl -f http://localhost || warning "Web application health check failed"
    
    log "Health checks completed."
}

# Display service status
show_status() {
    log "Deployment completed successfully!"
    
    echo -e "${GREEN}"
    echo "=========================================="
    echo "  E-Maintenance System Status"
    echo "=========================================="
    echo -e "${NC}"
    
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo -e "${BLUE}"
    echo "Access URLs:"
    echo "  Web Application:    http://10.163.144.13"
    echo "  User Service API:   http://10.163.144.13:3001"
    echo "  Work Order API:     http://10.163.144.13:3002"
    echo "  Asset Service API:  http://10.163.144.13:3003"
    echo ""
    echo "Default Admin Login:"
    echo "  Email:    admin@bizlink.com.my"
    echo "  Password: admin123"
    echo -e "${NC}"
}

# Cleanup function
cleanup() {
    if [[ $? -ne 0 ]]; then
        error "Deployment failed. Check logs at $LOG_FILE"
        echo -e "${RED}You can view detailed logs with: tail -f $LOG_FILE${NC}"
    fi
}

# Main deployment function
main() {
    log "Starting E-Maintenance production deployment..."
    log "Target server: 10.163.144.13"
    log "Deployment timestamp: $(date)"
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Run deployment steps
    check_privileges
    check_requirements
    create_directories
    load_environment
    backup_data
    configure_local_registry
    pull_local_images
    stop_containers
    pull_images
    build_images
    start_services
    run_migrations
    seed_database
    perform_health_checks
    show_status
    
    log "Deployment completed successfully at $(date)"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi