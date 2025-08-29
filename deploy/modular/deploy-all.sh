#!/bin/bash

# E-Maintenance 分模块部署 - 一键部署脚本
# 按顺序部署所有模块：基础设施 -> 微服务 -> 前端

set -e

# 脚本配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }  
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_debug() { echo -e "${BLUE}[DEBUG]${NC} $1"; }

# 使用说明
usage() {
    cat << EOF
E-Maintenance 分模块部署脚本

用法: $0 [环境] [选项]

环境:
    dev         开发环境部署 (默认)
    test        测试环境部署
    prod        生产环境部署

选项:
    --skip-build        跳过Docker镜像构建
    --force-recreate    强制重新创建容器
    --no-logs          不显示部署日志
    --parallel         并行部署（实验性）
    --dry-run          显示将要执行的命令但不执行
    --health-check     部署后执行健康检查
    --rollback         回滚到上一个版本
    
示例:
    $0 dev                          # 开发环境完整部署
    $0 prod --skip-build           # 生产环境部署，跳过构建
    $0 test --force-recreate       # 测试环境强制重建
    
EOF
    exit 1
}

# 参数解析
ENVIRONMENT=${1:-dev}
SKIP_BUILD=false
FORCE_RECREATE=false
NO_LOGS=false
PARALLEL=false
DRY_RUN=false
HEALTH_CHECK=true
ROLLBACK=false

# 解析选项
shift
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --force-recreate)
            FORCE_RECREATE=true
            shift
            ;;
        --no-logs)
            NO_LOGS=true
            shift
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --health-check)
            HEALTH_CHECK=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
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
    log_info "请从示例文件复制并配置: cp ${ENV_FILE}.example ${ENV_FILE}"
    exit 1
fi

# Docker Compose配置
COMPOSE_FILES=(
    "${SCRIPT_DIR}/docker-compose.infrastructure.yml"
    "${SCRIPT_DIR}/docker-compose.microservices.yml"  
    "${SCRIPT_DIR}/docker-compose.frontend.yml"
)

# 检查Docker和Docker Compose
check_docker() {
    log_info "检查Docker环境..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装或不在PATH中"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "无法连接到Docker守护进程"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose未安装或不在PATH中"
        exit 1
    fi
    
    log_info "✓ Docker环境检查通过"
}

# 准备部署环境
prepare_deployment() {
    log_info "准备部署环境..."
    
    # 切换到脚本目录
    cd "${SCRIPT_DIR}"
    
    # 导入环境变量
    set -a
    source "${ENV_FILE}"
    set +a
    
    # 创建必要的目录
    mkdir -p logs data/postgres data/redis data/uploads
    
    # 设置权限
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        chmod 600 "${ENV_FILE}"
        chmod 700 data/
    fi
    
    log_info "✓ 部署环境准备完成"
}

# 执行命令（支持dry-run模式）
execute_command() {
    local cmd="$1"
    local description="$2"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_debug "[DRY-RUN] $description"
        log_debug "[DRY-RUN] Command: $cmd"
        return 0
    fi
    
    log_info "$description"
    log_debug "Executing: $cmd"
    
    if eval "$cmd"; then
        log_info "✓ $description 完成"
        return 0
    else
        log_error "✗ $description 失败"
        return 1
    fi
}

# 构建Docker镜像
build_images() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        log_info "跳过Docker镜像构建"
        return 0
    fi
    
    log_info "构建Docker镜像..."
    
    local build_args="--build-arg NODE_ENV=${NODE_ENV:-production}"
    if [[ "$FORCE_RECREATE" == "true" ]]; then
        build_args="$build_args --no-cache"
    fi
    
    # 构建微服务镜像
    execute_command \
        "docker-compose -f docker-compose.microservices.yml build $build_args" \
        "构建微服务镜像"
    
    # 构建前端镜像
    execute_command \
        "docker-compose -f docker-compose.frontend.yml build $build_args" \
        "构建前端镜像"
}

# 部署基础设施模块
deploy_infrastructure() {
    log_info "部署基础设施模块..."
    
    local compose_args="--env-file ${ENV_FILE}"
    if [[ "$FORCE_RECREATE" == "true" ]]; then
        compose_args="$compose_args --force-recreate"
    fi
    
    execute_command \
        "docker-compose -f docker-compose.infrastructure.yml $compose_args up -d" \
        "启动基础设施服务"
    
    # 等待基础设施服务就绪
    wait_for_infrastructure
}

# 等待基础设施服务就绪
wait_for_infrastructure() {
    log_info "等待基础设施服务就绪..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log_debug "健康检查尝试 $attempt/$max_attempts"
        
        # 检查PostgreSQL
        if docker-compose -f docker-compose.infrastructure.yml exec -T postgres pg_isready -U "${POSTGRES_USER}" &>/dev/null; then
            postgres_ready=true
        else
            postgres_ready=false
        fi
        
        # 检查Redis  
        if docker-compose -f docker-compose.infrastructure.yml exec -T redis redis-cli ping | grep -q PONG &>/dev/null; then
            redis_ready=true
        else
            redis_ready=false
        fi
        
        # 检查Nginx
        if curl -f http://localhost:${HTTP_PORT:-80}/health &>/dev/null; then
            nginx_ready=true
        else
            nginx_ready=false
        fi
        
        if [[ "$postgres_ready" == "true" && "$redis_ready" == "true" && "$nginx_ready" == "true" ]]; then
            log_info "✓ 基础设施服务就绪"
            return 0
        fi
        
        log_debug "等待服务就绪... (PostgreSQL: $postgres_ready, Redis: $redis_ready, Nginx: $nginx_ready)"
        sleep 10
        ((attempt++))
    done
    
    log_error "基础设施服务启动超时"
    show_service_status
    return 1
}

# 部署微服务模块
deploy_microservices() {
    log_info "部署微服务模块..."
    
    local compose_args="--env-file ${ENV_FILE}"
    if [[ "$FORCE_RECREATE" == "true" ]]; then
        compose_args="$compose_args --force-recreate"
    fi
    
    execute_command \
        "docker-compose -f docker-compose.microservices.yml $compose_args up -d" \
        "启动微服务"
    
    # 等待微服务就绪
    wait_for_microservices
}

# 等待微服务就绪
wait_for_microservices() {
    log_info "等待微服务就绪..."
    
    local services=("user-service-1:3001" "work-order-service-1:3002" "asset-service-1:3003")
    local max_attempts=20
    
    for service in "${services[@]}"; do
        IFS=':' read -r service_name port <<< "$service"
        local attempt=1
        
        log_debug "等待 $service_name 就绪..."
        
        while [[ $attempt -le $max_attempts ]]; do
            if curl -f "http://localhost:$port/health" &>/dev/null || 
               curl -f "http://localhost:$port/api/health" &>/dev/null; then
                log_info "✓ $service_name 就绪"
                break
            fi
            
            if [[ $attempt -eq $max_attempts ]]; then
                log_error "✗ $service_name 启动超时"
                return 1
            fi
            
            sleep 5
            ((attempt++))
        done
    done
    
    log_info "✓ 所有微服务就绪"
}

# 部署前端模块
deploy_frontend() {
    log_info "部署前端模块..."
    
    local compose_args="--env-file ${ENV_FILE}"
    if [[ "$FORCE_RECREATE" == "true" ]]; then
        compose_args="$compose_args --force-recreate"
    fi
    
    execute_command \
        "docker-compose -f docker-compose.frontend.yml $compose_args up -d" \
        "启动前端应用"
    
    # 等待前端就绪
    wait_for_frontend
}

# 等待前端就绪
wait_for_frontend() {
    log_info "等待前端应用就绪..."
    
    local max_attempts=20
    local attempt=1
    local web_port=${WEB_PORT:-3000}
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f "http://localhost:$web_port/api/health" &>/dev/null; then
            log_info "✓ 前端应用就绪"
            return 0
        fi
        
        log_debug "等待前端应用启动... ($attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    log_error "前端应用启动超时"
    return 1
}

# 显示服务状态
show_service_status() {
    log_info "显示服务状态..."
    
    echo -e "\n${BLUE}=== 基础设施服务状态 ===${NC}"
    docker-compose -f docker-compose.infrastructure.yml ps
    
    echo -e "\n${BLUE}=== 微服务状态 ===${NC}"
    docker-compose -f docker-compose.microservices.yml ps
    
    echo -e "\n${BLUE}=== 前端服务状态 ===${NC}"
    docker-compose -f docker-compose.frontend.yml ps
}

# 健康检查
health_check() {
    if [[ "$HEALTH_CHECK" != "true" ]]; then
        return 0
    fi
    
    log_info "执行健康检查..."
    
    # 使用单独的健康检查脚本
    if [[ -x "${SCRIPT_DIR}/health-check.sh" ]]; then
        "${SCRIPT_DIR}/health-check.sh" "$ENVIRONMENT"
    else
        log_warn "健康检查脚本不存在，跳过详细检查"
        show_service_status
    fi
}

# 显示部署信息
show_deployment_info() {
    local host_ip
    host_ip=$(hostname -I | awk '{print $1}' 2>/dev/null || ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
    
    echo -e "\n${GREEN}========================================="
    echo -e "E-Maintenance 部署完成！"
    echo -e "=========================================${NC}"
    
    echo -e "\n${BLUE}访问地址:${NC}"
    echo -e "- Web应用: http://localhost:${HTTP_PORT:-80}"
    echo -e "- 局域网访问: http://$host_ip:${HTTP_PORT:-80}"
    
    echo -e "\n${BLUE}API端点:${NC}"
    echo -e "- 用户服务: http://localhost:${HTTP_PORT:-80}/api/users"
    echo -e "- 工单服务: http://localhost:${HTTP_PORT:-80}/api/work-orders"
    echo -e "- 资产服务: http://localhost:${HTTP_PORT:-80}/api/assets"
    
    echo -e "\n${BLUE}管理界面:${NC}"
    if [[ "${GRAFANA_PORT:-}" ]]; then
        echo -e "- Grafana监控: http://localhost:${GRAFANA_PORT}"
    fi
    if [[ "${MINIO_CONSOLE_PORT:-}" ]]; then
        echo -e "- MinIO控制台: http://localhost:${MINIO_CONSOLE_PORT}"
    fi
    
    echo -e "\n${BLUE}移动端配置:${NC}"
    echo -e "- 服务器地址: $host_ip"
    echo -e "- 端口: ${HTTP_PORT:-80}"
    
    echo -e "\n${BLUE}环境信息:${NC}"
    echo -e "- 部署环境: $ENVIRONMENT"
    echo -e "- 镜像标签: ${IMAGE_TAG:-latest}"
    echo -e "- 配置文件: $ENV_FILE"
    
    echo -e "\n${YELLOW}常用命令:${NC}"
    echo -e "- 查看日志: docker-compose -f docker-compose.*.yml logs -f"
    echo -e "- 重启服务: docker-compose -f docker-compose.*.yml restart [service]"
    echo -e "- 停止服务: ${SCRIPT_DIR}/stop-all.sh $ENVIRONMENT"
    echo -e "- 健康检查: ${SCRIPT_DIR}/health-check.sh $ENVIRONMENT"
}

# 回滚功能
rollback_deployment() {
    log_info "回滚部署..."
    
    # 这里可以实现回滚逻辑
    log_warn "回滚功能尚未实现"
    return 1
}

# 并行部署（实验性）
parallel_deploy() {
    log_info "并行部署模式（实验性）..."
    
    # 基础设施必须先部署
    deploy_infrastructure
    
    # 并行部署微服务和前端（前端会等待微服务）
    (deploy_microservices) &
    local microservices_pid=$!
    
    (deploy_frontend) &  
    local frontend_pid=$!
    
    # 等待两个进程完成
    wait $microservices_pid
    local microservices_exit=$?
    
    wait $frontend_pid
    local frontend_exit=$?
    
    if [[ $microservices_exit -eq 0 && $frontend_exit -eq 0 ]]; then
        log_info "✓ 并行部署完成"
        return 0
    else
        log_error "✗ 并行部署失败"
        return 1
    fi
}

# 主函数
main() {
    echo -e "${GREEN}"
    echo "========================================="
    echo "E-Maintenance 分模块部署脚本"
    echo "环境: $ENVIRONMENT"
    echo "========================================="
    echo -e "${NC}"
    
    # 前置检查
    check_docker
    prepare_deployment
    
    # 处理特殊选项
    if [[ "$ROLLBACK" == "true" ]]; then
        rollback_deployment
        exit $?
    fi
    
    # 开始部署
    local start_time
    start_time=$(date +%s)
    
    if [[ "$PARALLEL" == "true" ]]; then
        # 实验性并行部署
        build_images
        parallel_deploy
    else
        # 标准顺序部署
        build_images
        deploy_infrastructure
        deploy_microservices
        deploy_frontend
    fi
    
    # 后续操作
    health_check
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # 显示部署信息
    show_deployment_info
    
    log_info "部署完成，用时: ${duration}秒"
    
    if [[ "$NO_LOGS" != "true" ]]; then
        log_info "显示最新日志（Ctrl+C 退出）:"
        docker-compose \
            -f docker-compose.infrastructure.yml \
            -f docker-compose.microservices.yml \
            -f docker-compose.frontend.yml \
            logs -f --tail=50
    fi
}

# 信号处理
trap 'log_error "部署被中断"; exit 1' INT TERM

# 运行主函数
main "$@"