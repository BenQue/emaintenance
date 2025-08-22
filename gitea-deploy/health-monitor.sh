#!/bin/bash

# E-Maintenance Health Monitoring Script
# ======================================
# Comprehensive health monitoring for production deployment
# Can run as cron job or systemd service
# Version: 1.0.0
# Date: 2025-08-22

set -e
set -u

# Configuration
DEPLOY_DIR="/opt/emaintenance"
LOG_DIR="/var/log/emaintenance"
HEALTH_LOG="$LOG_DIR/health-monitor.log"
ALERT_LOG="$LOG_DIR/alerts.log"
METRICS_FILE="/tmp/emaintenance-metrics.json"
WEBHOOK_URL="${NOTIFICATION_WEBHOOK:-}"
ALERT_COOLDOWN=300  # 5 minutes
STATE_DIR="/var/run/emaintenance"

# Health check configuration
SERVICES=(
    "postgres:5432:database"
    "redis:6379:cache"
    "user-service:3001:api"
    "work-order-service:3002:api"
    "asset-service:3003:api"
    "web:3000:web"
    "nginx:80:proxy"
)

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=80
DISK_THRESHOLD=90
RESPONSE_TIME_THRESHOLD=5000  # milliseconds

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Ensure directories exist
mkdir -p "$LOG_DIR" "$STATE_DIR"

# Logging functions
log() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$HEALTH_LOG"; }
error() { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$HEALTH_LOG"; }
warning() { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$HEALTH_LOG"; }
info() { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$HEALTH_LOG"; }

# Alert function
alert() {
    local level="$1"
    local service="$2" 
    local message="$3"
    local alert_key="${service}_${level}"
    local alert_file="$STATE_DIR/alert_${alert_key}"
    
    # Check cooldown
    if [ -f "$alert_file" ]; then
        local last_alert=$(cat "$alert_file")
        local current_time=$(date +%s)
        local time_diff=$((current_time - last_alert))
        
        if [ $time_diff -lt $ALERT_COOLDOWN ]; then
            return 0  # Skip alert due to cooldown
        fi
    fi
    
    # Log alert
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $level: $service - $message" >> "$ALERT_LOG"
    
    # Send webhook notification
    if [ -n "$WEBHOOK_URL" ]; then
        send_webhook_alert "$level" "$service" "$message"
    fi
    
    # Update cooldown
    echo "$(date +%s)" > "$alert_file"
}

# Send webhook notification
send_webhook_alert() {
    local level="$1"
    local service="$2"
    local message="$3"
    local color=""
    
    case $level in
        "CRITICAL") color="#FF0000" ;;
        "WARNING") color="#FFA500" ;;
        "INFO") color="#00FF00" ;;
    esac
    
    curl -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"E-Maintenance Alert\",
            \"attachments\": [{
                \"color\": \"$color\",
                \"fields\": [
                    {\"title\": \"Level\", \"value\": \"$level\", \"short\": true},
                    {\"title\": \"Service\", \"value\": \"$service\", \"short\": true},
                    {\"title\": \"Message\", \"value\": \"$message\", \"short\": false},
                    {\"title\": \"Server\", \"value\": \"$(hostname)\", \"short\": true},
                    {\"title\": \"Time\", \"value\": \"$(date)\", \"short\": true}
                ]
            }]
        }" 2>/dev/null || true
}

# Check Docker service health
check_docker_health() {
    if ! docker info &>/dev/null; then
        alert "CRITICAL" "docker" "Docker daemon is not running"
        return 1
    fi
    
    return 0
}

# Check container health
check_container_health() {
    local service_info="$1"
    IFS=':' read -r service port type <<< "$service_info"
    local container_name="emaintenance_${service}_1"
    
    # Check if container exists and is running
    if ! docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
        alert "CRITICAL" "$service" "Container not running"
        return 1
    fi
    
    # Check container status
    local status=$(docker inspect -f '{{.State.Status}}' "$container_name" 2>/dev/null)
    if [ "$status" != "running" ]; then
        alert "CRITICAL" "$service" "Container status: $status"
        return 1
    fi
    
    # Check health status if health check is configured
    local health=$(docker inspect -f '{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")
    if [ "$health" != "none" ] && [ "$health" != "healthy" ]; then
        alert "WARNING" "$service" "Container health check: $health"
        return 1
    fi
    
    return 0
}

# Check service endpoint
check_service_endpoint() {
    local service_info="$1"
    IFS=':' read -r service port type <<< "$service_info"
    local url="http://localhost:$port"
    
    # Add health endpoint for API services
    if [ "$type" == "api" ]; then
        url="$url/health"
    fi
    
    local start_time=$(date +%s%3N)
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "$url" 2>/dev/null || echo "000")
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    # Check response code
    if [ "$response_code" != "200" ]; then
        alert "WARNING" "$service" "HTTP response code: $response_code"
        return 1
    fi
    
    # Check response time
    if [ $response_time -gt $RESPONSE_TIME_THRESHOLD ]; then
        alert "WARNING" "$service" "Slow response time: ${response_time}ms"
    fi
    
    # Store metrics
    echo "{\"service\":\"$service\",\"response_time\":$response_time,\"status\":\"ok\",\"timestamp\":$(date +%s)}" >> "$METRICS_FILE.tmp"
    
    return 0
}

# Check system resources
check_system_resources() {
    # CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' | cut -d'%' -f1)
    if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l 2>/dev/null || echo "0") )); then
        alert "WARNING" "system" "High CPU usage: ${cpu_usage}%"
    fi
    
    # Memory usage
    local memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ $memory_usage -gt $MEMORY_THRESHOLD ]; then
        alert "WARNING" "system" "High memory usage: ${memory_usage}%"
    fi
    
    # Disk usage
    local disk_usage=$(df "$DEPLOY_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ $disk_usage -gt $DISK_THRESHOLD ]; then
        alert "WARNING" "system" "High disk usage: ${disk_usage}%"
    fi
    
    # Store system metrics
    echo "{\"type\":\"system\",\"cpu\":$cpu_usage,\"memory\":$memory_usage,\"disk\":$disk_usage,\"timestamp\":$(date +%s)}" >> "$METRICS_FILE.tmp"
}

# Check database connectivity
check_database() {
    local container_name="emaintenance_postgres_1"
    
    if ! docker exec "$container_name" pg_isready -U postgres &>/dev/null; then
        alert "CRITICAL" "database" "PostgreSQL not accepting connections"
        return 1
    fi
    
    # Check database size
    local db_size=$(docker exec "$container_name" psql -U postgres -d emaintenance -t -c "SELECT pg_size_pretty(pg_database_size('emaintenance'));" | xargs)
    
    # Check active connections
    local connections=$(docker exec "$container_name" psql -U postgres -d emaintenance -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" | xargs)
    
    echo "{\"type\":\"database\",\"size\":\"$db_size\",\"connections\":$connections,\"timestamp\":$(date +%s)}" >> "$METRICS_FILE.tmp"
    
    return 0
}

# Check Redis connectivity
check_redis() {
    local container_name="emaintenance_redis_1"
    
    if ! docker exec "$container_name" redis-cli ping &>/dev/null; then
        alert "CRITICAL" "redis" "Redis not responding to ping"
        return 1
    fi
    
    # Check memory usage
    local redis_memory=$(docker exec "$container_name" redis-cli info memory | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
    
    # Check connected clients
    local redis_clients=$(docker exec "$container_name" redis-cli info clients | grep "connected_clients" | cut -d: -f2 | tr -d '\r')
    
    echo "{\"type\":\"redis\",\"memory\":\"$redis_memory\",\"clients\":$redis_clients,\"timestamp\":$(date +%s)}" >> "$METRICS_FILE.tmp"
    
    return 0
}

# Check log files for errors
check_logs() {
    local error_count=0
    local log_files=(
        "$LOG_DIR/user-service/*.log"
        "$LOG_DIR/work-order-service/*.log"
        "$LOG_DIR/asset-service/*.log"
        "$LOG_DIR/web/*.log"
        "$LOG_DIR/nginx/*.log"
    )
    
    for log_pattern in "${log_files[@]}"; do
        for log_file in $log_pattern; do
            if [ -f "$log_file" ]; then
                # Check for errors in last 5 minutes
                local recent_errors=$(grep -c "ERROR\|FATAL\|CRITICAL" "$log_file" 2>/dev/null | tail -100 | wc -l)
                error_count=$((error_count + recent_errors))
            fi
        done
    done
    
    if [ $error_count -gt 10 ]; then
        alert "WARNING" "logs" "High error count in logs: $error_count errors"
    fi
    
    echo "{\"type\":\"logs\",\"error_count\":$error_count,\"timestamp\":$(date +%s)}" >> "$METRICS_FILE.tmp"
}

# Generate health report
generate_health_report() {
    local healthy_services=0
    local total_services=${#SERVICES[@]}
    local status="HEALTHY"
    
    # Initialize metrics file
    echo "[]" > "$METRICS_FILE.tmp"
    
    log "Starting health check for E-Maintenance system"
    
    # Check Docker first
    if ! check_docker_health; then
        status="CRITICAL"
    fi
    
    # Check each service
    for service_info in "${SERVICES[@]}"; do
        IFS=':' read -r service port type <<< "$service_info"
        
        if check_container_health "$service_info" && check_service_endpoint "$service_info"; then
            info "✓ $service is healthy"
            healthy_services=$((healthy_services + 1))
        else
            warning "✗ $service has issues"
            status="DEGRADED"
        fi
    done
    
    # Check system resources
    check_system_resources
    
    # Check database and Redis specifically
    check_database
    check_redis
    
    # Check logs
    check_logs
    
    # Finalize metrics
    mv "$METRICS_FILE.tmp" "$METRICS_FILE"
    
    # Overall status
    if [ $healthy_services -eq $total_services ]; then
        status="HEALTHY"
    elif [ $healthy_services -eq 0 ]; then
        status="CRITICAL"
    else
        status="DEGRADED"
    fi
    
    log "Health check completed: $status ($healthy_services/$total_services services healthy)"
    
    # Send status update if configured
    if [ -n "$WEBHOOK_URL" ] && [ "$status" != "HEALTHY" ]; then
        send_webhook_alert "INFO" "system" "System status: $status ($healthy_services/$total_services services healthy)"
    fi
    
    return 0
}

# Cleanup old alerts
cleanup_old_alerts() {
    find "$STATE_DIR" -name "alert_*" -mmin +$((ALERT_COOLDOWN * 2 / 60)) -delete 2>/dev/null || true
}

# Main execution
main() {
    case "${1:-monitor}" in
        monitor)
            generate_health_report
            cleanup_old_alerts
            ;;
        status)
            echo "E-Maintenance System Status"
            echo "=========================="
            
            # Show running containers
            docker ps --filter "name=emaintenance_" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
            
            # Show recent alerts
            echo -e "\nRecent Alerts:"
            tail -10 "$ALERT_LOG" 2>/dev/null || echo "No recent alerts"
            
            # Show metrics if available
            if [ -f "$METRICS_FILE" ]; then
                echo -e "\nLatest Metrics:"
                cat "$METRICS_FILE" | jq -r '.[] | select(.type=="system") | "CPU: \(.cpu)% Memory: \(.memory)% Disk: \(.disk)%"' 2>/dev/null || echo "Metrics not available"
            fi
            ;;
        test)
            echo "Testing health monitoring system..."
            # Send test alert
            alert "INFO" "test" "Health monitoring test alert"
            echo "Test alert sent"
            ;;
        metrics)
            if [ -f "$METRICS_FILE" ]; then
                cat "$METRICS_FILE"
            else
                echo "No metrics available"
            fi
            ;;
        logs)
            tail -f "$HEALTH_LOG"
            ;;
        alerts)
            tail -f "$ALERT_LOG"
            ;;
        cleanup)
            cleanup_old_alerts
            echo "Cleaned up old alerts"
            ;;
        *)
            echo "Usage: $0 {monitor|status|test|metrics|logs|alerts|cleanup}"
            echo "  monitor  - Run health check (default)"
            echo "  status   - Show current system status"
            echo "  test     - Send test alert"
            echo "  metrics  - Show latest metrics"
            echo "  logs     - Tail health monitor logs"
            echo "  alerts   - Tail alert logs"
            echo "  cleanup  - Clean up old alert files"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"