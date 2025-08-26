#!/bin/bash

# 修复 Nginx 端口发布问题
# 用途：确保 Nginx 容器正确发布端口

set -e

echo "🔧 修复 Nginx 端口发布问题..."

# 确保在正确的目录执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$DEPLOY_DIR"

# 加载环境变量
if [ -f .env ]; then
    source .env
else
    echo "❌ 环境文件不存在"
    exit 1
fi

# 设置默认端口
NGINX_HTTP_PORT=${NGINX_HTTP_PORT:-3030}
NGINX_HTTPS_PORT=${NGINX_HTTPS_PORT:-3443}

echo "📋 使用端口: HTTP=$NGINX_HTTP_PORT, HTTPS=$NGINX_HTTPS_PORT"

# 停止现有 Nginx
echo "🛑 停止现有 Nginx 容器..."
docker stop emaintenance-nginx-prod 2>/dev/null || true
docker rm emaintenance-nginx-prod 2>/dev/null || true

# 重新创建 docker-compose 配置（明确指定端口）
echo "📝 重新创建 docker-compose 配置..."
cat > docker-compose.nginx-fixed.yml <<EOF
version: '3.8'

services:
  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: emaintenance-nginx-prod
    ports:
      - "$NGINX_HTTP_PORT:80"
      - "$NGINX_HTTPS_PORT:443"
    volumes:
      - ./configs/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./configs/nginx/conf.d:/etc/nginx/conf.d:ro
    networks:
      - deploy_emaintenance-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  deploy_emaintenance-network:
    external: true
EOF

# 检查网络是否存在
if ! docker network ls | grep -q deploy_emaintenance-network; then
    echo "⚠️  网络不存在，创建网络..."
    docker network create deploy_emaintenance-network
fi

# 启动 Nginx
echo "🚀 启动 Nginx..."
docker-compose -f docker-compose.nginx-fixed.yml up -d

# 等待启动
sleep 5

# 验证端口
echo "🔍 验证端口发布..."
docker ps | grep nginx
echo ""
echo "📊 端口检查:"
if docker ps --format "table {{.Names}}\t{{.Ports}}" | grep nginx; then
    echo "✅ Nginx 端口发布成功"
else
    echo "❌ Nginx 端口发布失败"
    docker logs emaintenance-nginx-prod --tail 20
    exit 1
fi

# 测试连接
echo ""
echo "🧪 测试连接..."
SERVER_IP=$(hostname -I | awk '{print $1}')

if curl -s -o /dev/null -w "%{http_code}" http://localhost:$NGINX_HTTP_PORT/health | grep -q "200"; then
    echo "✅ 本地连接测试成功"
else
    echo "⚠️  本地连接测试失败，检查配置..."
fi

echo ""
echo "✅ Nginx 修复完成!"
echo ""
echo "🌐 访问地址:"
echo "   主应用: http://$SERVER_IP:$NGINX_HTTP_PORT"
echo "   健康检查: http://$SERVER_IP:$NGINX_HTTP_PORT/health"
echo ""
echo "🔍 故障排除:"
echo "   查看日志: docker logs -f emaintenance-nginx-prod"
echo "   检查端口: docker ps | grep nginx"
echo "   测试连接: curl -I http://localhost:$NGINX_HTTP_PORT/health"