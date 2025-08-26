#!/bin/bash

# 启动缺失的容器（使用现有镜像）
# 用途：当容器被删除但镜像仍存在时，直接启动新容器

set -e

echo "🔄 启动缺失的容器..."

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

# 检查 docker-compose 文件
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "📋 使用配置文件: $COMPOSE_FILE"
elif [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
    echo "📋 使用配置文件: $COMPOSE_FILE"
else
    echo "❌ 未找到 docker-compose 配置文件"
    exit 1
fi

echo ""
echo "🔍 检查容器和镜像状态"
echo "======================"

# 检查需要的服务
SERVICES=("work-order-service" "asset-service")

for service in "${SERVICES[@]}"; do
    echo ""
    echo "检查 $service..."
    
    # 检查容器是否存在
    CONTAINER_EXISTS=$(docker ps -a --format "{{.Names}}" | grep "$service" | head -1)
    
    # 检查镜像是否存在
    IMAGE_EXISTS=$(docker images --format "{{.Repository}}" | grep "$service" | head -1)
    
    if [ -n "$CONTAINER_EXISTS" ]; then
        CONTAINER_STATUS=$(docker ps -a --format "{{.Status}}" --filter "name=$CONTAINER_EXISTS")
        echo "  容器状态: $CONTAINER_EXISTS - $CONTAINER_STATUS"
        
        if echo "$CONTAINER_STATUS" | grep -q "Up"; then
            echo "  ✅ $service 容器正在运行"
        else
            echo "  🔄 $service 容器存在但未运行，尝试启动..."
            docker start "$CONTAINER_EXISTS"
        fi
    else
        echo "  ❌ $service 容器不存在"
        
        if [ -n "$IMAGE_EXISTS" ]; then
            echo "  ✅ $service 镜像存在，可以创建新容器"
        else
            echo "  ❌ $service 镜像也不存在"
        fi
    fi
done

echo ""
echo "🚀 启动缺失的服务"
echo "=================="

# 确保依赖服务正在运行
echo "1️⃣ 确保基础服务运行..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d postgres redis

echo "2️⃣ 确保用户服务运行..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d user-service

echo "等待基础服务就绪..."
sleep 10

# 启动缺失的服务
for service in "${SERVICES[@]}"; do
    echo ""
    echo "3️⃣ 启动 $service..."
    
    # 使用 docker-compose 启动（会创建新容器如果不存在）
    docker-compose --env-file .env -f "$COMPOSE_FILE" up -d "$service"
    
    echo "⏳ 等待 $service 启动..."
    sleep 15
    
    # 检查启动结果
    CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep "$service" | head -1)
    
    if [ -n "$CONTAINER_NAME" ]; then
        echo "📋 $service 容器已创建: $CONTAINER_NAME"
        
        # 显示最新日志
        echo "📋 $service 最新日志："
        docker logs "$CONTAINER_NAME" --tail 8 | sed 's/^/    /'
        
        # 简单状态检查
        if docker logs "$CONTAINER_NAME" 2>&1 | grep -q "Server running on port\|server started\|listening on"; then
            echo "  ✅ $service 启动成功"
        elif docker logs "$CONTAINER_NAME" 2>&1 | grep -q "Authentication failed\|Error connecting to database"; then
            echo "  ⚠️  $service 有数据库连接问题"
        elif docker logs "$CONTAINER_NAME" 2>&1 | grep -q "Error\|FATAL\|failed"; then
            echo "  ❌ $service 启动时遇到错误"
        else
            echo "  🔄 $service 正在启动中..."
        fi
    else
        echo "  ❌ $service 容器创建失败"
    fi
    
    echo ""
done

# 显示最终状态
echo ""
echo "📊 所有服务最终状态"
echo "==================="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(postgres|redis|user-service|work-order-service|asset-service)"

echo ""
echo "🔍 验证服务健康状态"
echo "==================="

# 快速健康检查
for service in "${SERVICES[@]}"; do
    CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep "$service" | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        echo "检查 $service 健康状态..."
        
        # 根据服务端口检查健康状态
        case $service in
            "work-order-service")
                PORT=3002
                ;;
            "asset-service")
                PORT=3003
                ;;
        esac
        
        # 尝试健康检查请求
        if docker exec "$CONTAINER_NAME" curl -f "http://localhost:$PORT/health" >/dev/null 2>&1; then
            echo "  ✅ $service 健康检查通过"
        elif docker exec "$CONTAINER_NAME" curl -f "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
            echo "  ✅ $service 健康检查通过 (使用 /api/health)"
        else
            echo "  ⚠️  $service 健康检查失败（可能还在启动中）"
        fi
    fi
done

echo ""
echo "✅ 容器启动完成！"
echo ""
echo "📝 后续步骤："
echo "1. 如果服务正常运行，可以启动 Web 应用和 Nginx："
echo "   docker-compose --env-file .env -f $COMPOSE_FILE up -d web nginx"
echo ""
echo "2. 如果有数据库连接问题："
echo "   ./scripts/check-postgres-password.sh"
echo ""
echo "3. 查看详细日志："
for service in "${SERVICES[@]}"; do
    CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep "$service" | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        echo "   $service: docker logs -f $CONTAINER_NAME"
    fi
done