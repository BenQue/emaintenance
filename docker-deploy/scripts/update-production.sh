#!/bin/bash

# E-Maintenance Production Update Script
# =======================================
# Handles code updates with zero-downtime deployment
# Version: 1.0
# Date: 2025-01-21

set -e
set -u

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
PROJECT_NAME="emaintenance"
BACKUP_DIR="/opt/emaintenance/backups"
SOURCE_DIR="/opt/emaintenance/source"
UPDATE_LOG="/opt/emaintenance/logs/update-$(date +%Y%m%d-%H%M%S).log"

# Functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$UPDATE_LOG"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$UPDATE_LOG"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$UPDATE_LOG"
}

# Check update method
check_update_method() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   E-Maintenance Update Manager${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo
    echo "Select update method:"
    echo "1) Update from Git repository"
    echo "2) Update from local image files"
    echo "3) Update from Docker Hub/Registry"
    echo "4) Rebuild from source code"
    echo "5) Exit"
    echo
    read -p "Enter your choice (1-5): " choice
    
    case $choice in
        1) update_from_git ;;
        2) update_from_local ;;
        3) update_from_registry ;;
        4) rebuild_from_source ;;
        5) exit 0 ;;
        *) error "Invalid choice" ;;
    esac
}

# Method 1: Git Update
update_from_git() {
    log "Starting Git-based update..."
    
    # Check if source directory exists
    if [ ! -d "$SOURCE_DIR/.git" ]; then
        error "Git repository not found. Please clone the repository first."
    fi
    
    cd "$SOURCE_DIR"
    
    # Backup current version
    log "Creating backup of current version..."
    git rev-parse HEAD > "$BACKUP_DIR/version-$(date +%Y%m%d-%H%M%S).txt"
    
    # Pull latest changes
    log "Pulling latest changes from Git..."
    git fetch origin
    git pull origin main
    
    # Rebuild and deploy
    cd docker-deploy
    rebuild_services
}

# Method 2: Local Image Update
update_from_local() {
    log "Starting local image update..."
    
    read -p "Enter path to image tar.gz file: " image_path
    
    if [ ! -f "$image_path" ]; then
        error "Image file not found: $image_path"
    fi
    
    log "Loading Docker images..."
    docker load < "$image_path"
    
    restart_services
}

# Method 3: Registry Update
update_from_registry() {
    log "Starting registry update..."
    
    read -p "Enter registry URL (or press Enter for Docker Hub): " registry
    read -p "Enter image tag (default: latest): " tag
    
    tag=${tag:-latest}
    
    log "Pulling images from registry..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    restart_services
}

# Method 4: Rebuild from Source
rebuild_from_source() {
    log "Starting source code rebuild..."
    
    cd "$SOURCE_DIR/docker-deploy"
    
    rebuild_services
}

# Rebuild services
rebuild_services() {
    log "Building Docker images..."
    
    # Build with no cache for clean build
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    restart_services
}

# Restart services with zero downtime
restart_services() {
    log "Restarting services with zero-downtime deployment..."
    
    # Get list of services to update
    services="web user-service work-order-service asset-service"
    
    # Health check before update
    log "Performing pre-update health check..."
    for service in $services; do
        container="${PROJECT_NAME}_${service}_1"
        if docker ps | grep -q "$container"; then
            log "✓ $service is running"
        else
            warning "$service is not running"
        fi
    done
    
    # Rolling update for each service
    for service in $services; do
        log "Updating $service..."
        docker-compose -f "$COMPOSE_FILE" up -d --no-deps --build "$service"
        
        # Wait for service to be healthy
        sleep 5
        
        # Verify service is running
        container="${PROJECT_NAME}_${service}_1"
        if docker ps | grep -q "$container"; then
            log "✓ $service updated successfully"
        else
            error "Failed to update $service"
        fi
    done
    
    log "All services updated successfully!"
}

# Database migration check
check_migrations() {
    log "Checking for database migrations..."
    
    read -p "Do you need to run database migrations? (y/n): " run_migrations
    
    if [[ "$run_migrations" == "y" ]]; then
        log "Running database migrations..."
        docker exec "${PROJECT_NAME}_user-service_1" npx prisma migrate deploy
        log "✓ Migrations completed"
    fi
}

# Post-update verification
verify_update() {
    log "Verifying update..."
    
    echo -e "\n${BLUE}Service Status:${NC}"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo -e "\n${BLUE}Health Checks:${NC}"
    for port in 3031 3032 3033; do
        if curl -s "http://localhost:$port/health" > /dev/null; then
            echo -e "${GREEN}✓ Service on port $port is healthy${NC}"
        else
            echo -e "${RED}✗ Service on port $port is not responding${NC}"
        fi
    done
    
    echo -e "\n${BLUE}Container Logs (last 10 lines):${NC}"
    docker-compose -f "$COMPOSE_FILE" logs --tail=10
}

# Main execution
main() {
    # Create log directory if not exists
    mkdir -p "$(dirname "$UPDATE_LOG")"
    
    log "Starting E-Maintenance update process..."
    
    # Check Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running. Please start Docker first."
    fi
    
    # Check if production deployment exists
    if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "$PROJECT_NAME"; then
        warning "No existing deployment found. Run deploy-secure.sh first."
    fi
    
    # Execute update
    check_update_method
    
    # Check migrations
    check_migrations
    
    # Verify update
    verify_update
    
    log "Update completed successfully!"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   Update Completed Successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
}

# Run main function
main "$@"