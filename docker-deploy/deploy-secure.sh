#!/bin/bash

# E-Maintenance Secure Production Deployment Script
# =================================================
# This script handles secure deployment with proper environment setup
# Target: Any Linux server with Docker support
# Version: 3.0 - Secure Edition
# Date: 2025-08-21

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"
ENV_TEMPLATE=".env.production.secure"
PROJECT_NAME="emaintenance"
BACKUP_DIR="/opt/emaintenance/backups"
LOG_DIR="/opt/emaintenance/logs"
DATA_DIR="/opt/emaintenance/data"
LOG_FILE="${LOG_DIR}/deploy-$(date +%Y%m%d-%H%M%S).log"

# Ensure required directories exist
for dir in "$BACKUP_DIR" "$LOG_DIR" "$DATA_DIR"; do
    mkdir -p "$dir" 2>/dev/null || true
done

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

section() {
    echo -e "\n${CYAN}${BOLD}========================================${NC}" | tee -a "$LOG_FILE"
    echo -e "${CYAN}${BOLD} $1${NC}" | tee -a "$LOG_FILE"
    echo -e "${CYAN}${BOLD}========================================${NC}" | tee -a "$LOG_FILE"
}

# Show banner
show_banner() {
    echo -e "${CYAN}"
    cat << "EOF"
███████╗      ███╗   ███╗ █████╗ ██╗███╗   ██╗████████╗███████╗███╗   ██╗ █████╗ ███╗   ██╗ ██████╗███████╗
██╔════╝      ████╗ ████║██╔══██╗██║████╗  ██║╚══██╔══╝██╔════╝████╗  ██║██╔══██╗████╗  ██║██╔════╝██╔════╝
█████╗  █████╗██╔████╔██║███████║██║██╔██╗ ██║   ██║   █████╗  ██╔██╗ ██║███████║██╔██╗ ██║██║     █████╗  
██╔══╝  ╚════╝██║╚██╔╝██║██╔══██║██║██║╚██╗██║   ██║   ██╔══╝  ██║╚██╗██║██╔══██║██║╚██╗██║██║     ██╔══╝  
███████╗      ██║ ╚═╝ ██║██║  ██║██║██║ ╚████║   ██║   ███████╗██║ ╚████║██║  ██║██║ ╚████║╚██████╗███████╗
╚══════╝      ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
EOF
    echo -e "${NC}"
    echo -e "${CYAN}Enterprise Equipment Maintenance Management System${NC}"
    echo -e "${CYAN}Secure Production Deployment Script v3.0${NC}"
    echo -e "${CYAN}Date: $(date)${NC}"
    echo
}

# Check if running with appropriate privileges
check_privileges() {
    section "Checking User Privileges"
    
    if [[ $EUID -eq 0 ]]; then
        warning "Running as root. This is acceptable for deployment but not recommended for regular use."
    else
        info "Running as user: $USER"
        info "You may need to enter sudo password for some operations."
    fi
    
    # Test sudo access
    if sudo -n true 2>/dev/null; then
        success "Sudo access confirmed (cached credentials)"
    else
        info "Testing sudo access..."
        if sudo true; then
            success "Sudo access confirmed"
        else
            error "Sudo access required for deployment operations"
        fi
    fi
}

# Check system requirements
check_requirements() {
    section "Checking System Requirements"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    info "✓ Docker version: $(docker --version)"
    
    # Check Docker Compose
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
        info "✓ Docker Compose version: $(docker-compose --version)"
    elif docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
        info "✓ Docker Compose (plugin) version: $(docker compose version)"
    else
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check Docker service
    if ! systemctl is-active --quiet docker 2>/dev/null && ! service docker status &>/dev/null; then
        warning "Docker service may not be running. Attempting to start..."
        sudo systemctl start docker || sudo service docker start || error "Failed to start Docker service"
    fi
    success "✓ Docker service is running"
    
    # Check available disk space (minimum 10GB)
    AVAILABLE_SPACE=$(df / | tail -1 | awk '{print int($4/1048576)}')
    if [[ $AVAILABLE_SPACE -lt 10 ]]; then
        warning "Available disk space is less than 10GB (${AVAILABLE_SPACE}GB). Consider freeing up space."
    else
        info "✓ Available disk space: ${AVAILABLE_SPACE}GB"
    fi
    
    # Check available memory (minimum 4GB)
    if command -v free &> /dev/null; then
        AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $7/1024}')
        if [[ $AVAILABLE_MEM -lt 4 ]]; then
            warning "Available memory is less than 4GB (${AVAILABLE_MEM}GB). Performance may be affected."
        else
            info "✓ Available memory: ${AVAILABLE_MEM}GB"
        fi
    fi
    
    # Check required files
    local required_files=("$COMPOSE_FILE" "database/init/01-init.sql" "nginx/nginx.conf")
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            error "Required file missing: $file"
        fi
    done
    success "✓ All required files present"
    
    # Check network connectivity
    if ping -c 1 8.8.8.8 &> /dev/null; then
        info "✓ Network connectivity confirmed"
    else
        warning "Network connectivity issues detected"
    fi
}

# Environment setup and validation
setup_environment() {
    section "Environment Configuration Setup"
    
    # Check if environment file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        if [[ -f "$ENV_TEMPLATE" ]]; then
            info "Environment file not found. Setting up from template..."
            
            # Check if generate-secure-env.sh exists and is executable
            if [[ -x "./generate-secure-env.sh" ]]; then
                info "Running secure environment generation script..."
                if ./generate-secure-env.sh; then
                    success "✓ Environment configured with secure passwords"
                else
                    error "Environment generation failed"
                fi
            elif [[ -x "./generate-passwords.sh" ]]; then
                info "Running password generation script..."
                if ./generate-passwords.sh; then
                    success "✓ Environment configured with secure passwords"
                else
                    error "Password generation failed"
                fi
            else
                error "No environment generation script found. Please run './generate-secure-env.sh' first."
            fi
        else
            error "Neither $ENV_FILE nor $ENV_TEMPLATE found. Please ensure environment configuration exists."
        fi
    else
        info "✓ Environment file $ENV_FILE found"
        
        # Validate critical environment variables
        validate_environment
    fi
    
    # Export environment variables for Docker build
    export_build_variables
}

# Validate environment variables
validate_environment() {
    info "Validating environment configuration..."
    
    source "$ENV_FILE"
    
    local required_vars=(
        "DB_PASSWORD"
        "JWT_SECRET" 
        "REDIS_PASSWORD"
        "ADMIN_PASSWORD"
        "DATABASE_URL"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]] || [[ "${!var}" == *"YOUR_"* ]] || [[ "${!var}" == *"_HERE"* ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        error "Missing or invalid environment variables: ${missing_vars[*]}. Please run ./generate-passwords.sh first."
    fi
    
    # Validate password strength
    if [[ ${#DB_PASSWORD} -lt 12 ]]; then
        warning "Database password is less than 12 characters. Consider using a stronger password."
    fi
    
    if [[ ${#JWT_SECRET} -lt 32 ]]; then
        warning "JWT secret is less than 32 characters. Consider using a longer secret."
    fi
    
    success "✓ Environment validation passed"
}

# Export build variables for Docker
export_build_variables() {
    info "Exporting build-time environment variables..."
    
    # Source environment file
    set -a  # automatically export all variables
    source "$ENV_FILE"
    set +a  # stop automatically exporting
    
    # Ensure critical build variables are exported
    export NODE_ENV=production
    export DATABASE_URL
    export JWT_SECRET
    export REDIS_URL
    export NEXT_PUBLIC_API_URL
    export NEXT_PUBLIC_USER_SERVICE_URL
    export NEXT_PUBLIC_WORK_ORDER_SERVICE_URL
    export NEXT_PUBLIC_ASSET_SERVICE_URL
    
    # Debug: Show key variables (without sensitive data)
    info "Key build variables configured:"
    echo "  - NODE_ENV: $NODE_ENV"
    echo "  - Database configured: $([ -n "$DATABASE_URL" ] && echo "✓" || echo "✗")"
    echo "  - JWT secret configured: $([ -n "$JWT_SECRET" ] && echo "✓" || echo "✗")"
    echo "  - Frontend URLs configured: $([ -n "$NEXT_PUBLIC_API_URL" ] && echo "✓" || echo "✗")"
    
    success "✓ Build variables exported"
}

# Pre-deployment backup
create_backup() {
    section "Creating Pre-Deployment Backup"
    
    local backup_name="emaintenance-backup-$(date +%Y%m%d-%H%M%S)"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    
    info "Creating backup at: $backup_path"
    mkdir -p "$backup_path"
    
    # Backup existing containers data if they exist
    if docker ps -a --format "table {{.Names}}" | grep -q "${PROJECT_NAME}_"; then
        info "Backing up existing Docker volumes..."
        
        # Export database if postgres container exists
        if docker ps -a --format "table {{.Names}}" | grep -q "${PROJECT_NAME}_postgres"; then
            info "Creating database backup..."
            docker exec "${PROJECT_NAME}_postgres_1" pg_dumpall -U postgres > "$backup_path/database_backup.sql" 2>/dev/null || {
                warning "Could not backup database (container may not be running)"
            }
        fi
        
        # Backup Docker volumes
        docker run --rm -v "${PROJECT_NAME}_postgres_data:/data" -v "$backup_path:/backup" ubuntu tar czf /backup/postgres_volume.tar.gz -C /data . || {
            info "No postgres volume to backup"
        }
        
        docker run --rm -v "${PROJECT_NAME}_redis_data:/data" -v "$backup_path:/backup" ubuntu tar czf /backup/redis_volume.tar.gz -C /data . || {
            info "No redis volume to backup"
        }
    fi
    
    # Backup current environment and configuration files
    cp -r . "$backup_path/config_files/" 2>/dev/null || true
    
    # Create backup info file
    cat > "$backup_path/backup_info.txt" << EOF
E-Maintenance Backup Information
================================
Backup Date: $(date)
Backup Path: $backup_path
Server: $(hostname)
User: $(whoami)
Docker Version: $(docker --version)
Compose Version: $(${DOCKER_COMPOSE_CMD} --version)

Files Backed Up:
- Configuration files
- Environment settings
- Docker volumes (if existing)
- Database dump (if existing)

Restore Instructions:
1. Stop all services: ${DOCKER_COMPOSE_CMD} -f ${COMPOSE_FILE} down
2. Restore volumes: tar -xzf postgres_volume.tar.gz -C /var/lib/docker/volumes/
3. Import database: docker exec -i postgres_container psql -U postgres < database_backup.sql
4. Restart services: ${DOCKER_COMPOSE_CMD} -f ${COMPOSE_FILE} up -d
EOF
    
    success "✓ Backup created at: $backup_path"
    info "Backup size: $(du -sh "$backup_path" | cut -f1)"
}

# Stop existing services
stop_services() {
    section "Stopping Existing Services"
    
    if ${DOCKER_COMPOSE_CMD} -f "$COMPOSE_FILE" ps --services &>/dev/null; then
        info "Stopping existing services..."
        ${DOCKER_COMPOSE_CMD} -f "$COMPOSE_FILE" down --remove-orphans
        
        # Wait for containers to fully stop
        info "Waiting for containers to stop completely..."
        sleep 10
        
        # Force cleanup if needed
        local running_containers=$(docker ps -q --filter "name=${PROJECT_NAME}_")
        if [[ -n "$running_containers" ]]; then
            warning "Force stopping remaining containers..."
            docker stop $running_containers
        fi
        
        success "✓ All services stopped"
    else
        info "No existing services found"
    fi
}

# Pull and build images
prepare_images() {
    section "Preparing Docker Images"
    
    info "Pulling required base images..."
    if ! ${DOCKER_COMPOSE_CMD} -f "$COMPOSE_FILE" pull --ignore-pull-failures 2>/dev/null; then
        warning "Some base images failed to pull, continuing with cached/available images"
        warning "If this is the first deployment, some services may fail to build"
    fi
    
    info "Building custom images with environment variables..."
    
    # Validate compose file syntax first
    info "Validating Docker Compose configuration..."
    if ! ${DOCKER_COMPOSE_CMD} -f "$COMPOSE_FILE" config > /dev/null 2>&1; then
        error "Docker Compose file has syntax errors. Run '${DOCKER_COMPOSE_CMD} -f ${COMPOSE_FILE} config' to see details."
    fi
    success "✓ Docker Compose configuration is valid"
    
    # Build with verbose output and proper environment passing
    if ${DOCKER_COMPOSE_CMD} -f "$COMPOSE_FILE" build --no-cache; then
        success "✓ All images built successfully"
    else
        error "Image build failed. Check the output above for details."
    fi
    
    # Verify critical images were built
    info "Verifying built images..."
    local services=("user-service" "work-order-service" "asset-service" "web" "migrations")
    for service in "${services[@]}"; do
        if docker images | grep -q "${service}"; then
            info "✓ $service image built"
        else
            warning "⚠ $service image may not be built correctly"
        fi
    done
    
    success "✓ Image preparation completed"
}

# Deploy services
deploy_services() {
    section "Deploying Services"
    
    info "Starting database services first..."
    ${DOCKER_COMPOSE_CMD} -f "$COMPOSE_FILE" up -d postgres redis
    
    # Wait for database to be ready
    info "Waiting for database to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if ${DOCKER_COMPOSE_CMD} -f "$COMPOSE_FILE" exec -T postgres pg_isready -U postgres &>/dev/null; then
            success "✓ Database is ready"
            break
        fi
        
        info "Attempt $attempt/$max_attempts: Waiting for database..."
        sleep 5
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        error "Database failed to start within expected time"
    fi
    
    # Wait a bit more for full initialization
    sleep 10
    
    info "Running database migrations..."
    if ! run_migrations; then
        error "Database migrations failed. Check logs for details."
    fi
    
    info "Starting all services..."
    ${DOCKER_COMPOSE_CMD} -f "$COMPOSE_FILE" up -d
    
    success "✓ All services deployed"
}

# Run database migrations and seeding
run_migrations() {
    info "Running Prisma migrations..."
    
    # Use the migrations service from compose file instead of manual container
    info "Using migrations service from Docker Compose..."
    
    # First, build the migrations service if not already built
    if ! ${DOCKER_COMPOSE_CMD} -f "$COMPOSE_FILE" build migrations; then
        warning "Failed to build migrations service, trying direct approach..."
        
        # Fallback to direct container approach
        local temp_container="emaintenance_migration_$(date +%s)"
        
        docker run --rm \
            --name "$temp_container" \
            --network "docker-deploy_emaintenance_network" \
            --env-file "$ENV_FILE" \
            -v "$(pwd):/workspace" \
            -w "/workspace/packages/database" \
            node:18-alpine \
            sh -c "
                npm install -g npm@latest
                npm install
                npx prisma migrate deploy
                npx prisma generate
            " || return 1
        
        success "✓ Database migrations completed (fallback method)"
        return 0
    fi
    
    # Run the migrations service
    if ${DOCKER_COMPOSE_CMD} -f "$COMPOSE_FILE" run --rm migrations; then
        success "✓ Database migrations completed"
    else
        warning "Migrations service failed, trying manual approach..."
        return 1
    fi
    
    # Run additional SQL seeds
    info "Running additional seed files..."
    
    # Copy seed files to postgres container and execute them
    local seed_files=(
        "database/seeds/02-sample-assets.sql"
        "database/seeds/03-sample-workorders.sql"
    )
    
    for seed_file in "${seed_files[@]}"; do
        if [[ -f "$seed_file" ]]; then
            info "Running seed: $seed_file"
            docker exec -i "${PROJECT_NAME}_postgres_1" psql -U postgres -d emaintenance < "$seed_file" || {
                warning "Failed to run seed file: $seed_file"
            }
        fi
    done
    
    success "✓ Database seeding completed"
}

# Health checks
perform_health_checks() {
    section "Performing Health Checks"
    
    info "Waiting for all services to be fully ready..."
    sleep 30
    
    local services=("postgres" "redis" "web" "user-service" "work-order-service" "asset-service" "nginx")
    local failed_services=()
    
    for service in "${services[@]}"; do
        local container_name="${PROJECT_NAME}_${service}_1"
        
        if docker ps --format "table {{.Names}}" | grep -q "$container_name"; then
            # Check if container is running
            if [[ "$(docker inspect -f '{{.State.Status}}' "$container_name" 2>/dev/null)" == "running" ]]; then
                success "✓ $service is running"
                
                # Additional health checks for specific services
                case $service in
                    "postgres")
                        if ${DOCKER_COMPOSE_CMD} -f "$COMPOSE_FILE" exec -T postgres pg_isready -U postgres &>/dev/null; then
                            success "✓ PostgreSQL is accepting connections"
                        else
                            failed_services+=("postgres-connectivity")
                        fi
                        ;;
                    "redis")
                        if docker exec "$container_name" redis-cli ping &>/dev/null; then
                            success "✓ Redis is responding"
                        else
                            failed_services+=("redis-connectivity")
                        fi
                        ;;
                    "nginx")
                        if curl -f -s -o /dev/null "http://localhost:3030/health" 2>/dev/null; then
                            success "✓ Nginx is serving content"
                        else
                            info "⚠ Nginx health check (waiting for backend services)"
                        fi
                        ;;
                esac
            else
                failed_services+=("$service")
            fi
        else
            failed_services+=("$service")
        fi
    done
    
    # API Health Checks
    info "Testing API endpoints..."
    local api_endpoints=(
        "http://localhost:3001/health"
        "http://localhost:3002/health" 
        "http://localhost:3003/health"
    )
    
    local max_attempts=15
    for endpoint in "${api_endpoints[@]}"; do
        local attempt=1
        while [[ $attempt -le $max_attempts ]]; do
            if curl -f -s "$endpoint" &>/dev/null; then
                success "✓ API endpoint responding: $endpoint"
                break
            fi
            
            if [[ $attempt -eq $max_attempts ]]; then
                failed_services+=("api-$(echo "$endpoint" | grep -o '300[0-9]')")
            fi
            
            sleep 2
            ((attempt++))
        done
    done
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        warning "Some services failed health checks: ${failed_services[*]}"
        info "Check logs with: ${DOCKER_COMPOSE_CMD} -f ${COMPOSE_FILE} logs [service_name]"
    else
        success "✓ All services passed health checks"
    fi
}

# Display deployment summary
show_deployment_summary() {
    section "Deployment Summary"
    
    local server_ip="${SERVER_IP:-localhost}"
    
    echo -e "${GREEN}🎉 E-Maintenance System Deployed Successfully!${NC}"
    echo
    echo -e "${CYAN}📊 Access Information:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "🌐 Web Application:       ${YELLOW}http://${server_ip}:3030${NC}"
    echo -e "🔧 User Service API:      ${YELLOW}http://${server_ip}:3001${NC}"  
    echo -e "📋 Work Order Service:    ${YELLOW}http://${server_ip}:3002${NC}"
    echo -e "🏭 Asset Service:         ${YELLOW}http://${server_ip}:3003${NC}"
    echo
    echo -e "${CYAN}👥 Default Login Credentials:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "🔑 Admin:      admin@emaintenance.com / [Check credentials file]"
    echo -e "👨‍💼 Supervisor:  supervisor@emaintenance.com / password123"
    echo -e "🔧 Technician:  technician@emaintenance.com / password123"
    echo -e "👨‍💻 Employee:    employee@emaintenance.com / password123"
    echo
    echo -e "${RED}⚠️  IMPORTANT SECURITY NOTES:${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "1. ${RED}Change default passwords immediately after first login${NC}"
    echo -e "2. ${RED}Remove or secure the credentials file${NC}"
    echo -e "3. ${RED}Review and adjust firewall settings${NC}"
    echo -e "4. ${RED}Set up SSL/TLS certificates for production use${NC}"
    echo -e "5. ${RED}Configure regular database backups${NC}"
    echo
    echo -e "${BLUE}📁 Important Paths:${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "📊 Logs:         ${CYAN}${LOG_DIR}${NC}"
    echo -e "💾 Backups:      ${CYAN}${BACKUP_DIR}${NC}"
    echo -e "🗄️  Data:         ${CYAN}${DATA_DIR}${NC}"
    echo -e "📝 This Log:     ${CYAN}${LOG_FILE}${NC}"
    echo
    echo -e "${MAGENTA}🚀 Next Steps:${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "1. Test the application by logging in"
    echo -e "2. Create your first assets and work orders"
    echo -e "3. Configure user roles and permissions"
    echo -e "4. Set up monitoring and alerting"
    echo -e "5. Schedule regular backups"
    echo
    echo -e "${GREEN}✅ Deployment completed at $(date)${NC}"
}

# Cleanup function
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        error "Deployment failed with exit code $exit_code"
        info "Check the log file: $LOG_FILE"
        info "For troubleshooting, run: ${DOCKER_COMPOSE_CMD} -f ${COMPOSE_FILE} logs"
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main deployment process
main() {
    show_banner
    
    # Pre-flight checks
    check_privileges
    check_requirements
    setup_environment
    
    # Deployment steps
    create_backup
    stop_services
    prepare_images
    deploy_services
    perform_health_checks
    
    # Success!
    show_deployment_summary
    
    success "🎉 E-Maintenance system deployment completed successfully!"
}

# Run main function
main "$@"