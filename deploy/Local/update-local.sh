#!/bin/bash

# E-Maintenance 本地Docker部署更新脚本
# 支持本地开发环境的快速更新和部署

set -e

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
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }
log_debug() { echo -e "${BLUE}[DEBUG]${NC} $1"; }

# 脚本信息
echo -e "${PURPLE}"
echo "========================================="
echo "E-Maintenance 本地部署更新工具"
echo "版本: 1.0.0"
echo "更新时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="
echo -e "${NC}"

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$SCRIPT_DIR"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

log_info "项目根目录: $PROJECT_ROOT"
log_info "部署目录: $DEPLOY_DIR"

# 检查必要的命令
check_requirements() {
    local missing_commands=()
    
    for cmd in docker docker-compose git; do
        if ! command -v $cmd &> /dev/null; then
            missing_commands+=($cmd)
        fi
    done
    
    if [ ${#missing_commands[@]} -ne 0 ]; then
        log_error "缺少必要的命令: ${missing_commands[*]}"
        log_error "请先安装 Docker, Docker Compose 和 Git"
        exit 1
    fi
}

# 检查Docker服务状态
check_docker_status() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker 守护进程未运行"
        log_info "请启动 Docker Desktop 或 Docker 服务"
        exit 1
    fi
}

# 获取当前运行的容器
get_running_containers() {
    docker-compose -f "$DEPLOY_DIR/docker-compose.local.yml" ps --services --filter "status=running" 2>/dev/null || true
}

# 显示更新选项
show_update_menu() {
    local running_containers=$(get_running_containers)
    
    echo -e "${CYAN}更新选项:${NC}"
    echo ""
    echo "1) 完整更新 - 重新构建所有服务"
    echo "2) 快速更新 - 只重启服务（不重新构建）"
    echo "3) 前端更新 - 只更新Web应用"
    echo "4) 后端更新 - 只更新API服务"
    echo "5) 重置数据库 - 清理并重新初始化数据库"
    echo "6) 清理更新 - 删除旧镜像并重新构建"
    echo "q) 退出"
    echo ""
    
    if [[ -n "$running_containers" ]]; then
        echo -e "${GREEN}当前运行的服务:${NC}"
        echo "$running_containers" | sed 's/^/  - /'
    else
        echo -e "${YELLOW}当前没有运行的服务${NC}"
    fi
    echo ""
}

# 检查Git状态
check_git_status() {
    log_step "检查Git状态..."
    
    cd "$PROJECT_ROOT"
    
    # 获取当前分支
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    local current_commit=$(git rev-parse --short HEAD)
    
    log_info "当前分支: $current_branch"
    log_info "当前提交: $current_commit"
    
    # 检查是否有未提交的更改
    if ! git diff --quiet || ! git diff --cached --quiet; then
        log_warn "检测到未提交的更改"
        echo "是否继续更新？(y/N): "
        read -r continue_update
        
        if [[ ! "$continue_update" =~ ^[Yy]$ ]]; then
            log_info "已取消更新"
            exit 0
        fi
    fi
}

# 停止服务
stop_services() {
    log_step "停止现有服务..."
    
    cd "$DEPLOY_DIR"
    docker-compose -f docker-compose.local.yml stop 2>/dev/null || true
    
    log_info "服务已停止"
}

# 清理旧容器和镜像
clean_old_resources() {
    log_step "清理旧的容器和镜像..."
    
    # 删除停止的容器
    docker-compose -f "$DEPLOY_DIR/docker-compose.local.yml" rm -f 2>/dev/null || true
    
    # 清理未使用的镜像
    echo "是否清理未使用的Docker镜像？(y/N): "
    read -r clean_images
    
    if [[ "$clean_images" =~ ^[Yy]$ ]]; then
        docker image prune -f
        log_info "已清理未使用的镜像"
    fi
}

# 构建服务
build_services() {
    local services="$1"
    
    log_step "构建服务..."
    
    cd "$DEPLOY_DIR"
    
    if [[ -z "$services" ]]; then
        # 构建所有服务
        docker-compose -f docker-compose.local.yml build --no-cache || {
            log_error "服务构建失败"
            return 1
        }
    else
        # 构建指定服务
        docker-compose -f docker-compose.local.yml build --no-cache $services || {
            log_error "服务构建失败: $services"
            return 1
        }
    fi
    
    log_info "服务构建完成"
}

# 启动服务
start_services() {
    local services="$1"
    
    log_step "启动服务..."
    
    cd "$DEPLOY_DIR"
    
    if [[ -z "$services" ]]; then
        # 启动所有服务
        docker-compose -f docker-compose.local.yml up -d || {
            log_error "服务启动失败"
            return 1
        }
    else
        # 启动指定服务
        docker-compose -f docker-compose.local.yml up -d $services || {
            log_error "服务启动失败: $services"
            return 1
        }
    fi
    
    log_info "服务启动完成"
}

# 初始化数据库
init_database() {
    log_step "初始化数据库..."
    
    # 等待数据库启动
    log_info "等待数据库服务启动..."
    sleep 10
    
    # 运行Prisma迁移
    cd "$PROJECT_ROOT"
    
    log_info "运行数据库迁移..."
    npm run db:push || {
        log_error "数据库迁移失败"
        return 1
    }
    
    # 运行数据种子
    echo "是否运行数据种子？(y/N): "
    read -r run_seed
    
    if [[ "$run_seed" =~ ^[Yy]$ ]]; then
        log_info "运行数据种子..."
        npm run db:seed || {
            log_warn "数据种子执行失败（可能已存在数据）"
        }
    fi
    
    log_info "数据库初始化完成"
}

# 健康检查
health_check() {
    log_step "执行健康检查..."
    
    local services=("postgres" "redis" "user-service" "work-order-service" "asset-service" "web" "nginx")
    local failed_services=()
    
    # 等待服务完全启动
    sleep 15
    
    for service in "${services[@]}"; do
        local container_name="emaintenance-$service"
        
        # 检查容器是否运行
        if docker ps --format "table {{.Names}}" | grep -q "$container_name"; then
            log_info "✅ $service 运行中"
            
            # 检查健康状态
            local health_status=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$container_name" 2>/dev/null || echo "unknown")
            
            if [[ "$health_status" == "healthy" ]]; then
                log_info "   健康状态: 正常"
            elif [[ "$health_status" == "unhealthy" ]]; then
                log_error "   健康状态: 异常"
                failed_services+=("$service")
            elif [[ "$health_status" == "starting" ]]; then
                log_warn "   健康状态: 启动中"
            fi
        else
            log_error "❌ $service 未运行"
            failed_services+=("$service")
        fi
    done
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        log_info "🎉 所有服务健康检查通过！"
        return 0
    else
        log_error "以下服务存在问题: ${failed_services[*]}"
        return 1
    fi
}

# 显示服务状态
show_service_status() {
    log_step "服务状态:"
    
    cd "$DEPLOY_DIR"
    docker-compose -f docker-compose.local.yml ps
    
    echo ""
    log_info "服务访问地址:"
    echo "  - 前端应用: http://localhost"
    echo "  - 用户服务: http://localhost:3001"
    echo "  - 工单服务: http://localhost:3002"
    echo "  - 资产服务: http://localhost:3003"
    echo "  - PostgreSQL: localhost:5433"
    echo "  - Redis: localhost:6380"
}

# 查看日志
view_logs() {
    local service="$1"
    
    cd "$DEPLOY_DIR"
    
    if [[ -z "$service" ]]; then
        docker-compose -f docker-compose.local.yml logs --tail=50 -f
    else
        docker-compose -f docker-compose.local.yml logs --tail=50 -f "$service"
    fi
}

# 完整更新
full_update() {
    log_step "执行完整更新..."
    
    stop_services
    clean_old_resources
    build_services ""
    start_services ""
    init_database
    health_check
    show_service_status
    
    log_info "🎉 完整更新完成！"
}

# 快速更新
quick_update() {
    log_step "执行快速更新（只重启服务）..."
    
    cd "$DEPLOY_DIR"
    docker-compose -f docker-compose.local.yml restart
    
    sleep 10
    health_check
    show_service_status
    
    log_info "🎉 快速更新完成！"
}

# 前端更新
frontend_update() {
    log_step "更新前端应用..."
    
    stop_services
    build_services "web nginx"
    start_services "web nginx"
    
    sleep 10
    health_check
    show_service_status
    
    log_info "🎉 前端更新完成！"
}

# 后端更新
backend_update() {
    log_step "更新后端服务..."
    
    stop_services
    build_services "user-service work-order-service asset-service"
    start_services "postgres redis user-service work-order-service asset-service"
    
    sleep 10
    health_check
    show_service_status
    
    log_info "🎉 后端更新完成！"
}

# 重置数据库
reset_database() {
    log_warn "⚠️  此操作将删除所有数据！"
    echo "确定要重置数据库吗？(yes/N): "
    read -r confirm
    
    if [[ "$confirm" != "yes" ]]; then
        log_info "已取消重置"
        return
    fi
    
    log_step "重置数据库..."
    
    # 停止服务
    cd "$DEPLOY_DIR"
    docker-compose -f docker-compose.local.yml stop
    
    # 删除数据卷
    docker-compose -f docker-compose.local.yml rm -f postgres
    docker volume rm local_postgres-data 2>/dev/null || true
    
    # 重新启动数据库
    docker-compose -f docker-compose.local.yml up -d postgres redis
    
    # 初始化数据库
    sleep 10
    init_database
    
    # 启动其他服务
    start_services ""
    health_check
    
    log_info "🎉 数据库重置完成！"
}

# 清理更新
clean_update() {
    log_step "执行清理更新..."
    
    # 停止并删除所有容器
    cd "$DEPLOY_DIR"
    docker-compose -f docker-compose.local.yml down
    
    # 清理镜像
    docker image prune -a -f
    
    # 重新构建和启动
    build_services ""
    start_services ""
    init_database
    health_check
    show_service_status
    
    log_info "🎉 清理更新完成！"
}

# 主函数
main() {
    check_requirements
    check_docker_status
    
    # 如果提供了命令行参数
    if [[ -n "${1:-}" ]]; then
        case "$1" in
            "full")
                check_git_status
                full_update
                ;;
            "quick")
                quick_update
                ;;
            "frontend")
                check_git_status
                frontend_update
                ;;
            "backend")
                check_git_status
                backend_update
                ;;
            "reset-db")
                reset_database
                ;;
            "clean")
                check_git_status
                clean_update
                ;;
            "status")
                show_service_status
                ;;
            "logs")
                view_logs "${2:-}"
                ;;
            "help"|"-h"|"--help")
                echo "用法: $0 [命令] [选项]"
                echo ""
                echo "命令:"
                echo "  full       - 完整更新（重新构建所有服务）"
                echo "  quick      - 快速更新（只重启服务）"
                echo "  frontend   - 只更新前端"
                echo "  backend    - 只更新后端"
                echo "  reset-db   - 重置数据库"
                echo "  clean      - 清理并重新构建"
                echo "  status     - 显示服务状态"
                echo "  logs [服务] - 查看日志"
                echo "  help       - 显示帮助"
                echo ""
                echo "无参数运行将显示交互式菜单"
                ;;
            *)
                log_error "未知命令: $1"
                echo "使用 $0 help 查看帮助"
                exit 1
                ;;
        esac
    else
        # 交互式菜单
        while true; do
            show_update_menu
            echo -n "请选择操作 [1-6/q]: "
            read -r choice
            
            case "$choice" in
                "1")
                    check_git_status
                    full_update
                    break
                    ;;
                "2")
                    quick_update
                    break
                    ;;
                "3")
                    check_git_status
                    frontend_update
                    break
                    ;;
                "4")
                    check_git_status
                    backend_update
                    break
                    ;;
                "5")
                    reset_database
                    break
                    ;;
                "6")
                    check_git_status
                    clean_update
                    break
                    ;;
                "q"|"Q")
                    log_info "已退出"
                    exit 0
                    ;;
                *)
                    log_error "无效的选择: $choice"
                    ;;
            esac
        done
    fi
}

# 错误处理
trap 'log_error "脚本执行出错，行号: $LINENO"' ERR

# 运行主函数
main "$@"