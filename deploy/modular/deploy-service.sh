#!/bin/bash

# E-Maintenance 单个服务部署脚本
# 支持独立部署和更新单个微服务或前端服务

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
E-Maintenance 单个服务部署脚本

用法: $0 <服务名称> [环境] [选项]

服务名称:
    user-service            用户服务
    work-order-service      工单服务
    asset-service          资产服务
    web                    Web前端应用
    nginx                  Nginx网关
    postgres               PostgreSQL数据库
    redis                  Redis缓存

环境:
    dev         开发环境 (默认)
    test        测试环境
    prod        生产环境

选项:
    --scale N              扩展到N个实例
    --force-recreate       强制重新创建容器
    --build                重新构建镜像
    --no-deps             不启动依赖服务
    --wait                等待服务就绪
    --rollback            回滚到上一个版本
    --health-check        部署后健康检查
    --show-logs           显示服务日志

示例:
    $0 user-service dev --build                # 重新构建并部署用户服务
    $0 work-order-service prod --scale 3       # 生产环境扩展工单服务到3个实例
    $0 web test --force-recreate               # 测试环境强制重建Web应用
    $0 nginx --rollback                       # 回滚Nginx到上一版本

EOF
    exit 1
}

# 服务定义
declare -A SERVICE_CONFIGS
SERVICE_CONFIGS[user-service]="microservices:emaintenance-user-service-1:3001:/health"
SERVICE_CONFIGS[work-order-service]="microservices:emaintenance-work-order-service-1:3002:/health"
SERVICE_CONFIGS[asset-service]="microservices:emaintenance-asset-service-1:3003:/api/health"
SERVICE_CONFIGS[web]="frontend:emaintenance-web-1:3000:/api/health"
SERVICE_CONFIGS[nginx]="infrastructure:emaintenance-nginx:80:/health"
SERVICE_CONFIGS[postgres]="infrastructure:emaintenance-postgres:5432:"
SERVICE_CONFIGS[redis]="infrastructure:emaintenance-redis:6379:"

# 参数解析
if [[ $# -lt 1 ]]; then
    usage
fi

SERVICE_NAME=$1
ENVIRONMENT=${2:-dev}
SCALE=1
FORCE_RECREATE=false
BUILD=false
NO_DEPS=false
WAIT=true
ROLLBACK=false
HEALTH_CHECK=true
SHOW_LOGS=false

shift 2 2>/dev/null || shift 1
while [[ $# -gt 0 ]]; do
    case $1 in
        --scale)
            SCALE="$2"
            shift 2
            ;;
        --force-recreate)
            FORCE_RECREATE=true
            shift
            ;;
        --build)
            BUILD=true
            shift
            ;;
        --no-deps)
            NO_DEPS=true
            shift
            ;;
        --wait)
            WAIT=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --health-check)
            HEALTH_CHECK=true
            shift
            ;;
        --show-logs)
            SHOW_LOGS=true
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

# 验证服务名称
if [[ ! ${SERVICE_CONFIGS[$SERVICE_NAME]+_} ]]; then
    log_error "不支持的服务名称: $SERVICE_NAME"
    log_info "支持的服务: ${!SERVICE_CONFIGS[*]}"
    exit 1
fi

# 解析服务配置
IFS=':' read -r MODULE CONTAINER_NAME PORT HEALTH_PATH <<< "${SERVICE_CONFIGS[$SERVICE_NAME]}"

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
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.${MODULE}.yml"
if [[ ! -f "$COMPOSE_FILE" ]]; then
    log_error "Docker Compose文件不存在: $COMPOSE_FILE"
    exit 1
fi

# 执行命令
execute_command() {
    local cmd="$1"
    local description="$2"
    
    log_info "$description"
    
    if eval "$cmd"; then
        log_info "✓ $description 完成"
        return 0
    else
        log_error "✗ $description 失败"
        return 1
    fi
}

# 检查服务健康状态
check_service_health() {
    local container_name="$1"
    local port="$2" 
    local health_path="$3"
    local max_attempts=20
    local attempt=1
    
    if [[ -z "$health_path" ]]; then
        # 对于数据库服务，使用Docker健康检查
        while [[ $attempt -le $max_attempts ]]; do
            if docker inspect "$container_name" | jq -r '.[0].State.Health.Status' | grep -q "healthy"; then
                log_info "✓ $container_name 健康"
                return 0
            fi
            
            log_debug "等待 $container_name 健康检查通过... ($attempt/$max_attempts)"
            sleep 5
            ((attempt++))
        done
    else
        # 对于Web服务，使用HTTP健康检查
        while [[ $attempt -le $max_attempts ]]; do
            if curl -f "http://localhost:$port$health_path" &>/dev/null; then
                log_info "✓ $container_name 健康"
                return 0
            fi
            
            log_debug "等待 $container_name HTTP健康检查通过... ($attempt/$max_attempts)"
            sleep 5
            ((attempt++))
        done
    fi
    
    log_error "✗ $container_name 健康检查超时"
    return 1
}

# 构建镜像
build_image() {
    if [[ "$BUILD" != "true" ]]; then
        return 0
    fi
    
    log_info "构建 $SERVICE_NAME 镜像..."
    
    local build_args="--build-arg NODE_ENV=${NODE_ENV:-production}"
    if [[ "$FORCE_RECREATE" == "true" ]]; then
        build_args="$build_args --no-cache"
    fi
    
    execute_command \
        "docker-compose -f $COMPOSE_FILE build $build_args $SERVICE_NAME-1" \
        "构建 $SERVICE_NAME 镜像"
}

# 部署服务
deploy_service() {
    log_info "部署 $SERVICE_NAME 服务..."
    
    local compose_args="--env-file $ENV_FILE"
    
    if [[ "$FORCE_RECREATE" == "true" ]]; then
        compose_args="$compose_args --force-recreate"
    fi
    
    if [[ "$NO_DEPS" == "true" ]]; then
        compose_args="$compose_args --no-deps"
    fi
    
    # 停止现有服务
    execute_command \
        "docker-compose -f $COMPOSE_FILE stop ${SERVICE_NAME}-1" \
        "停止 $SERVICE_NAME 现有实例"
    
    # 启动服务
    execute_command \
        "docker-compose -f $COMPOSE_FILE $compose_args up -d ${SERVICE_NAME}-1" \
        "启动 $SERVICE_NAME 服务"
    
    # 扩展服务
    if [[ "$SCALE" -gt 1 ]]; then
        execute_command \
            "docker-compose -f $COMPOSE_FILE scale ${SERVICE_NAME}=$SCALE" \
            "扩展 $SERVICE_NAME 到 $SCALE 个实例"
    fi
}

# 等待服务就绪
wait_for_service() {
    if [[ "$WAIT" != "true" ]]; then
        return 0
    fi
    
    log_info "等待 $SERVICE_NAME 服务就绪..."
    
    # 如果是扩展部署，检查所有实例
    local instances_to_check=1
    if [[ "$SCALE" -gt 1 ]]; then
        instances_to_check=$SCALE
    fi
    
    for ((i=1; i<=instances_to_check; i++)); do
        local instance_name="${SERVICE_NAME}-$i"
        local instance_container="emaintenance-${instance_name}"
        
        # 根据服务类型调整端口
        local instance_port="$PORT"
        if [[ "$SCALE" -gt 1 && "$SERVICE_NAME" == "web" ]]; then
            # Web服务多实例端口递增
            instance_port=$((PORT + i - 1))
        fi
        
        check_service_health "$instance_container" "$instance_port" "$HEALTH_PATH"
    done
}

# 执行健康检查
health_check() {
    if [[ "$HEALTH_CHECK" != "true" ]]; then
        return 0
    fi
    
    log_info "执行 $SERVICE_NAME 健康检查..."
    
    # 显示服务状态
    docker-compose -f "$COMPOSE_FILE" ps "$SERVICE_NAME*"
    
    # 显示资源使用情况
    log_info "资源使用情况:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
        $(docker-compose -f "$COMPOSE_FILE" ps -q "$SERVICE_NAME*")
}

# 显示服务日志
show_logs() {
    if [[ "$SHOW_LOGS" != "true" ]]; then
        return 0
    fi
    
    log_info "显示 $SERVICE_NAME 最新日志:"
    docker-compose -f "$COMPOSE_FILE" logs --tail=50 "$SERVICE_NAME*"
}

# 回滚服务
rollback_service() {
    if [[ "$ROLLBACK" != "true" ]]; then
        return 0
    fi
    
    log_warn "回滚 $SERVICE_NAME 服务..."
    
    # 这里可以实现更复杂的回滚逻辑
    # 例如：从备份镜像恢复、从备份配置恢复等
    
    log_warn "回滚功能尚未完全实现"
    log_info "建议手动操作："
    log_info "1. 检查镜像历史: docker images | grep $SERVICE_NAME"
    log_info "2. 停止当前服务: docker-compose -f $COMPOSE_FILE stop $SERVICE_NAME*"
    log_info "3. 修改镜像标签并重启"
    
    return 1
}

# 显示部署信息
show_deployment_info() {
    local host_ip
    host_ip=$(hostname -I | awk '{print $1}' 2>/dev/null || ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
    
    echo -e "\n${GREEN}========================================="
    echo -e "$SERVICE_NAME 服务部署完成！"
    echo -e "=========================================${NC}"
    
    echo -e "\n${BLUE}服务信息:${NC}"
    echo -e "- 服务名称: $SERVICE_NAME"
    echo -e "- 环境: $ENVIRONMENT"
    echo -e "- 实例数量: $SCALE"
    echo -e "- 容器名称: $CONTAINER_NAME"
    
    if [[ -n "$HEALTH_PATH" ]]; then
        echo -e "\n${BLUE}访问地址:${NC}"
        if [[ "$SCALE" -eq 1 ]]; then
            echo -e "- 本地访问: http://localhost:$PORT$HEALTH_PATH"
            echo -e "- 局域网访问: http://$host_ip:$PORT$HEALTH_PATH"
        else
            for ((i=1; i<=SCALE; i++)); do
                local instance_port=$((PORT + i - 1))
                echo -e "- 实例$i: http://localhost:$instance_port$HEALTH_PATH"
            done
        fi
    fi
    
    echo -e "\n${YELLOW}常用命令:${NC}"
    echo -e "- 查看日志: docker-compose -f $COMPOSE_FILE logs -f $SERVICE_NAME*"
    echo -e "- 重启服务: docker-compose -f $COMPOSE_FILE restart $SERVICE_NAME*"
    echo -e "- 停止服务: docker-compose -f $COMPOSE_FILE stop $SERVICE_NAME*"
    echo -e "- 扩展服务: $0 $SERVICE_NAME $ENVIRONMENT --scale N"
    echo -e "- 更新服务: $0 $SERVICE_NAME $ENVIRONMENT --build --force-recreate"
}

# 主函数
main() {
    echo -e "${GREEN}"
    echo "========================================="
    echo "E-Maintenance 单个服务部署"
    echo "服务: $SERVICE_NAME"
    echo "环境: $ENVIRONMENT"
    echo "========================================="
    echo -e "${NC}"
    
    # 显示配置
    log_info "部署配置:"
    log_info "- 服务: $SERVICE_NAME ($MODULE 模块)"
    log_info "- 环境: $ENVIRONMENT"
    log_info "- 实例数量: $SCALE"
    log_info "- 强制重建: $(if [[ "$FORCE_RECREATE" == "true" ]]; then echo "是"; else echo "否"; fi)"
    log_info "- 重新构建: $(if [[ "$BUILD" == "true" ]]; then echo "是"; else echo "否"; fi)"
    
    if [[ "$ROLLBACK" == "true" ]]; then
        rollback_service
        exit $?
    fi
    
    # 执行部署
    local start_time
    start_time=$(date +%s)
    
    build_image
    deploy_service
    wait_for_service
    health_check
    show_logs
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    show_deployment_info
    
    log_info "$SERVICE_NAME 服务部署完成，用时: ${duration}秒"
}

# 信号处理
trap 'log_error "部署被中断"; exit 1' INT TERM

# 运行主函数
main "$@"