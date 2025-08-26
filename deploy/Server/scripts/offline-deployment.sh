#!/bin/bash

# E-Maintenance 离线部署脚本
# 适用于网络受限的中国服务器环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "=========================================="
echo "  E-Maintenance 离线部署工具"
echo "  适用于中国网络环境"
echo "=========================================="

# 脚本参数
ACTION=${1:-help}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGES_DIR="$SCRIPT_DIR/docker-images"
OFFLINE_PACKAGE_DIR="$SCRIPT_DIR/offline-package"

# 所有需要的镜像列表
REQUIRED_IMAGES=(
    # 基础设施镜像
    "postgres:16-alpine"
    "redis:7-alpine"
    
    # 应用运行时镜像
    "node:18-alpine"
    "node:20-alpine"
    
    # 代理和工具镜像
    "nginx:alpine"
    "alpine:latest"
    
    # 构建工具镜像
    "node:18-alpine"
    "alpine:latest"
)

# 显示帮助信息
show_help() {
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  prepare     在本地准备离线部署包"
    echo "  save        保存所有 Docker 镜像到本地文件"
    echo "  load        从本地文件加载 Docker 镜像"
    echo "  package     创建完整的离线部署包"
    echo "  deploy      执行离线部署"
    echo "  verify      验证离线部署环境"
    echo "  help        显示此帮助信息"
    echo ""
    echo "典型使用流程:"
    echo "  1. 在有网络的环境: ./offline-deployment.sh prepare"
    echo "  2. 将生成的离线包传输到目标服务器"
    echo "  3. 在目标服务器: ./offline-deployment.sh deploy"
}

# 准备离线部署包 (在有网络的环境执行)
prepare_offline_package() {
    log_info "准备离线部署包..."
    
    # 创建目录
    mkdir -p "$IMAGES_DIR" "$OFFLINE_PACKAGE_DIR"
    
    # 拉取所有必要的镜像
    log_info "拉取必要的 Docker 镜像..."
    for image in "${REQUIRED_IMAGES[@]}"; do
        log_info "拉取镜像: $image"
        docker pull "$image" || {
            log_error "拉取镜像失败: $image"
            return 1
        }
    done
    
    # 保存镜像到文件
    save_images
    
    # 复制项目文件
    log_info "复制项目文件到离线包..."
    cp -r "$SCRIPT_DIR/../" "$OFFLINE_PACKAGE_DIR/"
    
    # 下载 npm 依赖 (预缓存)
    log_info "预下载 npm 依赖..."
    if [ -d "$SCRIPT_DIR/../../apps" ]; then
        for service_dir in "$SCRIPT_DIR"/../../apps/api/*/; do
            if [ -f "$service_dir/package.json" ]; then
                log_info "缓存依赖: $(basename "$service_dir")"
                cd "$service_dir"
                npm ci --cache "$OFFLINE_PACKAGE_DIR/npm-cache" || true
            fi
        done
        
        # Web 应用依赖
        if [ -f "$SCRIPT_DIR/../../apps/web/package.json" ]; then
            log_info "缓存 Web 应用依赖..."
            cd "$SCRIPT_DIR/../../apps/web"
            npm ci --cache "$OFFLINE_PACKAGE_DIR/npm-cache" || true
        fi
    fi
    
    # 创建离线部署脚本
    create_offline_deploy_script
    
    # 打包
    log_info "创建离线部署压缩包..."
    cd "$SCRIPT_DIR"
    tar -czf "emaintenance-offline-$(date +%Y%m%d_%H%M%S).tar.gz" \
        docker-images/ \
        offline-package/ \
        offline-deploy.sh
    
    log_success "离线部署包准备完成!"
    log_info "文件位置: $SCRIPT_DIR/emaintenance-offline-*.tar.gz"
}

# 保存 Docker 镜像
save_images() {
    log_info "保存 Docker 镜像到本地文件..."
    mkdir -p "$IMAGES_DIR"
    
    for image in "${REQUIRED_IMAGES[@]}"; do
        filename=$(echo "$image" | tr '/:' '__')
        log_info "保存镜像: $image -> $filename.tar.gz"
        docker save "$image" | gzip > "$IMAGES_DIR/$filename.tar.gz"
    done
    
    log_success "所有镜像已保存"
}

# 加载 Docker 镜像
load_images() {
    log_info "从本地文件加载 Docker 镜像..."
    
    if [ ! -d "$IMAGES_DIR" ]; then
        log_error "镜像目录不存在: $IMAGES_DIR"
        return 1
    fi
    
    for file in "$IMAGES_DIR"/*.tar.gz; do
        if [ -f "$file" ]; then
            log_info "加载镜像: $(basename "$file")"
            gunzip -c "$file" | docker load
        fi
    done
    
    log_success "所有镜像加载完成"
}

# 创建离线部署脚本
create_offline_deploy_script() {
    cat > "$SCRIPT_DIR/offline-deploy.sh" << 'OFFLINE_DEPLOY_EOF'
#!/bin/bash

# E-Maintenance 离线部署执行脚本

set -e

log_info() { echo -e "\033[0;34m[INFO]\033[0m $1"; }
log_success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

echo "执行 E-Maintenance 离线部署..."

# 检查 Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker 未安装，请先安装 Docker"
    exit 1
fi

# 加载镜像
if [ -d "docker-images" ]; then
    log_info "加载 Docker 镜像..."
    for file in docker-images/*.tar.gz; do
        if [ -f "$file" ]; then
            log_info "加载: $(basename "$file")"
            gunzip -c "$file" | docker load
        fi
    done
else
    log_error "未找到 docker-images 目录"
    exit 1
fi

# 设置 npm 缓存
if [ -d "offline-package/npm-cache" ]; then
    log_info "配置 npm 离线缓存..."
    npm config set cache "$(pwd)/offline-package/npm-cache"
fi

# 复制部署文件
if [ -d "offline-package" ]; then
    log_info "部署应用文件..."
    cp -r offline-package/* ../
fi

log_success "离线部署准备完成，可以开始部署服务"
log_info "下一步: cd ../infrastructure && ./deploy.sh"

OFFLINE_DEPLOY_EOF
    
    chmod +x "$SCRIPT_DIR/offline-deploy.sh"
}

# 验证离线环境
verify_offline_environment() {
    log_info "验证离线部署环境..."
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        return 1
    fi
    
    # 检查镜像
    missing_images=()
    for image in "${REQUIRED_IMAGES[@]}"; do
        if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^$image$"; then
            missing_images+=("$image")
        fi
    done
    
    if [ ${#missing_images[@]} -gt 0 ]; then
        log_error "缺少以下 Docker 镜像:"
        for image in "${missing_images[@]}"; do
            echo "  - $image"
        done
        return 1
    fi
    
    log_success "离线环境验证通过"
}

# 执行离线部署
deploy_offline() {
    log_info "执行离线部署..."
    
    # 验证环境
    verify_offline_environment || {
        log_error "环境验证失败，请先运行: $0 load"
        return 1
    }
    
    # 设置 npm 为离线模式
    if command -v npm &> /dev/null; then
        npm config set offline true
        npm config set prefer-offline true
    fi
    
    log_info "开始部署基础设施服务..."
    cd "$SCRIPT_DIR/../infrastructure"
    ./deploy.sh
    
    log_success "离线部署完成"
}

# 主逻辑
case "$ACTION" in
    prepare)
        prepare_offline_package
        ;;
    save)
        save_images
        ;;
    load)
        load_images
        ;;
    package)
        prepare_offline_package
        ;;
    deploy)
        deploy_offline
        ;;
    verify)
        verify_offline_environment
        ;;
    help|*)
        show_help
        ;;
esac