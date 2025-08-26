#!/bin/bash

# 修复 PostgreSQL 密码认证问题
# 用途：解决 PostgreSQL 容器密码不匹配导致的认证失败

set -e

echo "🔐 修复 PostgreSQL 密码认证问题..."

# 确保在正确的目录执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$DEPLOY_DIR"

# 加载环境变量
if [ -f .env ]; then
    source .env
    echo "✅ 环境文件已加载"
    echo "📋 配置的密码: ${POSTGRES_PASSWORD:0:3}***"
else
    echo "❌ 环境文件不存在"
    exit 1
fi

# 查找 PostgreSQL 容器
POSTGRES_CONTAINER=$(docker ps -a --format "{{.Names}}" | grep postgres | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "❌ 未找到 PostgreSQL 容器"
    exit 1
fi

echo "📋 找到 PostgreSQL 容器: $POSTGRES_CONTAINER"

# 检查容器状态
CONTAINER_STATUS=$(docker ps -a --format "{{.Status}}" --filter "name=$POSTGRES_CONTAINER")
echo "📊 容器状态: $CONTAINER_STATUS"

# 如果容器正在运行，先停止所有依赖服务
if docker ps --format "{{.Names}}" | grep -q "$POSTGRES_CONTAINER"; then
    echo "🛑 停止依赖服务..."
    
    # 停止所有 API 服务（避免连接冲突）
    DEPENDENT_SERVICES=$(docker ps --format "{{.Names}}" | grep -E "(user-service|work-order-service|asset-service)" || true)
    if [ -n "$DEPENDENT_SERVICES" ]; then
        for service in $DEPENDENT_SERVICES; do
            echo "  停止 $service..."
            docker stop "$service" 2>/dev/null || true
        done
    fi
    
    echo "🛑 停止 PostgreSQL 容器..."
    docker stop "$POSTGRES_CONTAINER"
fi

# 删除现有容器（保留数据卷）
echo "🗑️  删除现有 PostgreSQL 容器（保留数据）..."
docker rm "$POSTGRES_CONTAINER" 2>/dev/null || true

# 方案1: 重新创建 PostgreSQL 容器，使用正确的密码
echo ""
echo "🔧 解决方案 1: 重新创建 PostgreSQL 容器"
echo "============================================"

# 检查是否有 docker-compose 文件
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
elif [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
else
    echo "❌ 未找到 docker-compose 文件"
    exit 1
fi

echo "📋 使用配置文件: $COMPOSE_FILE"

# 重新启动 PostgreSQL（会使用 .env 文件中的密码）
echo "🚀 重新启动 PostgreSQL..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d postgres

# 等待 PostgreSQL 启动
echo "⏳ 等待 PostgreSQL 启动..."
for i in {1..60}; do
    if docker exec "$POSTGRES_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
        echo "✅ PostgreSQL 启动成功"
        break
    else
        echo "  等待中... ($i/60)"
        sleep 2
    fi
done

# 验证密码是否正确
echo ""
echo "🧪 验证密码认证..."

# 使用环境变量中的密码测试连接
if docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_CONTAINER" psql -U postgres -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ 密码认证成功！"
    PASSWORD_FIXED=true
else
    echo "❌ 密码认证仍然失败"
    PASSWORD_FIXED=false
fi

# 如果方案1失败，尝试方案2：重置密码
if [ "$PASSWORD_FIXED" = false ]; then
    echo ""
    echo "🔧 解决方案 2: 重置 PostgreSQL 密码"
    echo "===================================="
    
    echo "🛑 停止 PostgreSQL 容器..."
    docker stop "$POSTGRES_CONTAINER"
    
    echo "🔧 以单用户模式启动 PostgreSQL 并重置密码..."
    
    # 临时启动容器进行密码重置
    docker run --rm -d \
        --name temp-postgres-reset \
        -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_DB=emaintenance \
        -v "$(docker volume ls -q | grep postgres)":/var/lib/postgresql/data \
        postgres:16
    
    # 等待启动
    sleep 10
    
    # 重置密码
    docker exec temp-postgres-reset psql -U postgres -c "ALTER USER postgres PASSWORD '${POSTGRES_PASSWORD}';"
    
    # 停止临时容器
    docker stop temp-postgres-reset
    
    # 重新启动正常容器
    docker-compose --env-file .env -f "$COMPOSE_FILE" up -d postgres
    
    # 等待启动并再次验证
    sleep 15
    if docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_CONTAINER" psql -U postgres -c "SELECT 1;" >/dev/null 2>&1; then
        echo "✅ 密码重置成功！"
        PASSWORD_FIXED=true
    else
        echo "❌ 密码重置失败"
    fi
fi

# 如果还是失败，提供手动解决方案
if [ "$PASSWORD_FIXED" = false ]; then
    echo ""
    echo "🔧 解决方案 3: 手动重建数据库"
    echo "=============================="
    echo "⚠️  自动修复失败，可能需要重建数据库"
    echo ""
    echo "手动步骤："
    echo "1. 备份重要数据（如果有）"
    echo "2. 删除 PostgreSQL 数据卷："
    echo "   docker volume rm \$(docker volume ls -q | grep postgres)"
    echo "3. 重新启动服务："
    echo "   docker-compose --env-file .env -f $COMPOSE_FILE up -d postgres"
    echo "4. 重新初始化数据库："
    echo "   ./scripts/initialize-database.sh"
    exit 1
fi

# 重新启动依赖服务
echo ""
echo "🚀 重新启动服务..."

# 等待 PostgreSQL 完全就绪
echo "⏳ 等待 PostgreSQL 完全就绪..."
sleep 10

# 启动服务（按依赖顺序）
echo "🚀 启动用户服务..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d user-service
sleep 15

echo "🚀 启动工单服务..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d work-order-service
sleep 10

echo "🚀 启动资产服务..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d asset-service
sleep 10

# 验证所有服务
echo ""
echo "🧪 验证服务状态..."

SERVICES=("user-service" "work-order-service" "asset-service")
ALL_HEALTHY=true

for service in "${SERVICES[@]}"; do
    CONTAINER=$(docker ps --format "{{.Names}}" | grep "$service" | head -1)
    if [ -n "$CONTAINER" ]; then
        # 等待服务启动
        echo "⏳ 等待 $service 启动..."
        for i in {1..30}; do
            if docker logs "$CONTAINER" 2>&1 | grep -q "Server running on port\|server started"; then
                echo "  ✅ $service 启动成功"
                break
            elif docker logs "$CONTAINER" 2>&1 | grep -q "Authentication failed"; then
                echo "  ❌ $service 仍有认证问题"
                ALL_HEALTHY=false
                break
            else
                if [ $i -eq 30 ]; then
                    echo "  ⚠️  $service 启动状态未知"
                    ALL_HEALTHY=false
                else
                    sleep 2
                fi
            fi
        done
    else
        echo "  ❌ $service 容器未运行"
        ALL_HEALTHY=false
    fi
done

# 显示最终状态
echo ""
echo "📊 最终状态:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(postgres|user-service|work-order-service|asset-service)"

if [ "$ALL_HEALTHY" = true ]; then
    echo ""
    echo "✅ PostgreSQL 密码问题已修复，所有服务正常运行！"
    echo ""
    echo "🔐 数据库连接信息:"
    echo "   主机: postgres (容器内) / localhost:5432 (外部)"
    echo "   用户: postgres"
    echo "   数据库: emaintenance"
    echo "   密码: ${POSTGRES_PASSWORD:0:3}***"
else
    echo ""
    echo "⚠️  部分服务可能仍有问题，请检查日志:"
    for service in "${SERVICES[@]}"; do
        CONTAINER=$(docker ps --format "{{.Names}}" | grep "$service" | head -1)
        if [ -n "$CONTAINER" ]; then
            echo "   $service: docker logs $CONTAINER --tail 10"
        fi
    done
fi