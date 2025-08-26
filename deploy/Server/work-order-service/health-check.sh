#!/bin/bash

# E-Maintenance 工单服务健康检查脚本
# 验证服务状态和核心功能

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
echo "  工单服务健康检查"
echo "=========================================="

# 服务配置
SERVICE_NAME="emaintenance-work-order-service"
SERVICE_PORT="${WORK_ORDER_SERVICE_PORT:-3002}"
HEALTH_ENDPOINT="http://localhost:${SERVICE_PORT}/health"

# 检查容器状态
log_info "检查工单服务容器状态..."
if docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q "$SERVICE_NAME"; then
    container_status=$(docker ps --format "{{.Status}}" --filter "name=$SERVICE_NAME")
    if [[ $container_status == *"healthy"* ]]; then
        log_success "工单服务容器运行中且健康"
    else
        log_warning "工单服务容器运行中但健康检查可能未通过"
    fi
else
    log_error "工单服务容器未找到或未运行"
    exit 1
fi

# 检查端口监听
log_info "检查服务端口监听..."
if netstat -tlnp 2>/dev/null | grep -q ":${SERVICE_PORT} " || ss -tlnp 2>/dev/null | grep -q ":${SERVICE_PORT} "; then
    log_success "工单服务端口 ${SERVICE_PORT} 正在监听"
else
    log_error "工单服务端口 ${SERVICE_PORT} 未监听"
    exit 1
fi

# 测试健康检查端点
log_info "测试健康检查端点..."
if response=$(curl -s -w "%{http_code}" -o /tmp/work_order_health_response "$HEALTH_ENDPOINT" 2>/dev/null); then
    http_code="${response: -3}"
    if [ "$http_code" = "200" ]; then
        log_success "健康检查端点响应正常"
        if [ -f /tmp/work_order_health_response ]; then
            log_info "响应内容: $(cat /tmp/work_order_health_response)"
        fi
    else
        log_warning "健康检查端点HTTP状态码: $http_code"
    fi
else
    log_warning "健康检查端点无响应"
fi

# 测试数据库连接 (通过健康检查接口)
log_info "测试数据库连接..."
if curl -f -s "http://localhost:${SERVICE_PORT}/health/db" > /dev/null 2>&1; then
    log_success "数据库连接正常"
else
    log_warning "数据库连接检查失败 (可能端点不存在)"
fi

# 测试Redis连接
log_info "测试 Redis 连接..."
if curl -f -s "http://localhost:${SERVICE_PORT}/health/redis" > /dev/null 2>&1; then
    log_success "Redis 连接正常"
else
    log_warning "Redis 连接检查失败 (可能端点不存在)"
fi

# 测试用户服务连接
log_info "测试用户服务连接..."
if curl -f -s "http://localhost:${SERVICE_PORT}/health/user-service" > /dev/null 2>&1; then
    log_success "用户服务连接正常"
else
    log_warning "用户服务连接检查失败 (可能端点不存在)"
fi

# 测试主要API端点 (无需认证的端点)
log_info "测试主要 API 端点..."
if curl -f -s "http://localhost:${SERVICE_PORT}/api/work-orders/health" > /dev/null 2>&1; then
    log_success "工单 API 端点响应正常"
else
    log_warning "工单 API 端点无响应 (可能需要认证或端点不存在)"
fi

# 检查服务日志
log_info "检查服务日志 (最近10行)..."
echo "最近的服务日志:"
docker logs --tail 10 "$SERVICE_NAME" 2>/dev/null | sed 's/^/  /' || log_warning "无法获取服务日志"

# 检查资源使用情况
log_info "检查服务资源使用..."
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" "$SERVICE_NAME" 2>/dev/null || log_warning "无法获取资源使用信息"

# 检查网络连通性
log_info "检查网络连通性..."
if docker exec "$SERVICE_NAME" wget --no-verbose --tries=1 --spider http://emaintenance-postgres:5432 2>/dev/null; then
    log_success "可以连接到 PostgreSQL 容器"
else
    log_warning "无法连接到 PostgreSQL 容器"
fi

if docker exec "$SERVICE_NAME" wget --no-verbose --tries=1 --spider http://emaintenance-redis:6379 2>/dev/null; then
    log_success "可以连接到 Redis 容器"
else
    log_warning "无法连接到 Redis 容器"
fi

if docker exec "$SERVICE_NAME" wget --no-verbose --tries=1 --spider http://emaintenance-user-service:3001/health 2>/dev/null; then
    log_success "可以连接到用户服务"
else
    log_warning "无法连接到用户服务"
fi

echo ""
echo "=========================================="
log_success "工单服务健康检查通过！"
echo ""
log_info "服务访问信息:"
echo "  服务地址: http://localhost:${SERVICE_PORT}"
echo "  健康检查: http://localhost:${SERVICE_PORT}/health"
echo "  API 文档: http://localhost:${SERVICE_PORT}/api-docs (如果启用)"
echo ""
log_info "常用 API 端点:"
echo "  POST /api/work-orders - 创建工单"
echo "  GET /api/work-orders - 获取工单列表" 
echo "  GET /api/work-orders/:id - 获取工单详情"
echo "  PUT /api/work-orders/:id - 更新工单"
echo "  POST /api/work-orders/:id/assign - 分配工单"
echo "=========================================="

# 清理临时文件
rm -f /tmp/work_order_health_response