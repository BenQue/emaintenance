#!/bin/bash

# EMaintenance Health Check Script
# This script checks the health of all services in the EMaintenance system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TIMEOUT=10
ENVIRONMENT="dev"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if curl is available
check_curl() {
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed. Installing curl..."
        # Try to install curl based on OS
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y curl
        elif command -v yum &> /dev/null; then
            sudo yum install -y curl
        elif command -v brew &> /dev/null; then
            brew install curl
        else
            log_error "Cannot install curl automatically. Please install curl manually."
            exit 1
        fi
    fi
}

# Check Docker services status
check_docker_services() {
    local compose_file=$1
    
    log_info "Checking Docker services status..."
    
    # Get list of running services
    local services=$(docker-compose -f "$compose_file" ps --services --filter "status=running" 2>/dev/null || echo "")
    
    if [ -z "$services" ]; then
        log_error "No Docker services are running"
        return 1
    fi
    
    local total_services=0
    local running_services=0
    
    while IFS= read -r service; do
        if [ -n "$service" ]; then
            total_services=$((total_services + 1))
            if docker-compose -f "$compose_file" ps "$service" | grep -q "Up"; then
                running_services=$((running_services + 1))
                log_success "Service $service is running"
            else
                log_error "Service $service is not running"
            fi
        fi
    done <<< "$(docker-compose -f "$compose_file" config --services)"
    
    log_info "Services status: $running_services/$total_services running"
    
    if [ "$running_services" -eq "$total_services" ]; then
        return 0
    else
        return 1
    fi
}

# Check HTTP endpoint
check_endpoint() {
    local url=$1
    local service_name=$2
    local expected_status=${3:-200}
    
    log_info "Checking $service_name endpoint: $url"
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$TIMEOUT" "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        log_success "$service_name is healthy (HTTP $response)"
        return 0
    else
        log_error "$service_name is unhealthy (HTTP $response)"
        return 1
    fi
}

# Check database connectivity
check_database() {
    local compose_file=$1
    
    log_info "Checking database connectivity..."
    
    if docker-compose -f "$compose_file" exec -T database pg_isready -U postgres >/dev/null 2>&1; then
        log_success "Database is ready"
        return 0
    else
        log_error "Database is not ready"
        return 1
    fi
}

# Check Redis connectivity
check_redis() {
    local compose_file=$1
    
    log_info "Checking Redis connectivity..."
    
    if docker-compose -f "$compose_file" exec -T redis redis-cli ping >/dev/null 2>&1; then
        log_success "Redis is ready"
        return 0
    else
        log_error "Redis is not ready"
        return 1
    fi
}

# Main health check function
run_health_check() {
    local env=$1
    local compose_file
    local base_url
    
    if [ "$env" = "production" ] || [ "$env" = "prod" ]; then
        compose_file="docker-compose.prod.yml"
        base_url="http://localhost"
        ENVIRONMENT="prod"
    else
        compose_file="docker-compose.yml"
        base_url="http://localhost"
        ENVIRONMENT="dev"
    fi
    
    log_info "Running health check for $ENVIRONMENT environment..."
    echo "=================================="
    
    local failed_checks=0
    
    # Check if Docker Compose file exists
    if [ ! -f "$compose_file" ]; then
        log_error "Docker Compose file $compose_file not found"
        exit 1
    fi
    
    # Check curl availability
    check_curl
    
    # Check Docker services
    if ! check_docker_services "$compose_file"; then
        failed_checks=$((failed_checks + 1))
    fi
    
    echo ""
    
    # Check database
    if ! check_database "$compose_file"; then
        failed_checks=$((failed_checks + 1))
    fi
    
    # Check Redis
    if ! check_redis "$compose_file"; then
        failed_checks=$((failed_checks + 1))
    fi
    
    echo ""
    
    # Check HTTP endpoints
    if [ "$ENVIRONMENT" = "prod" ]; then
        # In production, check through Nginx
        check_endpoint "$base_url" "Nginx Proxy" || failed_checks=$((failed_checks + 1))
        check_endpoint "$base_url/api/auth/health" "User Service (via Nginx)" || failed_checks=$((failed_checks + 1))
    else
        # In development, check services directly
        check_endpoint "$base_url:3000" "Web Application" || failed_checks=$((failed_checks + 1))
        check_endpoint "$base_url:3001/health" "User Service" || failed_checks=$((failed_checks + 1))
        check_endpoint "$base_url:3002/health" "Work Order Service" || failed_checks=$((failed_checks + 1))
        check_endpoint "$base_url:3003/health" "Asset Service" || failed_checks=$((failed_checks + 1))
    fi
    
    echo ""
    echo "=================================="
    
    if [ "$failed_checks" -eq 0 ]; then
        log_success "All health checks passed! ✨"
        echo ""
        log_info "System URLs:"
        if [ "$ENVIRONMENT" = "prod" ]; then
            log_info "  - Web Application: $base_url"
            log_info "  - API Services: $base_url/api/*"
        else
            log_info "  - Web Application: $base_url:3000"
            log_info "  - User Service: $base_url:3001"
            log_info "  - Work Order Service: $base_url:3002"
            log_info "  - Asset Service: $base_url:3003"
        fi
        return 0
    else
        log_error "$failed_checks health check(s) failed!"
        log_warning "Please check the logs and fix the issues:"
        log_info "  docker-compose -f $compose_file logs"
        return 1
    fi
}

# Show help
show_help() {
    echo "EMaintenance Health Check Script"
    echo ""
    echo "Usage: $0 [ENVIRONMENT]"
    echo ""
    echo "Environments:"
    echo "  dev, development    Check development environment (default)"
    echo "  prod, production    Check production environment"
    echo ""
    echo "Examples:"
    echo "  $0                  # Check development environment"
    echo "  $0 dev              # Check development environment"
    echo "  $0 prod             # Check production environment"
    echo ""
    echo "This script checks:"
    echo "  - Docker services status"
    echo "  - Database connectivity"
    echo "  - Redis connectivity"
    echo "  - HTTP endpoints health"
}

# Parse arguments
case "${1:-dev}" in
    "dev"|"development")
        run_health_check "dev"
        ;;
    "prod"|"production")
        run_health_check "prod"
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        log_error "Unknown environment: $1"
        show_help
        exit 1
        ;;
esac