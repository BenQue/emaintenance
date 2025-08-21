#!/bin/bash

# E-Maintenance Fixed Production Deployment Script
# Target Server: 10.163.144.13 (Ubuntu Linux)
# Version: 2.0 - Fixed
# Date: 2025-08-21

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.fixed.yml"
ENV_FILE=".env.production"
PROJECT_NAME="emaintenance"
BACKUP_DIR="/opt/emaintenance/backups"
LOG_DIR="/opt/emaintenance/logs"
LOG_FILE="${LOG_DIR}/deploy-$(date +%Y%m%d-%H%M%S).log"

# Create log directory if it doesn't exist
mkdir -p "${LOG_DIR}" 2>/dev/null || true

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

success() {
    echo -e "${MAGENTA}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}" | tee -a "$LOG_FILE"
}

# Check if running with appropriate privileges
check_privileges() {
    log "Checking user privileges..."
    
    if [[ $EUID -eq 0 ]]; then
        warning "Running as root. This is acceptable for deployment."
    else
        info "Running as user: $USER"
        info "You may need to enter sudo password for some operations."
    fi
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    info "Docker version: $(docker --version)"
    
    # Check Docker Compose
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
        info "Docker Compose version: $(docker-compose --version)"
    elif docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
        info "Docker Compose (plugin) version: $(docker compose version)"
    else
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check available disk space (minimum 10GB)
    AVAILABLE_SPACE=$(df / | tail -1 | awk '{print int($4/1048576)}')
    if [[ $AVAILABLE_SPACE -lt 10 ]]; then
        warning "Available disk space is less than 10GB (${AVAILABLE_SPACE}GB). Consider freeing up space."
    else
        info "Available disk space: ${AVAILABLE_SPACE}GB"
    fi
    
    # Check available memory (minimum 4GB)
    AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $7/1024}')
    if [[ $AVAILABLE_MEM -lt 4 ]]; then
        warning "Available memory is less than 4GB (${AVAILABLE_MEM}GB). Performance may be affected."
    else
        info "Available memory: ${AVAILABLE_MEM}GB"
    fi
    
    # Check if required ports are available
    check_ports
    
    log "System requirements check completed."
}

# Check if required ports are available
check_ports() {
    log "Checking port availability..."
    
    REQUIRED_PORTS=(3030 3031 3032 3033 5432 6379)
    PORTS_IN_USE=()
    
    for port in "${REQUIRED_PORTS[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            PORTS_IN_USE+=($port)
            warning "Port $port is already in use"
        else
            info "Port $port is available"
        fi
    done
    
    if [ ${#PORTS_IN_USE[@]} -gt 0 ]; then
        error "The following ports are already in use: ${PORTS_IN_USE[*]}. Please free these ports before continuing."
    fi
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    sudo mkdir -p "$BACKUP_DIR"
    sudo mkdir -p "$LOG_DIR"
    sudo mkdir -p "/opt/emaintenance/uploads"
    sudo mkdir -p "/opt/emaintenance/data/postgres"
    sudo mkdir -p "/opt/emaintenance/data/redis"
    sudo mkdir -p "/opt/emaintenance/nginx/logs"
    
    # Create local directories for logs
    mkdir -p ./logs/web
    mkdir -p ./logs/user-service
    mkdir -p ./logs/work-order-service
    mkdir -p ./logs/asset-service
    mkdir -p ./nginx/logs
    
    # Set permissions
    sudo chown -R $USER:$USER "/opt/emaintenance" 2>/dev/null || true
    sudo chmod -R 755 "/opt/emaintenance" 2>/dev/null || true
    
    # Make wait-for-it.sh executable
    chmod +x ./scripts/wait-for-it.sh 2>/dev/null || true
    
    log "Directories created successfully."
}

# Load and validate environment variables
load_environment() {
    log "Loading environment configuration..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Environment file $ENV_FILE not found. Creating from template..."
    fi
    
    # Source the environment file
    set -a  # Automatically export all variables
    source "$ENV_FILE"
    set +a
    
    # Validate critical environment variables
    if [[ -z "${DB_PASSWORD:-}" ]]; then
        error "DB_PASSWORD is not set in $ENV_FILE"
    fi
    
    if [[ -z "${JWT_SECRET:-}" ]]; then
        warning "JWT_SECRET is not set, using default (not recommended for production)"
    fi
    
    if [[ -z "${REDIS_PASSWORD:-}" ]]; then
        warning "REDIS_PASSWORD is not set, using default (not recommended for production)"
    fi
    
    info "Database: ${DB_NAME:-emaintenance}"
    info "Database User: ${DB_USER:-postgres}"
    info "Web Port: ${HTTP_PORT:-3030}"
    info "CORS Origin: ${CORS_ORIGIN:-http://10.163.144.13:3030}"
    
    log "Environment configuration loaded and validated."
}

# Backup existing data
backup_data() {
    log "Creating backup of existing data..."
    
    BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$BACKUP_TIMESTAMP"
    
    mkdir -p "$BACKUP_PATH"
    
    # Check if PostgreSQL container exists and is running
    if docker ps --format 'table {{.Names}}' | grep -q "emaintenance-postgres"; then
        info "Backing up database..."
        docker exec emaintenance-postgres pg_dump -U ${DB_USER:-postgres} ${DB_NAME:-emaintenance} > "$BACKUP_PATH/database_backup.sql" 2>/dev/null || warning "Database backup failed (container might be starting)"
    fi
    
    # Backup uploads directory if it exists
    if [[ -d "/opt/emaintenance/uploads" ]] && [[ "$(ls -A /opt/emaintenance/uploads)" ]]; then
        info "Backing up uploads..."
        cp -r "/opt/emaintenance/uploads" "$BACKUP_PATH/" || warning "Uploads backup failed"
    fi
    
    # Backup current environment file
    if [[ -f "$ENV_FILE" ]]; then
        cp "$ENV_FILE" "$BACKUP_PATH/.env.production.backup"
    fi
    
    log "Backup created at $BACKUP_PATH"
}

# Stop and clean existing containers
stop_existing_services() {
    log "Stopping existing services..."
    
    # Stop all containers with our project name
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down --remove-orphans 2>/dev/null || true
    
    # Also try to stop with default compose file if it exists
    if [[ -f "docker-compose.yml" ]]; then
        $DOCKER_COMPOSE_CMD -f "docker-compose.yml" -p "$PROJECT_NAME" down --remove-orphans 2>/dev/null || true
    fi
    
    # Remove any orphaned containers
    docker ps -a | grep emaintenance | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true
    
    log "Existing services stopped."
}

# Clean Docker resources
clean_docker() {
    log "Cleaning Docker resources..."
    
    # Remove unused images
    docker image prune -f || true
    
    # Remove unused volumes (be careful!)
    # docker volume prune -f || true
    
    # Remove unused networks
    docker network prune -f || true
    
    log "Docker resources cleaned."
}

# Build Docker images
build_images() {
    log "Building Docker images..."
    
    # Build all services
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" build --no-cache || error "Failed to build Docker images"
    
    success "Docker images built successfully."
}

# Start services in correct order
start_services() {
    log "Starting E-Maintenance services..."
    
    # Start database and redis first
    info "Starting infrastructure services (PostgreSQL, Redis)..."
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d postgres redis
    
    # Wait for database to be healthy
    info "Waiting for database to be ready..."
    for i in {1..30}; do
        if docker exec emaintenance-postgres pg_isready -U ${DB_USER:-postgres} >/dev/null 2>&1; then
            success "Database is ready!"
            break
        fi
        if [[ $i -eq 30 ]]; then
            error "Database failed to start within 30 seconds"
        fi
        echo -n "."
        sleep 1
    done
    echo
    
    # Run database initialization
    info "Initializing database schema..."
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up db-init
    
    # Wait for db-init to complete
    info "Waiting for database initialization to complete..."
    for i in {1..60}; do
        if ! docker ps | grep -q "emaintenance-db-init"; then
            success "Database initialization completed!"
            break
        fi
        if [[ $i -eq 60 ]]; then
            warning "Database initialization took longer than expected"
            break
        fi
        echo -n "."
        sleep 1
    done
    echo
    
    # Start API services
    info "Starting API services..."
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d user-service work-order-service asset-service
    
    # Wait for API services to be healthy
    info "Waiting for API services to be ready..."
    sleep 10
    
    # Check each API service
    services=("user-service:3001" "work-order-service:3002" "asset-service:3003")
    for service_port in "${services[@]}"; do
        service="${service_port%:*}"
        port="${service_port#*:}"
        
        info "Checking $service on port $port..."
        for i in {1..30}; do
            if curl -f http://localhost:$port/health >/dev/null 2>&1; then
                success "$service is healthy!"
                break
            fi
            if [[ $i -eq 30 ]]; then
                warning "$service health check failed"
            fi
            echo -n "."
            sleep 1
        done
        echo
    done
    
    # Start web application
    info "Starting web application..."
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d web
    
    # Wait for web to be ready
    info "Waiting for web application to be ready..."
    sleep 15
    
    # Start Nginx
    info "Starting Nginx reverse proxy..."
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d nginx
    
    success "All services started successfully."
}

# Perform comprehensive health checks
perform_health_checks() {
    log "Performing comprehensive health checks..."
    
    # Check container status
    info "Container status:"
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps
    
    # Test each endpoint
    ENDPOINTS=(
        "http://localhost:5432:PostgreSQL"
        "http://localhost:6379:Redis"
        "http://localhost:3001/health:User Service"
        "http://localhost:3002/health:Work Order Service"
        "http://localhost:3003/health:Asset Service"
        "http://localhost:3030:Web Application"
    )
    
    FAILED_CHECKS=()
    
    for endpoint_info in "${ENDPOINTS[@]}"; do
        endpoint="${endpoint_info%:*}"
        service_name="${endpoint_info##*:}"
        
        info "Testing $service_name..."
        
        if [[ "$service_name" == "PostgreSQL" ]]; then
            if docker exec emaintenance-postgres pg_isready -U ${DB_USER:-postgres} >/dev/null 2>&1; then
                success "$service_name is healthy"
            else
                FAILED_CHECKS+=("$service_name")
                warning "$service_name health check failed"
            fi
        elif [[ "$service_name" == "Redis" ]]; then
            if docker exec emaintenance-redis redis-cli -a ${REDIS_PASSWORD:-Emaint2024Redis!} ping >/dev/null 2>&1; then
                success "$service_name is healthy"
            else
                FAILED_CHECKS+=("$service_name")
                warning "$service_name health check failed"
            fi
        else
            if curl -f -m 5 "$endpoint" >/dev/null 2>&1; then
                success "$service_name is healthy"
            else
                FAILED_CHECKS+=("$service_name")
                warning "$service_name health check failed"
            fi
        fi
    done
    
    if [ ${#FAILED_CHECKS[@]} -gt 0 ]; then
        warning "The following services failed health checks: ${FAILED_CHECKS[*]}"
        warning "Please check the logs for more information."
    else
        success "All health checks passed!"
    fi
}

# Display service information
show_status() {
    echo
    echo -e "${GREEN}=========================================="
    echo "  E-Maintenance Deployment Complete!"
    echo "==========================================${NC}"
    echo
    
    echo -e "${BLUE}Access URLs:${NC}"
    echo "  Web Application:         http://10.163.144.13:3030"
    echo "  User Service API:        http://10.163.144.13:3031"
    echo "  Work Order Service API:  http://10.163.144.13:3032"
    echo "  Asset Service API:       http://10.163.144.13:3033"
    echo
    
    echo -e "${MAGENTA}Database Access:${NC}"
    echo "  Host: 10.163.144.13"
    echo "  Port: 5432"
    echo "  Database: ${DB_NAME:-emaintenance}"
    echo "  Username: ${DB_USER:-postgres}"
    echo
    
    echo -e "${YELLOW}Default Admin Credentials:${NC}"
    echo "  Email:    admin@emaintenance.com"
    echo "  Password: Admin@123456"
    echo
    
    echo -e "${GREEN}Container Status:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep emaintenance || true
    echo
    
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "  View logs:        $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE logs -f [service]"
    echo "  Stop services:    $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE down"
    echo "  Restart service:  $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE restart [service]"
    echo "  View status:      $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE ps"
    echo
    
    echo -e "${GREEN}Deployment log saved to: $LOG_FILE${NC}"
}

# Main deployment function
main() {
    log "=========================================="
    log "E-Maintenance Fixed Deployment Script v2.0"
    log "Target: 10.163.144.13"
    log "Date: $(date)"
    log "=========================================="
    
    # Change to script directory
    cd "$(dirname "$0")"
    
    # Run deployment steps
    check_privileges
    check_requirements
    create_directories
    load_environment
    backup_data
    stop_existing_services
    clean_docker
    build_images
    start_services
    perform_health_checks
    show_status
    
    success "Deployment completed successfully at $(date)"
    success "Please test the application at http://10.163.144.13:3030"
}

# Error handler
handle_error() {
    error "Deployment failed at line $1"
    echo -e "${RED}Check the log file for details: $LOG_FILE${NC}"
    exit 1
}

# Set error trap
trap 'handle_error $LINENO' ERR

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi