#!/bin/bash

# E-Maintenance 健康检查脚本
# 综合检查所有服务的健康状态和性能指标

set -e

# 脚本配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_debug() { echo -e "${BLUE}[DEBUG]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_fail() { echo -e "${RED}[✗]${NC} $1"; }

# 使用说明
usage() {
    cat << EOF
E-Maintenance 健康检查脚本

用法: $0 [环境] [选项]

环境:
    dev         开发环境 (默认)
    test        测试环境
    prod        生产环境

选项:
    --module MODULE        只检查指定模块 (infrastructure|microservices|frontend)
    --service SERVICE      只检查指定服务
    --detailed            显示详细信息
    --performance         显示性能指标
    --export-report       导出检查报告到文件
    --alert-webhook URL    发送告警到Webhook
    --continuous          持续监控模式

示例:
    $0 dev                                    # 基础健康检查
    $0 prod --detailed --performance          # 生产环境详细检查
    $0 test --module microservices           # 只检查微服务
    $0 prod --export-report --alert-webhook http://hooks.slack.com/...

EOF
    exit 1
}

# 参数解析
ENVIRONMENT=${1:-dev}
TARGET_MODULE=""
TARGET_SERVICE=""
DETAILED=false
PERFORMANCE=false
EXPORT_REPORT=false
ALERT_WEBHOOK=""
CONTINUOUS=false

shift
while [[ $# -gt 0 ]]; do
    case $1 in
        --module)
            TARGET_MODULE="$2"
            shift 2
            ;;
        --service)
            TARGET_SERVICE="$2"
            shift 2
            ;;
        --detailed)
            DETAILED=true
            shift
            ;;
        --performance)
            PERFORMANCE=true
            shift
            ;;
        --export-report)
            EXPORT_REPORT=true
            shift
            ;;
        --alert-webhook)
            ALERT_WEBHOOK="$2"
            shift 2
            ;;
        --continuous)
            CONTINUOUS=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            log_error "未知选项: $1"
            usage
            ;;
    esac
done

# 环境变量文件
ENV_FILE="${SCRIPT_DIR}/envs/${ENVIRONMENT}.env"
if [[ ! -f "$ENV_FILE" ]]; then
    log_error "环境配置文件不存在: $ENV_FILE"
    exit 1
fi

# 导入环境变量
set -a
source "$ENV_FILE"
set +a

# 检查结果存储
declare -A HEALTH_RESULTS
declare -A PERFORMANCE_METRICS
OVERALL_STATUS="HEALTHY"
FAILED_SERVICES=()

# 服务定义
declare -A INFRASTRUCTURE_SERVICES
INFRASTRUCTURE_SERVICES[postgres]="emaintenance-postgres:5432::PostgreSQL数据库"
INFRASTRUCTURE_SERVICES[redis]="emaintenance-redis:6379::Redis缓存"
INFRASTRUCTURE_SERVICES[nginx]="emaintenance-nginx:${HTTP_PORT:-80}:/health:Nginx网关"

declare -A MICROSERVICES
MICROSERVICES[user-service]="emaintenance-user-service-1:3001:/health:用户服务"
MICROSERVICES[work-order-service]="emaintenance-work-order-service-1:3002:/health:工单服务"
MICROSERVICES[asset-service]="emaintenance-asset-service-1:3003:/api/health:资产服务"

declare -A FRONTEND_SERVICES
FRONTEND_SERVICES[web]="emaintenance-web-1:3000:/api/health:Web应用"

# 检查Docker容器状态
check_container_status() {
    local container_name="$1"
    local service_display_name="$2"
    
    if ! docker ps --filter "name=$container_name" --filter "status=running" | grep -q "$container_name"; then
        HEALTH_RESULTS[$container_name]="STOPPED"
        FAILED_SERVICES+=("$service_display_name")
        OVERALL_STATUS="UNHEALTHY"
        return 1
    fi
    
    return 0
}

# 检查HTTP健康端点
check_http_health() {
    local container_name="$1"
    local port="$2"
    local health_path="$3"
    local service_display_name="$4"
    
    if [[ -z "$health_path" ]]; then
        # 对于数据库服务，检查容器状态和端口
        if check_container_status "$container_name" "$service_display_name" && \
           nc -z localhost "$port" 2>/dev/null; then
            HEALTH_RESULTS[$container_name]="HEALTHY"
            return 0
        else
            HEALTH_RESULTS[$container_name]="UNHEALTHY"
            FAILED_SERVICES+=("$service_display_name")
            OVERALL_STATUS="UNHEALTHY"
            return 1
        fi
    else
        # 对于Web服务，使用HTTP检查
        local url="http://localhost:$port$health_path"
        local response_code
        
        response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
        
        if [[ "$response_code" == "200" ]]; then
            HEALTH_RESULTS[$container_name]="HEALTHY"
            return 0
        else
            HEALTH_RESULTS[$container_name]="UNHEALTHY"
            FAILED_SERVICES+=("$service_display_name")
            OVERALL_STATUS="UNHEALTHY"
            
            if [[ "$DETAILED" == "true" ]]; then
                log_debug "$service_display_name HTTP响应码: $response_code"
            fi
            
            return 1
        fi
    fi
}

# 检查服务性能指标
check_performance_metrics() {
    local container_name="$1"
    local service_display_name="$2"
    
    if [[ "$PERFORMANCE" != "true" ]]; then
        return 0
    fi
    
    # 获取容器统计信息
    local stats
    stats=$(docker stats "$container_name" --no-stream --format "{{.CPUPerc}},{{.MemUsage}},{{.NetIO}},{{.BlockIO}}" 2>/dev/null || echo "N/A,N/A,N/A,N/A")
    
    IFS=',' read -r cpu_perc mem_usage net_io block_io <<< "$stats"
    
    PERFORMANCE_METRICS[$container_name]="CPU: $cpu_perc | Memory: $mem_usage | Network: $net_io | Disk: $block_io"
    
    # 检查CPU使用率告警
    if [[ "$cpu_perc" != "N/A" ]] && [[ "${cpu_perc%\%}" > "80" ]]; then
        log_warn "$service_display_name CPU使用率过高: $cpu_perc"
    fi
}

# 检查基础设施服务
check_infrastructure() {
    if [[ -n "$TARGET_MODULE" && "$TARGET_MODULE" != "infrastructure" ]]; then
        return 0
    fi
    
    echo -e "\n${CYAN}=== 基础设施服务健康检查 ===${NC}"
    
    for service in "${!INFRASTRUCTURE_SERVICES[@]}"; do
        if [[ -n "$TARGET_SERVICE" && "$TARGET_SERVICE" != "$service" ]]; then
            continue
        fi
        
        IFS=':' read -r container_name port health_path display_name <<< "${INFRASTRUCTURE_SERVICES[$service]}"
        
        log_debug "检查 $display_name ($container_name)..."
        
        if check_http_health "$container_name" "$port" "$health_path" "$display_name"; then
            log_success "$display_name - 健康"
        else
            log_fail "$display_name - 不健康"
        fi
        
        check_performance_metrics "$container_name" "$display_name"
    done
}

# 检查微服务
check_microservices() {
    if [[ -n "$TARGET_MODULE" && "$TARGET_MODULE" != "microservices" ]]; then
        return 0
    fi
    
    echo -e "\n${CYAN}=== 微服务健康检查 ===${NC}"
    
    for service in "${!MICROSERVICES[@]}"; do
        if [[ -n "$TARGET_SERVICE" && "$TARGET_SERVICE" != "$service" ]]; then
            continue
        fi
        
        IFS=':' read -r container_name port health_path display_name <<< "${MICROSERVICES[$service]}"
        
        log_debug "检查 $display_name ($container_name)..."
        
        if check_http_health "$container_name" "$port" "$health_path" "$display_name"; then
            log_success "$display_name - 健康"
        else
            log_fail "$display_name - 不健康"
        fi
        
        check_performance_metrics "$container_name" "$display_name"
        
        # 额外的微服务特定检查
        if [[ "$DETAILED" == "true" ]]; then
            check_microservice_details "$service" "$container_name" "$port"
        fi
    done
}

# 检查前端服务
check_frontend() {
    if [[ -n "$TARGET_MODULE" && "$TARGET_MODULE" != "frontend" ]]; then
        return 0
    fi
    
    echo -e "\n${CYAN}=== 前端服务健康检查 ===${NC}"
    
    for service in "${!FRONTEND_SERVICES[@]}"; do
        if [[ -n "$TARGET_SERVICE" && "$TARGET_SERVICE" != "$service" ]]; then
            continue
        fi
        
        IFS=':' read -r container_name port health_path display_name <<< "${FRONTEND_SERVICES[$service]}"
        
        log_debug "检查 $display_name ($container_name)..."
        
        if check_http_health "$container_name" "$port" "$health_path" "$display_name"; then
            log_success "$display_name - 健康"
        else
            log_fail "$display_name - 不健康"
        fi
        
        check_performance_metrics "$container_name" "$display_name"
    done
}

# 微服务详细检查
check_microservice_details() {
    local service="$1"
    local container_name="$2"
    local port="$3"
    
    case "$service" in
        "user-service")
            # 检查用户服务特定端点
            check_endpoint "用户服务认证端点" "http://localhost:$port/api/auth/health" || true
            ;;
        "work-order-service")
            # 检查工单服务特定端点
            check_endpoint "工单服务API" "http://localhost:$port/api/work-orders" || true
            ;;
        "asset-service")
            # 检查资产服务特定端点
            check_endpoint "资产服务API" "http://localhost:$port/api/assets/health" || true
            ;;
    esac
}

# 检查特定端点
check_endpoint() {
    local endpoint_name="$1"
    local url="$2"
    
    local response_code
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [[ "$response_code" == "200" || "$response_code" == "401" ]]; then
        log_debug "  ✓ $endpoint_name ($response_code)"
        return 0
    else
        log_debug "  ✗ $endpoint_name ($response_code)"
        return 1
    fi
}

# 检查系统资源
check_system_resources() {
    echo -e "\n${CYAN}=== 系统资源检查 ===${NC}"
    
    # 检查磁盘空间
    local disk_usage
    disk_usage=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
    
    if [[ "$disk_usage" -gt 90 ]]; then
        log_error "磁盘使用率过高: ${disk_usage}%"
        OVERALL_STATUS="UNHEALTHY"
    elif [[ "$disk_usage" -gt 80 ]]; then
        log_warn "磁盘使用率较高: ${disk_usage}%"
    else
        log_success "磁盘使用率正常: ${disk_usage}%"
    fi
    
    # 检查内存使用
    local mem_usage
    mem_usage=$(free | awk 'NR==2{printf "%.0f", $3/$2*100}')
    
    if [[ "$mem_usage" -gt 90 ]]; then
        log_error "内存使用率过高: ${mem_usage}%"
        OVERALL_STATUS="UNHEALTHY"
    elif [[ "$mem_usage" -gt 80 ]]; then
        log_warn "内存使用率较高: ${mem_usage}%"
    else
        log_success "内存使用率正常: ${mem_usage}%"
    fi
    
    # 检查Docker守护进程
    if docker system info >/dev/null 2>&1; then
        log_success "Docker守护进程运行正常"
    else
        log_error "Docker守护进程异常"
        OVERALL_STATUS="UNHEALTHY"
    fi
}

# 生成检查报告
generate_report() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "\n${PURPLE}========================================="
    echo -e "E-Maintenance 健康检查报告"
    echo -e "=========================================${NC}"
    echo -e "时间: $timestamp"
    echo -e "环境: $ENVIRONMENT"
    echo -e "总体状态: $(if [[ "$OVERALL_STATUS" == "HEALTHY" ]]; then echo -e "${GREEN}健康${NC}"; else echo -e "${RED}不健康${NC}"; fi)"
    
    if [[ ${#FAILED_SERVICES[@]} -gt 0 ]]; then
        echo -e "\n${RED}失败的服务:${NC}"
        printf '%s\n' "${FAILED_SERVICES[@]}" | sed 's/^/  - /'
    fi
    
    if [[ "$PERFORMANCE" == "true" ]]; then
        echo -e "\n${BLUE}性能指标:${NC}"
        for container in "${!PERFORMANCE_METRICS[@]}"; do
            echo -e "  $container: ${PERFORMANCE_METRICS[$container]}"
        done
    fi
    
    # 导出报告到文件
    if [[ "$EXPORT_REPORT" == "true" ]]; then
        local report_file="${SCRIPT_DIR}/logs/health-check-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"
        mkdir -p "$(dirname "$report_file")"
        
        generate_json_report > "$report_file"
        log_info "报告已导出到: $report_file"
    fi
}

# 生成JSON格式报告
generate_json_report() {
    cat << EOF
{
  "timestamp": "$(date -Iseconds)",
  "environment": "$ENVIRONMENT",
  "overall_status": "$OVERALL_STATUS",
  "failed_services": [$(printf '"%s",' "${FAILED_SERVICES[@]}" | sed 's/,$//')],
  "health_results": {
$(for container in "${!HEALTH_RESULTS[@]}"; do
    echo "    \"$container\": \"${HEALTH_RESULTS[$container]}\","
done | sed '$s/,$//')
  },
  "performance_metrics": {
$(for container in "${!PERFORMANCE_METRICS[@]}"; do
    echo "    \"$container\": \"${PERFORMANCE_METRICS[$container]}\","
done | sed '$s/,$//')
  }
}
EOF
}

# 发送告警
send_alert() {
    if [[ -z "$ALERT_WEBHOOK" || "$OVERALL_STATUS" == "HEALTHY" ]]; then
        return 0
    fi
    
    local alert_payload
    alert_payload=$(cat << EOF
{
  "text": "🚨 E-Maintenance 健康检查告警",
  "attachments": [
    {
      "color": "danger",
      "fields": [
        {
          "title": "环境",
          "value": "$ENVIRONMENT",
          "short": true
        },
        {
          "title": "状态",
          "value": "$OVERALL_STATUS",
          "short": true
        },
        {
          "title": "失败服务",
          "value": "$(IFS=', '; echo "${FAILED_SERVICES[*]}")",
          "short": false
        }
      ]
    }
  ]
}
EOF
)
    
    if curl -X POST -H 'Content-type: application/json' \
           --data "$alert_payload" \
           "$ALERT_WEBHOOK" >/dev/null 2>&1; then
        log_info "告警已发送到Webhook"
    else
        log_warn "发送告警失败"
    fi
}

# 持续监控模式
continuous_monitoring() {
    log_info "启动持续监控模式 (Ctrl+C 退出)"
    
    while true; do
        clear
        echo -e "${CYAN}E-Maintenance 持续监控 - $(date)${NC}"
        
        # 重置状态
        HEALTH_RESULTS=()
        PERFORMANCE_METRICS=()
        OVERALL_STATUS="HEALTHY"
        FAILED_SERVICES=()
        
        # 执行检查
        check_infrastructure
        check_microservices
        check_frontend
        check_system_resources
        generate_report
        send_alert
        
        sleep 30
    done
}

# 主函数
main() {
    echo -e "${GREEN}"
    echo "========================================="
    echo "E-Maintenance 健康检查"
    echo "环境: $ENVIRONMENT"
    echo "========================================="
    echo -e "${NC}"
    
    if [[ "$CONTINUOUS" == "true" ]]; then
        continuous_monitoring
        return
    fi
    
    # 执行检查
    check_infrastructure
    check_microservices  
    check_frontend
    check_system_resources
    generate_report
    send_alert
    
    # 返回适当的退出代码
    if [[ "$OVERALL_STATUS" == "HEALTHY" ]]; then
        log_info "所有健康检查通过"
        exit 0
    else
        log_error "存在不健康的服务"
        exit 1
    fi
}

# 信号处理
trap 'log_info "健康检查被中断"; exit 0' INT TERM

# 运行主函数
main "$@"