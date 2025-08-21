#!/bin/bash

# E-Maintenance System Production Deployment Script
# This script handles the complete deployment process on a Linux server

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEPLOY_DIR="${PROJECT_ROOT}/docker-deploy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${DEPLOY_DIR}/backups/${TIMESTAMP}"
LOG_FILE="${DEPLOY_DIR}/logs/deployment_${TIMESTAMP}.log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "${LOG_FILE}"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "${LOG_FILE}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "${LOG_FILE}"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "${LOG_FILE}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check if running as root or with sudo
    if [[ $EUID -ne 0 ]] && ! sudo -n true 2>/dev/null; then
        warning "This script should be run with sudo privileges for optimal performance."
    fi
    
    # Check disk space (minimum 10GB free)
    available_space=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$available_space" -lt 10 ]; then
        error "Insufficient disk space. At least 10GB free space required."
    fi
    
    log "Prerequisites check passed"
}

# Create necessary directories
setup_directories() {
    log "Setting up directories..."
    
    mkdir -p "${DEPLOY_DIR}/logs"
    mkdir -p "${DEPLOY_DIR}/backups"
    mkdir -p "${DEPLOY_DIR}/nginx/ssl"
    mkdir -p "${DEPLOY_DIR}/data/postgres"
    mkdir -p "${DEPLOY_DIR}/data/redis"
    mkdir -p "${DEPLOY_DIR}/data/uploads"
    
    # Set proper permissions
    chmod 755 "${DEPLOY_DIR}/logs"
    chmod 700 "${DEPLOY_DIR}/backups"
    
    log "Directories created successfully"
}

# Backup existing deployment
backup_existing() {
    if [ -f "${DEPLOY_DIR}/docker-compose.yml" ]; then
        log "Backing up existing deployment..."
        
        mkdir -p "${BACKUP_DIR}"
        
        # Backup database if running
        if docker ps | grep -q emaintenance-postgres; then
            info "Backing up database..."
            docker exec emaintenance-postgres pg_dump -U postgres emaintenance > "${BACKUP_DIR}/database_backup.sql" || warning "Database backup failed"
        fi
        
        # Backup configuration files
        cp -r "${DEPLOY_DIR}"/*.yml "${BACKUP_DIR}/" 2>/dev/null || true
        cp "${DEPLOY_DIR}/.env" "${BACKUP_DIR}/" 2>/dev/null || true
        
        log "Backup completed at ${BACKUP_DIR}"
    fi
}

# Load environment variables
load_environment() {
    log "Loading environment configuration..."
    
    if [ ! -f "${DEPLOY_DIR}/.env" ]; then
        if [ -f "${DEPLOY_DIR}/.env.template" ]; then
            warning ".env file not found. Creating from template..."
            cp "${DEPLOY_DIR}/.env.template" "${DEPLOY_DIR}/.env"
            error "Please edit ${DEPLOY_DIR}/.env with your configuration values and run the script again."
        else
            error ".env file not found and no template available."
        fi
    fi
    
    # Source the environment file
    set -a
    source "${DEPLOY_DIR}/.env"
    set +a
    
    log "Environment configuration loaded"
}

# Build Docker images
build_images() {
    log "Building Docker images..."
    
    cd "${PROJECT_ROOT}"
    
    # Build all services
    docker-compose -f "${DEPLOY_DIR}/docker-compose.yml" build --no-cache || error "Failed to build Docker images"
    
    log "Docker images built successfully"
}

# Deploy services
deploy_services() {
    log "Deploying services..."
    
    cd "${DEPLOY_DIR}"
    
    # Stop existing services
    if docker-compose ps | grep -q Up; then
        info "Stopping existing services..."
        docker-compose down
    fi
    
    # Start services
    log "Starting services..."
    docker-compose up -d || error "Failed to start services"
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 10
    
    # Check service health
    for service in postgres redis user-service work-order-service asset-service web nginx; do
        if docker-compose ps | grep -q "emaintenance-${service}.*Up"; then
            info "✓ ${service} is running"
        else
            error "✗ ${service} failed to start"
        fi
    done
    
    log "All services deployed successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Wait for database to be ready
    sleep 5
    
    # Run migrations from user-service
    docker exec emaintenance-user-service npm run db:migrate || warning "Migrations may have already been applied"
    
    log "Database migrations completed"
}

# Setup SSL certificates (optional)
setup_ssl() {
    if [ "${ENABLE_SSL:-false}" = "true" ]; then
        log "Setting up SSL certificates..."
        
        if [ ! -f "${DEPLOY_DIR}/nginx/ssl/cert.pem" ]; then
            # Generate self-signed certificate for testing
            # In production, use Let's Encrypt or your own certificates
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout "${DEPLOY_DIR}/nginx/ssl/key.pem" \
                -out "${DEPLOY_DIR}/nginx/ssl/cert.pem" \
                -subj "/C=US/ST=State/L=City/O=Organization/CN=${DOMAIN:-localhost}"
            
            warning "Using self-signed SSL certificate. Replace with proper certificate for production."
        fi
        
        log "SSL setup completed"
    fi
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check web application
    if curl -f -s -o /dev/null "http://localhost"; then
        info "✓ Web application is accessible"
    else
        warning "✗ Web application is not accessible"
    fi
    
    # Check API endpoints
    for port in 3001 3002 3003; do
        if curl -f -s -o /dev/null "http://localhost:${port}/health"; then
            info "✓ API service on port ${port} is healthy"
        else
            warning "✗ API service on port ${port} is not responding"
        fi
    done
    
    log "Deployment verification completed"
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Keep only last 7 days of backups
    find "${DEPLOY_DIR}/backups" -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
    
    log "Cleanup completed"
}

# Main deployment process
main() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}E-Maintenance System Deployment Script${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    # Create log file
    mkdir -p "$(dirname "${LOG_FILE}")"
    touch "${LOG_FILE}"
    
    log "Starting deployment process..."
    
    # Run deployment steps
    check_prerequisites
    setup_directories
    backup_existing
    load_environment
    build_images
    deploy_services
    run_migrations
    setup_ssl
    verify_deployment
    cleanup_old_backups
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Deployment completed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    info "Access the application at: http://localhost"
    info "Check logs at: ${LOG_FILE}"
    info "Monitor services: docker-compose -f ${DEPLOY_DIR}/docker-compose.yml ps"
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    stop)
        log "Stopping services..."
        cd "${DEPLOY_DIR}"
        docker-compose down
        log "Services stopped"
        ;;
    restart)
        log "Restarting services..."
        cd "${DEPLOY_DIR}"
        docker-compose restart
        log "Services restarted"
        ;;
    logs)
        cd "${DEPLOY_DIR}"
        docker-compose logs -f
        ;;
    backup)
        backup_existing
        ;;
    status)
        cd "${DEPLOY_DIR}"
        docker-compose ps
        ;;
    *)
        echo "Usage: $0 {deploy|stop|restart|logs|backup|status}"
        exit 1
        ;;
esac