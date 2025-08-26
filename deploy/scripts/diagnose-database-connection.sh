#!/bin/bash

# 数据库连接诊断脚本
# 用途：详细诊断数据库连接问题并提供修复建议

set -e

echo "🔍 数据库连接诊断..."

# 确保在正确的目录执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$DEPLOY_DIR"

# 检查环境文件
if [ -f .env ]; then
    source .env
else
    echo "❌ .env 文件不存在"
    exit 1
fi

echo "📋 诊断报告"
echo "============"

# 1. 检查 PostgreSQL 容器
echo ""
echo "1️⃣ PostgreSQL 容器状态："
POSTGRES_CONTAINERS=$(docker ps -a --format "{{.Names}}" | grep postgres || true)
if [ -n "$POSTGRES_CONTAINERS" ]; then
    for container in $POSTGRES_CONTAINERS; do
        STATUS=$(docker ps -a --format "{{.Status}}" --filter "name=$container")
        echo "  - $container: $STATUS"
        
        # 检查端口映射
        PORTS=$(docker ps --format "{{.Ports}}" --filter "name=$container" | head -1)
        echo "    端口映射: $PORTS"
    done
else
    echo "  ❌ 未找到 PostgreSQL 容器"
fi

# 2. 检查数据库配置
echo ""
echo "2️⃣ 数据库配置："
echo "  DATABASE_URL: $DATABASE_URL"
echo "  POSTGRES_PASSWORD: $POSTGRES_PASSWORD"

# 解析 DATABASE_URL
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
    
    echo "  解析结果："
    echo "    用户: $DB_USER"
    echo "    密码: ${DB_PASS:0:3}***"
    echo "    主机: $DB_HOST"
    echo "    端口: $DB_PORT"
    echo "    数据库: $DB_NAME"
else
    echo "  ⚠️  DATABASE_URL 格式无法解析"
fi

# 3. 检查 Docker 网络
echo ""
echo "3️⃣ Docker 网络状态："
NETWORKS=$(docker network ls --format "{{.Name}}" | grep -E "(emaintenance|deploy)" || true)
if [ -n "$NETWORKS" ]; then
    for network in $NETWORKS; do
        echo "  - 网络: $network"
        # 检查网络中的容器
        CONTAINERS_IN_NETWORK=$(docker network inspect "$network" --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || true)
        echo "    容器: $CONTAINERS_IN_NETWORK"
    done
else
    echo "  ⚠️  未找到相关 Docker 网络"
fi

# 4. 检查问题服务
echo ""
echo "4️⃣ 问题服务状态："
PROBLEM_SERVICES=("asset-service" "work-order-service")

for service in "${PROBLEM_SERVICES[@]}"; do
    CONTAINER=$(docker ps -a --format "{{.Names}}" | grep "$service" | head -1)
    if [ -n "$CONTAINER" ]; then
        STATUS=$(docker ps -a --format "{{.Status}}" --filter "name=$CONTAINER")
        echo "  - $service ($CONTAINER): $STATUS"
        
        # 检查环境变量
        echo "    环境变量检查："
        DATABASE_URL_IN_CONTAINER=$(docker exec "$CONTAINER" printenv DATABASE_URL 2>/dev/null || echo "未设置")
        echo "      DATABASE_URL: $DATABASE_URL_IN_CONTAINER"
        
        # 检查网络连接能力
        echo "    网络连接测试："
        if docker exec "$CONTAINER" ping -c 1 postgres >/dev/null 2>&1; then
            echo "      ping postgres: ✅ 可连通"
        else
            echo "      ping postgres: ❌ 不可连通"
        fi
        
        # 检查 PostgreSQL 端口
        if docker exec "$CONTAINER" nc -z postgres 5432 >/dev/null 2>&1; then
            echo "      postgres:5432: ✅ 端口可达"
        else
            echo "      postgres:5432: ❌ 端口不可达"
        fi
        
    else
        echo "  - $service: ❌ 容器未找到"
    fi
done

# 5. 提供修复建议
echo ""
echo "🔧 修复建议："
echo "============"

# 检查常见问题
echo "基于诊断结果，可能的解决方案："

# 检查是否所有容器在同一网络
echo ""
echo "1️⃣ 网络连接问题："
if [ -n "$POSTGRES_CONTAINERS" ] && [ -n "$(docker ps --format "{{.Names}}" | grep -E "asset-service|work-order-service")" ]; then
    echo "   建议：确保所有容器在同一 Docker 网络中"
    echo "   命令：docker-compose --env-file .env -f docker-compose.prod.yml down"
    echo "        docker-compose --env-file .env -f docker-compose.prod.yml up -d"
fi

echo ""
echo "2️⃣ 环境变量问题："
echo "   建议：重新启动服务并确保环境变量正确传递"
echo "   命令：./scripts/fix-database-auth.sh"

echo ""
echo "3️⃣ 数据库认证问题："
echo "   建议：验证数据库用户和密码"
if [ -n "$POSTGRES_CONTAINERS" ]; then
    POSTGRES_CONTAINER=$(echo "$POSTGRES_CONTAINERS" | head -1)
    echo "   测试命令：docker exec $POSTGRES_CONTAINER psql -U postgres -d emaintenance -c \"SELECT 1\""
fi

echo ""
echo "4️⃣ 容器启动顺序问题："
echo "   建议：确保 PostgreSQL 完全启动后再启动其他服务"
echo "   命令：docker-compose --env-file .env -f docker-compose.prod.yml up -d postgres"
echo "        sleep 30  # 等待数据库完全启动"
echo "        docker-compose --env-file .env -f docker-compose.prod.yml up -d"

echo ""
echo "📝 详细日志查看："
if [ -n "$(docker ps -a --format "{{.Names}}" | grep asset-service)" ]; then
    ASSET_CONTAINER=$(docker ps -a --format "{{.Names}}" | grep asset-service | head -1)
    echo "  asset-service: docker logs $ASSET_CONTAINER --tail 20"
fi

if [ -n "$(docker ps -a --format "{{.Names}}" | grep work-order-service)" ]; then
    WORKORDER_CONTAINER=$(docker ps -a --format "{{.Names}}" | grep work-order-service | head -1)
    echo "  work-order-service: docker logs $WORKORDER_CONTAINER --tail 20"
fi