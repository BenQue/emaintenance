#!/bin/bash

# 快速启动生产服务（跳过构建，使用已有镜像）
# 用途：当镜像已经构建好，只需要启动服务时使用

set -e

echo "🚀 快速启动 Emaintenance 生产服务..."

# 确保在正确的目录执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$DEPLOY_DIR"

# 检查环境配置
if [ ! -f .env ]; then
    echo "❌ 环境配置文件不存在: .env"
    exit 1
fi

# 加载环境变量
source .env

# 创建临时 docker-compose 文件，移除 build 部分
echo "📝 创建无构建配置..."
cp docker-compose.prod.yml docker-compose.prod-nobuild.yml

# 使用 sed 删除 build 相关配置（保留镜像名称）
# 为每个服务指定已构建的镜像
cat > docker-compose.prod-nobuild.yml <<'EOF'
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16
    container_name: emaintenance-postgres-prod
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-emaintenance}
    ports:
      - "${POSTGRES_PORT:-5433}:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - emaintenance-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: emaintenance-redis-prod
    ports:
      - "${REDIS_PORT:-6380}:6379"
    volumes:
      - redis-data:/data
    networks:
      - emaintenance-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # User Service
  user-service:
    image: local/emaintenance-user-service:latest
    container_name: emaintenance-user-service-prod
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      REDIS_URL: ${REDIS_URL}
      NODE_ENV: production
      PORT: 3001
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    networks:
      - emaintenance-network
    restart: unless-stopped

  # Work Order Service
  work-order-service:
    image: local/emaintenance-work-order-service:latest
    container_name: emaintenance-work-order-service-prod
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      REDIS_URL: ${REDIS_URL}
      USER_SERVICE_URL: http://user-service:3001
      NODE_ENV: production
      PORT: 3002
    ports:
      - "3002:3002"
    depends_on:
      - postgres
      - redis
      - user-service
    networks:
      - emaintenance-network
    restart: unless-stopped

  # Asset Service
  asset-service:
    image: local/emaintenance-asset-service:latest
    container_name: emaintenance-asset-service-prod
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      REDIS_URL: ${REDIS_URL}
      USER_SERVICE_URL: http://user-service:3001
      NODE_ENV: production
      PORT: 3003
    ports:
      - "3003:3003"
    depends_on:
      - postgres
      - redis
      - user-service
    networks:
      - emaintenance-network
    restart: unless-stopped

  # Web Application (如果有构建好的镜像)
  # web:
  #   image: local/emaintenance-web:latest
  #   container_name: emaintenance-web-prod
  #   environment:
  #     NEXT_PUBLIC_USER_SERVICE_URL: http://localhost:3001
  #     NEXT_PUBLIC_WORK_ORDER_SERVICE_URL: http://localhost:3002
  #     NEXT_PUBLIC_ASSET_SERVICE_URL: http://localhost:3003
  #     NODE_ENV: production
  #   ports:
  #     - "3000:3000"
  #   depends_on:
  #     - user-service
  #     - work-order-service
  #     - asset-service
  #   networks:
  #     - emaintenance-network
  #   restart: unless-stopped

networks:
  emaintenance-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
EOF

echo "✅ 配置文件已准备"

# 停止现有服务
echo "🛑 停止现有服务..."
docker-compose -f docker-compose.prod-nobuild.yml down 2>/dev/null || true

# 启动服务
echo "🚀 启动服务..."
docker-compose --env-file .env -f docker-compose.prod-nobuild.yml up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 显示状态
echo ""
echo "📊 服务状态:"
docker-compose -f docker-compose.prod-nobuild.yml ps

echo ""
echo "✅ 快速启动完成！"
echo ""
echo "📝 使用的镜像:"
echo "   - postgres:16"
echo "   - redis:7-alpine"
echo "   - local/emaintenance-user-service:latest"
echo "   - local/emaintenance-work-order-service:latest"
echo "   - local/emaintenance-asset-service:latest"
echo ""
echo "🔍 查看日志:"
echo "   docker-compose -f docker-compose.prod-nobuild.yml logs -f [service]"
echo ""
echo "🛑 停止服务:"
echo "   docker-compose -f docker-compose.prod-nobuild.yml down"