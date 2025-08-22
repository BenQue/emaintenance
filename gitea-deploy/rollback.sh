#!/bin/bash

# E-Maintenance Rollback Script
# ==============================
# Quick rollback to previous version or specific tag
# Version: 1.0.0
# Date: 2025-08-22

set -e
set -u

# Configuration
DEPLOY_DIR="/opt/emaintenance"
BACKUP_DIR="/opt/emaintenance/backups"
LOG_FILE="/var/log/emaintenance/rollback.log"
DOCKER_COMPOSE_CMD="docker compose"
COMPOSE_FILE="docker-compose.production.yml"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging functions
log() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"; exit 1; }
warning() { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"; }
info() { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"; }

# Show available versions for rollback
show_available_versions() {
    echo -e "${CYAN}=== Available Versions for Rollback ===${NC}"
    
    # Show git tags
    echo -e "\n${CYAN}Git Tags:${NC}"
    cd "$DEPLOY_DIR"
    git tag -l --sort=-version:refname | head -20
    
    # Show recent commits
    echo -e "\n${CYAN}Recent Commits:${NC}"
    git log --oneline -10
    
    # Show available backups
    echo -e "\n${CYAN}Available Backups:${NC}"
    if [ -d "$BACKUP_DIR" ]; then
        ls -lt "$BACKUP_DIR" | head -10
    else
        echo "No backups found"
    fi
}

# Get previous version from git
get_previous_version() {
    cd "$DEPLOY_DIR"
    
    # Get current commit
    local current_commit=$(git rev-parse HEAD)
    
    # Get previous commit
    local previous_commit=$(git rev-parse HEAD~1)
    
    echo "$previous_commit"
}

# Rollback to specific version
rollback_to_version() {
    local version="$1"
    
    log "Rolling back to version: $version"
    
    cd "$DEPLOY_DIR"
    
    # Stash any local changes
    git stash push -m "Rollback stash $(date +%Y%m%d-%H%M%S)"
    
    # Checkout the specified version
    if git tag -l | grep -q "^${version}$"; then
        # It's a tag
        git checkout "tags/${version}"
    elif git rev-parse --verify "${version}" &>/dev/null; then
        # It's a commit SHA
        git checkout "${version}"
    else
        error "Version ${version} not found"
    fi
    
    log "Code rolled back to: $(git rev-parse HEAD)"
}

# Restore from backup
restore_from_backup() {
    local backup_name="$1"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    
    if [ ! -d "$backup_path" ]; then
        error "Backup not found: $backup_path"
    fi
    
    log "Restoring from backup: $backup_name"
    
    cd "$DEPLOY_DIR/docker-deploy"
    
    # Stop current services
    log "Stopping current services"
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" down
    
    # Restore database if backup exists
    if [ -f "$backup_path/database.sql" ]; then
        log "Restoring database"
        
        # Start only postgres
        $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" up -d postgres
        
        # Wait for postgres to be ready
        sleep 30
        
        # Restore database
        docker exec -i emaintenance_postgres_1 psql -U postgres < "$backup_path/database.sql"
        
        log "Database restored"
    fi
    
    # Restore Docker volumes
    for volume_backup in "$backup_path"/*.tar.gz; do
        if [ -f "$volume_backup" ]; then
            local volume_name=$(basename "$volume_backup" .tar.gz)
            log "Restoring volume: $volume_name"
            
            # Remove existing volume
            docker volume rm "emaintenance_${volume_name}" 2>/dev/null || true
            
            # Create new volume
            docker volume create "emaintenance_${volume_name}"
            
            # Restore data
            docker run --rm \
                -v "emaintenance_${volume_name}:/target" \
                -v "$backup_path:/backup" \
                alpine tar xzf "/backup/$(basename $volume_backup)" -C /target
        fi
    done
    
    log "Backup restoration completed"
}

# Quick rollback (to previous deployment)
quick_rollback() {
    log "Performing quick rollback to previous deployment"
    
    # Check if using blue-green deployment
    if [ -f "/opt/emaintenance/.current_env" ]; then
        # Blue-green rollback
        local current_env=$(cat /opt/emaintenance/.current_env)
        local previous_env="blue"
        
        if [ "$current_env" == "blue" ]; then
            previous_env="green"
        fi
        
        log "Switching from $current_env to $previous_env environment"
        
        # Update nginx to route to previous environment
        ./zero-downtime-deploy.sh rollback
        
        # Update marker
        echo "$previous_env" > /opt/emaintenance/.current_env
        
        log "Quick rollback completed (blue-green switch)"
    else
        # Traditional rollback
        local previous_version=$(get_previous_version)
        rollback_to_version "$previous_version"
        redeploy_services
    fi
}

# Redeploy services after code rollback
redeploy_services() {
    log "Redeploying services"
    
    cd "$DEPLOY_DIR/docker-deploy"
    
    # Rebuild and restart services
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" build --no-cache
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be ready
    sleep 60
    
    # Health check
    perform_health_check
}

# Health check after rollback
perform_health_check() {
    log "Performing health checks"
    
    local services=("3001" "3002" "3003" "3000")
    local all_healthy=true
    
    for port in "${services[@]}"; do
        if curl -f -s -o /dev/null "http://localhost:${port}/health" 2>/dev/null || \
           curl -f -s -o /dev/null "http://localhost:${port}" 2>/dev/null; then
            log "✓ Service on port $port is healthy"
        else
            warning "✗ Service on port $port is not healthy"
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = true ]; then
        log "All services are healthy after rollback"
    else
        warning "Some services are not healthy after rollback"
    fi
}

# Create rollback point (backup current state)
create_rollback_point() {
    local rollback_name="rollback-$(date +%Y%m%d-%H%M%S)"
    local rollback_path="${BACKUP_DIR}/${rollback_name}"
    
    log "Creating rollback point: $rollback_name"
    
    mkdir -p "$rollback_path"
    
    cd "$DEPLOY_DIR"
    
    # Save current git state
    echo "$(git rev-parse HEAD)" > "$rollback_path/git_commit.txt"
    echo "$(git describe --tags --always)" > "$rollback_path/git_version.txt"
    
    # Backup database
    if docker ps --format "{{.Names}}" | grep -q "emaintenance_postgres"; then
        log "Backing up database"
        docker exec emaintenance_postgres_1 pg_dumpall -U postgres > "$rollback_path/database.sql"
    fi
    
    # Backup critical volumes
    for volume in postgres_data redis_data; do
        if docker volume ls | grep -q "emaintenance_$volume"; then
            log "Backing up volume: $volume"
            docker run --rm \
                -v "emaintenance_$volume:/source" \
                -v "$rollback_path:/backup" \
                alpine tar czf "/backup/${volume}.tar.gz" -C /source .
        fi
    done
    
    # Save environment info
    cat > "$rollback_path/environment.txt" << EOF
Rollback Point Created: $(date)
Server: $(hostname)
User: $(whoami)
Docker Version: $(docker --version)
Current Services:
$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}")
EOF
    
    log "Rollback point created: $rollback_path"
    echo "$rollback_name"
}

# Interactive rollback menu
interactive_rollback() {
    echo -e "${CYAN}=== E-Maintenance Rollback Menu ===${NC}"
    echo "1) Quick rollback (to previous deployment)"
    echo "2) Rollback to specific git tag/version"
    echo "3) Restore from backup"
    echo "4) Show available versions"
    echo "5) Create rollback point"
    echo "6) Exit"
    
    read -p "Select option: " choice
    
    case $choice in
        1)
            quick_rollback
            ;;
        2)
            show_available_versions
            read -p "Enter version/tag to rollback to: " version
            rollback_to_version "$version"
            redeploy_services
            ;;
        3)
            ls -lt "$BACKUP_DIR" | head -20
            read -p "Enter backup name to restore: " backup
            restore_from_backup "$backup"
            redeploy_services
            ;;
        4)
            show_available_versions
            ;;
        5)
            create_rollback_point
            ;;
        6)
            exit 0
            ;;
        *)
            error "Invalid option"
            ;;
    esac
}

# Main execution
main() {
    case "${1:-interactive}" in
        quick)
            quick_rollback
            ;;
        version)
            if [ -z "${2:-}" ]; then
                error "Version required. Usage: $0 version <tag/commit>"
            fi
            rollback_to_version "$2"
            redeploy_services
            ;;
        backup)
            if [ -z "${2:-}" ]; then
                error "Backup name required. Usage: $0 backup <backup-name>"
            fi
            restore_from_backup "$2"
            redeploy_services
            ;;
        create-point)
            create_rollback_point
            ;;
        list)
            show_available_versions
            ;;
        interactive)
            interactive_rollback
            ;;
        *)
            echo "Usage: $0 {quick|version <tag>|backup <name>|create-point|list|interactive}"
            echo "  quick        - Quick rollback to previous deployment"
            echo "  version      - Rollback to specific version/tag"
            echo "  backup       - Restore from specific backup"
            echo "  create-point - Create a rollback point"
            echo "  list         - Show available versions"
            echo "  interactive  - Interactive menu (default)"
            exit 1
            ;;
    esac
    
    log "Rollback process completed"
}

# Run main function
main "$@"