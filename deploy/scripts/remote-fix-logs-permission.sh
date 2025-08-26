#!/bin/bash

# 远程服务器修复 logs 目录权限问题
# 用途：修复 winston 创建 logs 目录的权限错误

set -e

echo "🔧 修复 logs 目录权限问题..."
echo "============================="
echo ""

# 确保在正确的目录
cd /home/bcnc/emaintenance || cd ~/emaintenance || exit 1

SERVICES=("work-order-service" "asset-service")

echo "📝 Step 1: 修改 Dockerfile 添加 logs 目录创建"
echo "============================================="

for service in "${SERVICES[@]}"; do
    DOCKERFILE="apps/api/$service/Dockerfile.optimized"
    
    if [ -f "$DOCKERFILE" ]; then
        echo "修复 $service 的 Dockerfile..."
        
        # 备份
        cp "$DOCKERFILE" "$DOCKERFILE.backup-logs-$(date +%Y%m%d-%H%M%S)"
        
        # 检查是否已经有正确的 logs 目录创建（在 USER apiuser 之前）
        if ! grep -B2 "USER apiuser" "$DOCKERFILE" | grep -q "mkdir.*logs"; then
            echo "  添加 logs 目录创建..."
            
            # 创建临时文件
            TEMP_FILE=$(mktemp)
            
            # 在 USER apiuser 之前插入目录创建命令
            awk '
            /^USER apiuser/ {
                print "# Create logs directory with correct permissions"
                print "RUN mkdir -p /app/logs /app/uploads && \\"
                print "    chown -R apiuser:nodejs /app/logs /app/uploads"
                print ""
            }
            { print }
            ' "$DOCKERFILE" > "$TEMP_FILE"
            
            mv "$TEMP_FILE" "$DOCKERFILE"
            echo "  ✅ 已添加 logs 目录创建命令"
        else
            echo "  ℹ️  logs 目录创建已存在"
        fi
    else
        echo "  ❌ 未找到 $service 的 Dockerfile"
        exit 1
    fi
done

echo ""
echo "📝 Step 2: 停止现有容器"
echo "======================"

for service in "${SERVICES[@]}"; do
    CONTAINER_NAME="emaintenance-$service"
    if docker ps -a --format "{{.Names}}" | grep -q "^$CONTAINER_NAME$"; then
        echo "停止 $CONTAINER_NAME..."
        docker stop "$CONTAINER_NAME" || true
        docker rm "$CONTAINER_NAME" || true
    fi
done

echo ""
echo "📝 Step 3: 删除旧镜像（强制重新构建）"
echo "===================================="

for service in "${SERVICES[@]}"; do
    IMAGE_NAME="local/emaintenance-$service:latest"
    if docker images | grep -q "$service"; then
        echo "删除 $IMAGE_NAME..."
        docker rmi "$IMAGE_NAME" 2>/dev/null || true
    fi
done

echo ""
echo "📝 Step 4: 重新构建服务"
echo "======================"

for service in "${SERVICES[@]}"; do
    echo ""
    echo "构建 $service..."
    echo "---------------"
    
    if docker build \
        -f "apps/api/$service/Dockerfile.optimized" \
        -t "local/emaintenance-$service:latest" \
        --no-cache \
        .; then
        echo "  ✅ $service 构建成功"
    else
        echo "  ❌ $service 构建失败"
        echo "  尝试查看 Dockerfile 内容："
        tail -20 "apps/api/$service/Dockerfile.optimized"
        exit 1
    fi
done

echo ""
echo "📝 Step 5: 使用 docker-compose 启动服务"
echo "======================================="

cd deploy

# 确定 compose 文件
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
elif [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
else
    echo "❌ 未找到 docker-compose 文件"
    exit 1
fi

# 启动服务
echo "使用 $COMPOSE_FILE 启动服务..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d work-order-service asset-service

echo ""
echo "⏳ 等待服务启动..."
sleep 15

echo ""
echo "📝 Step 6: 检查服务状态"
echo "======================"

# 查看容器状态
docker-compose --env-file .env -f "$COMPOSE_FILE" ps work-order-service asset-service

echo ""
echo "📋 检查日志（查找权限错误）："
echo "============================"

for service in "${SERVICES[@]}"; do
    echo ""
    echo "--- $service 日志 ---"
    docker logs "emaintenance-$service" 2>&1 | tail -20
    
    # 检查是否还有权限错误
    if docker logs "emaintenance-$service" 2>&1 | tail -50 | grep -q "EACCES.*logs"; then
        echo "  ⚠️  $service 仍有权限错误！"
        
        echo "  尝试额外修复..."
        # 在宿主机创建目录
        sudo mkdir -p /opt/emaintenance/logs /opt/emaintenance/uploads
        sudo chown -R 1001:1001 /opt/emaintenance/logs /opt/emaintenance/uploads
        sudo chmod -R 755 /opt/emaintenance/logs /opt/emaintenance/uploads
        
        # 重启容器
        docker restart "emaintenance-$service"
        sleep 5
        
        # 再次检查
        if docker logs "emaintenance-$service" 2>&1 | tail -10 | grep -q "EACCES"; then
            echo "  ❌ 权限问题仍未解决"
        else
            echo "  ✅ 权限问题已解决"
        fi
    else
        echo "  ✅ 未发现权限错误"
    fi
done

echo ""
echo "📝 Step 7: 健康检查"
echo "=================="

for service in "${SERVICES[@]}"; do
    case $service in
        "work-order-service") PORT=3002 ;;
        "asset-service") PORT=3003 ;;
    esac
    
    echo ""
    echo "测试 $service (端口 $PORT)..."
    
    RESPONSE=$(curl -s -w "\n%{http_code}" "http://localhost:$PORT/health" 2>/dev/null || echo "000")
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "  ✅ $service 健康检查通过"
    else
        echo "  ❌ $service 健康检查失败 (HTTP $HTTP_CODE)"
        echo "  查看详细日志："
        echo "  docker logs emaintenance-$service --tail 30"
    fi
done

echo ""
echo "✅ 脚本执行完成！"
echo ""
echo "📝 总结："
echo "1. 修改了 Dockerfile，在切换用户前创建 logs 目录"
echo "2. 重新构建了服务镜像"
echo "3. 重新启动了服务"
echo ""
echo "如果仍有问题，请检查："
echo "1. docker logs emaintenance-work-order-service"
echo "2. docker logs emaintenance-asset-service"
echo "3. 确保数据库和 Redis 正在运行"