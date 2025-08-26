#!/bin/bash

# E-Maintenance 资产服务健康检查脚本

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
echo "  资产服务健康检查"
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 加载环境变量
if [ -f ../infrastructure/.env ]; then
    source ../infrastructure/.env
fi

ASSET_SERVICE_PORT="${ASSET_SERVICE_PORT:-3003}"
HEALTH_STATUS=0

# 1. 检查容器状态
log_info "检查资产服务容器状态..."
if docker ps --format "{{.Names}}\t{{.Status}}" | grep -q "emaintenance-asset-service.*Up.*healthy"; then
    log_success "资产服务容器运行正常且健康"
elif docker ps --format "{{.Names}}\t{{.Status}}" | grep -q "emaintenance-asset-service.*Up"; then
    log_warning "资产服务容器运行中但健康检查可能未通过"
else
    log_error "资产服务容器未运行或状态异常"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep asset-service || echo "未找到资产服务容器"
    HEALTH_STATUS=1
fi

# 2. 检查端口监听
log_info "检查服务端口监听..."
if netstat -ln 2>/dev/null | grep -q ":$ASSET_SERVICE_PORT" || ss -ln 2>/dev/null | grep -q ":$ASSET_SERVICE_PORT"; then
    log_success "资产服务端口 $ASSET_SERVICE_PORT 正在监听"
else
    log_error "资产服务端口 $ASSET_SERVICE_PORT 未监听"
    HEALTH_STATUS=1
fi

# 3. 健康检查端点测试
log_info "测试健康检查端点..."
if curl -f -s "http://localhost:$ASSET_SERVICE_PORT/health" > /dev/null 2>&1; then
    HEALTH_RESPONSE=$(curl -s "http://localhost:$ASSET_SERVICE_PORT/health")
    log_success "健康检查端点响应正常"
    echo "响应内容: $HEALTH_RESPONSE"
else
    log_error "健康检查端点无响应"
    HEALTH_STATUS=1
fi

# 4. 数据库连接测试
log_info "测试数据库连接..."
if curl -f -s "http://localhost:$ASSET_SERVICE_PORT/api/health/database" > /dev/null 2>&1; then
    log_success "资产服务数据库连接正常"
else
    log_warning "数据库连接检查失败 (可能端点不存在)"
fi

# 5. Redis 连接测试
log_info "测试 Redis 连接..."
if curl -f -s "http://localhost:$ASSET_SERVICE_PORT/api/health/redis" > /dev/null 2>&1; then
    log_success "资产服务 Redis 连接正常"
else
    log_warning "Redis 连接检查失败 (可能端点不存在)"
fi

# 6. API 端点基本测试
log_info "测试主要 API 端点..."

# 测试资产相关端点 (不需要认证的端点)
API_ENDPOINTS=(
    "/api/assets/health"
    "/api/assets/categories"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
    if curl -f -s "http://localhost:$ASSET_SERVICE_PORT$endpoint" > /dev/null 2>&1; then
        log_success "API 端点 $endpoint 响应正常"
    else
        log_warning "API 端点 $endpoint 无响应 (可能需要认证或端点不存在)"
    fi
done

# 7. 用户服务连通性测试
log_info "测试用户服务连通性..."
if docker exec emaintenance-asset-service curl -f -s "http://emaintenance-user-service:3001/health" > /dev/null 2>&1; then
    log_success "资产服务可以连接到用户服务"
else
    log_error "资产服务无法连接到用户服务"
    HEALTH_STATUS=1
fi

# 8. 服务日志检查
log_info "检查服务日志 (最近10行)..."
echo "最近的服务日志:"
docker logs --tail=10 emaintenance-asset-service 2>/dev/null | head -10 | while read line; do
    echo "  $line"
done

# 9. 资源使用检查
log_info "检查服务资源使用..."
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" emaintenance-asset-service 2>/dev/null || log_warning "无法获取资源使用信息"

# 10. 网络连通性检查
log_info "检查网络连通性..."
if docker exec emaintenance-asset-service ping -c 1 emaintenance-postgres > /dev/null 2>&1; then
    log_success "可以连接到 PostgreSQL 容器"
else
    log_error "无法连接到 PostgreSQL 容器"
    HEALTH_STATUS=1
fi

if docker exec emaintenance-asset-service ping -c 1 emaintenance-redis > /dev/null 2>&1; then
    log_success "可以连接到 Redis 容器"
else
    log_error "无法连接到 Redis 容器"
    HEALTH_STATUS=1
fi

# 11. 文件上传目录检查
log_info "检查文件上传目录..."
if docker exec emaintenance-asset-service ls -la /app/uploads > /dev/null 2>&1; then
    log_success "文件上传目录存在且可访问"
else
    log_warning "文件上传目录可能不存在或权限不足"
fi

echo ""
echo "=========================================="
if [ $HEALTH_STATUS -eq 0 ]; then
    log_success "资产服务健康检查通过！"
    echo ""
    log_info "服务访问信息:"
    echo "  服务地址: http://localhost:$ASSET_SERVICE_PORT"
    echo "  健康检查: http://localhost:$ASSET_SERVICE_PORT/health"
    echo "  API 文档: http://localhost:$ASSET_SERVICE_PORT/api-docs (如果启用)"
    echo ""
    log_info "常用 API 端点:"
    echo "  POST /api/assets - 创建资产"
    echo "  GET /api/assets - 获取资产列表"
    echo "  GET /api/assets/:id - 获取特定资产"
    echo "  PUT /api/assets/:id - 更新资产"
    echo "  DELETE /api/assets/:id - 删除资产"
    echo "  POST /api/assets/:id/qr-code - 生成资产二维码"
    echo "  GET /api/assets/qr/:code - 通过二维码查找资产"
    echo "  POST /api/assets/:id/attachments - 上传资产附件"
else
    log_error "资产服务健康检查失败！"
    echo ""
    log_info "故障排查建议:"
    echo "  1. 查看详细日志: docker logs -f emaintenance-asset-service"
    echo "  2. 检查环境变量: docker exec emaintenance-asset-service env"
    echo "  3. 进入容器调试: docker exec -it emaintenance-asset-service /bin/sh"
    echo "  4. 检查依赖服务: docker ps | grep emaintenance"
    echo "  5. 重启服务: docker-compose restart asset-service"
    echo "  6. 重新部署: docker-compose down && ./deploy.sh"
fi
echo "=========================================="

exit $HEALTH_STATUS