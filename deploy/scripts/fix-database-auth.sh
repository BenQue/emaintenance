#!/bin/bash

# 修复数据库认证问题
# 用途：解决 asset-service 和 work-order-service 的数据库连接认证失败

set -e

echo "🔧 修复数据库认证问题..."

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

# 显示当前数据库配置
echo ""
echo "🔍 当前数据库配置:"
echo "DATABASE_URL: $DATABASE_URL"
echo "POSTGRES_PASSWORD: $POSTGRES_PASSWORD"

# 检查 PostgreSQL 容器状态
echo ""
echo "🔍 检查 PostgreSQL 容器状态:"
if docker ps | grep -q postgres; then
    POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep postgres | head -1)
    echo "✅ PostgreSQL 容器运行中: $POSTGRES_CONTAINER"
    
    # 测试数据库连接
    echo "🧪 测试数据库连接..."
    if docker exec "$POSTGRES_CONTAINER" pg_isready -U postgres; then
        echo "✅ PostgreSQL 服务正常"
    else
        echo "❌ PostgreSQL 服务异常"
        exit 1
    fi
else
    echo "❌ PostgreSQL 容器未运行"
    exit 1
fi

# 检查问题服务的状态
echo ""
echo "🔍 检查问题服务状态:"
PROBLEM_SERVICES=("asset-service" "work-order-service")

for service in "${PROBLEM_SERVICES[@]}"; do
    CONTAINER_NAME=$(docker ps -a --format "{{.Names}}" | grep "$service" | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        STATUS=$(docker ps -a --format "{{.Status}}" --filter "name=$CONTAINER_NAME")
        echo "  $service ($CONTAINER_NAME): $STATUS"
        
        # 显示最近的错误日志
        echo "  📋 最近的日志："
        docker logs "$CONTAINER_NAME" --tail 3 2>/dev/null | sed 's/^/    /' || echo "    无法获取日志"
    else
        echo "  $service: 容器未找到"
    fi
done

# 创建修复方案
echo ""
echo "🔧 开始修复..."

# 方案1: 重新启动问题服务（使用正确的环境变量）
echo "1️⃣ 重新启动问题服务..."

for service in "${PROBLEM_SERVICES[@]}"; do
    CONTAINER_NAME=$(docker ps -a --format "{{.Names}}" | grep "$service" | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        echo "  🛑 停止 $service..."
        docker stop "$CONTAINER_NAME" 2>/dev/null || true
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
        echo "  ✅ $service 已停止并删除"
    fi
done

# 方案2: 使用 docker-compose 重新启动服务（确保环境变量正确传递）
echo ""
echo "2️⃣ 重新部署服务..."

# 检查 docker-compose 文件
if [ -f "docker-compose.prod.yml" ]; then
    echo "  📋 使用 docker-compose.prod.yml"
    COMPOSE_FILE="docker-compose.prod.yml"
elif [ -f "docker-compose.yml" ]; then
    echo "  📋 使用 docker-compose.yml"
    COMPOSE_FILE="docker-compose.yml"
else
    echo "  ❌ 未找到 docker-compose 文件"
    exit 1
fi

# 启动 asset-service
echo "  🚀 启动 asset-service..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d asset-service

# 等待服务启动
sleep 10

# 启动 work-order-service
echo "  🚀 启动 work-order-service..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d work-order-service

# 等待服务启动
sleep 10

# 验证修复结果
echo ""
echo "🧪 验证修复结果..."

for service in "${PROBLEM_SERVICES[@]}"; do
    CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep "$service" | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        # 检查容器状态
        STATUS=$(docker ps --format "{{.Status}}" --filter "name=$CONTAINER_NAME")
        echo "  📊 $service 状态: $STATUS"
        
        # 等待服务启动
        echo "  ⏳ 等待 $service 启动..."
        for i in {1..30}; do
            if docker logs "$CONTAINER_NAME" 2>&1 | grep -q "Server running on port"; then
                echo "  ✅ $service 启动成功"
                break
            elif docker logs "$CONTAINER_NAME" 2>&1 | grep -q "Authentication failed"; then
                echo "  ❌ $service 仍有认证问题"
                break
            else
                echo "    等待中... ($i/30)"
                sleep 2
            fi
        done
        
        # 显示最新日志
        echo "  📋 最新日志："
        docker logs "$CONTAINER_NAME" --tail 5 2>/dev/null | sed 's/^/    /' || echo "    无法获取日志"
        
    else
        echo "  ❌ $service 容器未运行"
    fi
done

# 最终状态检查
echo ""
echo "📊 最终状态:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(postgres|asset|work-order|user)"

echo ""
echo "🔍 如果问题仍然存在，可能的原因:"
echo "  1. 环境变量 DATABASE_URL 中的主机名 'postgres' 无法解析"
echo "  2. PostgreSQL 容器的网络配置问题"
echo "  3. Docker 网络连接问题"
echo ""
echo "📝 进一步排查命令:"
echo "  查看网络: docker network ls"
echo "  检查网络连接: docker network inspect <network_name>"
echo "  测试容器间连接: docker exec <container> ping postgres"