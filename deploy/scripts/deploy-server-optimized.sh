#!/bin/bash

# Emaintenance 服务器部署脚本 (优化版，适用于网络较慢的环境)
# 用途: 在生产/测试服务器上构建和启动所有服务 (使用优化的 Dockerfile)

set -e  # 遇到错误立即退出

echo "🚀 开始 Emaintenance 服务器部署 (优化版)..."

# 检查运行环境
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "⚠️  检测到 macOS 环境，此脚本用于 Linux 服务器部署"
    echo "如需本地部署，请使用: ./deploy-local.sh"
    exit 1
fi

# 确保在正确的目录执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "📁 项目根目录: $PROJECT_ROOT"
echo "📁 部署目录: $DEPLOY_DIR"

# 切换到项目根目录
cd "$PROJECT_ROOT"

# 检查是否存在优化版 Dockerfile
OPTIMIZED_DOCKERFILES=()
for service in user-service work-order-service asset-service; do
    optimized_file="apps/api/$service/Dockerfile.optimized"
    if [ -f "$optimized_file" ]; then
        OPTIMIZED_DOCKERFILES+=("$service")
        echo "📋 发现 $service 优化版 Dockerfile"
    fi
done

if [ ${#OPTIMIZED_DOCKERFILES[@]} -eq 0 ]; then
    echo "⚠️  未发现优化版 Dockerfile，使用标准部署脚本"
    ./scripts/deploy-server.sh
    exit 0
fi

echo "🔧 使用优化构建模式，适用于网络较慢的环境"

# 选择部署配置文件
if [ -f "$DEPLOY_DIR/docker-compose.prod.yml" ]; then
    COMPOSE_FILE="$DEPLOY_DIR/docker-compose.prod.yml"
    echo "📋 使用生产环境配置: docker-compose.prod.yml"
else
    COMPOSE_FILE="$DEPLOY_DIR/docker-compose.yml"
    echo "📋 使用默认配置: docker-compose.yml"
fi

# 创建临时 docker-compose 文件，使用优化 Dockerfile
TEMP_COMPOSE_FILE="docker-compose.optimized.yml"
cp "$COMPOSE_FILE" "$TEMP_COMPOSE_FILE"

echo "📝 配置优化构建选项..."

# 为每个服务创建优化构建配置
for service in "${OPTIMIZED_DOCKERFILES[@]}"; do
    echo "   配置 $service 使用优化 Dockerfile"
    sed -i "s|dockerfile: ../apps/api/$service/Dockerfile|dockerfile: ../apps/api/$service/Dockerfile.optimized|g" "$TEMP_COMPOSE_FILE"
done

# 构建镜像
echo "🔨 使用优化 Dockerfile 构建镜像..."

# 使用专门的构建脚本
"$DEPLOY_DIR/scripts/build-with-timeout.sh" all 2700  # 45分钟总超时

# 如果构建失败，清理临时文件并退出
if [ $? -ne 0 ]; then
    echo "❌ 优化构建失败"
    rm -f "$TEMP_COMPOSE_FILE"
    exit 1
fi

# 启动服务
echo "🚀 启动所有服务..."
docker-compose -f "$TEMP_COMPOSE_FILE" up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 45

# 健康检查
echo "🏥 检查服务健康状态..."
"$DEPLOY_DIR/scripts/health-check.sh"

# 清理临时文件
rm -f "$TEMP_COMPOSE_FILE"

echo ""
echo "🎉 优化部署完成!"
echo ""
echo "📝 本次部署使用了以下优化:"
for service in "${OPTIMIZED_DOCKERFILES[@]}"; do
    echo "   ✅ $service: 优化 Dockerfile (阿里云镜像源 + 分步构建)"
done