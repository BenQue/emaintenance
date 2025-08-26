#!/bin/bash

# 安全恢复脚本 - 只处理 Emaintenance 相关服务
# 用途：安全地恢复 Emaintenance 服务，不影响其他 Docker 服务

set -e

echo "🔒 安全恢复 Emaintenance 服务..."

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
echo "🔍 检查当前 Emaintenance 服务状态"
echo "=================================="

echo "Emaintenance 相关容器："
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep emaintenance || echo "没有 Emaintenance 容器"

echo ""
echo "Emaintenance 相关镜像："
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep -E "(emaintenance|deploy)" || echo "没有 Emaintenance 镜像"

echo ""
echo "🧹 清理临时文件"
echo "==============="

# 只删除我们创建的临时文件
if [ -f "docker-compose.temp.yml" ]; then
    echo "删除临时 compose 文件..."
    rm -f docker-compose.temp.yml
fi

echo ""
echo "🛑 只停止 Emaintenance 相关容器"
echo "==============================="

# 只停止 Emaintenance 相关的容器
EMAINTENANCE_CONTAINERS=$(docker ps -a --format "{{.Names}}" | grep emaintenance || true)

if [ -n "$EMAINTENANCE_CONTAINERS" ]; then
    echo "停止 Emaintenance 容器："
    for container in $EMAINTENANCE_CONTAINERS; do
        echo "  停止: $container"
        docker stop "$container" 2>/dev/null || true
        docker rm "$container" 2>/dev/null || true
    done
else
    echo "没有找到 Emaintenance 容器"
fi

echo ""
echo "🚀 重新启动基础服务"
echo "==================="

# 使用原始的 docker-compose 文件
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
elif [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
else
    echo "❌ 未找到 docker-compose 配置文件"
    exit 1
fi

echo "使用配置文件: $COMPOSE_FILE"

# 只启动 PostgreSQL 和 Redis
echo "1️⃣ 启动 PostgreSQL 和 Redis..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d postgres redis

echo "等待基础服务启动..."
sleep 15

# 验证基础服务
echo ""
echo "🧪 验证基础服务"
echo "==============="

# 验证 PostgreSQL
POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep postgres | head -1)
if [ -n "$POSTGRES_CONTAINER" ]; then
    if docker exec "$POSTGRES_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
        echo "✅ PostgreSQL 正常运行"
        
        # 测试数据库连接
        if docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_CONTAINER" psql -U postgres -d emaintenance -c "SELECT 1;" >/dev/null 2>&1; then
            echo "✅ 数据库连接正常"
        else
            echo "⚠️  数据库连接有问题，但服务在运行"
        fi
    else
        echo "❌ PostgreSQL 服务异常"
        docker logs "$POSTGRES_CONTAINER" --tail 5
    fi
else
    echo "❌ PostgreSQL 容器未找到"
fi

# 验证 Redis
REDIS_CONTAINER=$(docker ps --format "{{.Names}}" | grep redis | head -1)
if [ -n "$REDIS_CONTAINER" ]; then
    if docker exec "$REDIS_CONTAINER" redis-cli ping | grep -q "PONG"; then
        echo "✅ Redis 正常运行"
    else
        echo "❌ Redis 服务异常"
        docker logs "$REDIS_CONTAINER" --tail 5
    fi
else
    echo "❌ Redis 容器未找到"
fi

echo ""
echo "📊 当前 Docker 状态（仅 Emaintenance）"
echo "===================================="

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep emaintenance

echo ""
echo "✅ 安全恢复完成！"
echo ""
echo "📝 基础服务已恢复，下一步选择："
echo ""
echo "选项1 - 检查现有 API 镜像："
echo "  docker images | grep -E '(emaintenance|deploy)'"
echo ""
echo "选项2 - 如果 API 镜像存在，手动启动一个服务测试："
echo "  docker run -d --name test-user-service --network deploy_emaintenance-network \\"
echo "    -e DATABASE_URL='$DATABASE_URL' -e JWT_SECRET='$JWT_SECRET' \\"
echo "    -p 3001:3001 deploy_user-service:latest"
echo ""
echo "选项3 - 如果需要重新构建 API 服务："
echo "  ./scripts/rebuild-services-fast.sh"
echo ""
echo "🙏 对于之前脚本的问题，我深表歉意。这个脚本只处理 Emaintenance 相关的服务。"