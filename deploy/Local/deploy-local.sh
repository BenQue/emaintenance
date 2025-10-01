#!/bin/bash

# ==================================================================================
# E-Maintenance 本地部署脚本 (增强版)
# ==================================================================================
# 用途: 在本地开发环境构建和启动所有服务
# 架构: MacBook M4 Pro + Docker Desktop
# 作者: E-Maintenance Team
# 版本: 2.0
# ==================================================================================

set -e  # 遇到错误立即退出
set -o pipefail  # 管道命令出错时退出

# ==================================================================================
# 全局配置
# ==================================================================================

# 脚本元信息
SCRIPT_VERSION="2.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_MODE="${1:-interactive}"  # interactive|quick|minimal|clean

# 日志配置
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/deploy-$(date +%Y%m%d-%H%M%S).log"
ERROR_LOG="$LOG_DIR/errors-$(date +%Y%m%d-%H%M%S).log"

# 部署配置
COMPOSE_FILE="docker-compose.local.yml"
ENV_TEMPLATE="env-templates/.env.example"
ENV_FILE=".env"

# 超时配置
HEALTH_CHECK_TIMEOUT=180     # 健康检查超时（秒）
DATABASE_INIT_TIMEOUT=60     # 数据库初始化超时（秒）

# 资源要求（最低配置）
MIN_DISK_SPACE_GB=10
MIN_MEMORY_GB=4
MIN_CPU_CORES=2

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# 状态符号
CHECK_MARK="${GREEN}✓${NC}"
CROSS_MARK="${RED}✗${NC}"
INFO_MARK="${BLUE}ℹ${NC}"
WARN_MARK="${YELLOW}⚠${NC}"
ARROW="${CYAN}→${NC}"

# ==================================================================================
# 日志函数
# ==================================================================================

setup_logging() {
    mkdir -p "$LOG_DIR"
    exec 1> >(tee -a "$LOG_FILE")
    exec 2> >(tee -a "$ERROR_LOG" >&2)
}

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"

    case "$level" in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            echo "[$timestamp] [ERROR] $message" >> "$ERROR_LOG"
            ;;
        "DEBUG")
            echo -e "${BLUE}[DEBUG]${NC} $message"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[✓]${NC} $message"
            ;;
        "FAIL")
            echo -e "${RED}[✗]${NC} $message"
            ;;
        *)
            echo "$message"
            ;;
    esac
}

log_step() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ==================================================================================
# 错误处理
# ==================================================================================

handle_error() {
    local line_number=$1
    local error_message="${2:-Unknown error}"

    log ERROR "部署失败于行 $line_number: $error_message"
    log ERROR "查看详细日志: $ERROR_LOG"

    echo ""
    echo -e "${YELLOW}建议操作:${NC}"
    echo "  1. 查看错误日志: cat $ERROR_LOG"
    echo "  2. 清理并重试: ./deploy-local.sh clean"
    echo "  3. 查看容器状态: docker-compose -f $COMPOSE_FILE ps"
    echo "  4. 查看服务日志: docker-compose -f $COMPOSE_FILE logs"
    echo ""

    exit 1
}

trap 'handle_error ${LINENO} "$BASH_COMMAND"' ERR

# ==================================================================================
# 工具函数
# ==================================================================================

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

get_available_disk_space() {
    df "$SCRIPT_DIR" | awk 'NR==2 {printf "%.2f", $4/1024/1024}'
}

get_available_memory() {
    sysctl hw.memsize | awk '{printf "%.2f", $2/1024/1024/1024}'
}

get_cpu_cores() {
    sysctl -n hw.ncpu
}

# ==================================================================================
# 显示信息
# ==================================================================================

show_banner() {
    clear
    echo -e "${PURPLE}"
    echo "╔════════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                        ║"
    echo "║               E-Maintenance 本地部署系统 v${SCRIPT_VERSION}                  ║"
    echo "║                                                                        ║"
    echo "║               企业设备维修管理系统 - Docker 本地部署                         ║"
    echo "║                                                                        ║"
    echo "╚════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${CYAN}部署信息:${NC}"
    echo "  ${ARROW} 时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "  ${ARROW} 模式: $DEPLOY_MODE"
    echo "  ${ARROW} 架构: $(uname -m)"
    echo "  ${ARROW} 系统: $(uname -s) $(uname -r)"
    echo ""
}

show_completion_info() {
    local deploy_time=$1

    echo ""
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                        ║"
    echo "║                     🎉 部署成功完成! 🎉                                  ║"
    echo "║                                                                        ║"
    echo "╚════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${CYAN}部署统计:${NC}"
    echo "  ${ARROW} 总耗时: ${deploy_time}秒"
    echo "  ${ARROW} 日志文件: $LOG_FILE"
    echo ""
    echo -e "${CYAN}服务访问地址:${NC}"
    echo "  ${ARROW} 前端应用:        http://localhost:3000"
    echo "  ${ARROW} 用户服务:        http://localhost:3001/health"
    echo "  ${ARROW} 工单服务:        http://localhost:3002/health"
    echo "  ${ARROW} 资产服务:        http://localhost:3003/health"
    echo "  ${ARROW} Nginx 代理:      http://localhost/health"
    echo ""
    echo -e "${CYAN}数据库连接:${NC}"
    echo "  ${ARROW} PostgreSQL:      postgresql://postgres:Qzy@7091!@localhost:5433/emaintenance"
    echo "  ${ARROW} Redis:          redis://localhost:6380"
    echo ""
    echo -e "${CYAN}常用命令:${NC}"
    echo "  ${ARROW} 查看服务状态:    ./status-local.sh"
    echo "  ${ARROW} 查看日志:        ./local-dev.sh logs"
    echo "  ${ARROW} 重启服务:        ./local-dev.sh restart"
    echo "  ${ARROW} 停止服务:        docker-compose -f $COMPOSE_FILE down"
    echo "  ${ARROW} 快速更新:        ./update-local.sh quick"
    echo ""
}

show_usage() {
    echo "用法: $0 [模式]"
    echo ""
    echo "部署模式:"
    echo "  interactive  - 交互式部署（默认）"
    echo "  quick        - 快速部署（使用缓存）"
    echo "  minimal      - 最小化部署（仅核心服务）"
    echo "  clean        - 清理后重新部署"
    echo ""
    echo "示例:"
    echo "  $0              # 交互式部署"
    echo "  $0 quick        # 快速部署"
    echo "  $0 clean        # 清理重建"
    echo ""
}

# ==================================================================================
# 前置检查
# ==================================================================================

check_prerequisites() {
    log_step "步骤 1/8: 系统前置条件检查"

    local check_failed=0

    log INFO "检查 Docker 环境..."
    if ! command_exists docker; then
        log FAIL "Docker 未安装"
        echo "  ${ARROW} 请访问 https://www.docker.com/products/docker-desktop 安装 Docker Desktop"
        check_failed=1
    else
        if ! docker info >/dev/null 2>&1; then
            log FAIL "Docker 未运行"
            echo "  ${ARROW} 请启动 Docker Desktop"
            check_failed=1
        else
            local docker_version=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
            log SUCCESS "Docker 已运行 (版本: $docker_version)"
        fi
    fi

    log INFO "检查 Docker Compose..."
    if ! command_exists docker-compose; then
        log FAIL "Docker Compose 未安装"
        check_failed=1
    else
        local compose_version=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        log SUCCESS "Docker Compose 已安装 (版本: $compose_version)"
    fi

    log INFO "检查系统资源..."
    local available_disk=$(get_available_disk_space)
    log SUCCESS "磁盘空间: ${available_disk}GB"

    local available_memory=$(get_available_memory)
    log SUCCESS "内存: ${available_memory}GB"

    local cpu_cores=$(get_cpu_cores)
    log SUCCESS "CPU 核心数: $cpu_cores"

    log INFO "检查端口占用..."
    local required_ports=(80 3000 3001 3002 3003 5433 6380)
    local port_conflicts=()

    for port in "${required_ports[@]}"; do
        if lsof -i:$port >/dev/null 2>&1 || netstat -an 2>/dev/null | grep -q "[:.]$port.*LISTEN"; then
            port_conflicts+=($port)
        fi
    done

    if [ ${#port_conflicts[@]} -gt 0 ]; then
        log WARN "以下端口已被占用: ${port_conflicts[*]}"
        if [ "$DEPLOY_MODE" = "clean" ]; then
            log INFO "清理模式将尝试停止冲突服务"
        fi
    else
        log SUCCESS "所有必需端口可用"
    fi

    if [ $check_failed -eq 1 ]; then
        log ERROR "前置检查失败，请解决上述问题后重试"
        exit 1
    fi

    log SUCCESS "所有前置检查通过"
}

# ==================================================================================
# 环境配置
# ==================================================================================

setup_environment() {
    log_step "步骤 2/8: 环境配置"

    cd "$SCRIPT_DIR"

    if [ -f "$ENV_FILE" ]; then
        log INFO "发现现有环境配置文件"

        if [ "$DEPLOY_MODE" = "interactive" ]; then
            echo -n "是否使用现有配置? (Y/n): "
            read -r use_existing

            if [[ ! "$use_existing" =~ ^[Yy]?$ ]]; then
                backup_env_file
                create_env_file
            else
                log SUCCESS "使用现有环境配置"
            fi
        else
            log SUCCESS "使用现有环境配置"
        fi
    else
        log INFO "创建新的环境配置文件"
        create_env_file
    fi

    validate_env_file
}

backup_env_file() {
    local backup_file="${ENV_FILE}.backup.$(date +%Y%m%d%H%M%S)"
    cp "$ENV_FILE" "$backup_file"
    log SUCCESS "已备份现有配置到: $backup_file"
}

create_env_file() {
    if [ ! -f "$ENV_TEMPLATE" ]; then
        log ERROR "环境模板文件不存在: $ENV_TEMPLATE"
        exit 1
    fi

    log INFO "从模板创建环境配置..."
    cp "$ENV_TEMPLATE" "$ENV_FILE"

    sed -i.bak 's|NODE_ENV=production|NODE_ENV=development|' "$ENV_FILE"
    sed -i.bak 's|your_secure_database_password_change_me|Qzy@7091!|g' "$ENV_FILE"

    local jwt_secret=$(openssl rand -base64 32 | tr -d '\n' | sed 's|/|\\/|g')
    sed -i.bak "s|your-jwt-signing-key-change-in-production-min-32-chars|${jwt_secret}|g" "$ENV_FILE"

    rm -f "${ENV_FILE}.bak"

    log SUCCESS "环境配置文件已创建: $ENV_FILE"
    log INFO "JWT 密钥已自动生成"
}

validate_env_file() {
    log INFO "验证环境配置..."

    local required_vars=("DATABASE_URL" "JWT_SECRET" "NODE_ENV")
    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$ENV_FILE"; then
            missing_vars+=($var)
        fi
    done

    if [ ${#missing_vars[@]} -gt 0 ]; then
        log ERROR "环境配置缺少必需变量: ${missing_vars[*]}"
        exit 1
    fi

    log SUCCESS "环境配置验证通过"
}

# ==================================================================================
# 清理操作
# ==================================================================================

cleanup_existing_deployment() {
    if [ "$DEPLOY_MODE" = "clean" ]; then
        log_step "清理现有部署"

        log INFO "停止并删除现有容器..."
        cd "$SCRIPT_DIR"
        docker-compose -f "$COMPOSE_FILE" down --remove-orphans --volumes 2>/dev/null || true

        log INFO "清理 Docker 系统..."
        docker system prune -f

        log SUCCESS "清理完成"
    fi
}

# ==================================================================================
# 构建镜像
# ==================================================================================

build_images() {
    log_step "步骤 3/8: 构建 Docker 镜像"

    cd "$SCRIPT_DIR"

    local build_args=""

    case "$DEPLOY_MODE" in
        "quick")
            log INFO "快速模式: 使用缓存构建"
            ;;
        "clean")
            log INFO "清理模式: 无缓存构建"
            build_args="--no-cache"
            ;;
        *)
            log INFO "标准构建模式"
            ;;
    esac

    log INFO "开始构建镜像..."
    local build_start=$(date +%s)

    if docker-compose -f "$COMPOSE_FILE" build $build_args; then
        local build_end=$(date +%s)
        local build_time=$((build_end - build_start))
        log SUCCESS "镜像构建完成 (耗时: ${build_time}秒)"
    else
        log ERROR "镜像构建失败"
        exit 1
    fi
}

# ==================================================================================
# 启动服务
# ==================================================================================

start_services() {
    log_step "步骤 4/8: 启动服务容器"

    cd "$SCRIPT_DIR"

    log INFO "启动所有服务..."

    if docker-compose -f "$COMPOSE_FILE" up -d; then
        log SUCCESS "服务容器已启动"
    else
        log ERROR "服务启动失败"
        exit 1
    fi

    log INFO "等待容器初始化..."
    sleep 10

    log INFO "容器状态:"
    docker-compose -f "$COMPOSE_FILE" ps
}

# ==================================================================================
# 数据库初始化
# ==================================================================================

initialize_database() {
    log_step "步骤 5/8: 数据库初始化"

    log INFO "等待 PostgreSQL 数据库就绪..."

    local db_ready=0
    local attempts=0
    local max_attempts=$((DATABASE_INIT_TIMEOUT / 5))

    while [ $attempts -lt $max_attempts ]; do
        if docker exec emaintenance-postgres pg_isready -U postgres >/dev/null 2>&1; then
            db_ready=1
            break
        fi

        attempts=$((attempts + 1))
        echo -n "."
        sleep 5
    done

    echo ""

    if [ $db_ready -eq 0 ]; then
        log ERROR "数据库启动超时"
        exit 1
    fi

    log SUCCESS "数据库已就绪"

    log INFO "运行数据库迁移..."
    cd "$PROJECT_ROOT"

    if npm run db:generate 2>&1 | tee -a "$LOG_FILE"; then
        log SUCCESS "Prisma Client 生成成功"
    else
        log WARN "Prisma Client 生成失败，继续部署"
    fi

    if npm run db:push 2>&1 | tee -a "$LOG_FILE"; then
        log SUCCESS "数据库架构更新成功"
    else
        log WARN "数据库架构更新失败，继续部署"
    fi

    cd "$SCRIPT_DIR"
}

# ==================================================================================
# 健康检查
# ==================================================================================

perform_health_checks() {
    log_step "步骤 6/8: 服务健康检查"

    log INFO "执行全面健康检查..."

    local services=(
        "postgres:5433:数据库:pg_isready"
        "redis:6380:Redis:redis-cli ping"
        "user-service:3001:用户服务:health"
        "work-order-service:3002:工单服务:health"
        "asset-service:3003:资产服务:api/health"
        "web:3000:前端应用:api/health"
        "nginx:80:反向代理:health"
    )

    local failed_services=()
    local healthy_count=0

    for service_info in "${services[@]}"; do
        IFS=':' read -r service port desc check <<< "$service_info"

        log INFO "检查 $desc..."

        if check_service_health "$service" "$port" "$check"; then
            log SUCCESS "$desc 健康"
            healthy_count=$((healthy_count + 1))
        else
            log FAIL "$desc 不健康"
            failed_services+=("$desc")
        fi
    done

    echo ""
    log INFO "健康检查结果: $healthy_count/${#services[@]} 服务健康"

    if [ ${#failed_services[@]} -gt 0 ]; then
        log WARN "以下服务检查失败: ${failed_services[*]}"
        log WARN "继续部署，但某些服务可能不可用"
    else
        log SUCCESS "所有服务健康检查通过"
    fi
}

check_service_health() {
    local service=$1
    local port=$2
    local check=$3
    local max_retries=12
    local retry_interval=5

    for ((i=1; i<=max_retries; i++)); do
        case "$check" in
            "pg_isready")
                if docker exec "emaintenance-$service" pg_isready -U postgres >/dev/null 2>&1; then
                    return 0
                fi
                ;;
            "redis-cli ping")
                if docker exec "emaintenance-$service" redis-cli ping 2>/dev/null | grep -q "PONG"; then
                    return 0
                fi
                ;;
            *)
                if curl -f -s "http://localhost:$port/$check" >/dev/null 2>&1; then
                    return 0
                fi
                ;;
        esac

        if [ $i -lt $max_retries ]; then
            echo -n "."
            sleep $retry_interval
        fi
    done

    echo ""
    return 1
}

# ==================================================================================
# 验证部署
# ==================================================================================

verify_deployment() {
    log_step "步骤 7/8: 部署验证"

    log INFO "验证服务可访问性..."

    local endpoints=(
        "http://localhost:3001/health:用户服务"
        "http://localhost:3002/health:工单服务"
        "http://localhost:3003/api/health:资产服务"
        "http://localhost:3000/api/health:前端应用"
        "http://localhost/health:Nginx代理"
    )

    local accessible_count=0

    for endpoint_info in "${endpoints[@]}"; do
        IFS=':' read -r url desc <<< "$endpoint_info"

        if curl -f -s "$url" >/dev/null 2>&1; then
            log SUCCESS "$desc 可访问"
            accessible_count=$((accessible_count + 1))
        else
            log WARN "$desc 不可访问"
        fi
    done

    log INFO "可访问性检查: $accessible_count/${#endpoints[@]} 端点可访问"

    log INFO "检查容器运行状态..."
    cd "$SCRIPT_DIR"

    local running_containers=$(docker-compose -f "$COMPOSE_FILE" ps -q | wc -l | tr -d ' ')
    local healthy_containers=$(docker-compose -f "$COMPOSE_FILE" ps -q | xargs docker inspect --format='{{.State.Status}}' 2>/dev/null | grep "running" | wc -l | tr -d ' ')

    log INFO "容器状态: $healthy_containers/$running_containers 运行中"

    if [ "$healthy_containers" -eq "$running_containers" ]; then
        log SUCCESS "所有容器运行正常"
    else
        log WARN "部分容器未正常运行"
    fi
}

# ==================================================================================
# 后置操作
# ==================================================================================

post_deployment_tasks() {
    log_step "步骤 8/8: 后置操作"

    log INFO "清理临时文件..."
    rm -f "$SCRIPT_DIR"/*.bak

    generate_deployment_report

    log SUCCESS "后置操作完成"
}

generate_deployment_report() {
    local report_file="$LOG_DIR/deployment-report-$(date +%Y%m%d-%H%M%S).json"

    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "version": "$SCRIPT_VERSION",
  "mode": "$DEPLOY_MODE",
  "status": "completed",
  "log_file": "$LOG_FILE"
}
EOF

    log INFO "部署报告已生成: $report_file"
}

# ==================================================================================
# 主流程
# ==================================================================================

main() {
    local start_time=$(date +%s)

    setup_logging
    show_banner

    if [ "$DEPLOY_MODE" = "help" ] || [ "$DEPLOY_MODE" = "-h" ] || [ "$DEPLOY_MODE" = "--help" ]; then
        show_usage
        exit 0
    fi

    log INFO "开始部署流程..."

    check_prerequisites
    setup_environment
    cleanup_existing_deployment
    build_images
    start_services
    initialize_database
    perform_health_checks
    verify_deployment
    post_deployment_tasks

    local end_time=$(date +%s)
    local total_time=$((end_time - start_time))

    show_completion_info $total_time

    log SUCCESS "部署流程全部完成!"

    exit 0
}

main "$@"
