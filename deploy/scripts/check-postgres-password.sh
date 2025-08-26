#!/bin/bash

# PostgreSQL 密码检查脚本
# 用途：快速检查和验证 PostgreSQL 密码配置

set -e

echo "🔐 检查 PostgreSQL 密码配置..."

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
echo "📋 配置信息检查:"
echo "================"
echo "POSTGRES_PASSWORD (从 .env): ${POSTGRES_PASSWORD:0:3}***"
echo "DATABASE_URL: $DATABASE_URL"

# 解析 DATABASE_URL 中的密码
if [[ $DATABASE_URL =~ postgresql://[^:]+:([^@]+)@.+ ]]; then
    URL_PASSWORD="${BASH_REMATCH[1]}"
    echo "DATABASE_URL 中的密码: ${URL_PASSWORD:0:3}***"
    
    if [ "$POSTGRES_PASSWORD" = "$URL_PASSWORD" ]; then
        echo "✅ 环境变量密码一致"
    else
        echo "❌ 环境变量密码不一致！"
        echo "   .env 中的 POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:0:3}***"
        echo "   DATABASE_URL 中的密码: ${URL_PASSWORD:0:3}***"
    fi
else
    echo "⚠️  无法从 DATABASE_URL 解析密码"
fi

# 查找 PostgreSQL 容器
POSTGRES_CONTAINER=$(docker ps -a --format "{{.Names}}" | grep postgres | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo ""
    echo "❌ 未找到 PostgreSQL 容器"
    exit 1
fi

echo ""
echo "🐳 容器信息:"
echo "============"
echo "容器名称: $POSTGRES_CONTAINER"
CONTAINER_STATUS=$(docker ps -a --format "{{.Status}}" --filter "name=$POSTGRES_CONTAINER")
echo "容器状态: $CONTAINER_STATUS"

# 检查容器是否运行
if docker ps --format "{{.Names}}" | grep -q "^${POSTGRES_CONTAINER}$"; then
    echo "✅ 容器正在运行"
    
    # 检查容器内的环境变量
    echo ""
    echo "🔍 容器环境变量:"
    echo "================"
    CONTAINER_POSTGRES_PASSWORD=$(docker exec "$POSTGRES_CONTAINER" printenv POSTGRES_PASSWORD 2>/dev/null || echo "未设置")
    echo "容器内 POSTGRES_PASSWORD: ${CONTAINER_POSTGRES_PASSWORD:0:3}***"
    
    if [ "$POSTGRES_PASSWORD" = "$CONTAINER_POSTGRES_PASSWORD" ]; then
        echo "✅ 容器环境变量匹配"
    else
        echo "❌ 容器环境变量不匹配！"
    fi
    
    # 测试数据库连接
    echo ""
    echo "🧪 连接测试:"
    echo "==========="
    
    # 测试1: 使用 .env 文件中的密码
    echo "测试 .env 文件密码..."
    if docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_CONTAINER" psql -U postgres -c "SELECT 'Connection successful' as status;" 2>/dev/null; then
        echo "✅ .env 密码连接成功"
    else
        echo "❌ .env 密码连接失败"
    fi
    
    # 测试2: 使用 DATABASE_URL 中的密码（如果不同）
    if [ "$POSTGRES_PASSWORD" != "$URL_PASSWORD" ] && [ -n "$URL_PASSWORD" ]; then
        echo "测试 DATABASE_URL 密码..."
        if docker exec -e PGPASSWORD="$URL_PASSWORD" "$POSTGRES_CONTAINER" psql -U postgres -c "SELECT 'Connection successful' as status;" 2>/dev/null; then
            echo "✅ DATABASE_URL 密码连接成功"
        else
            echo "❌ DATABASE_URL 密码连接失败"
        fi
    fi
    
    # 测试3: 无密码连接（检查是否配置了密码）
    echo "测试无密码连接..."
    if docker exec "$POSTGRES_CONTAINER" psql -U postgres -c "SELECT 'No password required' as status;" 2>/dev/null; then
        echo "⚠️  无密码也能连接（密码未正确设置）"
    else
        echo "✅ 需要密码才能连接（密码保护已启用）"
    fi
    
    # 显示最近的认证失败日志
    echo ""
    echo "📋 最近的认证失败日志:"
    echo "======================"
    docker logs "$POSTGRES_CONTAINER" 2>&1 | grep -E "(FATAL|authentication failed)" | tail -5 || echo "无认证失败日志"
    
else
    echo "❌ 容器未运行"
fi

echo ""
echo "🔧 解决建议:"
echo "==========="

if [ "$POSTGRES_PASSWORD" != "$URL_PASSWORD" ]; then
    echo "1️⃣ 修复环境变量不一致:"
    echo "   编辑 .env 文件，确保 POSTGRES_PASSWORD 和 DATABASE_URL 中的密码一致"
fi

echo "2️⃣ 如果密码认证失败:"
echo "   运行密码修复脚本: ./scripts/fix-postgres-password.sh"

echo "3️⃣ 如果问题持续:"
echo "   考虑重建数据库容器（会丢失数据）:"
echo "   docker-compose down postgres"
echo "   docker volume rm \$(docker volume ls -q | grep postgres)"
echo "   docker-compose --env-file .env up -d postgres"

echo ""
echo "📝 检查完成！"