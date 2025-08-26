#!/bin/bash

# 紧急修复脚本 - 恢复基础服务
# 用途：快速恢复数据库和 Redis 服务

set -e

echo "🚨 紧急修复：恢复基础服务..."

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
echo "🔍 检查当前状态"
echo "==============="

echo "当前运行的容器："
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(postgres|redis|emaintenance)" || echo "没有相关容器运行"

echo ""
echo "现有的数据卷："
docker volume ls | grep -E "(postgres|redis)" || echo "没有相关数据卷"

echo ""
echo "🛑 清理问题状态"
echo "================"

# 停止所有容器
echo "停止所有容器..."
docker stop $(docker ps -aq) 2>/dev/null || true

# 删除临时文件
echo "删除临时文件..."
rm -f docker-compose.temp.yml 2>/dev/null || true

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

# 先启动数据库和 Redis
echo "1️⃣ 启动 PostgreSQL..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d postgres

echo "等待 PostgreSQL 启动..."
sleep 10

# 验证 PostgreSQL
for i in {1..30}; do
    POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep postgres | head -1)
    if [ -n "$POSTGRES_CONTAINER" ] && docker exec "$POSTGRES_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
        echo "✅ PostgreSQL 启动成功"
        break
    else
        if [ $i -eq 30 ]; then
            echo "❌ PostgreSQL 启动失败"
            echo "PostgreSQL 日志："
            docker logs "$POSTGRES_CONTAINER" --tail 10 2>/dev/null || echo "无法获取日志"
            exit 1
        else
            echo "⏳ 等待 PostgreSQL... ($i/30)"
            sleep 2
        fi
    fi
done

echo ""
echo "2️⃣ 启动 Redis..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d redis

sleep 5

# 验证 Redis
REDIS_CONTAINER=$(docker ps --format "{{.Names}}" | grep redis | head -1)
if [ -n "$REDIS_CONTAINER" ] && docker exec "$REDIS_CONTAINER" redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis 启动成功"
else
    echo "❌ Redis 启动失败"
    echo "Redis 日志："
    docker logs "$REDIS_CONTAINER" --tail 10 2>/dev/null || echo "无法获取日志"
fi

echo ""
echo "📊 基础服务状态"
echo "==============="

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(postgres|redis)"

echo ""
echo "🧪 连接测试"
echo "==========="

# 测试数据库连接
POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep postgres | head -1)
if [ -n "$POSTGRES_CONTAINER" ]; then
    echo "测试数据库连接..."
    if docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_CONTAINER" psql -U postgres -d emaintenance -c "SELECT 1;" >/dev/null 2>&1; then
        echo "✅ 数据库连接正常"
    else
        echo "⚠️  数据库连接有问题"
    fi
fi

# 测试 Redis 连接
if [ -n "$REDIS_CONTAINER" ]; then
    echo "测试 Redis 连接..."
    if docker exec "$REDIS_CONTAINER" redis-cli ping | grep -q "PONG"; then
        echo "✅ Redis 连接正常"
    else
        echo "⚠️  Redis 连接有问题"
    fi
fi

echo ""
echo "✅ 基础服务修复完成！"
echo ""
echo "📝 下一步："
echo "如果基础服务正常，现在可以尝试启动 API 服务："
echo "  docker-compose --env-file .env -f $COMPOSE_FILE up -d user-service"
echo "  （等待用户服务启动后再启动其他服务）"
echo ""
echo "或者检查现有的 API 服务镜像："
echo "  docker images | grep emaintenance"