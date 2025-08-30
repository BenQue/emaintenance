#!/bin/bash

# E-Maintenance 本地开发快速工具
# 提供本地Docker部署的快捷操作命令

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 显示使用帮助
show_usage() {
    echo -e "${BLUE}E-Maintenance 本地开发快速工具${NC}"
    echo ""
    echo "用法: $0 <命令> [选项]"
    echo ""
    echo -e "${CYAN}部署管理:${NC}"
    echo "  start         - 启动所有服务"
    echo "  stop          - 停止所有服务"
    echo "  restart       - 重启所有服务"  
    echo "  rebuild       - 重新构建并启动"
    echo "  clean         - 清理并重新构建"
    echo ""
    echo -e "${CYAN}开发工具:${NC}"
    echo "  status        - 查看服务状态"
    echo "  logs [服务]   - 查看日志"
    echo "  shell <服务>  - 进入容器shell"
    echo "  db            - 连接数据库"
    echo "  redis         - 连接Redis"
    echo ""
    echo -e "${CYAN}更新部署:${NC}"
    echo "  update        - 交互式更新"
    echo "  update-quick  - 快速更新"
    echo "  update-full   - 完整更新"
    echo "  update-web    - 只更新前端"
    echo "  update-api    - 只更新后端"
    echo ""
    echo -e "${CYAN}回滚操作:${NC}"
    echo "  rollback      - 交互式回滚"
    echo "  rollback-git  - Git代码回滚"
    echo "  reset-db      - 重置数据库"
    echo ""
    echo -e "${CYAN}开发辅助:${NC}"
    echo "  health        - 健康检查"
    echo "  ports         - 显示端口信息"
    echo "  cleanup       - 清理Docker资源"
    echo "  backup-db     - 备份数据库"
    echo ""
    echo "示例:"
    echo "  $0 start          # 启动所有服务"
    echo "  $0 logs web       # 查看web服务日志"
    echo "  $0 update-web     # 只更新前端"
    echo "  $0 shell postgres # 进入数据库容器"
    echo ""
}

# 检查Docker状态
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_warn "Docker未运行，请启动Docker Desktop"
        exit 1
    fi
}

# 启动服务
start_services() {
    log_info "🚀 启动所有服务..."
    cd "$SCRIPT_DIR"
    docker-compose -f docker-compose.local.yml up -d
    log_info "✅ 服务已启动"
    echo ""
    show_access_info
}

# 停止服务
stop_services() {
    log_info "🛑 停止所有服务..."
    cd "$SCRIPT_DIR"
    docker-compose -f docker-compose.local.yml stop
    log_info "✅ 服务已停止"
}

# 重启服务
restart_services() {
    log_info "🔄 重启所有服务..."
    cd "$SCRIPT_DIR"
    docker-compose -f docker-compose.local.yml restart
    log_info "✅ 服务已重启"
}

# 重新构建
rebuild_services() {
    log_info "🔨 重新构建并启动服务..."
    cd "$SCRIPT_DIR"
    docker-compose -f docker-compose.local.yml down
    docker-compose -f docker-compose.local.yml build --no-cache
    docker-compose -f docker-compose.local.yml up -d
    log_info "✅ 重新构建完成"
}

# 显示服务状态
show_status() {
    cd "$SCRIPT_DIR"
    ./status-local.sh quick
}

# 查看日志
view_logs() {
    local service="$1"
    cd "$SCRIPT_DIR"
    
    if [[ -z "$service" ]]; then
        docker-compose -f docker-compose.local.yml logs -f --tail=50
    else
        docker-compose -f docker-compose.local.yml logs -f --tail=50 "$service"
    fi
}

# 进入容器shell
enter_shell() {
    local service="$1"
    
    if [[ -z "$service" ]]; then
        echo "请指定服务名称"
        echo "可用服务: postgres, redis, user-service, work-order-service, asset-service, web, nginx"
        return 1
    fi
    
    local container_name="emaintenance-$service"
    
    if docker ps | grep -q "$container_name"; then
        log_info "进入 $service 容器..."
        
        case "$service" in
            "postgres")
                docker exec -it "$container_name" psql -U postgres -d emaintenance
                ;;
            "redis")
                docker exec -it "$container_name" redis-cli
                ;;
            *)
                docker exec -it "$container_name" /bin/bash
                ;;
        esac
    else
        log_warn "$service 容器未运行"
    fi
}

# 连接数据库
connect_db() {
    local container_name="emaintenance-postgres"
    
    if docker ps | grep -q "$container_name"; then
        log_info "连接到PostgreSQL数据库..."
        docker exec -it "$container_name" psql -U postgres -d emaintenance
    else
        log_warn "数据库容器未运行"
    fi
}

# 连接Redis
connect_redis() {
    local container_name="emaintenance-redis"
    
    if docker ps | grep -q "$container_name"; then
        log_info "连接到Redis..."
        docker exec -it "$container_name" redis-cli
    else
        log_warn "Redis容器未运行"
    fi
}

# 显示访问信息
show_access_info() {
    echo -e "${CYAN}服务访问地址:${NC}"
    echo "  🌐 前端应用: http://localhost"
    echo "  🔑 用户API:  http://localhost:3001/api/health"
    echo "  📋 工单API:  http://localhost:3002/api/health" 
    echo "  🏭 资产API:  http://localhost:3003/api/health"
    echo "  🗄️  数据库:   postgresql://postgres:Qzy@7091!@localhost:5433/emaintenance"
    echo "  ⚡ Redis:   redis://localhost:6380"
}

# 显示端口信息
show_ports() {
    echo -e "${CYAN}端口映射信息:${NC}"
    echo "  80   -> Nginx (前端入口)"
    echo "  3001 -> 用户服务"
    echo "  3002 -> 工单服务"
    echo "  3003 -> 资产服务"
    echo "  5433 -> PostgreSQL"
    echo "  6380 -> Redis"
    echo ""
    
    echo -e "${CYAN}端口占用检查:${NC}"
    for port in 80 3001 3002 3003 5433 6380; do
        if lsof -i:$port >/dev/null 2>&1 || netstat -an 2>/dev/null | grep -q ":$port.*LISTEN"; then
            echo -e "  端口 $port: ${GREEN}已监听${NC}"
        else
            echo -e "  端口 $port: ${YELLOW}未监听${NC}"
        fi
    done
}

# 健康检查
health_check() {
    cd "$SCRIPT_DIR"
    ./status-local.sh health
}

# 清理Docker资源
cleanup_docker() {
    log_info "清理未使用的Docker资源..."
    
    echo "清理选项:"
    echo "1) 清理停止的容器"
    echo "2) 清理未使用的镜像"
    echo "3) 清理未使用的卷"
    echo "4) 全部清理"
    echo ""
    echo -n "请选择 [1-4]: "
    read -r choice
    
    case "$choice" in
        "1")
            docker container prune -f
            ;;
        "2")
            docker image prune -f
            ;;
        "3")
            docker volume prune -f
            ;;
        "4")
            docker system prune -f --volumes
            ;;
        *)
            log_warn "无效选择"
            return 1
            ;;
    esac
    
    log_info "✅ 清理完成"
}

# 备份数据库
backup_database() {
    local backup_file="emaintenance_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    log_info "备份数据库到: $backup_file"
    
    if docker ps | grep -q "emaintenance-postgres"; then
        docker exec emaintenance-postgres pg_dump -U postgres emaintenance > "$backup_file"
        log_info "✅ 数据库备份完成: $backup_file"
    else
        log_warn "数据库容器未运行"
    fi
}

# 主函数
main() {
    check_docker
    
    case "${1:-help}" in
        # 部署管理
        "start")
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "rebuild")
            rebuild_services
            ;;
        "clean")
            cd "$SCRIPT_DIR" && ./update-local.sh clean
            ;;
        
        # 开发工具
        "status")
            show_status
            ;;
        "logs")
            view_logs "$2"
            ;;
        "shell")
            enter_shell "$2"
            ;;
        "db")
            connect_db
            ;;
        "redis")
            connect_redis
            ;;
        
        # 更新部署
        "update")
            cd "$SCRIPT_DIR" && ./update-local.sh
            ;;
        "update-quick")
            cd "$SCRIPT_DIR" && ./update-local.sh quick
            ;;
        "update-full")
            cd "$SCRIPT_DIR" && ./update-local.sh full
            ;;
        "update-web")
            cd "$SCRIPT_DIR" && ./update-local.sh frontend
            ;;
        "update-api")
            cd "$SCRIPT_DIR" && ./update-local.sh backend
            ;;
        
        # 回滚操作
        "rollback")
            cd "$SCRIPT_DIR" && ./rollback-local.sh
            ;;
        "rollback-git")
            cd "$SCRIPT_DIR" && ./rollback-local.sh git
            ;;
        "reset-db")
            cd "$SCRIPT_DIR" && ./rollback-local.sh reset-db
            ;;
        
        # 开发辅助
        "health")
            health_check
            ;;
        "ports")
            show_ports
            ;;
        "cleanup")
            cleanup_docker
            ;;
        "backup-db")
            backup_database
            ;;
        
        # 帮助
        "help"|"-h"|"--help")
            show_usage
            ;;
        
        *)
            echo "未知命令: $1"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"