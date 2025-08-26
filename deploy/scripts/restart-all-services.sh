#!/bin/bash

# 重启所有服务脚本
# 用途：有序地重新启动整个 Emaintenance 系统的所有服务

set -e

echo "🔄 重启所有服务..."

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
    echo "📋 使用生产配置: $COMPOSE_FILE"
elif [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
    echo "📋 使用配置: $COMPOSE_FILE"
else
    echo "❌ 未找到 docker-compose 配置文件"
    exit 1
fi

echo ""
echo "🛑 第一步：停止所有服务"
echo "=========================="

# 显示当前运行的服务
echo "当前运行的服务："
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(emaintenance|postgres|redis)" || echo "无相关服务运行"

echo ""
echo "停止所有服务..."

# 使用 docker-compose 停止所有服务（保持数据）
docker-compose --env-file .env -f "$COMPOSE_FILE" stop

echo "✅ 所有服务已停止"

echo ""
echo "🚀 第二步：按依赖顺序启动服务"
echo "================================"

# 1. 首先启动基础设施服务
echo "1️⃣ 启动基础设施服务 (PostgreSQL + Redis)..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d postgres redis

echo "⏳ 等待数据库和缓存启动..."
sleep 15

# 验证基础设施
echo "🧪 验证基础设施服务..."
POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep postgres | head -1)
REDIS_CONTAINER=$(docker ps --format "{{.Names}}" | grep redis | head -1)

if [ -n "$POSTGRES_CONTAINER" ] && docker exec "$POSTGRES_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
    echo "  ✅ PostgreSQL 就绪"
else
    echo "  ❌ PostgreSQL 未就绪"
    exit 1
fi

if [ -n "$REDIS_CONTAINER" ] && docker exec "$REDIS_CONTAINER" redis-cli ping >/dev/null 2>&1; then
    echo "  ✅ Redis 就绪"
else
    echo "  ❌ Redis 未就绪"
    exit 1
fi

# 2. 启动用户服务
echo ""
echo "2️⃣ 启动用户服务..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d user-service

echo "⏳ 等待用户服务启动..."
sleep 20

# 验证用户服务
USER_SERVICE_CONTAINER=$(docker ps --format "{{.Names}}" | grep user-service | head -1)
if [ -n "$USER_SERVICE_CONTAINER" ]; then
    for i in {1..30}; do
        if docker logs "$USER_SERVICE_CONTAINER" 2>&1 | grep -q "Server running on port\|server started"; then
            echo "  ✅ 用户服务启动成功"
            break
        elif docker logs "$USER_SERVICE_CONTAINER" 2>&1 | grep -q "Authentication failed\|Error"; then
            echo "  ❌ 用户服务启动失败"
            docker logs "$USER_SERVICE_CONTAINER" --tail 5
            exit 1
        else
            echo "    等待用户服务启动... ($i/30)"
            sleep 2
        fi
    done
else
    echo "  ❌ 用户服务容器未找到"
    exit 1
fi

# 3. 启动工单服务
echo ""
echo "3️⃣ 启动工单服务..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d work-order-service

echo "⏳ 等待工单服务启动..."
sleep 20

# 验证工单服务
WORKORDER_CONTAINER=$(docker ps --format "{{.Names}}" | grep work-order-service | head -1)
if [ -n "$WORKORDER_CONTAINER" ]; then
    for i in {1..30}; do
        if docker logs "$WORKORDER_CONTAINER" 2>&1 | grep -q "Server running on port\|server started"; then
            echo "  ✅ 工单服务启动成功"
            break
        elif docker logs "$WORKORDER_CONTAINER" 2>&1 | grep -q "Authentication failed\|Error"; then
            echo "  ❌ 工单服务启动失败"
            docker logs "$WORKORDER_CONTAINER" --tail 5
            exit 1
        else
            echo "    等待工单服务启动... ($i/30)"
            sleep 2
        fi
    done
else
    echo "  ❌ 工单服务容器未找到"
    exit 1
fi

# 4. 启动资产服务
echo ""
echo "4️⃣ 启动资产服务..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d asset-service

echo "⏳ 等待资产服务启动..."
sleep 20

# 验证资产服务
ASSET_CONTAINER=$(docker ps --format "{{.Names}}" | grep asset-service | head -1)
if [ -n "$ASSET_CONTAINER" ]; then
    for i in {1..30}; do
        if docker logs "$ASSET_CONTAINER" 2>&1 | grep -q "Server running on port\|server started"; then
            echo "  ✅ 资产服务启动成功"
            break
        elif docker logs "$ASSET_CONTAINER" 2>&1 | grep -q "Authentication failed\|Error"; then
            echo "  ❌ 资产服务启动失败"
            docker logs "$ASSET_CONTAINER" --tail 5
            exit 1
        else
            echo "    等待资产服务启动... ($i/30)"
            sleep 2
        fi
    done
else
    echo "  ❌ 资产服务容器未找到"
    exit 1
fi

# 5. 启动 Web 应用
echo ""
echo "5️⃣ 启动 Web 应用..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d web

echo "⏳ 等待 Web 应用启动..."
sleep 15

# 验证 Web 服务
WEB_CONTAINER=$(docker ps --format "{{.Names}}" | grep web | head -1)
if [ -n "$WEB_CONTAINER" ]; then
    echo "  ✅ Web 应用启动"
else
    echo "  ⚠️  Web 应用可能未启动"
fi

# 6. 启动 Nginx 代理
echo ""
echo "6️⃣ 启动 Nginx 代理..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d nginx 2>/dev/null || echo "  ⚠️  Nginx 可能需要单独配置"

echo ""
echo "📊 最终服务状态"
echo "================"

# 显示所有服务状态
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(postgres|redis|user-service|work-order-service|asset-service|web|nginx)"

echo ""
echo "🧪 服务健康检查"
echo "================"

# 健康检查
SERVICES_CHECK=(
    "postgres:pg_isready -U postgres"
    "redis:redis-cli ping"
)

for service_check in "${SERVICES_CHECK[@]}"; do
    IFS=':' read -r service_name check_cmd <<< "$service_check"
    CONTAINER=$(docker ps --format "{{.Names}}" | grep "$service_name" | head -1)
    if [ -n "$CONTAINER" ]; then
        if docker exec "$CONTAINER" sh -c "$check_cmd" >/dev/null 2>&1; then
            echo "  ✅ $service_name: 健康"
        else
            echo "  ❌ $service_name: 不健康"
        fi
    else
        echo "  ❌ $service_name: 未运行"
    fi
done

echo ""
echo "✅ 服务重启完成！"
echo ""
echo "🔍 如果某个服务有问题，查看日志："
echo "  用户服务: docker logs -f $USER_SERVICE_CONTAINER"
echo "  工单服务: docker logs -f $WORKORDER_CONTAINER" 
echo "  资产服务: docker logs -f $ASSET_CONTAINER"
echo ""
echo "🌐 访问地址（如果 Nginx 正常）:"
SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "服务器IP")
echo "  http://$SERVER_IP:3030 (如果配置了 Nginx)"
echo "  直接访问 API："
echo "    用户服务: http://$SERVER_IP:3001/health"
echo "    工单服务: http://$SERVER_IP:3002/health"  
echo "    资产服务: http://$SERVER_IP:3003/health"