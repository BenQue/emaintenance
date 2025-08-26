#!/bin/bash

# 离线启动服务脚本（适用于已构建镜像且网络受限的环境）
# 用途：使用本地镜像启动服务，避免 Docker Hub 连接问题

set -e

echo "🚀 离线模式启动 Emaintenance 服务..."

# 确保在正确的目录执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "📁 项目根目录: $PROJECT_ROOT"
echo "📁 部署目录: $DEPLOY_DIR"

# 切换到部署目录
cd "$DEPLOY_DIR"

# 检查环境配置
if [ ! -f .env ]; then
    echo "❌ 环境配置文件不存在: $DEPLOY_DIR/.env"
    echo "请先运行: ./scripts/setup-server.sh"
    exit 1
fi

echo "📋 加载环境配置: $DEPLOY_DIR/.env"
source .env

# 检查本地镜像是否存在
echo "🔍 检查本地镜像..."

check_image() {
    local image=$1
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^$image$"; then
        echo "✅ 找到本地镜像: $image"
        return 0
    else
        echo "❌ 未找到本地镜像: $image"
        return 1
    fi
}

# 检查基础镜像
MISSING_IMAGES=()
if ! check_image "postgres:16"; then
    MISSING_IMAGES+=("postgres:16")
fi

if ! check_image "redis:7-alpine"; then
    MISSING_IMAGES+=("redis:7-alpine")
fi

# 检查构建的服务镜像
# 注意：生产环境可能使用不同的镜像标签
for service in user-service work-order-service asset-service; do
    # 检查多种可能的镜像名称
    if check_image "local/emaintenance-$service:latest"; then
        continue
    elif check_image "emaintenance-$service:latest"; then
        continue
    elif check_image "deploy-$service:latest"; then
        continue
    elif check_image "deploy_$service:latest"; then
        continue
    else
        echo "⚠️  服务镜像未找到: $service"
        echo "需要先构建镜像"
        MISSING_IMAGES+=("$service")
    fi
done

if [ ${#MISSING_IMAGES[@]} -gt 0 ]; then
    echo ""
    echo "❌ 缺少以下镜像:"
    for img in "${MISSING_IMAGES[@]}"; do
        echo "   - $img"
    done
    echo ""
    echo "对于基础镜像，可以手动拉取："
    echo "   docker pull postgres:16"
    echo "   docker pull redis:7-alpine"
    echo ""
    echo "或者使用镜像代理："
    echo "   docker pull mirror.ccs.tencentyun.com/library/postgres:16"
    echo "   docker tag mirror.ccs.tencentyun.com/library/postgres:16 postgres:16"
    exit 1
fi

# 选择配置文件
if [ -f docker-compose.prod.yml ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "📋 使用生产环境配置: $COMPOSE_FILE"
elif [ -f docker-compose.optimized.yml ]; then
    COMPOSE_FILE="docker-compose.optimized.yml"
    echo "📋 使用优化配置: $COMPOSE_FILE"
else
    COMPOSE_FILE="docker-compose.yml"
    echo "📋 使用默认配置: $COMPOSE_FILE"
fi

# 创建数据目录
echo "📁 创建数据持久化目录..."
sudo mkdir -p /opt/emaintenance/{data,logs,ssl}
sudo chown -R $USER:$USER /opt/emaintenance/

# 停止现有服务
if docker ps -q | grep -q .; then
    echo "🛑 停止现有服务..."
    docker-compose --env-file .env -f $COMPOSE_FILE down || true
fi

# 使用离线模式启动服务（跳过镜像拉取）
echo "🚀 启动服务（离线模式）..."

# 设置 Docker Compose 不拉取镜像
export COMPOSE_HTTP_TIMEOUT=10
export DOCKER_CLIENT_TIMEOUT=10

# 启动服务，使用 --no-deps 避免依赖检查问题
echo "📦 启动数据库服务..."
docker-compose --env-file .env -f $COMPOSE_FILE up -d --no-recreate postgres redis

echo "⏳ 等待数据库就绪..."
sleep 20

echo "📦 启动 API 服务..."
docker-compose --env-file .env -f $COMPOSE_FILE up -d --no-recreate user-service work-order-service asset-service

echo "⏳ 等待 API 服务就绪..."
sleep 20

echo "📦 启动 Web 服务..."
docker-compose --env-file .env -f $COMPOSE_FILE up -d --no-recreate web nginx

echo "⏳ 等待所有服务启动完成..."
sleep 30

# 显示服务状态
echo ""
echo "📊 服务状态:"
docker-compose --env-file .env -f $COMPOSE_FILE ps

# 健康检查
echo ""
echo "🏥 检查服务健康状态..."
./scripts/health-check.sh || true

echo ""
echo "🎉 离线模式启动完成!"
echo ""
echo "📝 注意事项:"
echo "   - 本脚本跳过了镜像拉取步骤"
echo "   - 确保所有需要的镜像已在本地存在"
echo "   - 如需更新镜像，请手动拉取"
echo ""
echo "🔍 查看日志:"
echo "   docker-compose --env-file $DEPLOY_DIR/.env -f $DEPLOY_DIR/$COMPOSE_FILE logs -f [service-name]"
echo ""
echo "🛑 停止服务:"
echo "   docker-compose --env-file $DEPLOY_DIR/.env -f $DEPLOY_DIR/$COMPOSE_FILE down"