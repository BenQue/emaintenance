#!/bin/bash

# 本地Docker镜像仓库验证脚本
# 检查本地仓库是否可用，并验证镜像是否存在

set -e

# 颜色代码
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
LOCAL_REGISTRY="10.163.144.13:5000"

# 函数
log() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 需要验证的镜像列表
REQUIRED_IMAGES=(
    "postgres:16-alpine"
    "redis:7-alpine"
    "nginx:alpine"
)

echo -e "${BLUE}"
echo "=============================================="
echo "  本地Docker镜像仓库验证"
echo "  仓库地址: $LOCAL_REGISTRY"
echo "=============================================="
echo -e "${NC}"

# 检查本地仓库连接
info "检查本地仓库连接..."
if curl -f http://$LOCAL_REGISTRY/v2/ >/dev/null 2>&1; then
    log "本地仓库连接正常"
else
    error "无法连接到本地仓库 $LOCAL_REGISTRY"
    echo ""
    echo "请检查："
    echo "1. 仓库服务是否运行"
    echo "2. 网络连接是否正常"
    echo "3. 防火墙设置是否允许访问端口5000"
    exit 1
fi

# 检查Docker配置
info "检查Docker客户端配置..."
if [[ -f "/etc/docker/daemon.json" ]]; then
    if grep -q "$LOCAL_REGISTRY" "/etc/docker/daemon.json"; then
        log "Docker已配置使用本地仓库"
    else
        warning "Docker未配置使用本地仓库"
        echo "建议运行: ./setup-local-registry.sh"
    fi
else
    warning "Docker daemon.json配置文件不存在"
    echo "建议运行: ./setup-local-registry.sh"
fi

# 验证各个镜像是否存在
echo ""
info "检查镜像可用性..."

for image in "${REQUIRED_IMAGES[@]}"; do
    echo -n "检查 $LOCAL_REGISTRY/$image ... "
    
    # 检查镜像manifest是否存在
    if curl -f -s http://$LOCAL_REGISTRY/v2/$image/tags/list >/dev/null 2>&1; then
        echo -e "${GREEN}✅ 可用${NC}"
    else
        echo -e "${RED}❌ 不可用${NC}"
        echo "  建议操作: docker pull $image && docker tag $image $LOCAL_REGISTRY/$image && docker push $LOCAL_REGISTRY/$image"
    fi
done

# 测试镜像拉取
echo ""
info "测试镜像拉取速度..."

test_image="$LOCAL_REGISTRY/nginx:alpine"
echo "拉取测试镜像: $test_image"

start_time=$(date +%s)
if docker pull "$test_image" >/dev/null 2>&1; then
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    log "拉取成功，耗时: ${duration}秒"
else
    error "拉取失败"
fi

echo ""
echo -e "${GREEN}"
echo "=============================================="
echo "  验证完成"
echo "=============================================="
echo -e "${NC}"

echo "💡 提示："
echo "  - 如果镜像不可用，请运行 ./setup-local-registry.sh"
echo "  - 部署时会自动配置和使用本地仓库"
echo "  - 本地仓库地址: http://$LOCAL_REGISTRY"