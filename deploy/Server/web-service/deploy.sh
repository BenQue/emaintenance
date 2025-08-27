#!/bin/bash

# E-Maintenance Web服务部署脚本
# 构建和部署前端Web应用服务

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
echo "  E-Maintenance Web服务部署"
echo "  版本: v2.0"
echo "  端口: 3000"
echo "=========================================="

# 切换到脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查依赖服务
log_info "检查依赖服务状态..."

# 检查所有后端API服务
REQUIRED_SERVICES=("emaintenance-user-service:3001" "emaintenance-work-order-service:3002" "emaintenance-asset-service:3003")
MISSING_SERVICES=()

for service in "${REQUIRED_SERVICES[@]}"; do
    service_name=$(echo $service | cut -d':' -f1)
    service_port=$(echo $service | cut -d':' -f2)
    
    # 简化检测：只要容器在运行就认为OK
    if ! docker ps --filter "name=${service_name}" --filter "status=running" --format "{{.Names}}" | grep -q "^${service_name}$"; then
        MISSING_SERVICES+=("$service_name")
    else
        log_info "检测到服务: $service_name"
    fi
done

if [ ${#MISSING_SERVICES[@]} -ne 0 ]; then
    log_error "以下依赖服务未运行或不健康:"
    for service in "${MISSING_SERVICES[@]}"; do
        echo "  - $service"
    done
    log_info "请确保所有后端服务已部署并运行健康"
    log_info "部署顺序: infrastructure -> user-service -> work-order-service -> asset-service -> web-service"
    exit 1
fi

log_success "所有依赖的后端服务都已运行"

# 加载环境变量
if [ -f ../infrastructure/.env ]; then
    source ../infrastructure/.env
elif [ -f ../../../.env ]; then
    source ../../../.env
else
    log_error "未找到环境配置文件"
    exit 1
fi

# 设置 Web 服务环境变量
# NEXT_PUBLIC_* 变量会暴露到浏览器端，应该指向Nginx代理地址
export NEXT_PUBLIC_USER_SERVICE_URL="http://localhost:3030"
export NEXT_PUBLIC_WORK_ORDER_SERVICE_URL="http://localhost:3030"  
export NEXT_PUBLIC_ASSET_SERVICE_URL="http://localhost:3030"
export NEXT_PUBLIC_APP_ENV="${NODE_ENV:-production}"

# 创建必要目录
log_info "创建Web服务目录..."
sudo mkdir -p /opt/emaintenance/{logs/web-service,data/web-uploads,data/web-cache}
sudo chown -R $USER:$USER /opt/emaintenance/

# 检查源代码
WEB_SERVICE_DIR="../../../apps/web"
if [ ! -d "$WEB_SERVICE_DIR" ]; then
    log_error "Web服务源代码目录不存在: $WEB_SERVICE_DIR"
    exit 1
fi

if [ ! -f "$WEB_SERVICE_DIR/package.json" ]; then
    log_error "Web服务 package.json 文件不存在"
    exit 1
fi

# 停止现有的Web服务 (如果存在)
log_info "停止现有Web服务..."
docker-compose down 2>/dev/null || true

# 构建镜像 (支持离线模式)
log_info "构建Web服务镜像..."

# 获取服务器外部IP地址用于API URL
if [ -z "$SERVER_IP" ]; then
    SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || hostname -I | awk '{print $1}' || echo "localhost")
    log_info "自动检测到服务器IP: $SERVER_IP"
else
    log_info "使用指定的服务器IP: $SERVER_IP"
fi

# 如果检测失败，提示用户手动指定
if [ "$SERVER_IP" = "localhost" ]; then
    log_warning "无法自动检测服务器IP地址"
    log_info "请手动指定服务器IP，例如: SERVER_IP=10.163.144.13 ./deploy.sh"
    log_info "或者编辑部署脚本手动设置SERVER_IP变量"
fi

if [ "$OFFLINE_MODE" = "true" ]; then
    log_info "离线模式，跳过镜像拉取"
    docker-compose build --no-cache --build-arg NEXT_PUBLIC_API_URL=http://${SERVER_IP}:3030 web-service
else
    # 在线模式，尝试拉取基础镜像
    docker pull node:18-alpine || log_warning "基础镜像拉取失败，使用本地镜像"
    docker-compose build --build-arg NEXT_PUBLIC_API_URL=http://${SERVER_IP}:3030 web-service
fi

# 启动Web服务
log_info "启动Web服务..."
# 导出环境变量确保 docker-compose 能访问
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:${POSTGRES_PASSWORD}@emaintenance-postgres:5432/emaintenance}"
export JWT_SECRET="${JWT_SECRET}"
export REDIS_URL="${REDIS_URL:-redis://emaintenance-redis:6379}"
export NODE_ENV="${NODE_ENV:-production}"
export USER_SERVICE_PORT="${USER_SERVICE_PORT:-3001}"
export WORK_ORDER_SERVICE_PORT="${WORK_ORDER_SERVICE_PORT:-3002}"
export ASSET_SERVICE_PORT="${ASSET_SERVICE_PORT:-3003}"
export WEB_SERVICE_PORT="${WEB_SERVICE_PORT:-3000}"

docker-compose up -d web-service

# 等待服务启动
log_info "等待Web服务启动..."
max_attempts=60  # Web服务可能需要更长时间启动
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f -s "http://localhost:${WEB_SERVICE_PORT:-3000}/" > /dev/null 2>&1; then
        log_success "Web服务启动成功"
        break
    fi
    
    log_info "等待Web服务启动... ($attempt/$max_attempts)"
    sleep 3
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    log_error "Web服务启动超时"
    log_info "查看日志: docker-compose logs web-service"
    exit 1
fi

# 执行健康检查
log_info "执行健康检查..."
./health-check.sh

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    log_success "Web服务部署成功！"
    echo "=========================================="
    echo ""
    log_info "服务信息:"
    echo "  容器名称: emaintenance-web-service"
    echo "  访问地址: http://localhost:${WEB_SERVICE_PORT:-3000}"
    echo "  健康检查: http://localhost:${WEB_SERVICE_PORT:-3000}/"
    echo ""
    log_info "应用功能:"
    echo "  用户管理: 登录、注册、用户资料管理"
    echo "  工单管理: 创建、查看、分配、完成工单"
    echo "  资产管理: 资产信息、二维码扫描"
    echo "  KPI 仪表板: 设备维护统计和分析"
    echo ""
    log_info "管理员默认账户 (如果已初始化):"
    echo "  用户名: admin@emaintenance.com"
    echo "  密码: admin123 (首次登录请修改密码)"
    echo ""
    log_info "部署完成！现在可以通过浏览器访问应用"
    echo "  前端应用: http://localhost:${WEB_SERVICE_PORT:-3000}"
    echo "  用户API: http://localhost:${USER_SERVICE_PORT:-3001}"
    echo "  工单API: http://localhost:${WORK_ORDER_SERVICE_PORT:-3002}"
    echo "  资产API: http://localhost:${ASSET_SERVICE_PORT:-3003}"
    echo ""
    log_info "如需配置反向代理，请参考:"
    echo "  cd ../nginx && ./deploy.sh"
else
    log_error "Web服务健康检查失败"
    log_info "查看详细日志:"
    echo "  docker-compose logs --tail=50 web-service"
    echo "  docker exec emaintenance-web-service cat /app/logs/next.log"
    exit 1
fi