#!/bin/bash

# 直接启动容器（强制使用现有镜像，不重新构建）
# 用途：当镜像存在时，强制跳过构建直接启动容器

set -e

echo "🚀 直接启动容器（使用现有镜像）..."

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
echo "🔍 检查现有镜像"
echo "==============="

# 列出相关镜像
echo "现有的相关镜像："
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}" | grep -E "(emaintenance|deploy)" | head -10

echo ""
echo "🛑 停止和清理现有容器"
echo "===================="

# 停止所有相关容器
echo "停止现有容器..."
docker-compose -f docker-compose.prod.yml stop 2>/dev/null || true

# 删除现有容器但保留镜像
echo "删除容器（保留镜像）..."
docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true

echo ""
echo "🏗️  创建临时 compose 文件（仅使用镜像）"
echo "========================================"

# 创建一个临时的 docker-compose 文件，强制使用现有镜像
cat > docker-compose.temp.yml <<EOF
version: '3.8'

networks:
  emaintenance-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  uploads-data:

services:
  # Database
  postgres:
    image: postgres:16
    container_name: emaintenance-postgres-prod
    environment:
      POSTGRES_DB: emaintenance
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - emaintenance-network
    restart: unless-stopped

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: emaintenance-redis-prod
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - emaintenance-network
    restart: unless-stopped

  # User Service - 使用现有镜像
  user-service:
    image: deploy_user-service:latest
    container_name: emaintenance-user-service-prod
    environment:
      DATABASE_URL: \${DATABASE_URL}
      JWT_SECRET: \${JWT_SECRET}
      REDIS_URL: \${REDIS_URL}
      NODE_ENV: \${NODE_ENV:-production}
      PORT: 3001
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    networks:
      - emaintenance-network
    restart: unless-stopped

  # Work Order Service - 使用现有镜像
  work-order-service:
    image: deploy_work-order-service:latest
    container_name: emaintenance-work-order-service-prod
    environment:
      DATABASE_URL: \${DATABASE_URL}
      JWT_SECRET: \${JWT_SECRET}
      REDIS_URL: \${REDIS_URL}
      NODE_ENV: \${NODE_ENV:-production}
      PORT: 3002
      USER_SERVICE_URL: \${USER_SERVICE_URL}
    ports:
      - "3002:3002"
    volumes:
      - uploads-data:/app/uploads
    depends_on:
      - postgres
      - redis
      - user-service
    networks:
      - emaintenance-network
    restart: unless-stopped

  # Asset Service - 使用现有镜像
  asset-service:
    image: deploy_asset-service:latest
    container_name: emaintenance-asset-service-prod
    environment:
      DATABASE_URL: \${DATABASE_URL}
      JWT_SECRET: \${JWT_SECRET}
      REDIS_URL: \${REDIS_URL}
      NODE_ENV: \${NODE_ENV:-production}
      PORT: 3003
      USER_SERVICE_URL: \${USER_SERVICE_URL}
    ports:
      - "3003:3003"
    depends_on:
      - postgres
      - redis
      - user-service
    networks:
      - emaintenance-network
    restart: unless-stopped
EOF

echo "✅ 临时 compose 文件已创建"

echo ""
echo "🚀 启动服务"
echo "==========="

# 启动基础设施
echo "1️⃣ 启动基础设施服务..."
docker-compose --env-file .env -f docker-compose.temp.yml up -d postgres redis

echo "等待数据库启动..."
sleep 15

# 验证数据库
POSTGRES_READY=false
for i in {1..30}; do
    if docker exec emaintenance-postgres-prod pg_isready -U postgres >/dev/null 2>&1; then
        echo "✅ PostgreSQL 就绪"
        POSTGRES_READY=true
        break
    else
        echo "⏳ 等待 PostgreSQL... ($i/30)"
        sleep 2
    fi
done

if [ "$POSTGRES_READY" = false ]; then
    echo "❌ PostgreSQL 未能启动"
    exit 1
fi

# 启动用户服务
echo ""
echo "2️⃣ 启动用户服务..."
docker-compose --env-file .env -f docker-compose.temp.yml up -d user-service

echo "等待用户服务启动..."
sleep 20

# 检查用户服务
if docker logs emaintenance-user-service-prod 2>&1 | grep -q "Server running on port\|server started"; then
    echo "✅ 用户服务启动成功"
else
    echo "⚠️  用户服务状态："
    docker logs emaintenance-user-service-prod --tail 5
fi

# 启动其他服务
echo ""
echo "3️⃣ 启动其他服务..."
docker-compose --env-file .env -f docker-compose.temp.yml up -d work-order-service asset-service

echo "等待服务启动..."
sleep 20

# 检查所有服务
echo ""
echo "📊 服务状态检查"
echo "==============="

SERVICES=("work-order-service" "asset-service")
for service in "\${SERVICES[@]}"; do
    CONTAINER_NAME="emaintenance-\${service}-prod"
    echo ""
    echo "检查 \$service..."
    
    if docker ps | grep -q "\$CONTAINER_NAME"; then
        echo "  ✅ 容器运行中"
        
        # 显示最新日志
        echo "  📋 最新日志："
        docker logs "\$CONTAINER_NAME" --tail 3 | sed 's/^/    /'
        
        # 简单健康检查
        if docker logs "\$CONTAINER_NAME" 2>&1 | grep -q "Server running on port\|server started"; then
            echo "  ✅ 服务启动成功"
        elif docker logs "\$CONTAINER_NAME" 2>&1 | grep -q "Authentication failed"; then
            echo "  ⚠️  数据库认证问题"
        else
            echo "  🔄 服务可能还在启动"
        fi
    else
        echo "  ❌ 容器未运行"
    fi
done

# 显示最终状态
echo ""
echo "📊 最终状态"
echo "==========="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep emaintenance

echo ""
echo "✅ 容器启动完成！"
echo ""
echo "🧹 清理临时文件"
rm -f docker-compose.temp.yml

echo ""
echo "📝 后续步骤："
echo "1. 如果所有服务正常，可以配置 Nginx："
echo "   ./scripts/fix-nginx-final.sh"
echo ""
echo "2. 如果有数据库认证问题："
echo "   ./scripts/check-postgres-password.sh"
echo ""
echo "3. 查看详细日志："
echo "   docker logs -f emaintenance-user-service-prod"
echo "   docker logs -f emaintenance-work-order-service-prod"  
echo "   docker logs -f emaintenance-asset-service-prod"
EOF