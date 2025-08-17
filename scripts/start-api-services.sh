#!/bin/bash

# EMaintenance API 服务一键启动脚本
# 功能：清理端口占用、启动所有API服务
# 作者：Claude Code
# 版本：1.0.0

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API服务配置
USER_SERVICE_PORT=3001
WORK_ORDER_SERVICE_PORT=3002
ASSET_SERVICE_PORT=3003
DATABASE_URL="postgresql://postgres:Qzy@7091!@localhost:5433/emaintenance"
PROJECT_ROOT="/Users/benque/Project/Emaintenance"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查端口占用并清理
kill_port() {
    local port=$1
    local service_name=$2
    
    log_info "检查端口 $port 是否被占用..."
    
    # 查找占用端口的进程
    local pid=$(lsof -ti:$port 2>/dev/null || echo "")
    
    if [ ! -z "$pid" ]; then
        log_warning "端口 $port 被进程 $pid 占用，正在清理..."
        kill -9 $pid 2>/dev/null || true
        sleep 1
        
        # 再次检查是否清理成功
        local check_pid=$(lsof -ti:$port 2>/dev/null || echo "")
        if [ -z "$check_pid" ]; then
            log_success "端口 $port 清理成功"
        else
            log_error "端口 $port 清理失败，可能需要手动处理"
            return 1
        fi
    else
        log_info "端口 $port 未被占用"
    fi
}

# 检查数据库连接
check_database() {
    log_info "检查数据库连接..."
    
    # 检查Docker容器是否运行
    if ! docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(emaintenance-db-hybrid|emaintenance-db-simple)" | grep -q "Up"; then
        log_error "数据库容器未运行！请先启动数据库服务："
        echo "  docker-compose -f docker-compose.hybrid.yml up -d database redis"
        echo "  或者"
        echo "  docker-compose -f docker-compose.simple.yml up -d database redis"
        return 1
    fi
    
    # 使用nc测试端口连接（替代psql）
    if ! nc -z localhost 5433 2>/dev/null; then
        log_error "数据库端口5433连接失败！请检查数据库容器状态"
        return 1
    fi
    
    log_success "数据库连接正常"
}

# 启动单个服务
start_service() {
    local service_name=$1
    local service_path=$2
    local service_port=$3
    
    log_info "启动 $service_name..."
    
    # 切换到服务目录
    cd "$PROJECT_ROOT/$service_path"
    
    # 检查 package.json 是否存在
    if [ ! -f "package.json" ]; then
        log_error "$service_name 目录下未找到 package.json"
        return 1
    fi
    
    # 确保在monorepo中，依赖由根目录管理，不在服务目录单独安装
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        log_info "检测到根目录缺少依赖，请先在项目根目录执行: npm install"
        log_error "请在项目根目录执行 'npm install' 后重试"
        return 1
    fi
    
    # 启动服务（后台运行）
    log_info "在端口 $service_port 启动 $service_name..."
    DATABASE_URL="$DATABASE_URL" npm run dev > "/tmp/${service_name}-$(date +%s).log" 2>&1 &
    local service_pid=$!
    
    # 等待服务启动
    sleep 3
    
    # 检查服务是否正常启动
    if kill -0 $service_pid 2>/dev/null; then
        log_success "$service_name 启动成功 (PID: $service_pid, 端口: $service_port)"
        echo "$service_pid" > "/tmp/${service_name}.pid"
        
        # 等待服务完全启动并测试健康检查
        sleep 2
        if curl -s "http://localhost:$service_port/health" >/dev/null 2>&1; then
            log_success "$service_name 健康检查通过"
        else
            log_warning "$service_name 健康检查失败，但服务进程正在运行"
        fi
    else
        log_error "$service_name 启动失败"
        return 1
    fi
}

# 显示服务状态
show_status() {
    echo
    log_info "=== API 服务状态 ==="
    echo
    
    # 检查各服务状态
    for port in $USER_SERVICE_PORT $WORK_ORDER_SERVICE_PORT $ASSET_SERVICE_PORT; do
        if curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
            local service_info=$(curl -s "http://localhost:$port/health" | jq -r '.service // "unknown"' 2>/dev/null || echo "unknown")
            log_success "✅ $service_info 运行在端口 $port"
        else
            log_error "❌ 端口 $port 上的服务未响应"
        fi
    done
    
    echo
    log_info "=== 服务地址 ==="
    echo -e "  • User Service:       ${GREEN}http://localhost:$USER_SERVICE_PORT${NC}"
    echo -e "  • Work Order Service: ${GREEN}http://localhost:$WORK_ORDER_SERVICE_PORT${NC}"
    echo -e "  • Asset Service:      ${GREEN}http://localhost:$ASSET_SERVICE_PORT${NC}"
    echo
}

# 停止所有服务
stop_services() {
    log_info "停止所有 API 服务..."
    
    for port in $USER_SERVICE_PORT $WORK_ORDER_SERVICE_PORT $ASSET_SERVICE_PORT; do
        kill_port $port "API服务"
    done
    
    # 清理 PID 文件
    rm -f /tmp/user-service.pid /tmp/work-order-service.pid /tmp/asset-service.pid
    
    log_success "所有服务已停止"
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "================================="
    echo "  EMaintenance API 服务管理脚本  "
    echo "================================="
    echo -e "${NC}"
    
    # 解析命令行参数
    case "${1:-start}" in
        "start")
            log_info "开始启动所有 API 服务..."
            
            # 检查数据库连接
            if ! check_database; then
                exit 1
            fi
            
            # 清理端口占用
            kill_port $USER_SERVICE_PORT "User Service"
            kill_port $WORK_ORDER_SERVICE_PORT "Work Order Service"
            kill_port $ASSET_SERVICE_PORT "Asset Service"
            
            echo
            log_info "启动服务..."
            
            # 启动各个服务
            start_service "user-service" "apps/api/user-service" $USER_SERVICE_PORT
            sleep 2
            start_service "work-order-service" "apps/api/work-order-service" $WORK_ORDER_SERVICE_PORT
            sleep 2
            start_service "asset-service" "apps/api/asset-service" $ASSET_SERVICE_PORT
            
            # 显示状态
            sleep 3
            show_status
            
            echo
            log_info "=== 管理命令 ==="
            echo "  • 查看状态: $0 status"
            echo "  • 停止服务: $0 stop"
            echo "  • 重启服务: $0 restart"
            echo "  • 查看日志: tail -f /tmp/*-service-*.log"
            echo
            ;;
            
        "stop")
            stop_services
            ;;
            
        "restart")
            log_info "重启所有 API 服务..."
            stop_services
            sleep 2
            $0 start
            ;;
            
        "status")
            show_status
            ;;
            
        "help"|"-h"|"--help")
            echo "使用方法: $0 [命令]"
            echo
            echo "可用命令:"
            echo "  start   - 启动所有 API 服务 (默认)"
            echo "  stop    - 停止所有 API 服务"
            echo "  restart - 重启所有 API 服务"
            echo "  status  - 查看服务状态"
            echo "  help    - 显示此帮助信息"
            echo
            ;;
            
        *)
            log_error "未知命令: $1"
            echo "使用 '$0 help' 查看可用命令"
            exit 1
            ;;
    esac
}

# 信号处理 - 清理后台进程
cleanup() {
    log_warning "收到中断信号，正在清理..."
    stop_services
    exit 0
}

trap cleanup SIGINT SIGTERM

# 运行主函数
main "$@"