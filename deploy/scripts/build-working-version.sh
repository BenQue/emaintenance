#!/bin/bash

# 使用已验证的分阶段构建构建服务
# 用途：使用之前成功的 Dockerfile.optimized 构建 3个API服务和Web服务

set -e

echo "🔨 使用已验证的构建方案..."

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

# 切换到项目根目录
cd "$PROJECT_ROOT"

echo ""
echo "🔍 检查现有的优化 Dockerfile"
echo "============================="

# 检查是否存在已验证的 Dockerfile
API_SERVICES=("user-service" "work-order-service" "asset-service")
AVAILABLE_DOCKERFILES=()

for service in "${API_SERVICES[@]}"; do
    if [ -f "apps/api/$service/Dockerfile.optimized" ]; then
        echo "✅ 找到 $service 的优化 Dockerfile"
        AVAILABLE_DOCKERFILES+=("$service")
    else
        echo "❌ 未找到 $service 的优化 Dockerfile"
    fi
done

echo "可用的优化构建: ${AVAILABLE_DOCKERFILES[*]}"

echo ""
echo "🔨 构建 API 服务"
echo "================="

# 使用优化 Dockerfile 构建每个服务
build_api_service() {
    local service=$1
    echo ""
    echo "构建 $service..."
    echo "=========================="
    
    if [ -f "apps/api/$service/Dockerfile.optimized" ]; then
        echo "使用优化 Dockerfile 构建 $service"
        
        # 记录构建开始时间
        START_TIME=$(date +%s)
        
        # 使用优化 Dockerfile 构建
        if docker build \
            -f "apps/api/$service/Dockerfile.optimized" \
            -t "local/emaintenance-$service:latest" \
            --progress=plain \
            .; then
            
            # 计算构建时间
            END_TIME=$(date +%s)
            BUILD_TIME=$((END_TIME - START_TIME))
            echo "✅ $service 构建成功（用时 ${BUILD_TIME}s）"
            
            # 立即启动测试
            echo "🚀 启动 $service 进行测试..."
            
            # 停止可能存在的测试容器
            docker stop "test-$service" 2>/dev/null || true
            docker rm "test-$service" 2>/dev/null || true
            
            # 确定端口
            case $service in
                "user-service") PORT=3001 ;;
                "work-order-service") PORT=3002 ;;
                "asset-service") PORT=3003 ;;
            esac
            
            # 启动测试容器
            docker run -d \
                --name "test-$service" \
                -p "$PORT:$PORT" \
                -e DATABASE_URL="$DATABASE_URL" \
                -e JWT_SECRET="$JWT_SECRET" \
                -e REDIS_URL="$REDIS_URL" \
                -e NODE_ENV=production \
                -e PORT=$PORT \
                --restart unless-stopped \
                "local/emaintenance-$service:latest"
            
            # 等待启动
            echo "⏳ 等待 $service 启动..."
            sleep 15
            
            # 检查状态
            if docker ps | grep -q "test-$service"; then
                echo "📋 $service 启动日志："
                docker logs "test-$service" --tail 5 | sed 's/^/  /'
                
                # 健康检查
                echo "🧪 健康检查..."
                if curl -s "http://localhost:$PORT/health" >/dev/null 2>&1; then
                    echo "  ✅ $service 健康检查通过"
                else
                    echo "  ⚠️  $service 健康检查失败，检查日志"
                fi
            else
                echo "  ❌ $service 容器启动失败"
                docker logs "test-$service" 2>/dev/null || echo "无法获取日志"
            fi
            
            return 0
        else
            echo "❌ $service 构建失败"
            return 1
        fi
    else
        echo "⚠️  $service 没有优化 Dockerfile，跳过"
        return 1
    fi
}

# 构建所有 API 服务
BUILT_SERVICES=()
for service in "${API_SERVICES[@]}"; do
    if build_api_service "$service"; then
        BUILT_SERVICES+=("$service")
    fi
done

echo ""
echo "🌐 构建 Web 服务"
echo "================="

cd "$DEPLOY_DIR"

# 检查是否有 Web 服务的优化构建
if [ -f "../apps/web/Dockerfile" ]; then
    echo "构建 Web 应用..."
    
    START_TIME=$(date +%s)
    
    if docker-compose --env-file .env -f "$COMPOSE_FILE" build web; then
        END_TIME=$(date +%s)
        BUILD_TIME=$((END_TIME - START_TIME))
        echo "✅ Web 服务构建成功（用时 ${BUILD_TIME}s）"
        
        # 启动 Web 服务测试
        echo "🚀 启动 Web 服务..."
        docker-compose --env-file .env -f "$COMPOSE_FILE" up -d web
        
        sleep 10
        
        # 检查 Web 服务
        if docker ps | grep -q web; then
            echo "✅ Web 服务启动成功"
            
            # 测试访问
            if curl -s http://localhost:3000 >/dev/null 2>&1; then
                echo "✅ Web 服务可访问"
            else
                echo "⚠️  Web 服务可能还在启动"
            fi
        else
            echo "❌ Web 服务启动失败"
        fi
    else
        echo "❌ Web 服务构建失败"
    fi
else
    echo "⚠️  未找到 Web 服务 Dockerfile"
fi

echo ""
echo "📊 构建结果总结"
echo "================"

echo "成功构建的 API 服务: ${BUILT_SERVICES[*]:-无}"
echo ""
echo "当前运行的服务："
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(test-|web|postgres|redis)" || echo "无相关服务运行"

echo ""
echo "🧪 服务状态检查"
echo "================"

# 检查所有服务状态
for service in "${BUILT_SERVICES[@]}"; do
    case $service in
        "user-service") PORT=3001 ;;
        "work-order-service") PORT=3002 ;;
        "asset-service") PORT=3003 ;;
    esac
    
    echo "检查 $service (端口 $PORT)..."
    if curl -s "http://localhost:$PORT/health" | grep -q "ok\|running\|healthy"; then
        echo "  ✅ $service 服务正常"
    else
        echo "  ⚠️  $service 服务状态未知"
        echo "  📋 最新日志："
        docker logs "test-$service" --tail 3 | sed 's/^/    /'
    fi
done

# 检查 Web 服务
if docker ps | grep -q web; then
    echo "检查 Web 服务..."
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo "  ✅ Web 服务可访问"
    else
        echo "  ⚠️  Web 服务响应异常"
    fi
fi

echo ""
echo "✅ 构建完成！"
echo ""
echo "🌐 可访问的服务："
SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")
echo "  Web 应用: http://$SERVER_IP:3000"
echo "  API 服务:"

for service in "${BUILT_SERVICES[@]}"; do
    case $service in
        "user-service") PORT=3001 ;;
        "work-order-service") PORT=3002 ;;
        "asset-service") PORT=3003 ;;
    esac
    echo "    $service: http://$SERVER_IP:$PORT/health"
done

echo ""
echo "📝 后续步骤："
echo "1. 如果服务正常，配置 Nginx："
echo "   ./scripts/fix-nginx-final.sh"
echo ""
echo "2. 停止测试容器，使用正式容器："
echo "   docker stop \$(docker ps -q --filter name=test-)"
echo "   docker-compose --env-file .env -f $COMPOSE_FILE up -d"
echo ""
echo "3. 查看服务日志："
for service in "${BUILT_SERVICES[@]}"; do
    echo "   $service: docker logs -f test-$service"
done