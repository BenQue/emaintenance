#!/bin/bash

# E-Maintenance 基础设施健康检查脚本
# 检查 PostgreSQL 和 Redis 服务状态

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "=========================================="
echo "  基础设施服务健康检查"
echo "=========================================="

# 切换到脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 加载环境变量
if [ -f .env ]; then
    source .env
fi

# 检查状态变量
POSTGRES_OK=false
REDIS_OK=false
OVERALL_STATUS=0

# 检查容器状态
log_info "检查容器运行状态..."

# PostgreSQL 容器检查
if docker ps --format "{{.Names}}\t{{.Status}}" | grep -q "emaintenance-postgres.*Up"; then
    log_success "PostgreSQL 容器运行正常"
    
    # 检查 PostgreSQL 连接
    log_info "测试 PostgreSQL 数据库连接..."
    
    if docker exec emaintenance-postgres pg_isready -U ${POSTGRES_USER:-postgres} > /dev/null 2>&1; then
        log_success "PostgreSQL 数据库连接正常"
        
        # 测试数据库查询
        if docker exec emaintenance-postgres psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-emaintenance} -c "SELECT version();" > /dev/null 2>&1; then
            log_success "PostgreSQL 数据库查询测试通过"
            POSTGRES_OK=true
        else
            log_error "PostgreSQL 数据库查询测试失败"
        fi
    else
        log_error "PostgreSQL 数据库连接失败"
    fi
else
    log_error "PostgreSQL 容器未运行或状态异常"
    echo "容器状态:"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep postgres || echo "  未找到 PostgreSQL 容器"
fi

echo ""

# Redis 容器检查
if docker ps --format "{{.Names}}\t{{.Status}}" | grep -q "emaintenance-redis.*Up"; then
    log_success "Redis 容器运行正常"
    
    # 检查 Redis 连接
    log_info "测试 Redis 缓存连接..."
    
    if docker exec emaintenance-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        log_success "Redis 缓存连接正常"
        
        # 测试 Redis 读写
        if docker exec emaintenance-redis redis-cli set healthcheck "$(date)" > /dev/null 2>&1 && \
           docker exec emaintenance-redis redis-cli get healthcheck > /dev/null 2>&1; then
            log_success "Redis 读写测试通过"
            REDIS_OK=true
        else
            log_error "Redis 读写测试失败"
        fi
    else
        log_error "Redis 缓存连接失败"
    fi
else
    log_error "Redis 容器未运行或状态异常"
    echo "容器状态:"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep redis || echo "  未找到 Redis 容器"
fi

echo ""

# 网络连通性检查
log_info "检查容器网络连通性..."

if docker network inspect emaintenance-network > /dev/null 2>&1; then
    log_success "Docker 网络 emaintenance-network 存在"
    
    # 检查容器是否在正确的网络中
    POSTGRES_IN_NETWORK=$(docker inspect emaintenance-postgres 2>/dev/null | jq -r '.[0].NetworkSettings.Networks | has("emaintenance-network")' 2>/dev/null || echo "false")
    REDIS_IN_NETWORK=$(docker inspect emaintenance-redis 2>/dev/null | jq -r '.[0].NetworkSettings.Networks | has("emaintenance-network")' 2>/dev/null || echo "false")
    
    if [ "$POSTGRES_IN_NETWORK" = "true" ]; then
        log_success "PostgreSQL 容器已加入网络"
    else
        log_warning "PostgreSQL 容器未加入 emaintenance-network"
    fi
    
    if [ "$REDIS_IN_NETWORK" = "true" ]; then
        log_success "Redis 容器已加入网络"
    else
        log_warning "Redis 容器未加入 emaintenance-network"
    fi
else
    log_error "Docker 网络 emaintenance-network 不存在"
fi

echo ""

# 端口检查
log_info "检查服务端口..."

# 检查 PostgreSQL 端口
POSTGRES_PORT_CHECK=$(netstat -ln 2>/dev/null | grep ":${POSTGRES_PORT:-5432}" || ss -ln 2>/dev/null | grep ":${POSTGRES_PORT:-5432}" || echo "")
if [ -n "$POSTGRES_PORT_CHECK" ]; then
    log_success "PostgreSQL 端口 ${POSTGRES_PORT:-5432} 已监听"
else
    log_warning "PostgreSQL 端口 ${POSTGRES_PORT:-5432} 未监听"
fi

# 检查 Redis 端口
REDIS_PORT_CHECK=$(netstat -ln 2>/dev/null | grep ":${REDIS_PORT:-6380}" || ss -ln 2>/dev/null | grep ":${REDIS_PORT:-6380}" || echo "")
if [ -n "$REDIS_PORT_CHECK" ]; then
    log_success "Redis 端口 ${REDIS_PORT:-6380} 已监听"
else
    log_warning "Redis 端口 ${REDIS_PORT:-6380} 未监听"
fi

echo ""

# 资源使用检查
log_info "检查系统资源使用..."

# 内存使用
TOTAL_MEM=$(free -m | awk '/^Mem:/ {print $2}')
USED_MEM=$(free -m | awk '/^Mem:/ {print $3}')
MEM_USAGE=$((USED_MEM * 100 / TOTAL_MEM))

if [ $MEM_USAGE -lt 80 ]; then
    log_success "内存使用正常: ${MEM_USAGE}%"
elif [ $MEM_USAGE -lt 90 ]; then
    log_warning "内存使用较高: ${MEM_USAGE}%"
else
    log_error "内存使用过高: ${MEM_USAGE}%"
fi

# 磁盘使用
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
    log_success "磁盘使用正常: ${DISK_USAGE}%"
elif [ $DISK_USAGE -lt 90 ]; then
    log_warning "磁盘使用较高: ${DISK_USAGE}%"
else
    log_error "磁盘使用过高: ${DISK_USAGE}%"
fi

# Docker 资源使用
log_info "Docker 容器资源使用:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" emaintenance-postgres emaintenance-redis 2>/dev/null || true

echo ""

# 最终状态总结
echo "=========================================="
if [ "$POSTGRES_OK" = true ] && [ "$REDIS_OK" = true ]; then
    log_success "基础设施服务健康检查通过！"
    echo ""
    log_info "服务访问信息:"
    echo "  PostgreSQL: localhost:${POSTGRES_PORT:-5432}"
    echo "  Redis: localhost:${REDIS_PORT:-6380}"
    echo ""
    log_info "下一步:"
    echo "  cd ../database && ./init.sh"
    OVERALL_STATUS=0
else
    log_error "基础设施服务健康检查失败！"
    echo ""
    log_info "问题排查:"
    echo "  查看容器日志: docker-compose logs [postgres|redis]"
    echo "  重启服务: docker-compose restart [postgres|redis]"
    echo "  完全重新部署: docker-compose down && ./deploy.sh"
    OVERALL_STATUS=1
fi

echo "=========================================="

exit $OVERALL_STATUS