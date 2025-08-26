#!/bin/bash

# 仅重启 API 服务（不重新构建）
# 用途：快速重启已有的 API 服务容器

set -e

echo "🔄 重启 API 服务（使用已有镜像）..."

# 确保在正确的目录执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$DEPLOY_DIR"

# 加载环境变量
if [ -f .env ]; then
    source .env
    echo "✅ 环境文件已加载"
else
    echo "❌ 环境文件不存在"
    exit 1
fi

echo ""
echo "📋 当前容器状态："
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(user-service|work-order-service|asset-service)" || echo "无相关服务容器"

echo ""
echo "🛑 停止问题服务"
echo "==============="

# 只停止有问题的服务
PROBLEM_SERVICES=("asset-service" "work-order-service")

for service in "${PROBLEM_SERVICES[@]}"; do
    CONTAINER_NAME=$(docker ps -a --format "{{.Names}}" | grep "$service" | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        echo "停止 $CONTAINER_NAME..."
        docker stop "$CONTAINER_NAME" 2>/dev/null || true
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
    else
        echo "$service 容器不存在"
    fi
done

echo ""
echo "🚀 重新启动服务"
echo "==============="

# 检查 docker-compose 文件
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
elif [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
else
    echo "❌ 未找到 docker-compose 配置文件"
    exit 1
fi

# 确保基础服务运行
echo "1️⃣ 确保基础服务运行..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d postgres redis

# 确保用户服务运行
echo "2️⃣ 确保用户服务运行..."
USER_CONTAINER=$(docker ps --format "{{.Names}}" | grep user-service | head -1)
if [ -z "$USER_CONTAINER" ]; then
    echo "启动用户服务..."
    docker-compose --env-file .env -f "$COMPOSE_FILE" up -d user-service
    sleep 20
fi

# 启动工单服务
echo "3️⃣ 启动工单服务..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d work-order-service

# 等待并检查
echo "⏳ 等待工单服务启动..."
sleep 15

WORKORDER_CONTAINER=$(docker ps --format "{{.Names}}" | grep work-order-service | head -1)
if [ -n "$WORKORDER_CONTAINER" ]; then
    echo "📋 工单服务最新日志："
    docker logs "$WORKORDER_CONTAINER" --tail 10
    
    if docker logs "$WORKORDER_CONTAINER" 2>&1 | grep -q "Server running on port\|server started"; then
        echo "✅ 工单服务启动成功"
    elif docker logs "$WORKORDER_CONTAINER" 2>&1 | grep -q "Authentication failed"; then
        echo "❌ 工单服务仍有数据库认证问题"
    else
        echo "⚠️  工单服务状态待确认"
    fi
fi

echo ""
echo "4️⃣ 启动资产服务..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d asset-service

# 等待并检查
echo "⏳ 等待资产服务启动..."
sleep 15

ASSET_CONTAINER=$(docker ps --format "{{.Names}}" | grep asset-service | head -1)
if [ -n "$ASSET_CONTAINER" ]; then
    echo "📋 资产服务最新日志："
    docker logs "$ASSET_CONTAINER" --tail 10
    
    if docker logs "$ASSET_CONTAINER" 2>&1 | grep -q "Server running on port\|server started"; then
        echo "✅ 资产服务启动成功"
    elif docker logs "$ASSET_CONTAINER" 2>&1 | grep -q "Authentication failed"; then
        echo "❌ 资产服务仍有数据库认证问题"
    else
        echo "⚠️  资产服务状态待确认"
    fi
fi

echo ""
echo "📊 最终状态"
echo "==========="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(postgres|redis|user-service|work-order-service|asset-service)"

echo ""
echo "💡 如果服务仍有数据库认证问题："
echo "   运行: ./scripts/check-postgres-password.sh"
echo "   然后: ./scripts/fix-postgres-password.sh"

echo ""
echo "🔍 查看详细日志："
if [ -n "$WORKORDER_CONTAINER" ]; then
    echo "   工单服务: docker logs -f $WORKORDER_CONTAINER"
fi
if [ -n "$ASSET_CONTAINER" ]; then
    echo "   资产服务: docker logs -f $ASSET_CONTAINER"
fi