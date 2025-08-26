#!/bin/bash

# 快速重构服务脚本（使用本地源和缓存优化）
# 用途：在网络环境不好的情况下快速重构 API 服务

set -e

echo "⚡ 快速重构服务（本地源优化）..."

# 确保在正确的目录执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# 加载环境变量
if [ -f "$DEPLOY_DIR/.env" ]; then
    source "$DEPLOY_DIR/.env"
    echo "✅ 环境文件已加载"
else
    echo "❌ 环境文件不存在"
    exit 1
fi

# 创建优化的 Dockerfile（使用本地源）
create_optimized_dockerfile() {
    local service=$1
    local dockerfile_path="apps/api/$service/Dockerfile.fast"
    
    echo "📝 创建 $service 的优化 Dockerfile..."
    
    cat > "$dockerfile_path" <<'EOF'
# 快速构建 Dockerfile（使用阿里云镜像源）
FROM node:18-alpine

# 使用阿里云镜像源（加速）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装依赖
RUN apk add --no-cache libc6-compat curl ca-certificates tzdata tini

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY packages/database/package*.json packages/database/
COPY apps/api/SERVICE_PLACEHOLDER/package*.json ./

# 复制共享包源码
COPY packages/database packages/database/

# 安装依赖（使用国内源）
RUN npm config set registry https://registry.npmmirror.com
RUN npm install --production

# 生成 Prisma 客户端
RUN cd packages/database && npx prisma generate

# 复制服务源码
COPY apps/api/SERVICE_PLACEHOLDER/src ./src
COPY apps/api/SERVICE_PLACEHOLDER/tsconfig.json ./

# 编译 TypeScript
RUN npm run build

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser

# 创建必要目录
RUN mkdir -p uploads logs && chown -R apiuser:nodejs uploads logs

# 切换用户
USER apiuser

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["node", "dist/index.js"]
EOF

    # 替换服务名占位符
    sed -i "s/SERVICE_PLACEHOLDER/$service/g" "$dockerfile_path"
    echo "✅ $service 优化 Dockerfile 创建完成"
}

# 快速构建函数
build_service_fast() {
    local service=$1
    local dockerfile_path="apps/api/$service/Dockerfile.fast"
    
    echo "🔨 快速构建 $service..."
    
    # 创建优化的 Dockerfile
    create_optimized_dockerfile "$service"
    
    # 构建镜像（使用缓存）
    docker build \
        -f "$dockerfile_path" \
        -t "local/emaintenance-$service:latest" \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        apps/api/$service/
    
    if [ $? -eq 0 ]; then
        echo "✅ $service 构建成功"
        # 清理临时 Dockerfile
        rm -f "$dockerfile_path"
        return 0
    else
        echo "❌ $service 构建失败"
        return 1
    fi
}

# 停止服务
echo ""
echo "🛑 停止相关服务..."
cd "$DEPLOY_DIR"

SERVICES_TO_REBUILD=("work-order-service" "asset-service")

for service in "${SERVICES_TO_REBUILD[@]}"; do
    echo "停止 $service..."
    docker-compose --env-file .env stop "$service" 2>/dev/null || true
    
    # 删除容器但保留镜像作为缓存层
    CONTAINER_NAME=$(docker ps -a --format "{{.Names}}" | grep "$service" | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
    fi
done

# 快速重构
echo ""
echo "⚡ 开始快速重构..."

cd "$PROJECT_ROOT"

for service in "${SERVICES_TO_REBUILD[@]}"; do
    if build_service_fast "$service"; then
        echo "✅ $service 重构完成"
    else
        echo "❌ $service 重构失败"
        exit 1
    fi
done

# 启动服务
echo ""
echo "🚀 启动重构的服务..."
cd "$DEPLOY_DIR"

# 检查 compose 文件
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
elif [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
else
    echo "❌ 未找到 docker-compose 文件"
    exit 1
fi

# 确保基础服务运行
echo "确保基础服务运行..."
docker-compose --env-file .env -f "$COMPOSE_FILE" up -d postgres redis user-service

echo "等待基础服务就绪..."
sleep 15

# 启动重构的服务
for service in "${SERVICES_TO_REBUILD[@]}"; do
    echo "启动 $service..."
    docker-compose --env-file .env -f "$COMPOSE_FILE" up -d "$service"
    sleep 10
    
    # 快速检查
    CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep "$service" | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        echo "📋 $service 启动状态："
        docker logs "$CONTAINER_NAME" --tail 3
        echo ""
    fi
done

# 显示最终状态
echo ""
echo "📊 服务状态："
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(postgres|redis|user-service|work-order-service|asset-service)"

echo ""
echo "✅ 快速重构完成！"
echo ""
echo "💡 优化特点："
echo "  - 使用阿里云 Alpine 镜像源（国内访问快）"
echo "  - 使用 npmmirror.com npm 源（国内访问快）"  
echo "  - 启用 Docker BuildKit 缓存"
echo "  - 简化构建步骤，避免复杂配置"
echo ""
echo "🔍 如果服务仍有问题，查看日志："
for service in "${SERVICES_TO_REBUILD[@]}"; do
    CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep "$service" | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        echo "  $service: docker logs -f $CONTAINER_NAME"
    fi
done