#!/bin/bash

# E-Maintenance 工单服务部署脚本
# 构建和部署工单管理服务

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
echo "  E-Maintenance 工单服务部署"
echo "  版本: v2.0"
echo "  端口: 3002"
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查依赖服务
log_info "检查依赖服务状态..."

# 检查基础设施服务
if ! docker ps --filter "name=emaintenance-postgres" --filter "status=running" --format "{{.Names}}" | grep -q "emaintenance-postgres"; then
    log_error "PostgreSQL 服务未运行"
    log_info "请先运行: cd ../infrastructure && ./deploy.sh"
    exit 1
fi

if ! docker ps --filter "name=emaintenance-redis" --filter "status=running" --format "{{.Names}}" | grep -q "emaintenance-redis"; then
    log_error "Redis 服务未运行"
    log_info "请先运行: cd ../infrastructure && ./deploy.sh"
    exit 1
fi

# 检查用户服务 (工单服务依赖用户服务进行用户验证)
if ! docker ps --filter "name=emaintenance-user-service" --filter "status=running" --format "{{.Names}}" | grep -q "emaintenance-user-service"; then
    log_error "用户服务未运行或不健康"
    log_info "请先运行: cd ../user-service && ./deploy.sh"
    exit 1
fi

# 加载环境变量
if [ -f ../infrastructure/.env ]; then
    source ../infrastructure/.env
elif [ -f ../../../.env ]; then
    source ../../../.env
else
    log_error "未找到环境配置文件"
    exit 1
fi

# 验证必要的环境变量
if [ -z "$JWT_SECRET" ]; then
    log_error "JWT_SECRET 环境变量未设置"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT:-5433}/${POSTGRES_DB:-emaintenance}"
fi

# 设置用户服务 URL
export USER_SERVICE_URL="http://emaintenance-user-service:3001"

# 创建必要目录
log_info "创建服务目录..."
sudo mkdir -p /opt/emaintenance/{logs/work-order-service,data/work-order-uploads}
sudo chown -R $USER:$USER /opt/emaintenance/

# 检查源代码
WORK_ORDER_SERVICE_DIR="../../../apps/api/work-order-service"
if [ ! -d "$WORK_ORDER_SERVICE_DIR" ]; then
    log_error "工单服务源代码目录不存在: $WORK_ORDER_SERVICE_DIR"
    exit 1
fi

# 停止现有服务
log_info "停止现有工单服务..."
docker-compose down 2>/dev/null || true

# 构建镜像
log_info "构建工单服务镜像..."
if [ "$OFFLINE_MODE" = "true" ]; then
    log_info "离线模式，跳过镜像拉取"
    docker-compose build --no-cache work-order-service
else
    docker pull node:18-alpine || log_warning "基础镜像拉取失败，使用本地镜像"
    docker-compose build work-order-service
fi

# 启动服务
log_info "启动工单服务..."
# 导出环境变量确保 docker-compose 能访问
export DATABASE_URL
export JWT_SECRET
export REDIS_URL
export NODE_ENV
export USER_SERVICE_URL
docker-compose up -d work-order-service

# 等待服务启动
log_info "等待工单服务启动..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f -s "http://localhost:${WORK_ORDER_SERVICE_PORT:-3002}/health" > /dev/null 2>&1; then
        log_success "工单服务启动成功"
        break
    fi
    
    log_info "等待工单服务启动... ($attempt/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    log_error "工单服务启动超时"
    log_info "查看日志: docker-compose logs work-order-service"
    exit 1
fi

# 执行健康检查
log_info "执行健康检查..."
./health-check.sh

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    log_success "工单服务部署成功！"
    echo "=========================================="
    echo ""
    log_info "服务信息:"
    echo "  容器名称: emaintenance-work-order-service"
    echo "  访问地址: http://localhost:${WORK_ORDER_SERVICE_PORT:-3002}"
    echo "  健康检查: http://localhost:${WORK_ORDER_SERVICE_PORT:-3002}/health"
    echo ""
    log_info "API 端点示例:"
    echo "  创建工单: POST /api/work-orders"
    echo "  获取工单: GET /api/work-orders"
    echo "  更新工单: PUT /api/work-orders/:id"
    echo "  上传文件: POST /api/work-orders/:id/attachments"
    echo ""
    log_info "下一步: 部署资产服务"
    echo "  cd ../asset-service && ./deploy.sh"
else
    log_error "工单服务健康检查失败"
    log_info "查看详细日志:"
    echo "  docker-compose logs --tail=50 work-order-service"
    exit 1
fi