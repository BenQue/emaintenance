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
    
    echo "Building with timeout: $TIMEOUT seconds"
    timeout $TIMEOUT docker build \
        -f $dockerfile_path \
        -t local/emaintenance-$service:latest \
        --no-cache \
        --progress=plain \
        .
}

# Retry logic
retry_count=0
while [ $retry_count -lt $MAX_RETRIES ]; do
    echo "Build attempt $((retry_count + 1)) of $MAX_RETRIES for $SERVICE_NAME"
    
    if build_service $SERVICE_NAME; then
        echo "✅ Successfully built $SERVICE_NAME"
        exit 0
    else
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
    fi
done

echo "❌ Failed to build $SERVICE_NAME after $MAX_RETRIES attempts"
exit 1