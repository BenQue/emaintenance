#!/bin/bash

# E-Maintenance Environment Variables Debug Tool
# ==============================================
# Comprehensive debugging for Docker environment variable issues
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

# Functions
log() { echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[$(date '+%H:%M:%S')] ERROR: $1${NC}"; }
warning() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING: $1${NC}"; }
info() { echo -e "${BLUE}[$(date '+%H:%M:%S')] INFO: $1${NC}"; }
success() { echo -e "${CYAN}[$(date '+%H:%M:%S')] SUCCESS: $1${NC}"; }
section() { echo -e "\n${MAGENTA}===== $1 =====${NC}"; }

# Show environment file contents (masked)
show_env_file() {
    section "Environment File Analysis"
    
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Environment file $ENV_FILE not found"
        return 1
    fi
    
    info "Environment file: $ENV_FILE"
    info "File permissions: $(ls -la "$ENV_FILE" | awk '{print $1 " " $3 ":" $4}')"
    info "File size: $(wc -l < "$ENV_FILE") lines"
    
    echo
    info "Environment variables (sensitive values masked):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    while IFS= read -r line; do
        # Skip comments and empty lines
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// }" ]] && continue
        
        if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
            local var_name="${BASH_REMATCH[1]}"
            local var_value="${BASH_REMATCH[2]}"
            
            # Mask sensitive values
            if [[ "$var_name" =~ (PASSWORD|SECRET|TOKEN|KEY) ]]; then
                local masked_value="***masked***"
                echo -e "${CYAN}$var_name${NC}=${YELLOW}$masked_value${NC}"
            else
                echo -e "${CYAN}$var_name${NC}=${GREEN}$var_value${NC}"
            fi
        fi
    done < "$ENV_FILE"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Validate critical variables
validate_critical_vars() {
    section "Critical Variables Validation"
    
    # Source environment file
    if ! source "$ENV_FILE" 2>/dev/null; then
        error "Failed to source environment file"
        return 1
    fi
    
    # Critical variables for deployment
    local critical_vars=(
        "DATABASE_URL:Database connection string"
        "JWT_SECRET:Authentication secret"
        "DB_PASSWORD:Database password"
        "REDIS_PASSWORD:Redis password"
        "ADMIN_PASSWORD:Admin user password"
        "NEXT_PUBLIC_API_URL:Frontend API URL"
        "NEXT_PUBLIC_USER_SERVICE_URL:User service URL"
        "NEXT_PUBLIC_WORK_ORDER_SERVICE_URL:Work order service URL"
        "NEXT_PUBLIC_ASSET_SERVICE_URL:Asset service URL"
    )
    
    local passed=0
    local failed=0
    
    for var_desc in "${critical_vars[@]}"; do
        IFS=':' read -r var_name description <<< "$var_desc"
        local var_value="${!var_name:-}"
        
        if [[ -n "$var_value" ]] && [[ "$var_value" != *"CHANGE_ME"* ]] && [[ "$var_value" != *"YOUR_"* ]]; then
            echo -e "✅ ${CYAN}$var_name${NC}: $description"
            ((passed++))
        else
            echo -e "❌ ${RED}$var_name${NC}: $description - ${YELLOW}Missing or placeholder${NC}"
            ((failed++))
        fi
    done
    
    echo
    if [[ $failed -eq 0 ]]; then
        success "All critical variables validated ($passed/$((passed + failed)))"
    else
        error "$failed critical variables are missing or invalid"
        return 1
    fi
}

# Test Docker environment variable passing
test_docker_env_passing() {
    section "Docker Environment Variable Passing Test"
    
    info "Testing environment variable availability in Docker build context..."
    
    # Create a test Dockerfile
    local test_dockerfile="Dockerfile.env.test"
    cat > "$test_dockerfile" << 'EOF'
FROM alpine:latest
ARG TEST_VAR
ARG NODE_ENV
ARG DATABASE_URL
ARG NEXT_PUBLIC_API_URL
RUN echo "=== Environment Test ==="
RUN echo "TEST_VAR: ${TEST_VAR}"
RUN echo "NODE_ENV: ${NODE_ENV}"
RUN echo "DATABASE_URL: ${DATABASE_URL:0:20}..." 
RUN echo "NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}"
RUN echo "========================="
CMD ["echo", "Environment test completed"]
EOF
    
    # Source environment and export variables
    set -a
    source "$ENV_FILE"
    set +a
    
    # Test Docker build with environment variables
    info "Building test image with environment variables..."
    
    if docker build \
        --build-arg TEST_VAR="Environment passing works!" \
        --build-arg NODE_ENV="$NODE_ENV" \
        --build-arg DATABASE_URL="$DATABASE_URL" \
        --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
        -f "$test_dockerfile" \
        -t env-test:latest . 2>&1 | grep -E "(TEST_VAR|NODE_ENV|DATABASE_URL|NEXT_PUBLIC_API_URL)"; then
        success "Environment variables are being passed to Docker build"
    else
        error "Environment variables are not being passed correctly to Docker build"
    fi
    
    # Cleanup
    rm -f "$test_dockerfile"
    docker rmi env-test:latest &>/dev/null || true
}

# Test Docker Compose environment handling
test_compose_env() {
    section "Docker Compose Environment Test"
    
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error "Docker Compose file $COMPOSE_FILE not found"
        return 1
    fi
    
    info "Analyzing Docker Compose environment configuration..."
    
    # Check if env_file is specified
    if grep -q "env_file" "$COMPOSE_FILE"; then
        success "Docker Compose configured to use env_file"
    else
        warning "Docker Compose not configured to use env_file"
    fi
    
    # Check for build args in compose file
    local services_with_build_args=$(grep -A 20 "build:" "$COMPOSE_FILE" | grep -c "args:" || echo "0")
    info "Services with build args: $services_with_build_args"
    
    # Test compose config validation
    info "Validating Docker Compose configuration..."
    if docker compose -f "$COMPOSE_FILE" config >/dev/null 2>&1; then
        success "Docker Compose configuration is valid"
    else
        error "Docker Compose configuration has errors:"
        docker compose -f "$COMPOSE_FILE" config 2>&1 | head -10
    fi
}

# Check running containers and their environment
check_running_containers() {
    section "Running Containers Environment Check"
    
    local containers=$(docker ps --format "table {{.Names}}" | grep -E "(emaintenance|user-service|work-order|asset-service|web)" | tail -n +2 || echo "")
    
    if [[ -z "$containers" ]]; then
        warning "No E-Maintenance containers currently running"
        return 0
    fi
    
    info "Checking environment variables in running containers..."
    
    while IFS= read -r container; do
        [[ -z "$container" ]] && continue
        
        echo
        info "Container: $container"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        # Check key environment variables
        local env_vars=("NODE_ENV" "PORT" "DATABASE_URL" "JWT_SECRET")
        for var in "${env_vars[@]}"; do
            local value=$(docker exec "$container" printenv "$var" 2>/dev/null || echo "NOT SET")
            if [[ "$var" =~ (PASSWORD|SECRET|TOKEN) ]]; then
                value="***masked***"
            elif [[ "$var" == "DATABASE_URL" && "$value" != "NOT SET" ]]; then
                value="${value:0:20}..."
            fi
            echo -e "  ${CYAN}$var${NC}: ${GREEN}$value${NC}"
        done
        
        # Test connectivity within container
        if docker exec "$container" which curl &>/dev/null; then
            local port=$(docker exec "$container" printenv PORT 2>/dev/null || echo "3000")
            if docker exec "$container" curl -f -s "http://localhost:$port/health" &>/dev/null; then
                echo -e "  ${GREEN}✅ Health endpoint responding${NC}"
            else
                echo -e "  ${YELLOW}⚠ Health endpoint not responding${NC}"
            fi
        fi
        
    done <<< "$containers"
}

# Generate environment troubleshooting report
generate_troubleshooting_report() {
    section "Troubleshooting Report Generation"
    
    local report_file="env-debug-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "E-Maintenance Environment Debug Report"
        echo "Generated: $(date)"
        echo "System: $(uname -a)"
        echo "Docker: $(docker --version)"
        echo "Docker Compose: $(docker compose version)"
        echo
        
        echo "=== File Status ==="
        echo "Environment file exists: $([[ -f "$ENV_FILE" ]] && echo "YES" || echo "NO")"
        echo "Compose file exists: $([[ -f "$COMPOSE_FILE" ]] && echo "YES" || echo "NO")"
        echo "Generate script exists: $([[ -f "generate-secure-env.sh" ]] && echo "YES" || echo "NO")"
        echo
        
        echo "=== Docker Images ==="
        docker images | grep -E "(emaintenance|user-service|work-order|asset-service|web|postgres|redis|nginx)" || echo "No relevant images found"
        echo
        
        echo "=== Docker Containers ==="
        docker ps -a | grep -E "(emaintenance|user-service|work-order|asset-service|web|postgres|redis|nginx)" || echo "No relevant containers found"
        echo
        
        echo "=== Docker Networks ==="
        docker network ls | grep emaintenance || echo "No E-Maintenance networks found"
        echo
        
        echo "=== System Resources ==="
        echo "Disk space: $(df -h / | tail -1)"
        echo "Memory: $(free -h | grep Mem)"
        echo "Docker info:"
        docker system df 2>/dev/null || echo "Unable to get Docker system info"
        
    } > "$report_file"
    
    success "Troubleshooting report saved: $report_file"
}

# Main function
main() {
    local action="${1:-all}"
    
    echo -e "${CYAN}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                E-Maintenance Environment Debugger            ║
║                     Troubleshoot Like a Pro                  ║
╚═══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    case "$action" in
        "env"|"environment")
            show_env_file
            validate_critical_vars
            ;;
        "docker")
            test_docker_env_passing
            ;;
        "compose")
            test_compose_env
            ;;
        "containers")
            check_running_containers
            ;;
        "report")
            generate_troubleshooting_report
            ;;
        "all"|*)
            show_env_file
            echo
            validate_critical_vars
            echo
            test_docker_env_passing
            echo
            test_compose_env
            echo
            check_running_containers
            echo
            generate_troubleshooting_report
            ;;
    esac
    
    echo
    log "Environment debugging completed!"
    echo
    echo -e "${YELLOW}Available commands:${NC}"
    echo -e "  ${CYAN}$0 env${NC}        - Check environment file"
    echo -e "  ${CYAN}$0 docker${NC}     - Test Docker environment passing"
    echo -e "  ${CYAN}$0 compose${NC}    - Test Docker Compose config"
    echo -e "  ${CYAN}$0 containers${NC} - Check running containers"
    echo -e "  ${CYAN}$0 report${NC}     - Generate troubleshooting report"
    echo -e "  ${CYAN}$0 all${NC}        - Run all checks (default)"
}

# Run main function
main "$@"