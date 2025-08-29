#!/bin/bash

# E-Maintenance 基础设施模块独立部署脚本
# 部署数据库、缓存、网关等核心基础服务

set -e

# 脚本配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_debug() { echo -e "${BLUE}[DEBUG]${NC} $1"; }

# 使用说明
usage() {
    cat << EOF
E-Maintenance 基础设施模块部署脚本

用法: $0 [环境] [选项]

环境:
    dev         开发环境 (默认)
    test        测试环境
    prod        生产环境

选项:
    --force-recreate    强制重新创建容器
    --with-monitoring   启用监控服务 (Prometheus, Grafana)
    --with-logging      启用日志聚合服务
    --with-storage      启用对象存储服务 (MinIO)
    --scale REPLICAS    设置Nginx副本数量
    --dry-run          显示命令但不执行

示例:
    $0 dev                              # 基础部署
    $0 prod --with-monitoring          # 生产环境带监控
    $0 test --with-storage --scale 2   # 测试环境带存储，2个Nginx副本

EOF
    exit 1
}

# 参数解析
ENVIRONMENT=${1:-dev}
FORCE_RECREATE=false
WITH_MONITORING=false
WITH_LOGGING=false
WITH_STORAGE=false
NGINX_SCALE=1
DRY_RUN=false

shift
while [[ $# -gt 0 ]]; do
    case $1 in
        --force-recreate)
            FORCE_RECREATE=true
            shift
            ;;
        --with-monitoring)
            WITH_MONITORING=true
            shift
            ;;
        --with-logging)
            WITH_LOGGING=true
            shift
            ;;
        --with-storage)
            WITH_STORAGE=true
            shift
            ;;
        --scale)
            NGINX_SCALE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
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

# Docker Compose文件
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.infrastructure.yml"

# 执行命令
execute_command() {
    local cmd="$1"
    local description="$2"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_debug "[DRY-RUN] $description"
        log_debug "[DRY-RUN] Command: $cmd"
        return 0
    fi
    
    log_info "$description"
    
    if eval "$cmd"; then
        log_info "✓ $description 完成"
        return 0
    else
        log_error "✗ $description 失败"
        return 1
    fi
}

# 检查Docker
check_docker() {
    log_info "检查Docker环境..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "无法连接到Docker守护进程"
        exit 1
    fi
    
    log_info "✓ Docker环境正常"
}

# 准备部署环境
prepare_environment() {
    log_info "准备部署环境..."
    
    cd "$SCRIPT_DIR"
    
    # 创建数据目录
    mkdir -p data/postgres data/redis data/uploads logs/nginx
    
    # 设置权限
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        chmod 600 "$ENV_FILE"
        chmod 700 data/
    fi
    
    # 创建网络（如果不存在）
    if ! docker network ls | grep -q "emaintenance-network"; then
        execute_command \
            "docker network create emaintenance-network" \
            "创建Docker网络"
    fi
    
    log_info "✓ 环境准备完成"
}

# 构建Profile参数
build_profiles() {
    local profiles=""
    
    if [[ "$WITH_MONITORING" == "true" ]]; then
        profiles="${profiles}monitoring,"
    fi
    
    if [[ "$WITH_LOGGING" == "true" ]]; then
        profiles="${profiles}logging,"
    fi
    
    if [[ "$WITH_STORAGE" == "true" ]]; then
        profiles="${profiles}object-storage,"
    fi
    
    # 移除末尾的逗号
    profiles="${profiles%,}"
    
    if [[ -n "$profiles" ]]; then
        echo "--profile $profiles"
    fi
}

# 部署基础设施
deploy_infrastructure() {
    log_info "部署基础设施服务..."
    
    local compose_args="--env-file $ENV_FILE"
    local profiles
    profiles=$(build_profiles)
    
    if [[ -n "$profiles" ]]; then
        compose_args="$compose_args $profiles"
    fi
    
    if [[ "$FORCE_RECREATE" == "true" ]]; then
        compose_args="$compose_args --force-recreate"
    fi
    
    # 启动服务
    execute_command \
        "docker-compose -f $COMPOSE_FILE $compose_args up -d" \
        "启动基础设施服务"
    
    # 扩展Nginx服务
    if [[ "$NGINX_SCALE" -gt 1 ]]; then
        execute_command \
            "docker-compose -f $COMPOSE_FILE scale nginx=$NGINX_SCALE" \
            "扩展Nginx到 $NGINX_SCALE 个副本"
    fi
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log_debug "健康检查尝试 $attempt/$max_attempts"
        
        local all_ready=true
        
        # 检查PostgreSQL
        if ! docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${POSTGRES_USER}" &>/dev/null; then
            log_debug "PostgreSQL 未就绪"
            all_ready=false
        fi
        
        # 检查Redis
        if ! docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping | grep -q PONG &>/dev/null; then
            log_debug "Redis 未就绪"
            all_ready=false
        fi
        
        # 检查Nginx
        if ! curl -f "http://localhost:${HTTP_PORT:-80}/health" &>/dev/null; then
            log_debug "Nginx 未就绪"
            all_ready=false
        fi
        
        # 检查可选服务
        if [[ "$WITH_MONITORING" == "true" ]] && ! curl -f "http://localhost:${PROMETHEUS_PORT:-9090}/-/ready" &>/dev/null; then
            log_debug "Prometheus 未就绪"
            all_ready=false
        fi
        
        if [[ "$WITH_STORAGE" == "true" ]] && ! curl -f "http://localhost:${MINIO_PORT:-9000}/minio/health/live" &>/dev/null; then
            log_debug "MinIO 未就绪"
            all_ready=false
        fi
        
        if [[ "$all_ready" == "true" ]]; then
            log_info "✓ 所有服务就绪"
            return 0
        fi
        
        sleep 10
        ((attempt++))
    done
    
    log_error "服务启动超时"
    show_service_status
    return 1
}

# 显示服务状态
show_service_status() {
    log_info "显示服务状态..."
    docker-compose -f "$COMPOSE_FILE" ps
}

# 执行健康检查
health_check() {
    log_info "执行健康检查..."
    
    local failed=0
    
    # PostgreSQL健康检查
    log_debug "检查 PostgreSQL..."
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${POSTGRES_USER}"; then
        log_info "✓ PostgreSQL 健康"
    else
        log_error "✗ PostgreSQL 不健康"
        ((failed++))
    fi
    
    # Redis健康检查
    log_debug "检查 Redis..."
    if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping | grep -q PONG; then
        log_info "✓ Redis 健康"
    else
        log_error "✗ Redis 不健康"
        ((failed++))
    fi
    
    # Nginx健康检查
    log_debug "检查 Nginx..."
    if curl -f "http://localhost:${HTTP_PORT:-80}/health" &>/dev/null; then
        log_info "✓ Nginx 健康"
    else
        log_error "✗ Nginx 不健康"
        ((failed++))
    fi
    
    # 可选服务检查
    if [[ "$WITH_MONITORING" == "true" ]]; then
        log_debug "检查 Prometheus..."
        if curl -f "http://localhost:${PROMETHEUS_PORT:-9090}/-/ready" &>/dev/null; then
            log_info "✓ Prometheus 健康"
        else
            log_error "✗ Prometheus 不健康"
            ((failed++))
        fi
        
        log_debug "检查 Grafana..."
        if curl -f "http://localhost:${GRAFANA_PORT:-3000}/api/health" &>/dev/null; then
            log_info "✓ Grafana 健康"
        else
            log_warn "△ Grafana 可能仍在启动中"
        fi
    fi
    
    if [[ "$WITH_STORAGE" == "true" ]]; then
        log_debug "检查 MinIO..."
        if curl -f "http://localhost:${MINIO_PORT:-9000}/minio/health/live" &>/dev/null; then
            log_info "✓ MinIO 健康"
        else
            log_error "✗ MinIO 不健康"
            ((failed++))
        fi
    fi
    
    if [[ $failed -eq 0 ]]; then
        log_info "✓ 所有服务健康检查通过"
        return 0
    else
        log_error "✗ $failed 个服务健康检查失败"
        return 1
    fi
}

# 显示部署信息
show_deployment_info() {
    local host_ip
    host_ip=$(hostname -I | awk '{print $1}' 2>/dev/null || ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
    
    echo -e "\n${GREEN}========================================="
    echo -e "基础设施模块部署完成！"
    echo -e "=========================================${NC}"
    
    echo -e "\n${BLUE}核心服务:${NC}"
    echo -e "- PostgreSQL: localhost:${POSTGRES_PORT:-5432}"
    echo -e "- Redis: localhost:${REDIS_PORT:-6379}"
    echo -e "- Nginx网关: http://localhost:${HTTP_PORT:-80}"
    
    if [[ "$WITH_MONITORING" == "true" ]]; then
        echo -e "\n${BLUE}监控服务:${NC}"
        echo -e "- Prometheus: http://localhost:${PROMETHEUS_PORT:-9090}"
        echo -e "- Grafana: http://localhost:${GRAFANA_PORT:-3000} (admin:${GRAFANA_PASSWORD:-admin123})"
    fi
    
    if [[ "$WITH_STORAGE" == "true" ]]; then
        echo -e "\n${BLUE}存储服务:${NC}"
        echo -e "- MinIO API: http://localhost:${MINIO_PORT:-9000}"
        echo -e "- MinIO控制台: http://localhost:${MINIO_CONSOLE_PORT:-9001}"
    fi
    
    echo -e "\n${BLUE}网络信息:${NC}"
    echo -e "- 局域网访问: http://$host_ip:${HTTP_PORT:-80}"
    echo -e "- Docker网络: emaintenance-network"
    
    echo -e "\n${BLUE}数据持久化:${NC}"
    echo -e "- PostgreSQL数据: $(pwd)/data/postgres"
    echo -e "- Redis数据: $(pwd)/data/redis"
    echo -e "- 上传文件: $(pwd)/data/uploads"
    echo -e "- Nginx日志: $(pwd)/logs/nginx"
    
    echo -e "\n${YELLOW}下一步:${NC}"
    echo -e "- 部署微服务: ./deploy-microservices.sh $ENVIRONMENT"
    echo -e "- 部署前端: ./deploy-frontend.sh $ENVIRONMENT"
    echo -e "- 或一键部署: ./deploy-all.sh $ENVIRONMENT"
}

# 主函数
main() {
    echo -e "${GREEN}"
    echo "========================================="
    echo "E-Maintenance 基础设施模块部署"
    echo "环境: $ENVIRONMENT"
    echo "========================================="
    echo -e "${NC}"
    
    # 显示配置
    log_info "部署配置:"
    log_info "- 环境: $ENVIRONMENT"
    log_info "- 监控服务: $(if [[ "$WITH_MONITORING" == "true" ]]; then echo "启用"; else echo "禁用"; fi)"
    log_info "- 日志聚合: $(if [[ "$WITH_LOGGING" == "true" ]]; then echo "启用"; else echo "禁用"; fi)"
    log_info "- 对象存储: $(if [[ "$WITH_STORAGE" == "true" ]]; then echo "启用"; else echo "禁用"; fi)"
    log_info "- Nginx副本: $NGINX_SCALE"
    
    # 执行部署
    check_docker
    prepare_environment
    deploy_infrastructure
    wait_for_services
    health_check
    show_deployment_info
    
    log_info "基础设施模块部署完成！"
}

# 信号处理
trap 'log_error "部署被中断"; exit 1' INT TERM

# 运行主函数
main "$@"