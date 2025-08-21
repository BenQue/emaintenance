#!/bin/bash

# Advanced Monitoring Script for E-Maintenance System
# Provides detailed metrics and alerts

set -e

# Configuration
ALERT_EMAIL=${ALERT_EMAIL:-""}
SLACK_WEBHOOK=${SLACK_WEBHOOK:-""}
LOG_DIR="/var/log/emaintenance"
METRICS_FILE="${LOG_DIR}/metrics_$(date +%Y%m%d).log"

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=90
DISK_THRESHOLD=85
RESPONSE_TIME_THRESHOLD=2.0

# Create log directory
mkdir -p "$LOG_DIR"

# Functions
send_alert() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[${timestamp}] [${level}] ${message}" >> "${METRICS_FILE}"
    
    # Send email alert if configured
    if [ -n "$ALERT_EMAIL" ]; then
        echo "${message}" | mail -s "E-Maintenance Alert: ${level}" "$ALERT_EMAIL" 2>/dev/null || true
    fi
    
    # Send Slack alert if configured
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"*E-Maintenance ${level} Alert*\n${message}\"}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
}

check_container_health() {
    local container=$1
    local cpu_usage=$(docker stats --no-stream --format "{{.CPUPerc}}" "$container" | sed 's/%//')
    local mem_usage=$(docker stats --no-stream --format "{{.MemPerc}}" "$container" | sed 's/%//')
    
    if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l) )); then
        send_alert "WARNING" "Container ${container} CPU usage is high: ${cpu_usage}%"
    fi
    
    if (( $(echo "$mem_usage > $MEMORY_THRESHOLD" | bc -l) )); then
        send_alert "WARNING" "Container ${container} memory usage is high: ${mem_usage}%"
    fi
}

check_api_response_times() {
    local endpoints=(
        "http://localhost:3001/health:User Service"
        "http://localhost:3002/health:Work Order Service"
        "http://localhost:3003/health:Asset Service"
    )
    
    for endpoint in "${endpoints[@]}"; do
        IFS=':' read -r url service <<< "$endpoint"
        response_time=$(curl -o /dev/null -s -w '%{time_total}' "$url" 2>/dev/null || echo "999")
        
        if (( $(echo "$response_time > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
            send_alert "WARNING" "${service} response time is slow: ${response_time}s"
        fi
    done
}

check_database_connections() {
    local max_connections=$(docker exec emaintenance-postgres psql -U postgres -d emaintenance -t -c "SHOW max_connections;" 2>/dev/null | tr -d ' ')
    local current_connections=$(docker exec emaintenance-postgres psql -U postgres -d emaintenance -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')
    
    if [ -n "$max_connections" ] && [ -n "$current_connections" ]; then
        local usage_percent=$((current_connections * 100 / max_connections))
        if [ $usage_percent -gt 80 ]; then
            send_alert "WARNING" "Database connection pool usage is high: ${current_connections}/${max_connections} (${usage_percent}%)"
        fi
    fi
}

check_disk_space() {
    local disk_usage=$(df -h /var/lib/docker | awk 'NR==2 {print int($5)}')
    
    if [ $disk_usage -gt $DISK_THRESHOLD ]; then
        send_alert "CRITICAL" "Disk usage is critical: ${disk_usage}%"
    fi
}

collect_metrics() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Collect container metrics
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" \
        $(docker ps -q --filter "name=emaintenance") >> "${METRICS_FILE}"
    
    # Database metrics
    docker exec emaintenance-postgres psql -U postgres -d emaintenance -c "\
        SELECT 'DB Size:' as metric, pg_size_pretty(pg_database_size('emaintenance')) as value \
        UNION ALL \
        SELECT 'Active Connections:', count(*)::text FROM pg_stat_activity \
        UNION ALL \
        SELECT 'Transaction Rate:', xact_commit::text FROM pg_stat_database WHERE datname='emaintenance';" \
        >> "${METRICS_FILE}" 2>/dev/null || true
    
    # Redis metrics
    docker exec emaintenance-redis redis-cli INFO stats | grep -E "instantaneous_ops_per_sec|keyspace_hits|keyspace_misses" \
        >> "${METRICS_FILE}" 2>/dev/null || true
}

generate_report() {
    echo "======================================"
    echo "E-Maintenance System Monitoring Report"
    echo "Generated: $(date)"
    echo "======================================"
    
    echo -e "\n## Container Status"
    docker ps --filter "name=emaintenance" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo -e "\n## Resource Usage"
    docker stats --no-stream --filter "name=emaintenance"
    
    echo -e "\n## Recent Alerts"
    tail -20 "${METRICS_FILE}" | grep -E "WARNING|CRITICAL" || echo "No recent alerts"
    
    echo -e "\n## Database Statistics"
    docker exec emaintenance-postgres psql -U postgres -d emaintenance -c "\
        SELECT tablename, n_live_tup as rows, n_dead_tup as dead_rows \
        FROM pg_stat_user_tables \
        ORDER BY n_live_tup DESC \
        LIMIT 10;" 2>/dev/null || echo "Unable to fetch database statistics"
}

# Main monitoring loop
main() {
    while true; do
        # Run all checks
        check_disk_space
        check_database_connections
        check_api_response_times
        
        # Check each container
        for container in $(docker ps --format "{{.Names}}" --filter "name=emaintenance"); do
            check_container_health "$container"
        done
        
        # Collect metrics
        collect_metrics
        
        # Sleep before next check
        sleep 60
    done
}

# Handle command line arguments
case "${1:-monitor}" in
    monitor)
        echo "Starting continuous monitoring..."
        main
        ;;
    report)
        generate_report
        ;;
    check)
        check_disk_space
        check_database_connections
        check_api_response_times
        ;;
    *)
        echo "Usage: $0 {monitor|report|check}"
        exit 1
        ;;
esac