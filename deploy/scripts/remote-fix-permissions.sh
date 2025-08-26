#!/bin/bash

# 远程服务器权限修复脚本
# 用途：修复 work-order-service 和 asset-service 的 logs 目录权限问题

set -e

echo "🔧 修复远程服务器容器权限问题..."
echo "================================"
echo ""

# 确保在正确的目录执行
cd /root/emaintenance || cd ~/emaintenance

echo "📝 Step 1: 修复 Dockerfile 中的权限设置"
echo "======================================="

SERVICES=("work-order-service" "asset-service")

for service in "${SERVICES[@]}"; do
    DOCKERFILE="apps/api/$service/Dockerfile.optimized"
    
    if [ -f "$DOCKERFILE" ]; then
        echo ""
        echo "修复 $service 的 Dockerfile..."
        
        # 备份原文件
        cp "$DOCKERFILE" "$DOCKERFILE.backup-$(date +%Y%m%d-%H%M%S)"
        
        # 使用更简单的方法修复权限问题
        # 查找 adduser 行并在其后添加目录创建
        if ! grep -q "mkdir -p /app/logs" "$DOCKERFILE"; then
            # 创建临时文件
            TEMP_FILE=$(mktemp)
            
            # 处理文件，在创建用户的同时创建目录
            awk '
            /^RUN addgroup --system --gid 1001 nodejs/ {
                # 输出原始行，但修改为包含所有操作
                print "# Create app user and necessary directories"
                print "RUN addgroup --system --gid 1001 nodejs && \\"
                print "    adduser --system --uid 1001 apiuser && \\"
                print "    mkdir -p /app/logs /app/uploads && \\"
                print "    chown -R apiuser:nodejs /app/logs /app/uploads"
                # 跳过后续可能的错误行
                getline
                while ($0 ~ /^[[:space:]]*\\/ || $0 ~ /^[[:space:]]*#/ || $0 ~ /^[[:space:]]*RUN mkdir/ || $0 ~ /^[[:space:]]*adduser/) {
                    getline
                }
                print $0
                next
            }
            { print }
            ' "$DOCKERFILE" > "$TEMP_FILE"
            
            # 替换原文件
            mv "$TEMP_FILE" "$DOCKERFILE"
            echo "  ✅ 修复了 $service 的 Dockerfile"
        else
            echo "  ℹ️  $service 的权限设置已存在"
        fi
    else
        echo "  ❌ 未找到 $service 的 Dockerfile"
    fi
done

echo ""
echo "📝 Step 2: 停止有问题的容器"
echo "========================="

# 停止现有容器
for service in "${SERVICES[@]}"; do
    CONTAINER_NAME="emaintenance-$service"
    if docker ps -a --format "{{.Names}}" | grep -q "^$CONTAINER_NAME$"; then
        echo "停止 $CONTAINER_NAME..."
        docker stop "$CONTAINER_NAME" || true
        docker rm "$CONTAINER_NAME" || true
        echo "  ✅ 已停止并删除 $CONTAINER_NAME"
    fi
done

echo ""
echo "📝 Step 3: 重新构建服务镜像"
echo "========================="

# 加载环境变量
if [ -f deploy/.env ]; then
    source deploy/.env
elif [ -f .env ]; then
    source .env
fi

for service in "${SERVICES[@]}"; do
    echo ""
    echo "构建 $service..."
    
    # 删除旧镜像以强制重新构建
    IMAGE_NAME="local/emaintenance-$service:latest"
    if docker images | grep -q "emaintenance-$service"; then
        docker rmi "$IMAGE_NAME" 2>/dev/null || true
    fi
    
    # 构建新镜像
    if docker build \
        -f "apps/api/$service/Dockerfile.optimized" \
        -t "$IMAGE_NAME" \
        --no-cache \
        .; then
        echo "  ✅ $service 构建成功"
    else
        echo "  ❌ $service 构建失败"
        continue
    fi
done

echo ""
echo "📝 Step 4: 使用 docker-compose 重新启动服务"
echo "=========================================="

cd deploy || cd ~/emaintenance/deploy

# 确定使用哪个 compose 文件
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
elif [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
else
    echo "❌ 未找到 docker-compose 配置文件"
    exit 1
fi

echo "使用配置文件: $COMPOSE_FILE"

# 只重新启动有问题的服务
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d work-order-service asset-service

echo ""
echo "⏳ 等待服务启动..."
sleep 15

echo ""
echo "📝 Step 5: 检查服务状态"
echo "======================"

# 检查容器状态
docker-compose --env-file .env -f "$COMPOSE_FILE" ps work-order-service asset-service

echo ""
echo "📋 检查服务日志（查看是否还有权限错误）："
echo "========================================="

for service in "${SERVICES[@]}"; do
    echo ""
    echo "$service 最新日志："
    docker logs "emaintenance-$service" --tail 10 2>&1 | head -20
    
    # 检查是否还有权限错误
    if docker logs "emaintenance-$service" 2>&1 | tail -50 | grep -q "EACCES.*logs"; then
        echo "  ⚠️  $service 可能仍有权限问题"
    else
        echo "  ✅ $service 未发现权限错误"
    fi
done

echo ""
echo "📝 Step 6: 健康检查"
echo "=================="

# 确定服务器 IP
SERVER_IP=$(hostname -I | awk '{print $1}' || echo "localhost")

for service in "${SERVICES[@]}"; do
    case $service in
        "work-order-service") PORT=3002 ;;
        "asset-service") PORT=3003 ;;
    esac
    
    echo ""
    echo "测试 $service (http://$SERVER_IP:$PORT/health)..."
    
    if curl -s "http://localhost:$PORT/health" 2>/dev/null | grep -q "ok\|running\|healthy"; then
        echo "  ✅ $service 健康检查通过"
    elif curl -s "http://localhost:$PORT/api/health" 2>/dev/null | grep -q "ok\|running\|healthy"; then
        echo "  ✅ $service 健康检查通过 (/api/health)"
    else
        echo "  ⚠️  $service 健康检查失败"
        echo "  可能原因："
        echo "  1. 服务还在启动中"
        echo "  2. 权限问题未完全解决"
        echo "  3. 数据库连接问题"
        echo ""
        echo "  查看详细日志："
        echo "  docker logs emaintenance-$service --tail 30"
    fi
done

echo ""
echo "✅ 远程服务器权限修复脚本执行完成！"
echo ""
echo "📝 总结："
echo "1. 修复了 Dockerfile 中的权限设置"
echo "2. 重新构建了有问题的服务"
echo "3. 使用 docker-compose 重新启动了服务"
echo ""
echo "如果服务仍有问题，请检查："
echo "1. 数据库连接是否正常"
echo "2. 环境变量是否正确"
echo "3. 端口是否被占用"
echo ""
echo "查看详细日志命令："
echo "  docker logs -f emaintenance-work-order-service"
echo "  docker logs -f emaintenance-asset-service"