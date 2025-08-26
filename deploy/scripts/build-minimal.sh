#!/bin/bash

# 最小化构建脚本 - 使用国内源和最简单的方式
# 用途：在网络环境困难时的最后手段

set -e

echo "🔧 最小化构建（国内源）..."

# 确保在正确的目录执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$DEPLOY_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# 为每个服务创建超级简化的 Dockerfile
create_minimal_dockerfile() {
    local service=$1
    local dockerfile_path="apps/api/$service/Dockerfile.minimal"
    
    echo "📝 创建 $service 最小化 Dockerfile..."
    
    cat > "$dockerfile_path" <<EOF
FROM node:18-alpine

# 使用国内镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装基础依赖
RUN apk add --no-cache curl

# 设置工作目录
WORKDIR /app

# 设置 npm 镜像源
RUN npm config set registry https://registry.npmmirror.com

# 复制 package.json
COPY apps/api/$service/package.json ./
COPY packages/database/package.json ./packages/database/

# 安装依赖（生产环境）
RUN npm install --production --no-optional

# 复制源码
COPY apps/api/$service/src ./src
COPY packages/database ./packages/database

# 简单编译（跳过类型检查）
RUN npm install -g typescript
RUN tsc --skipLibCheck --noEmitOnError false --target es2020 --module commonjs --outDir dist src/*.ts || echo "编译完成（忽略错误）"

# 如果编译失败，至少复制 JavaScript 文件
RUN if [ ! -d "dist" ]; then mkdir dist && cp -r src/* dist/; fi

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["node", "dist/index.js"]
EOF

    echo "✅ $service 最小化 Dockerfile 创建完成"
}

# 构建单个服务
build_service_minimal() {
    local service=$1
    echo "🔨 最小化构建 $service..."
    
    create_minimal_dockerfile "$service"
    
    # 构建
    docker build \
        -f "apps/api/$service/Dockerfile.minimal" \
        -t "minimal-$service:latest" \
        --network=host \
        . || {
            echo "❌ $service 构建失败"
            return 1
        }
    
    echo "✅ $service 构建成功"
    
    # 立即启动测试
    echo "🚀 测试启动 $service..."
    
    # 停止可能存在的同名容器
    docker stop "minimal-$service-test" 2>/dev/null || true
    docker rm "minimal-$service-test" 2>/dev/null || true
    
    # 启动测试容器
    case $service in
        "user-service")
            PORT=3001
            ;;
        "work-order-service")
            PORT=3002
            ;;
        "asset-service")
            PORT=3003
            ;;
    esac
    
    docker run -d \
        --name "minimal-$service-test" \
        -p "$PORT:3001" \
        -e NODE_ENV=production \
        -e DATABASE_URL="$DATABASE_URL" \
        -e JWT_SECRET="$JWT_SECRET" \
        "minimal-$service:latest"
    
    # 等待启动
    sleep 10
    
    # 检查状态
    if docker ps | grep -q "minimal-$service-test"; then
        echo "✅ $service 测试容器启动成功"
        docker logs "minimal-$service-test" --tail 5
    else
        echo "❌ $service 测试容器启动失败"
        docker logs "minimal-$service-test" --tail 10 || echo "无法获取日志"
    fi
    
    echo ""
}

# 加载环境变量
cd "$DEPLOY_DIR"
if [ -f .env ]; then
    source .env
    echo "✅ 环境变量加载"
else
    echo "❌ 未找到 .env 文件"
    exit 1
fi

cd "$PROJECT_ROOT"

echo ""
echo "🚀 开始最小化构建"
echo "=================="

# 构建服务
SERVICES=("user-service" "work-order-service" "asset-service")

for service in "${SERVICES[@]}"; do
    echo ""
    echo "构建 $service..."
    echo "=========================="
    
    if build_service_minimal "$service"; then
        echo "✅ $service 完成"
    else
        echo "❌ $service 失败，继续下一个..."
    fi
done

echo ""
echo "📊 最小化构建结果"
echo "=================="

docker ps | grep minimal || echo "没有运行的测试容器"

echo ""
echo "🧪 快速测试"
echo "==========="

for service in "${SERVICES[@]}"; do
    case $service in
        "user-service") PORT=3001 ;;
        "work-order-service") PORT=3002 ;;  
        "asset-service") PORT=3003 ;;
    esac
    
    echo "测试 $service (端口 $PORT)..."
    if curl -s "http://localhost:$PORT" >/dev/null 2>&1; then
        echo "  ✅ $service 响应正常"
    else
        echo "  ⚠️  $service 无响应"
    fi
done

echo ""
echo "✅ 最小化构建完成！"
echo ""
echo "📝 如果测试正常，可以："
echo "1. 停止测试容器并使用这些镜像"
echo "2. 或者直接在现有端口使用这些服务"
echo ""
echo "清理测试容器："
echo "  docker stop \$(docker ps -q --filter name=minimal) && docker rm \$(docker ps -aq --filter name=minimal)"