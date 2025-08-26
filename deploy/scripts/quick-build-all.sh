#!/bin/bash

# 快速构建所有服务脚本
# 用途：在数据库和基础设施正常的情况下，快速构建所有 API 和 Web 服务

set -e

echo "⚡ 快速构建所有服务..."

# 确保在正确的目录执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$DEPLOY_DIR/.." && pwd)"

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
echo "🔍 检查当前状态"
echo "==============="

echo "当前运行的服务："
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "可用的镜像："
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -10

# 检查 compose 文件
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
elif [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
else
    echo "❌ 未找到 docker-compose 配置文件"
    exit 1
fi

echo "使用配置文件: $COMPOSE_FILE"

echo ""
echo "🚀 开始构建服务"
echo "==============="

# 要构建的服务列表
SERVICES_TO_BUILD=("user-service" "work-order-service" "asset-service" "web")

# 逐个构建服务
for service in "${SERVICES_TO_BUILD[@]}"; do
    echo ""
    echo "🔨 构建 $service..."
    echo "================================"
    
    # 记录开始时间
    START_TIME=$(date +%s)
    
    # 构建服务（使用缓存，超时30分钟）
    timeout 1800 docker-compose --env-file .env -f "$COMPOSE_FILE" build "$service" || {
        echo "❌ $service 构建失败或超时"
        echo "尝试无缓存构建..."
        timeout 1800 docker-compose --env-file .env -f "$COMPOSE_FILE" build --no-cache "$service" || {
            echo "❌ $service 无缓存构建也失败"
            continue
        }
    }
    
    # 计算构建时间
    END_TIME=$(date +%s)
    BUILD_TIME=$((END_TIME - START_TIME))
    echo "✅ $service 构建完成（用时 ${BUILD_TIME}s）"
    
    # 立即启动刚构建的服务
    echo "🚀 启动 $service..."
    docker-compose --env-file .env -f "$COMPOSE_FILE" up -d "$service"
    
    # 等待服务启动
    if [ "$service" = "user-service" ]; then
        echo "⏳ 等待用户服务启动（其他服务依赖它）..."
        sleep 30
    else
        echo "⏳ 等待 $service 启动..."
        sleep 15
    fi
    
    # 快速健康检查
    CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep "$service" | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        echo "📋 $service 启动状态："
        
        # 显示最新日志
        docker logs "$CONTAINER_NAME" --tail 3 | sed 's/^/  /'
        
        # 简单状态检查
        if docker logs "$CONTAINER_NAME" 2>&1 | grep -q "Server running on port\|server started\|listening\|ready"; then
            echo "  ✅ $service 启动成功"
        elif docker logs "$CONTAINER_NAME" 2>&1 | grep -q "Error\|FATAL\|failed"; then
            echo "  ⚠️  $service 可能有启动问题"
        else
            echo "  🔄 $service 正在启动中"
        fi
    else
        echo "  ❌ $service 容器未找到"
    fi
    
    echo ""
done

echo ""
echo "📊 所有服务构建完成"
echo "==================="

# 显示最终状态
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(postgres|redis|nginx|user-service|work-order-service|asset-service|web)"

echo ""
echo "🧪 快速健康检查"
echo "==============="

# 健康检查所有服务
ALL_SERVICES=("user-service" "work-order-service" "asset-service" "web")

for service in "${ALL_SERVICES[@]}"; do
    CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep "$service" | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        echo "检查 $service..."
        
        # 根据服务类型进行健康检查
        if [ "$service" = "web" ]; then
            # Web 服务检查
            if curl -s http://localhost:3000 >/dev/null 2>&1; then
                echo "  ✅ $service 可访问"
            else
                echo "  ⚠️  $service 可能还在启动"
            fi
        else
            # API 服务检查
            case $service in
                "user-service") PORT=3001 ;;
                "work-order-service") PORT=3002 ;;
                "asset-service") PORT=3003 ;;
            esac
            
            if curl -s "http://localhost:$PORT/health" >/dev/null 2>&1 || \
               curl -s "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
                echo "  ✅ $service API 可访问"
            else
                echo "  ⚠️  $service API 可能还在启动"
            fi
        fi
    else
        echo "❌ $service 容器未运行"
    fi
done

echo ""
echo "✅ 快速构建完成！"
echo ""
echo "🌐 访问信息："
SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "服务器IP")
echo "  Web 应用: http://$SERVER_IP:3000"
echo "  API 服务:"
echo "    用户服务: http://$SERVER_IP:3001/health"
echo "    工单服务: http://$SERVER_IP:3002/health"
echo "    资产服务: http://$SERVER_IP:3003/health"

echo ""
echo "🔍 如果有问题，查看日志："
for service in "${ALL_SERVICES[@]}"; do
    CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep "$service" | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        echo "  $service: docker logs -f $CONTAINER_NAME"
    fi
done

echo ""
echo "📝 后续步骤："
echo "1. 如果所有服务正常，配置 Nginx 代理："
echo "   ./scripts/fix-nginx-final.sh"
echo ""
echo "2. 初始化数据库（如果需要）："
echo "   ./scripts/initialize-database.sh"
echo ""
echo "3. 完整系统验证："
echo "   ./scripts/verify-deployment.sh"