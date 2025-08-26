#!/bin/bash

# 最终修复 Nginx 配置 - 使用最简单可靠的方法
# 用途：确保 Nginx 能够正常代理到运行的服务

set -e

echo "🔧 最终修复 Nginx 配置..."

# 确保在正确的目录执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$DEPLOY_DIR"

# 检查当前运行的服务
echo "🔍 检查当前运行的服务..."
RUNNING_SERVICES=$(docker ps --format "{{.Names}}" | grep -E "(user-service|work-order|asset-service|web|postgres|redis)" || true)

if [ -z "$RUNNING_SERVICES" ]; then
    echo "❌ 没有发现运行的服务，请先启动基础服务"
    exit 1
fi

echo "📋 发现的运行服务:"
echo "$RUNNING_SERVICES"

# 停止问题的 Nginx
echo "🛑 清理现有 Nginx..."
docker stop emaintenance-nginx-prod 2>/dev/null || true
docker rm emaintenance-nginx-prod 2>/dev/null || true

# 获取服务器 IP
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "📋 服务器 IP: $SERVER_IP"

# 检查各个服务的实际端口
USER_SERVICE_PORT=3001
WORK_ORDER_PORT=3002
ASSET_SERVICE_PORT=3003
WEB_PORT=3000

echo "🔍 测试服务连接性..."
for service in "user-service:$USER_SERVICE_PORT" "work-order-service:$WORK_ORDER_PORT" "asset-service:$ASSET_SERVICE_PORT"; do
    IFS=':' read -r name port <<< "$service"
    if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
        echo "  ✅ $name (端口 $port) - 可访问"
    else
        echo "  ⚠️  $name (端口 $port) - 不可访问"
    fi
done

# Web 服务检查
if curl -s "http://localhost:$WEB_PORT" > /dev/null 2>&1; then
    echo "  ✅ web (端口 $WEB_PORT) - 可访问"
    HAS_WEB=true
else
    echo "  ⚠️  web (端口 $WEB_PORT) - 不可访问"
    HAS_WEB=false
fi

# 创建临时目录和配置
mkdir -p temp-nginx-final

# 创建最简单的工作配置
echo "📝 创建最终 Nginx 配置..."
cat > temp-nginx-final/nginx.conf <<'EOF'
events {
    worker_connections 1024;
}

http {
    # 基本 MIME 类型
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for"';
    
    # 基本设置
    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout  65;
    types_hash_max_size 2048;
    
    server {
        listen 80;
        server_name _;
        
        # 增加超时和缓冲区大小
        proxy_connect_timeout       60s;
        proxy_send_timeout          60s;
        proxy_read_timeout          60s;
        proxy_buffer_size           4k;
        proxy_buffers               4 32k;
        proxy_busy_buffers_size     64k;
        client_max_body_size        100M;
        
        # 健康检查
        location /health {
            access_log off;
            return 200 "Nginx is running\n";
            add_header Content-Type text/plain;
        }
        
        # 用户服务 API
        location /api/auth {
            proxy_pass http://host.docker.internal:3001/api/auth;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
        
        location /api/users {
            proxy_pass http://host.docker.internal:3001/api/users;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        location /api/settings {
            proxy_pass http://host.docker.internal:3001/api/settings;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
        
        # 工单服务 API
        location /api/work-orders {
            proxy_pass http://host.docker.internal:3002/api/work-orders;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        location /api/notifications {
            proxy_pass http://host.docker.internal:3002/api/notifications;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
        
        # 资产服务 API
        location /api/assets {
            proxy_pass http://host.docker.internal:3003/api/assets;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
EOF

# 根据 Web 服务是否可用添加相应配置
if [ "$HAS_WEB" = true ]; then
    cat >> temp-nginx-final/nginx.conf <<'EOF'
        
        # Web 应用（所有其他路径）
        location / {
            proxy_pass http://host.docker.internal:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
EOF
else
    cat >> temp-nginx-final/nginx.conf <<'EOF'
        
        # 显示服务状态（没有 Web 应用时）
        location / {
            return 200 "Emaintenance API Gateway\n\n可用服务:\n- /api/auth - 用户认证\n- /api/users - 用户管理\n- /api/work-orders - 工单管理\n- /api/assets - 资产管理\n- /health - 健康检查\n\n状态: 运行中\n";
            add_header Content-Type text/plain;
        }
EOF
fi

cat >> temp-nginx-final/nginx.conf <<'EOF'
    }
}
EOF

# 启动最终的 Nginx 容器
echo "🚀 启动最终 Nginx 配置..."
docker run -d \
    --name emaintenance-nginx-prod \
    --add-host=host.docker.internal:host-gateway \
    -p 3030:80 \
    -v "$DEPLOY_DIR/temp-nginx-final/nginx.conf:/etc/nginx/nginx.conf:ro" \
    --restart unless-stopped \
    nginx:alpine

# 等待启动
echo "⏳ 等待 Nginx 启动..."
sleep 5

# 测试连接
echo "🧪 测试 Nginx..."
NGINX_SUCCESS=false
for i in {1..5}; do
    if curl -s http://localhost:3030/health | grep -q "Nginx is running"; then
        echo "✅ Nginx 启动成功！"
        NGINX_SUCCESS=true
        break
    else
        echo "⏳ 等待启动... ($i/5)"
        sleep 2
    fi
done

if [ "$NGINX_SUCCESS" = false ]; then
    echo "❌ Nginx 启动失败，查看日志:"
    docker logs emaintenance-nginx-prod --tail 20
    exit 1
fi

# 测试 API 连接
echo ""
echo "🧪 测试 API 代理..."
if curl -s "http://localhost:3030/api/auth/health" > /dev/null 2>&1; then
    echo "✅ API 代理工作正常"
else
    echo "⚠️  API 代理可能有问题，但 Nginx 本身正常"
fi

# 显示最终状态
echo ""
echo "📊 最终状态:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep nginx

echo ""
echo "✅ Nginx 最终修复完成!"
echo ""
echo "🌐 访问地址:"
echo "   主应用: http://$SERVER_IP:3030"
echo "   健康检查: http://$SERVER_IP:3030/health"
echo "   用户 API: http://$SERVER_IP:3030/api/auth/health"
echo ""
echo "🔍 故障排除:"
echo "   查看日志: docker logs -f emaintenance-nginx-prod"
echo "   配置文件: $DEPLOY_DIR/temp-nginx-final/nginx.conf"
echo "   重启服务: docker restart emaintenance-nginx-prod"