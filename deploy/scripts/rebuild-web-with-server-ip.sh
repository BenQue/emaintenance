#!/bin/bash

# 重新构建 Web 服务并配置正确的服务器 IP
# 用途：修复前端连接 localhost 的问题

set -e

echo "🔧 重新构建 Web 服务（使用服务器 IP）..."

# 确保在正确的目录执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# 获取服务器 IP
SERVER_IP=$(hostname -I | awk '{print $1}')
if [ -z "$SERVER_IP" ]; then
    echo "⚠️  无法自动获取服务器 IP"
    read -p "请输入服务器 IP 地址: " SERVER_IP
fi

echo "📋 服务器 IP: $SERVER_IP"

# 停止现有 Web 服务
echo "🛑 停止现有 Web 服务..."
docker stop emaintenance-web-prod 2>/dev/null || true
docker rm emaintenance-web-prod 2>/dev/null || true

# 删除旧镜像
echo "🧹 清理旧镜像..."
docker rmi local/emaintenance-web:latest 2>/dev/null || true

# 构建新的 Web 镜像，使用正确的 API URL
echo "🔨 构建 Web 服务（配置服务器 IP）..."
docker build \
    -f apps/web/Dockerfile \
    -t local/emaintenance-web:latest \
    --build-arg NEXT_PUBLIC_USER_SERVICE_URL=http://${SERVER_IP}:3001 \
    --build-arg NEXT_PUBLIC_WORK_ORDER_SERVICE_URL=http://${SERVER_IP}:3002 \
    --build-arg NEXT_PUBLIC_ASSET_SERVICE_URL=http://${SERVER_IP}:3003 \
    --build-arg NEXT_PUBLIC_API_URL=http://${SERVER_IP}:3001 \
    --build-arg NODE_ENV=production \
    .

echo "✅ Web 服务构建完成"

# 重新创建 docker-compose 配置（使用 Nginx 代理）
cat > "$DEPLOY_DIR/docker-compose.web-proxy.yml" <<EOF
version: '3.8'

services:
  # Web Application
  web:
    image: local/emaintenance-web:latest
    container_name: emaintenance-web-prod
    environment:
      NODE_ENV: production
    networks:
      - deploy_emaintenance-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx Reverse Proxy (整合所有服务)
  nginx:
    image: nginx:alpine
    container_name: emaintenance-nginx-prod
    ports:
      - "${NGINX_HTTP_PORT:-3030}:80"
      - "${NGINX_HTTPS_PORT:-3443}:443"
    volumes:
      - $DEPLOY_DIR/configs/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - $DEPLOY_DIR/configs/nginx/conf.d:/etc/nginx/conf.d:ro
    depends_on:
      - web
    networks:
      - deploy_emaintenance-network
    restart: unless-stopped

networks:
  deploy_emaintenance-network:
    external: true
EOF

# 更新 Nginx 配置，统一代理所有服务
cat > "$DEPLOY_DIR/configs/nginx/conf.d/unified.conf" <<'NGINX_CONFIG'
# 上游服务定义
upstream web {
    server web:3000;
}

upstream user-service {
    server emaintenance-user-service-prod:3001;
}

upstream work-order-service {
    server emaintenance-work-order-service-prod:3002;
}

upstream asset-service {
    server emaintenance-asset-service-prod:3003;
}

server {
    listen 80;
    server_name _;
    
    client_max_body_size 100M;
    
    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # 用户服务 API
    location /api/auth {
        proxy_pass http://user-service/api/auth;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/users {
        proxy_pass http://user-service/api/users;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/settings {
        proxy_pass http://user-service/api/settings;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 工单服务 API
    location /api/work-orders {
        proxy_pass http://work-order-service/api/work-orders;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/notifications {
        proxy_pass http://work-order-service/api/notifications;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 资产服务 API  
    location /api/assets {
        proxy_pass http://asset-service/api/assets;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Web 应用（所有其他路径）
    location / {
        proxy_pass http://web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_CONFIG

echo "✅ Nginx 配置已更新"

# 启动服务
echo "🚀 启动 Web 和 Nginx 服务..."
cd "$DEPLOY_DIR"
docker-compose --env-file .env -f docker-compose.web-proxy.yml up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 15

# 显示状态
echo ""
echo "📊 服务状态:"
docker ps | grep -E "web|nginx"

echo ""
echo "✅ Web 服务已重新构建并启动!"
echo ""
echo "🌐 访问地址:"
echo "   主应用: http://$SERVER_IP:3030"
echo ""
echo "📡 API 已配置为:"
echo "   用户服务: http://$SERVER_IP:3001"
echo "   工单服务: http://$SERVER_IP:3002"
echo "   资产服务: http://$SERVER_IP:3003"
echo ""
echo "🔍 查看日志:"
echo "   docker logs -f emaintenance-web-prod"
echo "   docker logs -f emaintenance-nginx-prod"
echo ""
echo "📝 注意：Web 服务现在使用服务器 IP 而不是 localhost"