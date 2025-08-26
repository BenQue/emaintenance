#!/bin/bash

# 重新构建 API 服务脚本
# 用途：修复 Docker 构建问题并重新构建所有 API 服务

set -e

echo "🔧 重新构建 API 服务..."

# 确保在正确的目录执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$DEPLOY_DIR"

# 加载环境变量
if [ -f .env ]; then
    source .env
    echo "✅ 环境文件已加载"
else
    echo "❌ 环境文件不存在"
    exit 1
fi

# 检查 docker-compose 文件
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "📋 使用生产配置: $COMPOSE_FILE"
elif [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
    echo "📋 使用配置: $COMPOSE_FILE"
else
    echo "❌ 未找到 docker-compose 配置文件"
    exit 1
fi

echo ""
echo "🛑 停止所有 API 服务"
echo "==================="

# 停止所有 API 服务
API_SERVICES=("user-service" "work-order-service" "asset-service")

for service in "${API_SERVICES[@]}"; do
    echo "停止 $service..."
    docker-compose --env-file .env -f "$COMPOSE_FILE" stop "$service" 2>/dev/null || true
    
    # 删除容器
    CONTAINER_NAME=$(docker ps -a --format "{{.Names}}" | grep "$service" | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        echo "删除容器 $CONTAINER_NAME..."
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
    fi
done

echo ""
echo "🧹 清理旧镜像"
echo "============="

# 清理旧的 API 服务镜像
for service in "${API_SERVICES[@]}"; do
    IMAGE_NAME="deploy_${service}"
    if docker images | grep -q "$IMAGE_NAME"; then
        echo "删除镜像 $IMAGE_NAME..."
        docker rmi "$IMAGE_NAME" 2>/dev/null || true
    fi
done

echo ""
echo "🔨 重新构建服务"
echo "==============="

# 重新构建所有 API 服务
for service in "${API_SERVICES[@]}"; do
    echo "重新构建 $service..."
    
    # 使用 --no-cache 强制重建
    docker-compose --env-file .env -f "$COMPOSE_FILE" build --no-cache "$service"
    
    if [ $? -eq 0 ]; then
        echo "  ✅ $service 构建成功"
    else
        echo "  ❌ $service 构建失败"
        exit 1
    fi
done

echo ""
echo "🚀 启动服务"
echo "==========="

# 确保基础设施先运行
echo "确保基础设施服务运行中..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d postgres redis

echo "等待基础设施就绪..."
sleep 10

# 按顺序启动 API 服务
for service in "${API_SERVICES[@]}"; do
    echo "启动 $service..."
    docker-compose --env-file .env -f "$COMPOSE_FILE" up -d "$service"
    
    if [ "$service" = "user-service" ]; then
        echo "等待用户服务启动（其他服务依赖它）..."
        sleep 30
    else
        echo "等待 $service 启动..."
        sleep 15
    fi
    
    # 验证服务是否启动成功
    CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep "$service" | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        echo "验证 $service 状态..."
        
        for i in {1..20}; do
            if docker logs "$CONTAINER_NAME" 2>&1 | grep -q "Server running on port\|server started"; then
                echo "  ✅ $service 启动成功"
                break
            elif docker logs "$CONTAINER_NAME" 2>&1 | grep -q "Authentication failed\|Error\|FATAL"; then
                echo "  ❌ $service 启动失败"
                echo "  📋 错误日志："
                docker logs "$CONTAINER_NAME" --tail 10 | sed 's/^/    /'
                break
            else
                if [ $i -eq 20 ]; then
                    echo "  ⚠️  $service 启动状态未知"
                    echo "  📋 最新日志："
                    docker logs "$CONTAINER_NAME" --tail 5 | sed 's/^/    /'
                else
                    echo "    等待 $service 启动... ($i/20)"
                    sleep 3
                fi
            fi
        done
    else
        echo "  ❌ $service 容器未运行"
    fi
done

echo ""
echo "📊 最终服务状态"
echo "==============="

# 显示所有服务状态
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(postgres|redis|user-service|work-order-service|asset-service)"

echo ""
echo "🧪 快速健康检查"
echo "==============="

# 简单的健康检查
for service in "${API_SERVICES[@]}"; do
    CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep "$service" | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        if docker logs "$CONTAINER_NAME" 2>&1 | grep -q "Server running on port\|server started"; then
            echo "  ✅ $service: 运行正常"
        else
            echo "  ⚠️  $service: 状态未知"
        fi
    else
        echo "  ❌ $service: 未运行"
    fi
done

echo ""
echo "✅ API 服务重构建完成！"
echo ""
echo "🔍 如果仍有问题，查看详细日志："
for service in "${API_SERVICES[@]}"; do
    CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep "$service" | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        echo "  $service: docker logs -f $CONTAINER_NAME"
    fi
done