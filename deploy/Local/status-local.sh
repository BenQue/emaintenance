#!/bin/bash

# E-Maintenance 本地部署状态监控脚本
# 显示本地Docker部署的服务状态和健康检查

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
echo "E-Maintenance 本地部署状态监控"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="
echo -e "${NC}"

# 检查Docker状态
check_docker() {
    echo -e "${CYAN}Docker 环境:${NC}"
    if docker info >/dev/null 2>&1; then
        echo -e "  Docker引擎: ${GREEN}运行中${NC}"
        docker version --format '  版本: {{.Server.Version}}'
    else
        echo -e "  Docker引擎: ${RED}未运行${NC}"
        exit 1
    fi
    echo ""
}

# 显示容器状态
show_containers() {
    echo -e "${CYAN}容器状态:${NC}"
    echo ""
    
    cd "$DEPLOY_DIR"
    docker-compose -f docker-compose.local.yml ps
    echo ""
    
    # 统计信息
    local total=$(docker-compose -f docker-compose.local.yml ps -q | wc -l | tr -d ' ')
    local running=$(docker-compose -f docker-compose.local.yml ps -q | xargs docker inspect --format='{{.State.Status}}' 2>/dev/null | grep "running" | wc -l | tr -d ' ')
    
    echo "容器统计: 总数=$total, 运行中=${GREEN}$running${NC}, 停止=${RED}$((total-running))${NC}"
    echo ""
}

# 健康检查
health_check() {
    echo -e "${CYAN}服务健康状态:${NC}"
    echo ""
    
    local services=(
        "postgres:5433:数据库"
        "redis:6380:缓存"
        "user-service:3001:用户服务"
        "work-order-service:3002:工单服务"
        "asset-service:3003:资产服务"
        "web:3000:前端应用"
        "nginx:80:反向代理"
    )
    
    printf "%-20s %-15s %-15s %-15s\n" "服务" "容器状态" "健康状态" "端口"
    echo "---------------------------------------------------------------"
    
    for service_info in "${services[@]}"; do
        local service=$(echo "$service_info" | cut -d: -f1)
        local port=$(echo "$service_info" | cut -d: -f2)
        local desc=$(echo "$service_info" | cut -d: -f3)
        local container_name="emaintenance-$service"
        
        # 检查容器状态
        local container_status="未运行"
        local health_status="N/A"
        local port_status="未监听"
        
        if docker ps --format "{{.Names}}" | grep -q "^$container_name$"; then
            container_status="${GREEN}运行中${NC}"
            
            # 检查健康状态
            health_status=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-check{{end}}' "$container_name" 2>/dev/null || echo "unknown")
            
            case "$health_status" in
                "healthy")
                    health_status="${GREEN}健康${NC}"
                    ;;
                "unhealthy")
                    health_status="${RED}不健康${NC}"
                    ;;
                "starting")
                    health_status="${YELLOW}启动中${NC}"
                    ;;
                "no-check")
                    health_status="${CYAN}无检查${NC}"
                    ;;
                *)
                    health_status="${YELLOW}未知${NC}"
                    ;;
            esac
            
            # 检查端口
            if netstat -an 2>/dev/null | grep -q "[:.]$port.*LISTEN" || lsof -i:$port >/dev/null 2>&1; then
                port_status="${GREEN}$port${NC}"
            else
                port_status="${YELLOW}$port${NC}"
            fi
        else
            container_status="${RED}未运行${NC}"
            port_status="${RED}--${NC}"
        fi
        
        printf "%-20s %-25s %-25s %-15s\n" "$desc" "$container_status" "$health_status" "$port_status"
    done
    echo ""
}

# 资源使用
resource_usage() {
    echo -e "${CYAN}资源使用情况:${NC}"
    echo ""
    
    # Docker资源统计
    local containers=$(docker-compose -f "$DEPLOY_DIR/docker-compose.local.yml" ps -q)
    if [[ -n "$containers" ]]; then
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $containers 2>/dev/null || echo "无法获取资源统计"
    else
        echo "没有运行的容器"
    fi
    echo ""
}

# 磁盘使用
disk_usage() {
    echo -e "${CYAN}磁盘使用:${NC}"
    echo ""
    
    # Docker卷使用情况
    echo "Docker卷:"
    docker volume ls --filter name=local | grep -v DRIVER || echo "  无卷"
    echo ""
    
    # Docker镜像占用
    echo "镜像大小:"
    docker images | grep emaintenance || echo "  无相关镜像"
    echo ""
    
    # 系统磁盘
    echo "系统磁盘:"
    df -h | grep -E "(Filesystem|/$|/System/Volumes/Data)" | head -3
    echo ""
}

# 网络信息
network_info() {
    echo -e "${CYAN}网络配置:${NC}"
    echo ""
    
    # Docker网络
    echo "Docker网络:"
    docker network ls | grep -E "(NETWORK|emaintenance|local)" || docker network ls | head -2
    echo ""
    
    # 端口映射
    echo "端口映射:"
    echo "  - 前端: http://localhost (Nginx代理)"
    echo "  - 用户API: http://localhost:3001"
    echo "  - 工单API: http://localhost:3002"
    echo "  - 资产API: http://localhost:3003"
    echo "  - 数据库: postgresql://localhost:5433/emaintenance"
    echo "  - Redis: redis://localhost:6380"
    echo ""
}

# 最近日志
recent_logs() {
    echo -e "${CYAN}最近错误日志 (最近5分钟):${NC}"
    echo ""
    
    local services=("user-service" "work-order-service" "asset-service" "web")
    local has_errors=false
    
    for service in "${services[@]}"; do
        local container_name="emaintenance-$service"
        if docker ps --format "{{.Names}}" | grep -q "^$container_name$"; then
            local errors=$(docker logs --since=5m "$container_name" 2>&1 | grep -i "error\|exception" | head -2)
            if [[ -n "$errors" ]]; then
                echo -e "${RED}$service:${NC}"
                echo "$errors" | sed 's/^/  /'
                echo ""
                has_errors=true
            fi
        fi
    done
    
    if ! $has_errors; then
        echo -e "${GREEN}✅ 没有发现近期错误${NC}"
    fi
    echo ""
}

# 快速诊断
quick_diagnosis() {
    echo -e "${CYAN}快速诊断:${NC}"
    echo ""
    
    local issues=()
    
    # 检查关键服务
    if ! docker ps | grep -q emaintenance-postgres; then
        issues+=("数据库未运行")
    fi
    
    if ! docker ps | grep -q emaintenance-redis; then
        issues+=("Redis未运行")
    fi
    
    if ! docker ps | grep -q emaintenance-nginx; then
        issues+=("Nginx未运行")
    fi
    
    # 检查端口
    if ! netstat -an 2>/dev/null | grep -q "[:.]80.*LISTEN" && ! lsof -i:80 >/dev/null 2>&1; then
        issues+=("端口80未监听（前端不可访问）")
    fi
    
    if ! netstat -an 2>/dev/null | grep -q "[:.]5433.*LISTEN" && ! lsof -i:5433 >/dev/null 2>&1; then
        issues+=("端口5433未监听（数据库不可访问）")
    fi
    
    # 显示结果
    if [ ${#issues[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ 系统状态正常${NC}"
    else
        echo -e "${RED}⚠️  发现以下问题:${NC}"
        for issue in "${issues[@]}"; do
            echo -e "  ${RED}•${NC} $issue"
        done
        echo ""
        echo -e "${YELLOW}建议:${NC}"
        echo "  1. 运行 ./update-local.sh quick 快速重启服务"
        echo "  2. 运行 ./update-local.sh logs 查看详细日志"
    fi
    echo ""
}

# 显示帮助
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  all, a      - 显示完整报告（默认）"
    echo "  quick, q    - 快速诊断"
    echo "  health, h   - 健康检查"
    echo "  resource, r - 资源使用"
    echo "  network, n  - 网络信息"
    echo "  logs, l     - 最近日志"
    echo "  help        - 显示帮助"
    echo ""
}

# 主函数
main() {
    case "${1:-all}" in
        "all"|"a")
            check_docker
            show_containers
            health_check
            resource_usage
            disk_usage
            network_info
            recent_logs
            quick_diagnosis
            ;;
        "quick"|"q")
            quick_diagnosis
            ;;
        "health"|"h")
            health_check
            ;;
        "resource"|"r")
            resource_usage
            disk_usage
            ;;
        "network"|"n")
            network_info
            ;;
        "logs"|"l")
            recent_logs
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"