#!/bin/bash

# E-Maintenance 用户服务部署脚本
# 构建和部署用户认证和管理服务

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
echo "  E-Maintenance 用户服务部署"
echo "  版本: v2.0"
echo "  端口: 3001"
echo "=========================================="

# 切换到脚本所在目录
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

# 检查数据库是否已初始化
log_info "验证数据库连接和数据..."
if ! docker exec emaintenance-postgres psql -U postgres -d emaintenance -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
    log_error "数据库未初始化或连接失败"
    log_info "请先运行: cd ../database && ./manual-init.sh"
    exit 1
fi
log_success "数据库连接正常"

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
    export DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-emaintenance}"
fi

# 创建日志目录
log_info "创建服务日志目录..."
sudo mkdir -p /opt/emaintenance/logs/user-service
sudo chown -R $USER:$USER /opt/emaintenance/logs/

# 检查源代码
USER_SERVICE_DIR="../../../apps/api/user-service"
if [ ! -d "$USER_SERVICE_DIR" ]; then
    log_error "用户服务源代码目录不存在: $USER_SERVICE_DIR"
    exit 1
fi

if [ ! -f "$USER_SERVICE_DIR/package.json" ]; then
    log_error "用户服务 package.json 文件不存在"
    exit 1
fi

# 停止现有的用户服务 (如果存在)
log_info "停止现有用户服务..."
docker-compose down 2>/dev/null || true

# 构建镜像 (支持离线模式)
log_info "构建用户服务镜像..."

if [ "$OFFLINE_MODE" = "true" ]; then
    log_info "离线模式，跳过镜像拉取"
    docker-compose build --no-cache user-service
else
    # 在线模式，尝试拉取基础镜像
    docker pull node:18-alpine || log_warning "基础镜像拉取失败，使用本地镜像"
    docker-compose build user-service
fi

# 启动用户服务
log_info "启动用户服务..."
docker-compose up -d user-service

# 等待服务启动
log_info "等待用户服务启动..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if docker exec emaintenance-user-service wget --no-verbose --tries=1 --spider http://localhost:3001/health 2>/dev/null; then
        log_success "用户服务启动成功"
        break
    fi
    
    log_info "等待用户服务启动... ($attempt/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    log_error "用户服务启动超时"
    log_info "查看日志: docker-compose logs user-service"
    exit 1
fi

# 执行健康检查
log_info "执行健康检查..."
./health-check.sh

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    log_success "用户服务部署成功！"
    echo "=========================================="
    echo ""
    log_info "服务信息:"
    echo "  容器名称: emaintenance-user-service"
    echo "  访问地址: http://localhost:${USER_SERVICE_PORT:-3001}"
    echo "  健康检查: http://localhost:${USER_SERVICE_PORT:-3001}/health"
    echo ""
    log_info "API 端点示例:"
    echo "  用户注册: POST /api/auth/register"
    echo "  用户登录: POST /api/auth/login" 
    echo "  获取用户: GET /api/users/profile"
    echo ""
    log_info "下一步: 部署工单服务"
    echo "  cd ../work-order-service && ./deploy.sh"
else
    log_error "用户服务健康检查失败"
    log_info "查看详细日志:"
    echo "  docker-compose logs --tail=50 user-service"
    echo "  docker exec emaintenance-user-service cat /app/logs/app.log"
    exit 1
fi