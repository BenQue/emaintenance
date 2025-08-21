#!/bin/bash

# Health Check Script for E-Maintenance System
# Monitors all services and reports their status

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SERVICES=("postgres" "redis" "user-service" "work-order-service" "asset-service" "web" "nginx")
API_PORTS=(3001 3002 3003)
CHECK_INTERVAL=${1:-60}  # Default 60 seconds

# Functions
check_docker_service() {
    local service=$1
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "emaintenance-${service}.*Up"; then
        return 0
    else
        return 1
    fi
}

check_api_health() {
    local port=$1
    if curl -f -s -o /dev/null "http://localhost:${port}/health"; then
        return 0
    else
        return 1
    fi
}

check_database() {
    if docker exec emaintenance-postgres pg_isready -U postgres -d emaintenance &>/dev/null; then
        return 0
    else
        return 1
    fi
}

check_redis() {
    if docker exec emaintenance-redis redis-cli ping &>/dev/null; then
        return 0
    else
        return 1
    fi
}

check_web_app() {
    if curl -f -s -o /dev/null "http://localhost"; then
        return 0
    else
        return 1
    fi
}

get_container_stats() {
    local container=$1
    docker stats --no-stream --format "CPU: {{.CPUPerc}} | Memory: {{.MemUsage}}" "emaintenance-${container}" 2>/dev/null || echo "N/A"
}

print_status() {
    local service=$1
    local status=$2
    local stats=$3
    
    if [ "$status" = "UP" ]; then
        echo -e "${GREEN}✓${NC} ${service}: ${GREEN}${status}${NC} - ${stats}"
    else
        echo -e "${RED}✗${NC} ${service}: ${RED}${status}${NC}"
    fi
}

# Main health check
run_health_check() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}E-Maintenance System Health Check${NC}"
    echo -e "${BLUE}Time: $(date)${NC}"
    echo -e "${BLUE}========================================${NC}\n"
    
    # Check Docker services
    echo -e "${YELLOW}Docker Services:${NC}"
    for service in "${SERVICES[@]}"; do
        if check_docker_service "$service"; then
            stats=$(get_container_stats "$service")
            print_status "$service" "UP" "$stats"
        else
            print_status "$service" "DOWN" ""
        fi
    done
    
    echo -e "\n${YELLOW}Service Health Endpoints:${NC}"
    
    # Check Database
    if check_database; then
        connections=$(docker exec emaintenance-postgres psql -U postgres -d emaintenance -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null || echo "N/A")
        print_status "PostgreSQL" "UP" "Connections: ${connections}"
    else
        print_status "PostgreSQL" "DOWN" ""
    fi
    
    # Check Redis
    if check_redis; then
        memory=$(docker exec emaintenance-redis redis-cli INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r' 2>/dev/null || echo "N/A")
        print_status "Redis" "UP" "Memory: ${memory}"
    else
        print_status "Redis" "DOWN" ""
    fi
    
    # Check API services
    for port in "${API_PORTS[@]}"; do
        case $port in
            3001) service_name="User Service" ;;
            3002) service_name="Work Order Service" ;;
            3003) service_name="Asset Service" ;;
        esac
        
        if check_api_health "$port"; then
            response_time=$(curl -o /dev/null -s -w '%{time_total}' "http://localhost:${port}/health")
            print_status "${service_name} API" "UP" "Response time: ${response_time}s"
        else
            print_status "${service_name} API" "DOWN" ""
        fi
    done
    
    # Check Web Application
    if check_web_app; then
        response_time=$(curl -o /dev/null -s -w '%{time_total}' "http://localhost")
        print_status "Web Application" "UP" "Response time: ${response_time}s"
    else
        print_status "Web Application" "DOWN" ""
    fi
    
    echo -e "\n${YELLOW}System Resources:${NC}"
    
    # Disk usage
    disk_usage=$(df -h /var/lib/docker | awk 'NR==2 {print $5}')
    echo -e "Docker disk usage: ${disk_usage}"
    
    # Total memory usage
    total_memory=$(docker stats --no-stream --format "{{.MemUsage}}" $(docker ps -q --filter "name=emaintenance") | awk '{sum+=$1} END {print sum "MB"}' 2>/dev/null || echo "N/A")
    echo -e "Total container memory: ${total_memory}"
    
    echo -e "\n${BLUE}========================================${NC}\n"
}

# Continuous monitoring mode
if [ "$CHECK_INTERVAL" = "once" ]; then
    run_health_check
else
    echo -e "${GREEN}Starting continuous health monitoring (interval: ${CHECK_INTERVAL}s)${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"
    
    while true; do
        run_health_check
        sleep "$CHECK_INTERVAL"
    done
fi