#!/bin/bash

# E-Maintenance Zero-Downtime Deployment Script
# ==============================================
# Implements blue-green deployment strategy for zero downtime
# Version: 1.0.0
# Date: 2025-08-22

set -e
set -u

# Configuration
DEPLOY_DIR="/opt/emaintenance"
GITEA_REPO="${GITEA_REPO:-git@gitea.yourdomain.com:your-org/emaintenance.git}"
BLUE_PREFIX="blue"
GREEN_PREFIX="green"
CURRENT_ENV_FILE="/opt/emaintenance/.current_env"
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=10
DOCKER_NETWORK="emaintenance_network"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Logging
log() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a deploy.log; }
error() { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a deploy.log; exit 1; }
warning() { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a deploy.log; }
info() { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a deploy.log; }
success() { echo -e "${MAGENTA}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}" | tee -a deploy.log; }

# Determine current active environment
get_current_env() {
    if [ -f "$CURRENT_ENV_FILE" ]; then
        cat "$CURRENT_ENV_FILE"
    else
        echo "$BLUE_PREFIX"
    fi
}

# Get the inactive environment
get_target_env() {
    local current=$(get_current_env)
    if [ "$current" == "$BLUE_PREFIX" ]; then
        echo "$GREEN_PREFIX"
    else
        echo "$BLUE_PREFIX"
    fi
}

# Generate environment-specific docker-compose file
generate_compose_file() {
    local env_prefix="$1"
    local compose_file="docker-compose.${env_prefix}.yml"
    
    log "Generating Docker Compose file for $env_prefix environment"
    
    cat > "$DEPLOY_DIR/docker-deploy/$compose_file" << EOF
version: '3.8'

services:
  # User Service
  ${env_prefix}_user-service:
    build:
      context: ..
      dockerfile: docker-deploy/dockerfiles/Dockerfile.api.fixed
      args:
        SERVICE_NAME: user-service
    container_name: emaintenance_${env_prefix}_user-service
    environment:
      NODE_ENV: production
      DATABASE_URL: \${DATABASE_URL}
      JWT_SECRET: \${JWT_SECRET}
      REDIS_URL: \${REDIS_URL}
      PORT: 3001
    networks:
      - ${DOCKER_NETWORK}
    labels:
      - "traefik.enable=false"
      - "deployment.environment=${env_prefix}"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Work Order Service
  ${env_prefix}_work-order-service:
    build:
      context: ..
      dockerfile: docker-deploy/dockerfiles/Dockerfile.api.fixed
      args:
        SERVICE_NAME: work-order-service
    container_name: emaintenance_${env_prefix}_work-order-service
    environment:
      NODE_ENV: production
      DATABASE_URL: \${DATABASE_URL}
      JWT_SECRET: \${JWT_SECRET}
      REDIS_URL: \${REDIS_URL}
      PORT: 3002
      USER_SERVICE_URL: http://${env_prefix}_user-service:3001
    networks:
      - ${DOCKER_NETWORK}
    labels:
      - "traefik.enable=false"
      - "deployment.environment=${env_prefix}"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Asset Service
  ${env_prefix}_asset-service:
    build:
      context: ..
      dockerfile: docker-deploy/dockerfiles/Dockerfile.api.fixed
      args:
        SERVICE_NAME: asset-service
    container_name: emaintenance_${env_prefix}_asset-service
    environment:
      NODE_ENV: production
      DATABASE_URL: \${DATABASE_URL}
      JWT_SECRET: \${JWT_SECRET}
      REDIS_URL: \${REDIS_URL}
      PORT: 3003
      USER_SERVICE_URL: http://${env_prefix}_user-service:3001
    networks:
      - ${DOCKER_NETWORK}
    labels:
      - "traefik.enable=false"
      - "deployment.environment=${env_prefix}"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3003/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Web Application
  ${env_prefix}_web:
    build:
      context: ..
      dockerfile: docker-deploy/dockerfiles/Dockerfile.web.fixed
    container_name: emaintenance_${env_prefix}_web
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_USER_SERVICE_URL: http://${env_prefix}_user-service:3001
      NEXT_PUBLIC_WORK_ORDER_SERVICE_URL: http://${env_prefix}_work-order-service:3002
      NEXT_PUBLIC_ASSET_SERVICE_URL: http://${env_prefix}_asset-service:3003
      PORT: 3000
    networks:
      - ${DOCKER_NETWORK}
    labels:
      - "traefik.enable=false"
      - "deployment.environment=${env_prefix}"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

networks:
  ${DOCKER_NETWORK}:
    external: true
EOF
    
    success "Generated $compose_file"
}

# Deploy to target environment
deploy_to_environment() {
    local env_prefix="$1"
    local compose_file="docker-compose.${env_prefix}.yml"
    
    info "Deploying to $env_prefix environment"
    
    cd "$DEPLOY_DIR/docker-deploy"
    
    # Build and start services
    docker compose -f "$compose_file" build --no-cache
    docker compose -f "$compose_file" up -d
    
    success "Services deployed to $env_prefix environment"
}

# Health check for environment
health_check_environment() {
    local env_prefix="$1"
    local attempts=0
    
    info "Running health checks for $env_prefix environment"
    
    local services=(
        "${env_prefix}_user-service:3001"
        "${env_prefix}_work-order-service:3002"
        "${env_prefix}_asset-service:3003"
        "${env_prefix}_web:3000"
    )
    
    while [ $attempts -lt $HEALTH_CHECK_RETRIES ]; do
        local all_healthy=true
        
        for service_port in "${services[@]}"; do
            IFS=':' read -r service port <<< "$service_port"
            local container="emaintenance_${service}"
            
            # Get container IP
            local container_ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$container" 2>/dev/null)
            
            if [ -z "$container_ip" ]; then
                warning "Container $container not found or not running"
                all_healthy=false
                continue
            fi
            
            # Check health endpoint
            if docker exec "$container" curl -f -s "http://localhost:${port}/health" &>/dev/null || \
               docker exec "$container" curl -f -s "http://localhost:${port}" &>/dev/null; then
                log "✓ $service is healthy"
            else
                warning "✗ $service not healthy yet"
                all_healthy=false
            fi
        done
        
        if [ "$all_healthy" = true ]; then
            success "All services in $env_prefix environment are healthy"
            return 0
        fi
        
        attempts=$((attempts + 1))
        info "Health check attempt $attempts/$HEALTH_CHECK_RETRIES"
        sleep $HEALTH_CHECK_INTERVAL
    done
    
    error "Health checks failed for $env_prefix environment after $attempts attempts"
}

# Update load balancer configuration
update_load_balancer() {
    local target_env="$1"
    
    info "Updating load balancer to point to $target_env environment"
    
    # Generate new nginx configuration
    cat > "$DEPLOY_DIR/docker-deploy/nginx/nginx.blue-green.conf" << EOF
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml application/atom+xml image/svg+xml 
               text/x-js text/x-cross-domain-policy application/x-font-ttf 
               application/x-font-opentype application/vnd.ms-fontobject 
               image/x-icon;
    
    # Upstream definitions for ${target_env} environment
    upstream user_service {
        server emaintenance_${target_env}_user-service:3001;
    }
    
    upstream work_order_service {
        server emaintenance_${target_env}_work-order-service:3002;
    }
    
    upstream asset_service {
        server emaintenance_${target_env}_asset-service:3003;
    }
    
    upstream web_app {
        server emaintenance_${target_env}_web:3000;
    }
    
    # Main server block
    server {
        listen 80;
        server_name _;
        
        # Health check endpoint for nginx
        location /nginx-health {
            access_log off;
            return 200 "healthy\\n";
            add_header Content-Type text/plain;
        }
        
        # Web application
        location / {
            proxy_pass http://web_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_cache_bypass \$http_upgrade;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        # API services
        location /api/users {
            proxy_pass http://user_service;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        location /api/work-orders {
            proxy_pass http://work_order_service;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        location /api/assets {
            proxy_pass http://asset_service;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOF
    
    # Reload nginx configuration
    if docker ps --format "{{.Names}}" | grep -q "emaintenance_nginx"; then
        docker cp "$DEPLOY_DIR/docker-deploy/nginx/nginx.blue-green.conf" emaintenance_nginx:/etc/nginx/nginx.conf
        docker exec emaintenance_nginx nginx -s reload
        success "Load balancer updated to route traffic to $target_env"
    else
        warning "Nginx container not found, starting it"
        docker run -d \
            --name emaintenance_nginx \
            --network ${DOCKER_NETWORK} \
            -p 80:80 \
            -v "$DEPLOY_DIR/docker-deploy/nginx/nginx.blue-green.conf:/etc/nginx/nginx.conf:ro" \
            nginx:alpine
    fi
}

# Smoke test the new environment
smoke_test() {
    local env_prefix="$1"
    
    info "Running smoke tests on $env_prefix environment"
    
    # Test authentication
    local user_service="emaintenance_${env_prefix}_user-service"
    
    if docker exec "$user_service" curl -s -X POST http://localhost:3001/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@emaintenance.com","password":"password123"}' | grep -q "token"; then
        success "✓ Authentication test passed"
    else
        error "✗ Authentication test failed"
    fi
    
    # Test database connectivity
    if docker exec "$user_service" curl -s http://localhost:3001/health | grep -q "ok"; then
        success "✓ Database connectivity test passed"
    else
        error "✗ Database connectivity test failed"
    fi
    
    success "Smoke tests passed for $env_prefix environment"
}

# Cleanup old environment
cleanup_old_environment() {
    local env_prefix="$1"
    local compose_file="docker-compose.${env_prefix}.yml"
    
    info "Cleaning up $env_prefix environment"
    
    cd "$DEPLOY_DIR/docker-deploy"
    
    # Stop and remove containers
    docker compose -f "$compose_file" down
    
    # Remove unused images
    docker image prune -f
    
    success "Cleaned up $env_prefix environment"
}

# Rollback to previous environment
rollback() {
    local current_env=$(get_current_env)
    
    warning "Rolling back to $current_env environment"
    
    # Simply update the load balancer to point back to current environment
    update_load_balancer "$current_env"
    
    success "Rolled back to $current_env environment"
}

# Main deployment flow
main() {
    log "=========================================="
    log "E-Maintenance Zero-Downtime Deployment"
    log "=========================================="
    
    # Get current and target environments
    local current_env=$(get_current_env)
    local target_env=$(get_target_env)
    
    info "Current environment: $current_env"
    info "Target environment: $target_env"
    
    # Step 1: Pull latest code
    log "Step 1: Pulling latest code from Gitea"
    cd "$DEPLOY_DIR"
    git pull origin main
    
    # Step 2: Generate compose file for target environment
    log "Step 2: Generating deployment configuration"
    generate_compose_file "$target_env"
    
    # Step 3: Deploy to target environment
    log "Step 3: Deploying to $target_env environment"
    deploy_to_environment "$target_env"
    
    # Step 4: Health checks
    log "Step 4: Running health checks"
    if ! health_check_environment "$target_env"; then
        error "Health checks failed, aborting deployment"
    fi
    
    # Step 5: Smoke tests
    log "Step 5: Running smoke tests"
    if ! smoke_test "$target_env"; then
        error "Smoke tests failed, aborting deployment"
    fi
    
    # Step 6: Switch traffic to new environment
    log "Step 6: Switching traffic to $target_env environment"
    update_load_balancer "$target_env"
    
    # Step 7: Update current environment marker
    echo "$target_env" > "$CURRENT_ENV_FILE"
    
    # Step 8: Monitor for issues (grace period)
    log "Step 7: Monitoring new deployment for 60 seconds"
    sleep 60
    
    # Step 9: Final health check
    log "Step 8: Final health check"
    if health_check_environment "$target_env"; then
        success "Deployment successful!"
        
        # Step 10: Cleanup old environment (optional)
        read -p "Clean up $current_env environment? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cleanup_old_environment "$current_env"
        fi
    else
        warning "Final health check failed, rolling back"
        rollback
        error "Deployment failed and rolled back"
    fi
    
    log "=========================================="
    log "Deployment completed successfully"
    log "Active environment: $target_env"
    log "=========================================="
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    rollback)
        rollback
        ;;
    status)
        current_env=$(get_current_env)
        echo "Current active environment: $current_env"
        docker ps --filter "label=deployment.environment=$current_env"
        ;;
    cleanup)
        target_env=$(get_target_env)
        cleanup_old_environment "$target_env"
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|status|cleanup}"
        echo "  deploy   - Deploy new version with zero downtime"
        echo "  rollback - Roll back to previous environment"
        echo "  status   - Show current deployment status"
        echo "  cleanup  - Clean up inactive environment"
        exit 1
        ;;
esac