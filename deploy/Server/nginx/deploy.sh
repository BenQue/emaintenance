#!/bin/bash

# E-Maintenance Nginx 反向代理部署脚本
# 最后部署的统一入口服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "=========================================="
echo "  E-Maintenance Nginx 反向代理部署"
echo "  版本: v2.0"
echo "  端口: 3030 (HTTP), 3443 (HTTPS)"
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查所有依赖服务
log_info "检查所有后端服务状态..."

REQUIRED_SERVICES=(
    "emaintenance-user-service:3001"
    "emaintenance-work-order-service:3002"
    "emaintenance-asset-service:3003"
    "emaintenance-web-service:3000"
)

ALL_SERVICES_READY=true

for service_info in "${REQUIRED_SERVICES[@]}"; do
    service_name=$(echo "$service_info" | cut -d':' -f1)
    service_port=$(echo "$service_info" | cut -d':' -f2)
    
    # 简化检测逻辑，只检查容器是否运行
    if docker ps --filter "name=${service_name}" --filter "status=running" --format "{{.Names}}" | grep -q "^${service_name}$"; then
        log_success "$service_name 运行正常"
    else
        log_error "$service_name 未运行"
        ALL_SERVICES_READY=false
    fi
done

if [ "$ALL_SERVICES_READY" = false ]; then
    log_error "部分后端服务未就绪，请先部署所有后端服务"
    echo ""
    log_info "部署顺序："
    echo "  cd ../user-service && ./deploy.sh"
    echo "  cd ../work-order-service && ./deploy.sh"
    echo "  cd ../asset-service && ./deploy.sh"
    echo "  cd ../web-service && ./deploy.sh"
    exit 1
fi

# 生成 Nginx 配置
log_info "生成 Nginx 配置文件..."
mkdir -p configs

cat > configs/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # 基础配置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_comp_level 6;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # 上游服务定义 - 使用容器网络中的服务名
    upstream user_service {
        server emaintenance-user-service:3001 max_fails=3 fail_timeout=30s;
        keepalive 16;
    }

    upstream work_order_service {
        server emaintenance-work-order-service:3002 max_fails=3 fail_timeout=30s;
        keepalive 16;
    }

    upstream asset_service {
        server emaintenance-asset-service:3003 max_fails=3 fail_timeout=30s;
        keepalive 16;
    }

    upstream web_service {
        server emaintenance-web-service:3000 max_fails=3 fail_timeout=30s;
        keepalive 16;
    }

    # 主服务器配置
    server {
        listen 80;
        server_name _;
        
        # 安全头
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;

        # 健康检查
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # API 路由
        location ~ ^/api/auth(.*)$ {
            proxy_pass http://user_service/api/auth$1$is_args$args;
            include /etc/nginx/proxy_params;
        }

        location ~ ^/api/users(.*)$ {
            proxy_pass http://user_service/api/users$1$is_args$args;
            include /etc/nginx/proxy_params;
        }

        location ~ ^/api/settings(.*)$ {
            proxy_pass http://user_service/api/settings$1$is_args$args;
            include /etc/nginx/proxy_params;
        }

        location ~ ^/api/work-orders(.*)$ {
            proxy_pass http://work_order_service/api/work-orders$1$is_args$args;
            include /etc/nginx/proxy_params;
        }

        location ~ ^/api/assignment-rules(.*)$ {
            proxy_pass http://work_order_service/api/assignment-rules$1$is_args$args;
            include /etc/nginx/proxy_params;
        }

        location ~ ^/api/notifications(.*)$ {
            proxy_pass http://work_order_service/api/notifications$1$is_args$args;
            include /etc/nginx/proxy_params;
        }

        location ~ ^/api/assets(.*)$ {
            proxy_pass http://asset_service/api/assets$1$is_args$args;
            include /etc/nginx/proxy_params;
        }

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://web_service;
            include /etc/nginx/proxy_params;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Next.js 特殊路由
        location /_next/ {
            proxy_pass http://web_service;
            include /etc/nginx/proxy_params;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Web 应用主路由
        location / {
            proxy_pass http://web_service;
            include /etc/nginx/proxy_params;
        }
    }
}
EOF

cat > configs/proxy_params << 'EOF'
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "";
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_cache_bypass $http_upgrade;
proxy_connect_timeout 30s;
proxy_send_timeout 30s;
proxy_read_timeout 30s;
proxy_buffering off;
EOF

# 创建 Docker Compose 配置
cat > docker-compose.yml << 'EOF'
networks:
  emaintenance-network:
    external: true

services:
  nginx:
    image: nginx:alpine
    container_name: emaintenance-nginx
    ports:
      - "3030:80"
      - "3443:443"
    volumes:
      - ./configs/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./configs/proxy_params:/etc/nginx/proxy_params:ro
      - nginx-logs:/var/log/nginx
      - /opt/emaintenance/logs/nginx:/backup/logs
    networks:
      - emaintenance-network
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M

volumes:
  nginx-logs:
EOF

# 创建日志目录
log_info "创建 Nginx 日志目录..."
sudo mkdir -p /opt/emaintenance/logs/nginx
sudo chown -R $USER:$USER /opt/emaintenance/logs/

# 停止现有的 Nginx
log_info "停止现有 Nginx 服务..."
docker-compose down 2>/dev/null || true

# 启动 Nginx
log_info "启动 Nginx 反向代理..."
docker-compose up -d nginx

# 等待 Nginx 启动
log_info "等待 Nginx 启动..."
sleep 10

# 测试 Nginx 配置
log_info "测试 Nginx 配置..."
if docker exec emaintenance-nginx nginx -t; then
    log_success "Nginx 配置测试通过"
else
    log_error "Nginx 配置有误"
    exit 1
fi

# 执行健康检查
log_info "执行系统总体健康检查..."
./health-check.sh

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    log_success "🎉 E-Maintenance 系统部署完成！"
    echo "=========================================="
    echo ""
    log_info "🌐 系统访问地址:"
    echo "  主应用: http://$(hostname -I | awk '{print $1}'):3030"
    echo "  健康检查: http://$(hostname -I | awk '{print $1}'):3030/health"
    echo ""
    log_info "📋 默认管理员账号:"
    echo "  用户名: admin@emaintenance.com"
    echo "  密码: admin123"
    echo ""
    log_info "🔧 服务端口映射:"
    echo "  Nginx (主入口): 3030, 3443"
    echo "  Web 应用: 3000 (内部)"
    echo "  用户服务: 3001 (内部)"
    echo "  工单服务: 3002 (内部)"
    echo "  资产服务: 3003 (内部)"
    echo "  PostgreSQL: ${POSTGRES_PORT:-5432}"
    echo "  Redis: ${REDIS_PORT:-6380}"
    echo ""
    log_info "📊 系统监控:"
    echo "  查看所有服务: docker ps"
    echo "  查看系统日志: cd ../scripts && ./system-status.sh"
    echo "  备份数据: cd ../scripts && ./backup-all.sh"
else
    log_error "系统健康检查失败，请查看具体服务状态"
fi