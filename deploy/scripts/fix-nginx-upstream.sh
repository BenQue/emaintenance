#!/bin/bash

# 修复 Nginx 上游服务连接问题
# 用途：使用正确的容器名称和网络配置

set -e

echo "🔧 修复 Nginx 上游服务连接..."

# 确保在正确的目录执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$DEPLOY_DIR"

# 检查当前运行的服务
echo "🔍 检查当前运行的服务..."
echo "API 服务:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "user-service|work-order|asset-service" || echo "没有找到 API 服务"
echo ""
echo "Web 服务:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep web || echo "没有找到 Web 服务"

# 获取实际的容器名称
USER_SERVICE_CONTAINER=$(docker ps --format "{{.Names}}" | grep user-service | head -1)
WORK_ORDER_CONTAINER=$(docker ps --format "{{.Names}}" | grep work-order | head -1)
ASSET_SERVICE_CONTAINER=$(docker ps --format "{{.Names}}" | grep asset-service | head -1)
WEB_CONTAINER=$(docker ps --format "{{.Names}}" | grep web | head -1)

echo "📋 发现的容器:"
echo "   用户服务: ${USER_SERVICE_CONTAINER:-未找到}"
echo "   工单服务: ${WORK_ORDER_CONTAINER:-未找到}"  
echo "   资产服务: ${ASSET_SERVICE_CONTAINER:-未找到}"
echo "   Web 服务: ${WEB_CONTAINER:-未找到}"

# 停止问题的 Nginx
echo "🛑 停止问题的 Nginx..."
docker stop emaintenance-nginx-prod 2>/dev/null || true
docker rm emaintenance-nginx-prod 2>/dev/null || true

# 创建简化的 Nginx 配置（使用实际容器名）
mkdir -p configs/nginx/conf.d

echo "📝 创建修复后的 Nginx 配置..."
cat > configs/nginx/conf.d/simple.conf <<EOF
# 简化的上游配置（使用实际容器名和 IP）
server {
    listen 80;
    server_name _;
    
    client_max_body_size 100M;
    
    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
    
    # 直接代理到 Web 服务（如果存在）
    location / {
EOF

# 根据实际存在的服务配置代理
if [ -n "$WEB_CONTAINER" ]; then
    cat >> configs/nginx/conf.d/simple.conf <<EOF
        proxy_pass http://$WEB_CONTAINER:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # API 代理（直接到容器）
EOF
    
    if [ -n "$USER_SERVICE_CONTAINER" ]; then
        cat >> configs/nginx/conf.d/simple.conf <<EOF
    location /api/auth {
        proxy_pass http://$USER_SERVICE_CONTAINER:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    location /api/users {
        proxy_pass http://$USER_SERVICE_CONTAINER:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/settings {
        proxy_pass http://$USER_SERVICE_CONTAINER:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
EOF
    fi
else
    # 如果没有 Web 容器，显示简单页面
    cat >> configs/nginx/conf.d/simple.conf <<EOF
        return 200 "Emaintenance API Server\\nAPI 服务正在运行\\n";
        add_header Content-Type text/plain;
    }
    
    # API 端点
EOF
    
    if [ -n "$USER_SERVICE_CONTAINER" ]; then
        cat >> configs/nginx/conf.d/simple.conf <<EOF
    location /api/ {
        proxy_pass http://$USER_SERVICE_CONTAINER:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
EOF
    fi
fi

cat >> configs/nginx/conf.d/simple.conf <<EOF
}
EOF

# 获取网络名称
NETWORK_NAME=$(docker ps --format "{{.Names}}" | grep user-service | head -1 | xargs -I {} docker inspect {} --format "{{range .NetworkSettings.Networks}}{{.NetworkID}}{{end}}" | head -c 12)
if [ -n "$NETWORK_NAME" ]; then
    FULL_NETWORK=$(docker network ls --format "{{.Name}}" | grep "$NETWORK_NAME" | head -1)
    echo "🌐 发现网络: $FULL_NETWORK"
fi

# 启动简化的 Nginx
echo "🚀 启动修复后的 Nginx..."
docker run -d \
    --name emaintenance-nginx-prod \
    --network ${FULL_NETWORK:-bridge} \
    -p 3030:80 \
    -v "$DEPLOY_DIR/configs/nginx/conf.d:/etc/nginx/conf.d:ro" \
    --restart unless-stopped \
    nginx:alpine

# 等待启动
sleep 3

# 测试
echo "🧪 测试连接..."
if curl -s http://localhost:3030/health | grep -q "healthy"; then
    echo "✅ Nginx 修复成功！"
else
    echo "⚠️  测试连接，查看日志..."
    docker logs emaintenance-nginx-prod --tail 10
fi

echo ""
echo "📊 当前状态:"
docker ps | grep nginx

SERVER_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "🌐 访问地址:"
echo "   主应用: http://$SERVER_IP:3030"
echo "   健康检查: http://$SERVER_IP:3030/health"