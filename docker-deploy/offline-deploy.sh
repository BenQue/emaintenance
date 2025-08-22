#!/bin/bash

# E-Maintenance Offline Deployment Script
# For servers with limited internet connectivity
# Version: 1.0

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Configuration
IMAGES_FILE="/opt/emaintenance/emaintenance-images.tar.gz"
COMPOSE_FILE="docker-compose.production.yml"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   E-Maintenance Offline Deployment${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if images file exists
if [ ! -f "$IMAGES_FILE" ]; then
    error "Images file not found: $IMAGES_FILE"
fi

# Load Docker images
log "Loading Docker images from offline bundle..."
if gunzip -c "$IMAGES_FILE" | docker load; then
    log "✓ Docker images loaded successfully"
else
    error "Failed to load Docker images"
fi

# Show loaded images
info "Loaded images:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep -E "(docker-deploy|postgres|redis|nginx)"

# Stop existing services
log "Stopping existing services..."
docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || true

# Start services (without build step)
log "Starting services from pre-built images..."
if docker-compose -f "$COMPOSE_FILE" up -d --no-build; then
    log "✓ Services started successfully"
else
    error "Failed to start services"
fi

# Wait for services to be ready
log "Waiting for services to become healthy..."
sleep 30

# Health checks
info "Checking service health..."
for service in postgres redis user-service work-order-service asset-service web; do
    if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
        echo -e "${GREEN}✓ $service is running${NC}"
    else
        echo -e "${RED}✗ $service is not running${NC}"
    fi
done

# Run migrations if migrations container exists
if docker images | grep -q "docker-deploy-migrations"; then
    log "Running database migrations..."
    docker run --rm --network docker-deploy_emaintenance_network \
        -e DATABASE_URL="postgresql://postgres:${DB_PASSWORD:-Emaint2024!}@postgres:5432/emaintenance" \
        docker-deploy-migrations:latest
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Deployment Completed Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Access your application at: ${BLUE}http://$(hostname -I | awk '{print $1}'):3030${NC}"