#!/bin/bash

# E-Maintenance 服务状态监控脚本
# 显示所有服务的运行状态、健康检查、资源使用情况

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$SCRIPT_DIR"

echo -e "${PURPLE}"
echo "========================================="
echo "E-Maintenance 服务状态监控"
echo "更新时间: $(date)"
echo "========================================="
echo -e "${NC}"

# 检查Docker和Docker Compose状态
check_docker_status() {
    log_info "Docker 环境状态:"
    echo ""
    
    # Docker 版本
    echo -e "${CYAN}Docker 版本:${NC}"
    docker --version
    docker-compose --version
    echo ""
    
    # Docker 守护进程状态
    if docker info >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker 守护进程运行正常${NC}"
    else
        echo -e "${RED}❌ Docker 守护进程异常${NC}"
        return 1
    fi
    echo ""
}

# 显示服务容器状态
show_container_status() {
    log_info "容器运行状态:"
    echo ""
    
    cd "$DEPLOY_DIR"
    
    # 获取容器状态
    if docker-compose ps --format table >/dev/null 2>&1; then
        docker-compose ps --format table
    else
        docker-compose ps
    fi
    echo ""
    
    # 统计容器状态
    local total_containers=$(docker-compose ps -q | wc -l | tr -d ' ')
    local running_containers=$(docker-compose ps -q | xargs docker inspect --format='{{.State.Status}}' 2>/dev/null | grep "running" | wc -l | tr -d ' ')
    local exited_containers=$(docker-compose ps -q | xargs docker inspect --format='{{.State.Status}}' 2>/dev/null | grep "exited" | wc -l | tr -d ' ')
    
    echo -e "${CYAN}容器统计:${NC}"
    echo "  总数: $total_containers"
    echo "  运行中: ${GREEN}$running_containers${NC}"
    echo "  已停止: ${RED}$exited_containers${NC}"
    echo ""
}

# 显示服务健康状态
show_health_status() {
    log_info "服务健康检查:"
    echo ""
    
    local services=("web" "user-service" "work-order-service" "asset-service" "nginx" "postgres" "redis")
    
    printf "%-20s %-15s %-15s %-20s\n" "服务名称" "容器状态" "健康状态" "启动时间"
    echo "--------------------------------------------------------------------------------"
    
    for service in "${services[@]}"; do
        local container_id=$(docker-compose -f "$DEPLOY_DIR/docker-compose.yml" ps -q "$service" 2>/dev/null)
        
        if [[ -n "$container_id" ]]; then
            local container_status=$(docker inspect "$container_id" --format='{{.State.Status}}' 2>/dev/null || echo "unknown")
            local health_status=$(docker inspect "$container_id" --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' 2>/dev/null || echo "unknown")
            local start_time=$(docker inspect "$container_id" --format='{{.State.StartedAt}}' 2>/dev/null | cut -c1-19 | tr 'T' ' ' || echo "unknown")
            
            # 格式化状态显示
            case "$container_status" in
                "running")
                    container_status="${GREEN}running${NC}"
                    ;;
                "exited")
                    container_status="${RED}exited${NC}"
                    ;;
                *)
                    container_status="${YELLOW}$container_status${NC}"
                    ;;
            esac
            
            case "$health_status" in
                "healthy")
                    health_status="${GREEN}healthy${NC}"
                    ;;
                "unhealthy")
                    health_status="${RED}unhealthy${NC}"
                    ;;
                "starting")
                    health_status="${YELLOW}starting${NC}"
                    ;;
                *)
                    health_status="${CYAN}$health_status${NC}"
                    ;;
            esac
            
            printf "%-35s %-25s %-25s %-20s\n" "$service" "$container_status" "$health_status" "$start_time"
        else
            printf "%-35s %-25s %-25s %-20s\n" "$service" "${RED}not-running${NC}" "${RED}n/a${NC}" "n/a"
        fi
    done
    echo ""
}

# 显示资源使用情况
show_resource_usage() {
    log_info "资源使用情况:"
    echo ""
    
    # 获取容器资源使用情况
    if docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" $(docker-compose -f "$DEPLOY_DIR/docker-compose.yml" ps -q) 2>/dev/null; then
        echo ""
    else
        log_warn "无法获取容器资源使用情况"
    fi
    
    # 系统资源概览
    echo -e "${CYAN}系统资源概览:${NC}"
    
    # 内存使用
    if command -v free >/dev/null 2>&1; then
        echo "内存使用:"
        free -h | grep -E "(Mem|Swap):"
    elif [[ -f /proc/meminfo ]]; then
        local total_mem=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        local free_mem=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
        local used_mem=$((total_mem - free_mem))
        echo "内存使用: $(($used_mem / 1024))MB / $(($total_mem / 1024))MB"
    fi
    
    # 磁盘使用
    echo "磁盘使用:"
    df -h | grep -E "(Filesystem|/dev/)" | head -5
    echo ""
}

# 显示网络连接状态
show_network_status() {
    log_info "网络连接状态:"
    echo ""
    
    # 显示端口监听状态
    echo -e "${CYAN}端口监听状态:${NC}"
    local ports=("80:nginx" "3001:user-service" "3002:work-order-service" "3003:asset-service" "5432:postgres" "6379:redis")
    
    for port_service in "${ports[@]}"; do
        local port=$(echo "$port_service" | cut -d: -f1)
        local service=$(echo "$port_service" | cut -d: -f2)
        
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            echo -e "  端口 $port ($service): ${GREEN}监听中${NC}"
        else
            echo -e "  端口 $port ($service): ${RED}未监听${NC}"
        fi
    done
    echo ""
    
    # 显示Docker网络
    echo -e "${CYAN}Docker网络:${NC}"
    docker network ls | grep -E "(NETWORK ID|$(docker-compose -f "$DEPLOY_DIR/docker-compose.yml" config | grep -o 'emaintenance[a-z_-]*')" || docker network ls
    echo ""
}

# 显示日志摘要
show_log_summary() {
    log_info "最近错误日志 (最近10分钟):"
    echo ""
    
    local services=("web" "user-service" "work-order-service" "asset-service" "nginx")
    local has_errors=false
    
    for service in "${services[@]}"; do
        local container_id=$(docker-compose -f "$DEPLOY_DIR/docker-compose.yml" ps -q "$service" 2>/dev/null)
        
        if [[ -n "$container_id" ]]; then
            # 获取最近10分钟的错误日志
            local error_logs=$(docker logs --since=10m "$container_id" 2>&1 | grep -i "error\|exception\|fail" | head -3)
            
            if [[ -n "$error_logs" ]]; then
                echo -e "${RED}$service 错误:${NC}"
                echo "$error_logs" | sed 's/^/  /'
                echo ""
                has_errors=true
            fi
        fi
    done
    
    if ! $has_errors; then
        echo -e "${GREEN}✅ 未发现近期错误日志${NC}"
    fi
    echo ""
}

# 显示版本信息
show_version_info() {
    log_info "当前部署版本:"
    echo ""
    
    if [[ -f "$DEPLOY_DIR/.env" ]]; then
        echo -e "${CYAN}镜像版本:${NC}"
        grep "_IMAGE_TAG=" "$DEPLOY_DIR/.env" | sed 's/^/  /'
        echo ""
    fi
    
    if [[ -f "$DEPLOY_DIR/.env.build" ]]; then
        echo -e "${CYAN}构建信息:${NC}"
        grep -E "BUILD_|GIT_" "$DEPLOY_DIR/.env.build" | sed 's/^/  /'
        echo ""
    fi
}

# 快速健康检查
quick_health_check() {
    log_info "快速健康检查:"
    echo ""
    
    local issues=()
    
    # 检查关键服务是否运行
    local critical_services=("postgres" "redis" "user-service" "work-order-service" "asset-service" "web" "nginx")
    
    for service in "${critical_services[@]}"; do
        local container_id=$(docker-compose -f "$DEPLOY_DIR/docker-compose.yml" ps -q "$service" 2>/dev/null)
        
        if [[ -z "$container_id" ]]; then
            issues+=("$service 容器未运行")
        else
            local status=$(docker inspect "$container_id" --format='{{.State.Status}}' 2>/dev/null)
            if [[ "$status" != "running" ]]; then
                issues+=("$service 容器状态异常: $status")
            fi
        fi
    done
    
    # 检查关键端口
    local critical_ports=("80" "5432" "6379")
    for port in "${critical_ports[@]}"; do
        if ! netstat -tuln 2>/dev/null | grep -q ":$port "; then
            issues+=("端口 $port 未监听")
        fi
    done
    
    if [ ${#issues[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ 系统运行正常${NC}"
    else
        echo -e "${RED}⚠️  发现以下问题:${NC}"
        for issue in "${issues[@]}"; do
            echo -e "  ${RED}•${NC} $issue"
        done
    fi
    echo ""
}

# 显示操作建议
show_recommendations() {
    log_info "常用操作命令:"
    echo ""
    echo "🔧 服务管理:"
    echo "  重启所有服务:    docker-compose -f $DEPLOY_DIR/docker-compose.yml restart"
    echo "  重启单个服务:    docker-compose -f $DEPLOY_DIR/docker-compose.yml restart [服务名]"
    echo "  查看服务日志:    docker-compose -f $DEPLOY_DIR/docker-compose.yml logs -f [服务名]"
    echo ""
    echo "📊 监控命令:"
    echo "  实时资源监控:    docker stats"
    echo "  查看容器详情:    docker inspect [容器名]"
    echo "  服务健康检查:    $SCRIPT_DIR/status.sh"
    echo ""
    echo "🔄 更新和回滚:"
    echo "  更新服务:        $SCRIPT_DIR/update-modules.sh"
    echo "  快速更新:        $SCRIPT_DIR/quick-update.sh [前端|后端|全部]"
    echo "  服务回滚:        $SCRIPT_DIR/rollback.sh"
    echo ""
}

# 主函数
main() {
    local show_all=true
    
    # 解析命令行参数
    case "${1:-}" in
        "quick"|"q")
            quick_health_check
            exit 0
            ;;
        "containers"|"c")
            show_container_status
            exit 0
            ;;
        "health"|"h")
            show_health_status
            exit 0
            ;;
        "resources"|"r")
            show_resource_usage
            exit 0
            ;;
        "network"|"n")
            show_network_status
            exit 0
            ;;
        "logs"|"l")
            show_log_summary
            exit 0
            ;;
        "version"|"v")
            show_version_info
            exit 0
            ;;
        "help"|"--help"|"-h")
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  quick, q      - 快速健康检查"
            echo "  containers, c - 容器状态"
            echo "  health, h     - 健康检查详情"
            echo "  resources, r  - 资源使用情况"
            echo "  network, n    - 网络状态"
            echo "  logs, l       - 最近错误日志"
            echo "  version, v    - 版本信息"
            echo "  help          - 显示帮助"
            echo "  (无参数)      - 显示完整状态报告"
            exit 0
            ;;
    esac
    
    # 显示完整状态报告
    if $show_all; then
        check_docker_status
        show_container_status
        show_health_status
        show_resource_usage
        show_network_status
        show_log_summary
        show_version_info
        quick_health_check
        show_recommendations
    fi
}

# 错误处理
trap 'log_error "状态检查脚本执行出错，行号: $LINENO"' ERR

# 运行主函数
main "$@"