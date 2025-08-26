#!/bin/bash

# Docker build script with timeout and retry logic
set -e

SERVICE_NAME=${1:-user-service}
TIMEOUT=${2:-1800}  # 30 minutes default timeout
MAX_RETRIES=${3:-3}

# 确保在项目根目录执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Building $SERVICE_NAME with timeout $TIMEOUT seconds..."
echo "Project root: $PROJECT_ROOT"

# 切换到项目根目录
cd "$PROJECT_ROOT"

build_service() {
    local service=$1
    local dockerfile_path="apps/api/$service/Dockerfile"
    
    if [ -f "apps/api/$service/Dockerfile.optimized" ]; then
        dockerfile_path="apps/api/$service/Dockerfile.optimized"
        echo "Using optimized Dockerfile for $service"
    fi
    
    echo "Building $service with timeout: $TIMEOUT seconds"
    echo "Dockerfile path: $dockerfile_path"
    
    timeout $TIMEOUT docker build \
        -f $dockerfile_path \
        -t local/emaintenance-$service:latest \
        --no-cache \
        --progress=plain \
        .
}

build_all_services() {
    local services=("user-service" "work-order-service" "asset-service")
    
    for service in "${services[@]}"; do
        echo "🔨 构建 $service..."
        if ! build_service "$service"; then
            echo "❌ $service 构建失败"
            return 1
        fi
        echo "✅ $service 构建成功"
    done
    return 0
}

# Retry logic
retry_count=0
while [ $retry_count -lt $MAX_RETRIES ]; do
    echo "Build attempt $((retry_count + 1)) of $MAX_RETRIES for $SERVICE_NAME"
    
    # 处理 "all" 服务或单个服务
    if [ "$SERVICE_NAME" = "all" ]; then
        if build_all_services; then
            echo "✅ Successfully built all services"
            exit 0
        fi
    else
        if build_service $SERVICE_NAME; then
            echo "✅ Successfully built $SERVICE_NAME"
            exit 0
        fi
    fi
    
    exit_code=$?
    retry_count=$((retry_count + 1))
    
    if [ $exit_code -eq 124 ]; then
        echo "⏰ Build timed out after $TIMEOUT seconds"
    else
        echo "❌ Build failed with exit code $exit_code"
    fi
    
    if [ $retry_count -lt $MAX_RETRIES ]; then
        echo "🔄 Retrying in 10 seconds..."
        sleep 10
        
        # Clear build cache before retry
        docker builder prune -f
    fi
done

echo "❌ Failed to build $SERVICE_NAME after $MAX_RETRIES attempts"
exit 1