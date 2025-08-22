#!/bin/bash

# E-Maintenance Gitea Webhook Deployment Handler
# ==============================================
# This script handles incoming webhooks from Gitea to trigger deployments
# It can be run as a systemd service or standalone webhook listener
# Version: 1.0.0
# Date: 2025-08-22

set -e
set -u

# Configuration
DEPLOY_DIR="/opt/emaintenance"
GITEA_REPO="${GITEA_REPO:-git@gitea.yourdomain.com:your-org/emaintenance.git}"
WEBHOOK_PORT="${WEBHOOK_PORT:-9000}"
WEBHOOK_SECRET="${WEBHOOK_SECRET}"
LOG_DIR="/var/log/emaintenance"
LOG_FILE="${LOG_DIR}/webhook-deploy.log"
LOCK_FILE="/var/run/emaintenance-deploy.lock"
DOCKER_COMPOSE_CMD="docker compose"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
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

# Verify webhook signature
verify_signature() {
    local payload="$1"
    local signature="$2"
    
    if [ -z "$WEBHOOK_SECRET" ]; then
        warning "Webhook secret not configured, skipping signature verification"
        return 0
    fi
    
    # Calculate expected signature
    expected_signature=$(echo -n "$payload" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')
    
    if [ "$signature" != "sha256=$expected_signature" ]; then
        error "Invalid webhook signature"
        return 1
    fi
    
    return 0
}

# Acquire deployment lock
acquire_lock() {
    local timeout=300  # 5 minutes timeout
    local elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        if mkdir "$LOCK_FILE" 2>/dev/null; then
            echo $$ > "$LOCK_FILE/pid"
            log "Acquired deployment lock"
            return 0
        fi
        
        # Check if the process holding the lock is still running
        if [ -f "$LOCK_FILE/pid" ]; then
            local pid=$(cat "$LOCK_FILE/pid")
            if ! kill -0 "$pid" 2>/dev/null; then
                warning "Removing stale lock from PID $pid"
                rm -rf "$LOCK_FILE"
                continue
            fi
        fi
        
        info "Waiting for deployment lock... ($elapsed/$timeout seconds)"
        sleep 10
        elapsed=$((elapsed + 10))
    done
    
    error "Failed to acquire deployment lock after $timeout seconds"
}

# Release deployment lock
release_lock() {
    rm -rf "$LOCK_FILE"
    log "Released deployment lock"
}

# Cleanup on exit
cleanup() {
    release_lock
}
trap cleanup EXIT

# Pull latest code from Gitea
pull_latest_code() {
    local ref="${1:-main}"
    
    log "Pulling latest code from Gitea (ref: $ref)"
    
    cd "$DEPLOY_DIR"
    
    # Stash any local changes
    git stash push -m "Auto-stash before deployment $(date +%Y%m%d-%H%M%S)"
    
    # Fetch latest changes
    git fetch origin
    
    # Checkout the specified ref
    if [[ "$ref" == refs/tags/* ]]; then
        # Tag deployment
        local tag="${ref#refs/tags/}"
        git checkout "tags/$tag"
    elif [[ "$ref" == refs/heads/* ]]; then
        # Branch deployment
        local branch="${ref#refs/heads/}"
        git checkout "$branch"
        git pull origin "$branch"
    else
        # Direct ref (commit SHA or branch name)
        git checkout "$ref"
    fi
    
    log "Code updated to: $(git rev-parse HEAD)"
}

# Run pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks"
    
    # Check Docker
    if ! docker info &>/dev/null; then
        error "Docker is not running"
    fi
    
    # Check Docker Compose
    if ! $DOCKER_COMPOSE_CMD version &>/dev/null; then
        error "Docker Compose is not available"
    fi
    
    # Check required files
    if [ ! -f "$DEPLOY_DIR/docker-deploy/docker-compose.production.yml" ]; then
        error "Docker Compose production file not found"
    fi
    
    if [ ! -f "$DEPLOY_DIR/docker-deploy/.env.production" ]; then
        warning "Production environment file not found, will be created from secrets"
    fi
    
    # Check disk space (minimum 5GB)
    available_space=$(df "$DEPLOY_DIR" | tail -1 | awk '{print int($4/1048576)}')
    if [ $available_space -lt 5 ]; then
        error "Insufficient disk space: ${available_space}GB available, 5GB required"
    fi
    
    log "Pre-deployment checks passed"
}

# Create backup before deployment
create_backup() {
    log "Creating pre-deployment backup"
    
    local backup_dir="/opt/emaintenance/backups/webhook-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    cd "$DEPLOY_DIR/docker-deploy"
    
    # Backup database if running
    if docker ps --format "{{.Names}}" | grep -q "emaintenance_postgres"; then
        docker exec emaintenance_postgres_1 pg_dumpall -U postgres > "$backup_dir/database.sql" 2>/dev/null || \
            warning "Could not backup database"
    fi
    
    # Save current image tags
    docker ps --format "{{.Image}}" > "$backup_dir/current_images.txt"
    
    log "Backup created at: $backup_dir"
}

# Deploy with zero downtime using rolling update
deploy_zero_downtime() {
    log "Starting zero-downtime deployment"
    
    cd "$DEPLOY_DIR/docker-deploy"
    
    # Build new images
    log "Building new Docker images"
    $DOCKER_COMPOSE_CMD -f docker-compose.production.yml build --no-cache
    
    # Update services one by one for zero downtime
    local services=("user-service" "work-order-service" "asset-service" "web")
    
    for service in "${services[@]}"; do
        log "Updating service: $service"
        
        # Scale up new version alongside old
        $DOCKER_COMPOSE_CMD -f docker-compose.production.yml up -d --no-deps --scale ${service}=2 ${service}
        
        # Wait for new container to be healthy
        sleep 30
        
        # Check health
        if ! $DOCKER_COMPOSE_CMD -f docker-compose.production.yml exec -T ${service} curl -f http://localhost:3000/health &>/dev/null; then
            warning "Health check failed for $service, but continuing"
        fi
        
        # Scale back to 1 (removes old container)
        $DOCKER_COMPOSE_CMD -f docker-compose.production.yml up -d --no-deps --scale ${service}=1 ${service}
        
        log "Service $service updated successfully"
    done
    
    # Update nginx last
    log "Updating nginx configuration"
    $DOCKER_COMPOSE_CMD -f docker-compose.production.yml up -d nginx
    
    log "Zero-downtime deployment completed"
}

# Perform health checks
health_check() {
    log "Performing post-deployment health checks"
    
    local services=("3001:user-service" "3002:work-order-service" "3003:asset-service" "3000:web")
    local failed=0
    
    # Wait for services to stabilize
    sleep 30
    
    for service_port in "${services[@]}"; do
        IFS=':' read -r port service <<< "$service_port"
        
        if curl -f -s -o /dev/null "http://localhost:${port}/health" 2>/dev/null || \
           curl -f -s -o /dev/null "http://localhost:${port}" 2>/dev/null; then
            log "✓ ${service} is healthy"
        else
            warning "✗ ${service} health check failed"
            failed=$((failed + 1))
        fi
    done
    
    if [ $failed -gt 0 ]; then
        warning "$failed services failed health checks"
        return 1
    fi
    
    log "All services are healthy"
    return 0
}

# Send deployment notification
send_notification() {
    local status="$1"
    local message="$2"
    local version="$3"
    
    # Log the deployment result
    echo "$(date -Iseconds)|$status|$version|$message" >> "${LOG_DIR}/deployment-history.log"
    
    # Send webhook notification if configured
    if [ -n "${NOTIFICATION_WEBHOOK:-}" ]; then
        curl -X POST "$NOTIFICATION_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{
                \"status\": \"$status\",
                \"message\": \"$message\",
                \"version\": \"$version\",
                \"timestamp\": \"$(date -Iseconds)\",
                \"server\": \"$(hostname)\"
            }" || warning "Failed to send notification"
    fi
}

# Handle deployment request
handle_deployment() {
    local payload="$1"
    
    # Parse payload (basic parsing, enhance as needed)
    local ref=$(echo "$payload" | grep -o '"ref":"[^"]*' | cut -d'"' -f4)
    local sha=$(echo "$payload" | grep -o '"sha":"[^"]*' | cut -d'"' -f4)
    local pusher=$(echo "$payload" | grep -o '"pusher":"[^"]*' | cut -d'"' -f4)
    
    log "==================================================="
    log "Deployment triggered"
    log "Ref: $ref"
    log "SHA: $sha"
    log "Pusher: $pusher"
    log "==================================================="
    
    # Acquire lock for deployment
    acquire_lock
    
    # Execute deployment steps
    (
        pre_deployment_checks
        create_backup
        pull_latest_code "$ref"
        deploy_zero_downtime
        
        if health_check; then
            send_notification "success" "Deployment successful" "$sha"
            log "Deployment completed successfully"
        else
            send_notification "failure" "Deployment completed with warnings" "$sha"
            warning "Deployment completed with some health check failures"
        fi
    ) || {
        local exit_code=$?
        send_notification "failure" "Deployment failed" "$sha"
        error "Deployment failed with exit code $exit_code"
    }
}

# Webhook server (using netcat for simplicity)
start_webhook_server() {
    log "Starting webhook server on port $WEBHOOK_PORT"
    
    while true; do
        # Use netcat to listen for incoming webhooks
        {
            read -r request
            read -r host
            read -r content_length_header
            read -r signature_header
            read -r  # empty line
            
            # Extract content length
            content_length=$(echo "$content_length_header" | grep -o '[0-9]*')
            
            # Extract signature
            signature=$(echo "$signature_header" | cut -d' ' -f2)
            
            # Read payload
            payload=$(head -c "$content_length")
            
            # Verify signature
            if verify_signature "$payload" "$signature"; then
                # Send response
                echo -e "HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nOK"
                
                # Handle deployment in background
                handle_deployment "$payload" &
            else
                echo -e "HTTP/1.1 401 Unauthorized\r\nContent-Length: 12\r\n\r\nUnauthorized"
            fi
        } | nc -l -p "$WEBHOOK_PORT" -q 1
    done
}

# Main execution
main() {
    case "${1:-}" in
        server)
            start_webhook_server
            ;;
        deploy)
            # Manual deployment trigger
            handle_deployment '{"ref":"refs/heads/main","sha":"manual","pusher":"manual"}'
            ;;
        test)
            # Test deployment without actually deploying
            pre_deployment_checks
            health_check
            ;;
        *)
            echo "Usage: $0 {server|deploy|test}"
            echo "  server - Start webhook server"
            echo "  deploy - Trigger manual deployment"
            echo "  test   - Run deployment tests"
            exit 1
            ;;
    esac
}

# Check if running as systemd service
if [ "${INVOCATION_ID:-}" ]; then
    # Running as systemd service
    log "Starting as systemd service"
    start_webhook_server
else
    # Running manually
    main "$@"
fi