#!/bin/bash

# E-Maintenance System Health Check Script
# Monitors all services and provides detailed status information

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
LOG_FILE="/opt/emaintenance/logs/health-check-$(date +%Y%m%d).log"

# Functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# Check Docker containers status
check_containers() {
    echo -e "${BLUE}========== Container Status ==========${NC}"
    
    containers=("emaintenance-db" "emaintenance-redis" "emaintenance-user-service" "emaintenance-work-order-service" "emaintenance-asset-service" "emaintenance-web" "emaintenance-nginx")
    
    for container in "${containers[@]}"; do
        if docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -q "$container"; then
            status=$(docker ps --format 'table {{.Names}}\t{{.Status}}' | grep "$container" | awk '{print $2, $3, $4}')
            log "$container: $status"
        else
            error "$container: NOT RUNNING"
        fi
    done
    echo ""
}

# Check service health endpoints
check_health_endpoints() {
    echo -e "${BLUE}========== Health Endpoints ==========${NC}"
    
    endpoints=(
        "Database:localhost:5432"
        "Redis:localhost:6379"
        "User Service:localhost:3001/health"
        "Work Order Service:localhost:3002/health"
        "Asset Service:localhost:3003/health"
        "Web Application:localhost/"
    )
    
    for endpoint in "${endpoints[@]}"; do
        name=$(echo "$endpoint" | cut -d: -f1)
        url=$(echo "$endpoint" | cut -d: -f2-)
        
        if [[ "$name" == "Database" ]]; then
            if docker exec emaintenance-db pg_isready -U postgres &>/dev/null; then
                log "$name: HEALTHY"
            else
                error "$name: UNHEALTHY"
            fi
        elif [[ "$name" == "Redis" ]]; then
            if docker exec emaintenance-redis redis-cli ping &>/dev/null; then
                log "$name: HEALTHY"
            else
                error "$name: UNHEALTHY"
            fi
        else
            if timeout 10s curl -f "http://$url" &>/dev/null; then
                log "$name: HEALTHY"
            else
                error "$name: UNHEALTHY"
            fi
        fi
    done
    echo ""
}

# Check resource usage
check_resource_usage() {
    echo -e "${BLUE}========== Resource Usage ==========${NC}"
    
    # System resources
    echo -e "${YELLOW}System Resources:${NC}"
    
    # CPU usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    echo "CPU Usage: ${cpu_usage}%"
    
    # Memory usage
    mem_usage=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
    echo "Memory Usage: ${mem_usage}%"
    
    # Disk usage
    disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    echo "Disk Usage: ${disk_usage}%"
    
    echo ""
    
    # Docker container resources
    echo -e "${YELLOW}Container Resources:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
    echo ""
}

# Check database connectivity and data
check_database() {
    echo -e "${BLUE}========== Database Status ==========${NC}"
    
    # Check database connection
    if docker exec emaintenance-db psql -U postgres -d emaintenance -c "SELECT version();" &>/dev/null; then
        log "Database connection: SUCCESSFUL"
        
        # Check table counts
        user_count=$(docker exec emaintenance-db psql -U postgres -d emaintenance -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d ' ')
        workorder_count=$(docker exec emaintenance-db psql -U postgres -d emaintenance -t -c "SELECT COUNT(*) FROM \"WorkOrder\";" 2>/dev/null | tr -d ' ')
        asset_count=$(docker exec emaintenance-db psql -U postgres -d emaintenance -t -c "SELECT COUNT(*) FROM \"Asset\";" 2>/dev/null | tr -d ' ')
        
        info "Users: $user_count"
        info "Work Orders: $workorder_count"
        info "Assets: $asset_count"
    else
        error "Database connection: FAILED"
    fi
    echo ""
}

# Check API functionality
check_api_functionality() {
    echo -e "${BLUE}========== API Functionality ==========${NC}"
    
    # Test user service login endpoint
    if timeout 10s curl -s -X POST http://localhost:3001/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@bizlink.com.my","password":"admin123"}' | grep -q "token"; then
        log "User Service Login: WORKING"
    else
        warning "User Service Login: NOT WORKING"
    fi
    
    # Test work order service (needs authentication, so just check if it responds)
    if timeout 10s curl -s http://localhost:3002/health | grep -q "OK\|healthy"; then
        log "Work Order Service: RESPONDING"
    else
        warning "Work Order Service: NOT RESPONDING"
    fi
    
    # Test asset service
    if timeout 10s curl -s http://localhost:3003/health | grep -q "OK\|healthy"; then
        log "Asset Service: RESPONDING"
    else
        warning "Asset Service: NOT RESPONDING"
    fi
    echo ""
}

# Check logs for errors
check_logs() {
    echo -e "${BLUE}========== Recent Error Logs ==========${NC}"
    
    containers=("emaintenance-user-service" "emaintenance-work-order-service" "emaintenance-asset-service" "emaintenance-web")
    
    for container in "${containers[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "$container"; then
            echo -e "${YELLOW}$container errors (last 10):${NC}"
            docker logs --tail 10 "$container" 2>&1 | grep -i "error\|failed\|exception" || echo "No recent errors found"
            echo ""
        fi
    done
}

# Main function
main() {
    log "Starting E-Maintenance system health check..."
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    echo -e "${GREEN}"
    echo "=============================================="
    echo "  E-Maintenance System Health Check"
    echo "  $(date)"
    echo "=============================================="
    echo -e "${NC}"
    
    check_containers
    check_health_endpoints
    check_resource_usage
    check_database
    check_api_functionality
    check_logs
    
    echo -e "${GREEN}"
    echo "=============================================="
    echo "  Health Check Completed"
    echo "  Log saved to: $LOG_FILE"
    echo "=============================================="
    echo -e "${NC}"
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi