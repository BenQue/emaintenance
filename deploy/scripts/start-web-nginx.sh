#!/bin/bash

# 启动 Web 和 Nginx 服务脚本
# 用途：在 API 服务启动后，添加前端服务

set -e

echo "🌐 启动 Web 和 Nginx 服务..."

# 确保在正确的目录执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# 加载环境变量
if [ -f "$DEPLOY_DIR/.env" ]; then
    source "$DEPLOY_DIR/.env"
else
    echo "❌ 环境文件不存在"
    exit 1
fi

# 检查 Web 镜像是否存在
echo "🔍 检查 Web 服务镜像..."
if docker images | grep -q "emaintenance-web"; then
    echo "✅ Web 镜像已存在"
else
    echo "🔨 构建 Web 服务镜像..."
    
    # 构建 Web 服务
    docker build \
        -f apps/web/Dockerfile \
        -t local/emaintenance-web:latest \
        --build-arg NODE_ENV=production \
        .
fi

# 创建 Web 和 Nginx 的 docker-compose 配置
cat > "$DEPLOY_DIR/docker-compose.web.yml" <<EOF
version: '3.8'

services:
  # Web Application
  web:
    image: local/emaintenance-web:latest
    container_name: emaintenance-web-prod
    environment:
      NEXT_PUBLIC_USER_SERVICE_URL: ${NEXT_PUBLIC_USER_SERVICE_URL:-http://user-service:3001}
      NEXT_PUBLIC_WORK_ORDER_SERVICE_URL: ${NEXT_PUBLIC_WORK_ORDER_SERVICE_URL:-http://work-order-service:3002}
      NEXT_PUBLIC_ASSET_SERVICE_URL: ${NEXT_PUBLIC_ASSET_SERVICE_URL:-http://asset-service:3003}
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://user-service:3001}
      NODE_ENV: production
    ports:
      - "3000:3000"
    networks:
      - deploy_emaintenance-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx Reverse Proxy
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
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  deploy_emaintenance-network:
    external: true
EOF

# 创建 Nginx 配置
echo "📝 创建 Nginx 配置..."
mkdir -p "$DEPLOY_DIR/configs/nginx/conf.d"

cat > "$DEPLOY_DIR/configs/nginx/nginx.conf" <<'NGINX_CONF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    keepalive_timeout 65;
    gzip on;

    include /etc/nginx/conf.d/*.conf;
}
NGINX_CONF

cat > "$DEPLOY_DIR/configs/nginx/conf.d/default.conf" <<'NGINX_DEFAULT'
upstream web {
    server web:3000;
}

upstream user-service {
    server user-service:3001;
}

upstream work-order-service {
    server work-order-service:3002;
}

upstream asset-service {
    server asset-service:3003;
}

server {
    listen 80;
    server_name _;
    
    client_max_body_size 100M;
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # API routes
    location /api/users {
        proxy_pass http://user-service;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/work-orders {
        proxy_pass http://work-order-service;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/assets {
        proxy_pass http://asset-service;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Web application
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
NGINX_DEFAULT

echo "✅ Nginx 配置已创建"

# 启动 Web 和 Nginx
echo "🚀 启动 Web 和 Nginx 服务..."
cd "$DEPLOY_DIR"
docker-compose --env-file .env -f docker-compose.web.yml up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 20

# 显示状态
echo ""
echo "📊 服务状态:"
docker-compose -f docker-compose.web.yml ps

# 显示访问信息
SERVER_IP=$(hostname -I | awk '{print $1}')
NGINX_PORT="${NGINX_HTTP_PORT:-3030}"
echo ""
echo "✅ Web 和 Nginx 服务已启动!"
echo ""
echo "🌐 访问地址:"
echo "   Web 应用: http://$SERVER_IP:$NGINX_PORT"
echo "   直接访问: http://$SERVER_IP:3000"
echo ""
echo "📡 API 端点:"
echo "   用户服务: http://$SERVER_IP/api/users"
echo "   工单服务: http://$SERVER_IP/api/work-orders"
echo "   资产服务: http://$SERVER_IP/api/assets"
echo ""
echo "🔍 查看日志:"
echo "   docker logs -f emaintenance-web-prod"
echo "   docker logs -f emaintenance-nginx-prod"