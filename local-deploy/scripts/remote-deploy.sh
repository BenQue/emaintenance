#!/bin/bash

# Remote Deployment Script
# This script deploys pre-built Docker images to remote servers without rebuilding

set -e

# Configuration
PROJECT_NAME="emaintenance"
REGISTRY_PREFIX="local"
DEFAULT_REMOTE_DIR="/opt/emaintenance"
DEFAULT_DEPLOY_USER="deploy"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

Deploy pre-built Docker images to remote servers

COMMANDS:
    deploy      Deploy images to remote server
    rollback    Rollback to previous deployment
    status      Check deployment status
    logs        Show logs from remote deployment
    stop        Stop remote deployment
    restart     Restart remote deployment
    health      Run health checks on remote deployment
    backup      Create backup before deployment
    restore     Restore from backup

OPTIONS:
    -h, --help              Show this help message
    -s, --server HOST       Remote server hostname/IP (required)
    -u, --user USER         SSH username (default: $DEFAULT_DEPLOY_USER)
    -k, --key PATH          SSH private key path
    -p, --port PORT         SSH port (default: 22)
    -t, --tag TAG           Image tag to deploy (default: latest)
    -d, --dir DIR           Remote deployment directory (default: $DEFAULT_REMOTE_DIR)
    -e, --env ENV           Environment file to use (production, staging, etc.)
    --registry URL          Docker registry URL
    --transfer-method METHOD Transfer method (ssh, registry, auto)
    --backup                Create backup before deployment
    --force                 Force deployment without confirmation
    --dry-run               Show what would be done without executing
    --no-migrate            Skip database migrations
    --no-healthcheck        Skip health checks after deployment

TRANSFER METHODS:
    ssh         Transfer via SSH/SCP (save/load tar files)
    registry    Transfer via Docker registry (push/pull)
    auto        Auto-detect best method (default)

EXAMPLES:
    # Deploy with SSH transfer
    $0 deploy --server prod.example.com --user deploy --tag v1.0.0

    # Deploy with registry transfer
    $0 deploy --server prod.example.com --registry registry.example.com --tag v1.0.0

    # Deploy with backup
    $0 deploy --server prod.example.com --tag v1.0.0 --backup

    # Check deployment status
    $0 status --server prod.example.com

    # Rollback deployment
    $0 rollback --server prod.example.com

    # View logs
    $0 logs --server prod.example.com --service web

EOF
}

# Parse command line arguments
parse_args() {
    COMMAND=""
    REMOTE_SERVER=""
    SSH_USER="$DEFAULT_DEPLOY_USER"
    SSH_KEY=""
    SSH_PORT="22"
    IMAGE_TAG="latest"
    REMOTE_DIR="$DEFAULT_REMOTE_DIR"
    ENV_FILE=""
    REGISTRY_URL=""
    TRANSFER_METHOD="auto"
    CREATE_BACKUP=false
    FORCE=false
    DRY_RUN=false
    NO_MIGRATE=false
    NO_HEALTHCHECK=false
    SERVICE=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            deploy|rollback|status|logs|stop|restart|health|backup|restore)
                COMMAND="$1"
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            -s|--server)
                REMOTE_SERVER="$2"
                shift 2
                ;;
            -u|--user)
                SSH_USER="$2"
                shift 2
                ;;
            -k|--key)
                SSH_KEY="$2"
                shift 2
                ;;
            -p|--port)
                SSH_PORT="$2"
                shift 2
                ;;
            -t|--tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            -d|--dir)
                REMOTE_DIR="$2"
                shift 2
                ;;
            -e|--env)
                ENV_FILE="$2"
                shift 2
                ;;
            --registry)
                REGISTRY_URL="$2"
                shift 2
                ;;
            --transfer-method)
                TRANSFER_METHOD="$2"
                shift 2
                ;;
            --service)
                SERVICE="$2"
                shift 2
                ;;
            --backup)
                CREATE_BACKUP=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --no-migrate)
                NO_MIGRATE=true
                shift
                ;;
            --no-healthcheck)
                NO_HEALTHCHECK=true
                shift
                ;;
            *)
                error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    if [[ -z "$COMMAND" ]]; then
        error "No command specified"
        show_help
        exit 1
    fi

    if [[ -z "$REMOTE_SERVER" ]]; then
        error "Remote server is required (use -s/--server)"
        exit 1
    fi
}

# Build SSH command
get_ssh_cmd() {
    local ssh_opts="-p $SSH_PORT"
    if [[ -n "$SSH_KEY" ]]; then
        ssh_opts="$ssh_opts -i $SSH_KEY"
    fi
    echo "ssh $ssh_opts $SSH_USER@$REMOTE_SERVER"
}

# Build SCP command
get_scp_cmd() {
    local scp_opts="-P $SSH_PORT"
    if [[ -n "$SSH_KEY" ]]; then
        scp_opts="$scp_opts -i $SSH_KEY"
    fi
    echo "scp $scp_opts"
}

# Execute remote command
remote_exec() {
    local cmd="$1"
    local ssh_cmd=$(get_ssh_cmd)
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "[DRY RUN] Would execute: $cmd"
        return 0
    fi
    
    $ssh_cmd "$cmd"
}

# Transfer file to remote
remote_copy() {
    local local_file="$1"
    local remote_path="$2"
    local scp_cmd=$(get_scp_cmd)
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "[DRY RUN] Would copy: $local_file -> $SSH_USER@$REMOTE_SERVER:$remote_path"
        return 0
    fi
    
    $scp_cmd "$local_file" "$SSH_USER@$REMOTE_SERVER:$remote_path"
}

# Check remote server connectivity
check_connectivity() {
    log "Checking connectivity to $SSH_USER@$REMOTE_SERVER..."
    
    if ! remote_exec "echo 'Connection test successful'"; then
        error "Cannot connect to remote server"
        exit 1
    fi
    
    # Check Docker availability
    if ! remote_exec "command -v docker >/dev/null 2>&1"; then
        error "Docker is not installed on remote server"
        exit 1
    fi
    
    if ! remote_exec "docker info >/dev/null 2>&1"; then
        error "Docker is not running on remote server"
        exit 1
    fi
    
    # Check Docker Compose availability
    if ! remote_exec "command -v docker-compose >/dev/null 2>&1"; then
        error "Docker Compose is not installed on remote server"
        exit 1
    fi
    
    success "Remote server connectivity verified"
}

# Setup remote environment
setup_remote() {
    log "Setting up remote deployment environment..."
    
    # Create directories
    remote_exec "
        sudo mkdir -p $REMOTE_DIR/{docker-compose,configs,logs,data,backups,transfer}
        sudo chown -R $SSH_USER:$SSH_USER $REMOTE_DIR
        chmod -R 755 $REMOTE_DIR
    "
    
    # Upload Docker Compose configuration
    local compose_file="docker-compose/docker-compose.production.yml"
    if [[ -n "$ENV_FILE" ]]; then
        compose_file="docker-compose/docker-compose.${ENV_FILE}.yml"
    fi
    
    if [[ ! -f "$compose_file" ]]; then
        compose_file="../docker-deploy/docker-compose.production.yml"
    fi
    
    if [[ -f "$compose_file" ]]; then
        log "Uploading Docker Compose configuration..."
        remote_copy "$compose_file" "$REMOTE_DIR/docker-compose/docker-compose.yml"
    else
        error "Docker Compose file not found: $compose_file"
        exit 1
    fi
    
    # Upload environment configuration
    local env_source="configs/.env.production"
    if [[ -n "$ENV_FILE" ]]; then
        env_source="configs/.env.${ENV_FILE}"
    fi
    
    if [[ -f "$env_source" ]]; then
        log "Uploading environment configuration..."
        remote_copy "$env_source" "$REMOTE_DIR/configs/.env"
    else
        warning "Environment file not found: $env_source"
        log "Creating default environment file..."
        remote_exec "cat > $REMOTE_DIR/configs/.env << 'EOF'
# Production Environment Configuration
PROJECT_NAME=emaintenance
NODE_ENV=production
IMAGE_TAG=$IMAGE_TAG
REGISTRY_PREFIX=$REGISTRY_PREFIX

# Database Configuration
DB_NAME=emaintenance
DB_USER=postgres
DB_PASSWORD=\${DB_PASSWORD:-Emaint2024!}
DATABASE_URL=postgresql://postgres:\${DB_PASSWORD:-Emaint2024!}@postgres:5432/emaintenance

# Redis Configuration
REDIS_PASSWORD=\${REDIS_PASSWORD:-Redis2024!}
REDIS_URL=redis://:\${REDIS_PASSWORD:-Redis2024!}@redis:6379

# JWT Configuration
JWT_SECRET=\${JWT_SECRET:-ProductionJWTSecret2024}
JWT_EXPIRES_IN=7d

# Service URLs
USER_SERVICE_URL=http://user-service:3001
WORK_ORDER_SERVICE_URL=http://work-order-service:3002
ASSET_SERVICE_URL=http://asset-service:3003

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com

# Storage Paths
DATA_DIR=$REMOTE_DIR/data
LOG_DIR=$REMOTE_DIR/logs
BACKUP_DIR=$REMOTE_DIR/backups
EOF"
    fi
    
    # Upload Nginx configuration if available
    if [[ -f "configs/nginx/nginx.production.conf" ]]; then
        log "Uploading Nginx configuration..."
        remote_exec "mkdir -p $REMOTE_DIR/configs/nginx"
        remote_copy "configs/nginx/nginx.production.conf" "$REMOTE_DIR/configs/nginx/nginx.conf"
    fi
    
    success "Remote environment setup complete"
}

# Create backup
create_backup() {
    if [[ "$CREATE_BACKUP" != "true" ]] && [[ "$COMMAND" != "backup" ]]; then
        return 0
    fi
    
    log "Creating backup on remote server..."
    
    local backup_timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_dir="$REMOTE_DIR/backups/${backup_timestamp}"
    
    remote_exec "
        cd $REMOTE_DIR
        
        # Create backup directory
        mkdir -p $backup_dir
        
        # Backup Docker Compose configuration
        if [[ -f docker-compose/docker-compose.yml ]]; then
            cp docker-compose/docker-compose.yml $backup_dir/
        fi
        
        # Backup environment configuration
        if [[ -f configs/.env ]]; then
            cp configs/.env $backup_dir/
        fi
        
        # Backup database if running
        if docker-compose -f docker-compose/docker-compose.yml ps postgres | grep -q 'Up'; then
            echo 'Creating database backup...'
            docker-compose -f docker-compose/docker-compose.yml exec -T postgres pg_dump -U postgres emaintenance > $backup_dir/database.sql || true
        fi
        
        # Save current image tags
        docker images --format 'table {{.Repository}}:{{.Tag}}\t{{.ID}}' | grep '$PROJECT_NAME' > $backup_dir/images.txt || true
        
        # Create backup manifest
        cat > $backup_dir/manifest.txt << EOF
Backup Created: $(date)
Image Tag: $IMAGE_TAG
Git Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')
Server: $REMOTE_SERVER
User: $SSH_USER
EOF
        
        echo 'Backup created at: $backup_dir'
    "
    
    success "Backup created: ${backup_timestamp}"
    echo "$backup_timestamp" > /tmp/latest_backup
}

# Deploy application
deploy_application() {
    log "Starting deployment of $PROJECT_NAME:$IMAGE_TAG to $REMOTE_SERVER"
    
    check_connectivity
    setup_remote
    
    if [[ "$CREATE_BACKUP" == "true" ]]; then
        create_backup
    fi
    
    # Transfer images
    log "Transferring Docker images..."
    case $TRANSFER_METHOD in
        "ssh")
            ../scripts/transfer-images.sh transfer --server "$REMOTE_SERVER" --user "$SSH_USER" --tag "$IMAGE_TAG" $(if [[ -n "$SSH_KEY" ]]; then echo "--key $SSH_KEY"; fi) --port "$SSH_PORT"
            ;;
        "registry")
            if [[ -z "$REGISTRY_URL" ]]; then
                error "Registry URL required for registry transfer method"
                exit 1
            fi
            ../scripts/transfer-images.sh push --registry "$REGISTRY_URL" --tag "$IMAGE_TAG"
            remote_exec "
                export REGISTRY_URL='$REGISTRY_URL'
                export IMAGE_TAG='$IMAGE_TAG'
                cd $REMOTE_DIR
                # Pull images from registry
                for service in web user-service work-order-service asset-service migrations; do
                    echo \"Pulling \$service...\"
                    docker pull \${REGISTRY_URL}/${PROJECT_NAME}-\${service}:${IMAGE_TAG}
                    docker tag \${REGISTRY_URL}/${PROJECT_NAME}-\${service}:${IMAGE_TAG} ${REGISTRY_PREFIX}/${PROJECT_NAME}-\${service}:${IMAGE_TAG}
                done
            "
            ;;
        "auto")
            if [[ -n "$REGISTRY_URL" ]]; then
                log "Auto-detected: Using registry transfer"
                TRANSFER_METHOD="registry"
                deploy_application
                return $?
            else
                log "Auto-detected: Using SSH transfer"
                TRANSFER_METHOD="ssh"
                deploy_application
                return $?
            fi
            ;;
        *)
            error "Unknown transfer method: $TRANSFER_METHOD"
            exit 1
            ;;
    esac
    
    # Stop existing deployment
    log "Stopping existing deployment..."
    remote_exec "
        cd $REMOTE_DIR
        if [[ -f docker-compose/docker-compose.yml ]]; then
            docker-compose -f docker-compose/docker-compose.yml --env-file configs/.env down || true
        fi
    "
    
    # Update image tags in environment
    remote_exec "
        cd $REMOTE_DIR
        sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=$IMAGE_TAG/' configs/.env
    "
    
    # Run database migrations if needed
    if [[ "$NO_MIGRATE" != "true" ]]; then
        log "Running database migrations..."
        remote_exec "
            cd $REMOTE_DIR
            docker-compose -f docker-compose/docker-compose.yml --env-file configs/.env up -d postgres redis
            sleep 10
            docker-compose -f docker-compose/docker-compose.yml --env-file configs/.env run --rm migrations
        "
    fi
    
    # Start new deployment
    log "Starting new deployment..."
    remote_exec "
        cd $REMOTE_DIR
        docker-compose -f docker-compose/docker-compose.yml --env-file configs/.env up -d
    "
    
    # Wait for services to start
    log "Waiting for services to start..."
    sleep 30
    
    # Run health checks
    if [[ "$NO_HEALTHCHECK" != "true" ]]; then
        if ! run_health_checks; then
            error "Health checks failed after deployment"
            if [[ "$FORCE" != "true" ]]; then
                warning "Consider rolling back with: $0 rollback --server $REMOTE_SERVER"
                exit 1
            fi
        fi
    fi
    
    success "Deployment completed successfully"
    log "Access your application at: http://$REMOTE_SERVER"
}

# Rollback deployment
rollback_deployment() {
    log "Rolling back deployment on $REMOTE_SERVER"
    
    check_connectivity
    
    # Find latest backup
    local latest_backup=$(remote_exec "ls -t $REMOTE_DIR/backups/ | head -1" 2>/dev/null || echo "")
    
    if [[ -z "$latest_backup" ]]; then
        error "No backup found for rollback"
        exit 1
    fi
    
    log "Rolling back to backup: $latest_backup"
    
    if [[ "$FORCE" != "true" ]]; then
        echo -n "Confirm rollback to $latest_backup? (y/N): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log "Rollback cancelled"
            exit 0
        fi
    fi
    
    remote_exec "
        cd $REMOTE_DIR
        
        # Stop current deployment
        docker-compose -f docker-compose/docker-compose.yml --env-file configs/.env down || true
        
        # Restore configuration files
        backup_dir=\"$REMOTE_DIR/backups/$latest_backup\"
        if [[ -f \"\$backup_dir/docker-compose.yml\" ]]; then
            cp \"\$backup_dir/docker-compose.yml\" docker-compose/
        fi
        if [[ -f \"\$backup_dir/.env\" ]]; then
            cp \"\$backup_dir/.env\" configs/
        fi
        
        # Restore database if backup exists
        if [[ -f \"\$backup_dir/database.sql\" ]]; then
            echo 'Restoring database...'
            docker-compose -f docker-compose/docker-compose.yml --env-file configs/.env up -d postgres
            sleep 10
            docker-compose -f docker-compose/docker-compose.yml --env-file configs/.env exec -T postgres psql -U postgres emaintenance < \"\$backup_dir/database.sql\"
        fi
        
        # Start services
        docker-compose -f docker-compose/docker-compose.yml --env-file configs/.env up -d
    "
    
    success "Rollback completed"
}

# Check deployment status
check_status() {
    log "Checking deployment status on $REMOTE_SERVER"
    
    remote_exec "
        cd $REMOTE_DIR
        
        echo '=== Docker Compose Status ==='
        docker-compose -f docker-compose/docker-compose.yml --env-file configs/.env ps
        
        echo
        echo '=== Service Health ==='
        for service in postgres redis user-service work-order-service asset-service web nginx; do
            container=\"${PROJECT_NAME}_\${service}_1\"
            if docker ps --format '{{.Names}}' | grep -q \"\$container\"; then
                health=\$(docker inspect --format='{{.State.Health.Status}}' \"\$container\" 2>/dev/null || echo 'unknown')
                echo \"\$service: \$health\"
            else
                echo \"\$service: not running\"
            fi
        done
        
        echo
        echo '=== Current Images ==='
        docker images --format 'table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}' | grep '$PROJECT_NAME' || echo 'No images found'
    "
}

# Show logs
show_logs() {
    local follow_logs=true
    local tail_lines=100
    
    if [[ -n "$SERVICE" ]]; then
        log "Showing logs for service: $SERVICE"
        remote_exec "
            cd $REMOTE_DIR
            docker-compose -f docker-compose/docker-compose.yml --env-file configs/.env logs --tail=$tail_lines -f $SERVICE
        "
    else
        log "Showing logs for all services"
        remote_exec "
            cd $REMOTE_DIR
            docker-compose -f docker-compose/docker-compose.yml --env-file configs/.env logs --tail=$tail_lines -f
        "
    fi
}

# Stop deployment
stop_deployment() {
    log "Stopping deployment on $REMOTE_SERVER"
    
    if [[ "$FORCE" != "true" ]]; then
        echo -n "Confirm stopping deployment? (y/N): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log "Stop cancelled"
            exit 0
        fi
    fi
    
    remote_exec "
        cd $REMOTE_DIR
        docker-compose -f docker-compose/docker-compose.yml --env-file configs/.env down
    "
    
    success "Deployment stopped"
}

# Restart deployment
restart_deployment() {
    log "Restarting deployment on $REMOTE_SERVER"
    
    remote_exec "
        cd $REMOTE_DIR
        docker-compose -f docker-compose/docker-compose.yml --env-file configs/.env restart
    "
    
    success "Deployment restarted"
}

# Run health checks
run_health_checks() {
    log "Running health checks on $REMOTE_SERVER"
    
    local failed=0
    
    # Define health check endpoints
    local endpoints=(
        "http://localhost/health|Nginx"
        "http://localhost:3000/api/health|Web App"
        "http://localhost:3001/health|User Service"
        "http://localhost:3002/health|Work Order Service"
        "http://localhost:3003/health|Asset Service"
    )
    
    for endpoint_info in "${endpoints[@]}"; do
        local url=$(echo "$endpoint_info" | cut -d'|' -f1)
        local name=$(echo "$endpoint_info" | cut -d'|' -f2)
        
        log "Checking $name: $url"
        
        if remote_exec "curl -f -s -m 10 '$url' >/dev/null"; then
            success "$name is healthy"
        else
            error "$name health check failed"
            failed=$((failed + 1))
        fi
    done
    
    # Database connectivity test
    log "Testing database connectivity..."
    if remote_exec "
        cd $REMOTE_DIR
        docker-compose -f docker-compose/docker-compose.yml --env-file configs/.env exec postgres pg_isready -U postgres -d emaintenance >/dev/null 2>&1
    "; then
        success "Database is healthy"
    else
        error "Database connectivity failed"
        failed=$((failed + 1))
    fi
    
    # Redis connectivity test
    log "Testing Redis connectivity..."
    if remote_exec "
        cd $REMOTE_DIR
        docker-compose -f docker-compose/docker-compose.yml --env-file configs/.env exec redis redis-cli ping >/dev/null 2>&1
    "; then
        success "Redis is healthy"
    else
        error "Redis connectivity failed"
        failed=$((failed + 1))
    fi
    
    if [[ $failed -eq 0 ]]; then
        success "All health checks passed!"
        return 0
    else
        error "$failed health checks failed"
        return 1
    fi
}

# Main function
main() {
    if [[ $# -eq 0 ]]; then
        show_help
        exit 0
    fi
    
    parse_args "$@"
    
    case $COMMAND in
        "deploy")
            deploy_application
            ;;
        "rollback")
            rollback_deployment
            ;;
        "status")
            check_status
            ;;
        "logs")
            show_logs
            ;;
        "stop")
            stop_deployment
            ;;
        "restart")
            restart_deployment
            ;;
        "health")
            run_health_checks
            ;;
        "backup")
            create_backup
            ;;
        *)
            error "Unknown command: $COMMAND"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"