#!/bin/bash

# E-Maintenance Deployment Environment Validator
# ==============================================
# Validates all environment variables and configurations before deployment
# Version: 1.0
# Date: 2025-08-22

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.production.yml"

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Functions
log() { echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[$(date '+%H:%M:%S')] ERROR: $1${NC}"; ((FAILED_CHECKS++)); }
warning() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING: $1${NC}"; ((WARNING_CHECKS++)); }
info() { echo -e "${BLUE}[$(date '+%H:%M:%S')] INFO: $1${NC}"; }
success() { echo -e "${CYAN}[$(date '+%H:%M:%S')] SUCCESS: $1${NC}"; ((PASSED_CHECKS++)); }
section() { echo -e "\n${MAGENTA}===== $1 =====${NC}"; }

check() {
    ((TOTAL_CHECKS++))
    local condition="$1"
    local success_msg="$2"
    local error_msg="$3"
    
    if eval "$condition"; then
        success "$success_msg"
        return 0
    else
        error "$error_msg"
        return 1
    fi
}

check_warning() {
    ((TOTAL_CHECKS++))
    local condition="$1"
    local success_msg="$2"
    local warning_msg="$3"
    
    if eval "$condition"; then
        success "$success_msg"
        return 0
    else
        warning "$warning_msg"
        return 1
    fi
}

# Validate file existence and permissions
validate_files() {
    section "File Validation"
    
    check "[[ -f '$ENV_FILE' ]]" \
        "Environment file exists: $ENV_FILE" \
        "Environment file missing: $ENV_FILE"
    
    check "[[ -r '$ENV_FILE' ]]" \
        "Environment file is readable" \
        "Environment file is not readable"
    
    check "[[ -f '$COMPOSE_FILE' ]]" \
        "Docker Compose file exists: $COMPOSE_FILE" \
        "Docker Compose file missing: $COMPOSE_FILE"
    
    check "[[ -r '$COMPOSE_FILE' ]]" \
        "Docker Compose file is readable" \
        "Docker Compose file is not readable"
    
    # Check Dockerfiles
    local dockerfiles=(
        "dockerfiles/Dockerfile.api.fixed"
        "dockerfiles/Dockerfile.web.fixed"
    )
    
    for dockerfile in "${dockerfiles[@]}"; do
        check "[[ -f '$dockerfile' ]]" \
            "Dockerfile exists: $dockerfile" \
            "Dockerfile missing: $dockerfile"
    done
}

# Validate environment variables
validate_environment_variables() {
    section "Environment Variables Validation"
    
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Cannot validate environment variables: $ENV_FILE not found"
        return 1
    fi
    
    # Source environment file
    source "$ENV_FILE"
    
    # Database variables
    check "[[ -n '$DATABASE_URL' ]]" \
        "DATABASE_URL is set" \
        "DATABASE_URL is missing"
    
    check "[[ -n '$DB_PASSWORD' ]]" \
        "DB_PASSWORD is set" \
        "DB_PASSWORD is missing"
    
    check "[[ ${#DB_PASSWORD} -ge 12 ]]" \
        "Database password is strong (≥12 chars)" \
        "Database password is weak (<12 chars)"
    
    # JWT configuration
    check "[[ -n '$JWT_SECRET' ]]" \
        "JWT_SECRET is set" \
        "JWT_SECRET is missing"
    
    check "[[ ${#JWT_SECRET} -ge 32 ]]" \
        "JWT secret is strong (≥32 chars)" \
        "JWT secret is weak (<32 chars)"
    
    # Redis configuration
    check "[[ -n '$REDIS_PASSWORD' ]]" \
        "REDIS_PASSWORD is set" \
        "REDIS_PASSWORD is missing"
    
    check "[[ -n '$REDIS_URL' ]]" \
        "REDIS_URL is set" \
        "REDIS_URL is missing"
    
    # Admin configuration
    check "[[ -n '$ADMIN_PASSWORD' ]]" \
        "ADMIN_PASSWORD is set" \
        "ADMIN_PASSWORD is missing"
    
    check "[[ -n '$ADMIN_EMAIL' ]]" \
        "ADMIN_EMAIL is set" \
        "ADMIN_EMAIL is missing"
    
    # Frontend URLs
    local frontend_vars=(
        "NEXT_PUBLIC_API_URL"
        "NEXT_PUBLIC_USER_SERVICE_URL"
        "NEXT_PUBLIC_WORK_ORDER_SERVICE_URL"
        "NEXT_PUBLIC_ASSET_SERVICE_URL"
    )
    
    for var in "${frontend_vars[@]}"; do
        check "[[ -n '${!var}' ]]" \
            "$var is set" \
            "$var is missing"
        
        # Check if URL format is valid
        if [[ -n "${!var}" ]]; then
            check "[[ '${!var}' =~ ^https?:// ]]" \
                "$var has valid URL format" \
                "$var has invalid URL format: ${!var}"
        fi
    done
    
    # Check for placeholder values
    local all_vars=(DATABASE_URL DB_PASSWORD JWT_SECRET REDIS_PASSWORD ADMIN_PASSWORD)
    for var in "${all_vars[@]}"; do
        local value="${!var:-}"
        check "[[ '$value' != *'CHANGE_ME'* && '$value' != *'YOUR_'* ]]" \
            "$var is properly configured" \
            "$var contains placeholder value"
    done
}

# Validate Docker configuration
validate_docker_config() {
    section "Docker Configuration Validation"
    
    # Check Docker is running
    check "docker info >/dev/null 2>&1" \
        "Docker daemon is running" \
        "Docker daemon is not running or accessible"
    
    # Check Docker Compose
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    else
        error "Docker Compose not found"
        return 1
    fi
    
    success "Docker Compose found: $DOCKER_COMPOSE_CMD"
    
    # Validate compose file syntax
    check "$DOCKER_COMPOSE_CMD -f '$COMPOSE_FILE' config >/dev/null 2>&1" \
        "Docker Compose file syntax is valid" \
        "Docker Compose file has syntax errors"
    
    # Check if all services have proper build context
    local services=$(docker compose -f "$COMPOSE_FILE" config --services)
    info "Services defined: $(echo $services | tr '\n' ' ')"
    
    # Check for required volumes
    local volume_dirs=(
        "/opt/emaintenance/data"
        "/opt/emaintenance/logs"
        "/opt/emaintenance/backups"
    )
    
    for dir in "${volume_dirs[@]}"; do
        check_warning "[[ -d '$dir' ]]" \
            "Volume directory exists: $dir" \
            "Volume directory will be created: $dir"
    done
}

# Validate network connectivity
validate_network() {
    section "Network Connectivity Validation"
    
    # Check internet connectivity
    check_warning "ping -c 1 8.8.8.8 >/dev/null 2>&1" \
        "Internet connectivity available" \
        "Limited internet connectivity (may affect image pulls)"
    
    # Check Docker registry connectivity
    check_warning "docker pull hello-world >/dev/null 2>&1" \
        "Docker registry connectivity confirmed" \
        "Docker registry connectivity issues"
    
    # Cleanup test image
    docker rmi hello-world >/dev/null 2>&1 || true
    
    # Check if ports are available
    local ports=(3000 3001 3002 3003 3030 5432 6379)
    for port in "${ports[@]}"; do
        check_warning "! netstat -tuln 2>/dev/null | grep ':$port ' >/dev/null" \
            "Port $port is available" \
            "Port $port may be in use"
    done
}

# Validate system resources
validate_system_resources() {
    section "System Resources Validation"
    
    # Check available disk space (minimum 10GB)
    local available_space=$(df / | tail -1 | awk '{print int($4/1048576)}')
    check "[[ $available_space -ge 10 ]]" \
        "Sufficient disk space available: ${available_space}GB" \
        "Insufficient disk space: ${available_space}GB (minimum 10GB required)"
    
    # Check available memory (minimum 4GB)
    if command -v free &> /dev/null; then
        local available_mem=$(free -m | awk 'NR==2{printf "%.0f", $7/1024}')
        check_warning "[[ $available_mem -ge 4 ]]" \
            "Sufficient memory available: ${available_mem}GB" \
            "Limited memory available: ${available_mem}GB (recommended: 4GB+)"
    fi
    
    # Check Docker system space
    local docker_space=$(docker system df --format "table {{.Size}}" | tail -n +2 | head -1 || echo "0B")
    info "Current Docker space usage: $docker_space"
}

# Validate build arguments in compose file
validate_build_args() {
    section "Build Arguments Validation"
    
    # Check if all services that need build args have them
    local api_services=("user-service" "work-order-service" "asset-service")
    
    for service in "${api_services[@]}"; do
        local has_service_name=$(grep -A 10 "$service:" "$COMPOSE_FILE" | grep -c "SERVICE_NAME" || echo "0")
        check "[[ $has_service_name -gt 0 ]]" \
            "$service has SERVICE_NAME build arg" \
            "$service missing SERVICE_NAME build arg"
        
        local has_service_path=$(grep -A 10 "$service:" "$COMPOSE_FILE" | grep -c "SERVICE_PATH" || echo "0")
        check "[[ $has_service_path -gt 0 ]]" \
            "$service has SERVICE_PATH build arg" \
            "$service missing SERVICE_PATH build arg"
    done
    
    # Check web service build args
    local web_args=$(grep -A 15 "web:" "$COMPOSE_FILE" | grep -c "NEXT_PUBLIC_" || echo "0")
    check "[[ $web_args -gt 0 ]]" \
        "Web service has NEXT_PUBLIC_ build args" \
        "Web service missing NEXT_PUBLIC_ build args"
}

# Show validation summary
show_summary() {
    section "Validation Summary"
    
    echo -e "\n${CYAN}📊 Validation Results:${NC}"
    echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "✅ Passed: ${GREEN}$PASSED_CHECKS${NC}"
    echo -e "❌ Failed: ${RED}$FAILED_CHECKS${NC}"
    echo -e "⚠️  Warnings: ${YELLOW}$WARNING_CHECKS${NC}"
    echo -e "📋 Total: $TOTAL_CHECKS"
    echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local success_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        echo -e "\n🎉 ${GREEN}VALIDATION PASSED${NC} (${success_rate}% success rate)"
        echo -e "${GREEN}✓ Environment is ready for deployment${NC}"
        
        if [[ $WARNING_CHECKS -gt 0 ]]; then
            echo -e "${YELLOW}⚠️  Note: $WARNING_CHECKS warnings detected${NC}"
            echo -e "${YELLOW}   Review warnings but deployment can proceed${NC}"
        fi
        
        echo -e "\n${CYAN}🚀 Next Steps:${NC}"
        echo -e "   1. Run deployment: ${MAGENTA}./deploy-secure.sh${NC}"
        echo -e "   2. Monitor logs during deployment"
        echo -e "   3. Verify services after deployment"
        
        return 0
    else
        echo -e "\n❌ ${RED}VALIDATION FAILED${NC} (${success_rate}% success rate)"
        echo -e "${RED}✗ Environment has critical issues${NC}"
        
        echo -e "\n${CYAN}🔧 Recommended Actions:${NC}"
        echo -e "   1. Fix failed checks above"
        echo -e "   2. Run environment generator: ${MAGENTA}./generate-secure-env.sh${NC}"
        echo -e "   3. Re-run validation: ${MAGENTA}./validate-deployment-env.sh${NC}"
        echo -e "   4. Check debug output: ${MAGENTA}./debug-env.sh${NC}"
        
        return 1
    fi
}

# Main function
main() {
    echo -e "${CYAN}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════════╗
║               E-Maintenance Deployment Validator                 ║
║                   Pre-flight Safety Check                       ║
╚══════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    log "Starting comprehensive deployment validation..."
    
    # Run all validation checks
    validate_files
    validate_environment_variables
    validate_docker_config
    validate_network
    validate_system_resources
    validate_build_args
    
    # Show summary and exit with appropriate code
    show_summary
}

# Handle interruption
trap 'error "Validation interrupted"; exit 1' INT TERM

# Run main function
main "$@"