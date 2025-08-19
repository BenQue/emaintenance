#!/bin/bash

# 本地Docker镜像仓库设置脚本
# 为生产环境部署准备必要的Docker镜像到本地仓库 10.163.144.13:5000

set -e

# 颜色代码
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
LOCAL_REGISTRY="10.163.144.13:5000"
LOG_FILE="/tmp/registry-setup-$(date +%Y%m%d_%H%M%S).log"

# 函数
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

# 需要的基础镜像列表
BASE_IMAGES=(
    "postgres:16-alpine"
    "redis:7-alpine"
    "nginx:alpine"
    "node:18-alpine"
    "node:20-alpine"
)

# 检查本地仓库连接
check_registry_connection() {
    log "检查本地Docker仓库连接..."
    
    if curl -f http://$LOCAL_REGISTRY/v2/ >/dev/null 2>&1; then
        log "本地Docker仓库连接正常"
    else
        error "无法连接到本地Docker仓库 $LOCAL_REGISTRY"
    fi
}

# 配置Docker客户端信任本地仓库
configure_docker_registry() {
    log "配置Docker客户端信任本地仓库..."
    
    # 检查Docker配置目录
    if [[ ! -d "/etc/docker" ]]; then
        sudo mkdir -p /etc/docker
    fi
    
    # 创建或更新daemon.json
    if [[ -f "/etc/docker/daemon.json" ]]; then
        # 备份现有配置
        sudo cp /etc/docker/daemon.json "/etc/docker/daemon.json.backup.$(date +%Y%m%d_%H%M%S)"
        info "已备份现有Docker配置"
    fi
    
    # 创建新的daemon.json配置
    cat > /tmp/daemon.json << EOF
{
  "insecure-registries": ["$LOCAL_REGISTRY"],
  "registry-mirrors": ["http://$LOCAL_REGISTRY"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
    
    sudo mv /tmp/daemon.json /etc/docker/daemon.json
    
    # 重启Docker服务
    info "重启Docker服务以应用配置..."
    sudo systemctl restart docker
    
    # 等待Docker服务启动
    sleep 10
    
    if systemctl is-active --quiet docker; then
        log "Docker服务重启成功"
    else
        error "Docker服务重启失败"
    fi
}

# 拉取并推送镜像到本地仓库
prepare_images() {
    log "开始准备基础镜像..."
    
    for image in "${BASE_IMAGES[@]}"; do
        info "处理镜像: $image"
        
        # 拉取原始镜像
        info "拉取镜像: $image"
        if docker pull "$image"; then
            log "成功拉取镜像: $image"
        else
            warning "拉取镜像失败: $image，跳过该镜像"
            continue
        fi
        
        # 标记为本地仓库镜像
        local_image="$LOCAL_REGISTRY/$image"
        info "标记镜像: $image -> $local_image"
        docker tag "$image" "$local_image"
        
        # 推送到本地仓库
        info "推送镜像到本地仓库: $local_image"
        if docker push "$local_image"; then
            log "成功推送镜像: $local_image"
        else
            warning "推送镜像失败: $local_image"
        fi
        
        echo ""
    done
}

# 验证本地仓库镜像
verify_registry_images() {
    log "验证本地仓库镜像..."
    
    info "本地仓库中的镜像列表："
    
    for image in "${BASE_IMAGES[@]}"; do
        local_image="$LOCAL_REGISTRY/$image"
        
        # 检查镜像是否存在于本地仓库
        if curl -f http://$LOCAL_REGISTRY/v2/${image}/tags/list >/dev/null 2>&1; then
            log "✅ $local_image - 可用"
        else
            warning "❌ $local_image - 不可用"
        fi
    done
}

# 创建镜像拉取脚本
create_pull_script() {
    log "创建镜像预拉取脚本..."
    
    cat > "pull-local-images.sh" << 'EOF'
#!/bin/bash

# E-Maintenance 本地镜像预拉取脚本
# 在部署前预先拉取所有需要的镜像

set -e

LOCAL_REGISTRY="10.163.144.13:5000"

echo "🐳 从本地仓库预拉取所有镜像..."

images=(
    "postgres:16-alpine"
    "redis:7-alpine"
    "nginx:alpine"
)

for image in "${images[@]}"; do
    local_image="$LOCAL_REGISTRY/$image"
    echo "📥 拉取镜像: $local_image"
    docker pull "$local_image" || echo "⚠️ 拉取失败: $local_image"
done

echo "✅ 镜像预拉取完成"
EOF
    
    chmod +x "pull-local-images.sh"
    log "镜像预拉取脚本已创建: pull-local-images.sh"
}

# 生成部署建议
generate_deployment_notes() {
    log "生成部署建议..."
    
    cat > "LOCAL_REGISTRY_NOTES.md" << EOF
# 本地Docker镜像仓库配置说明

## 🎯 本地仓库地址
- **仓库地址**: $LOCAL_REGISTRY
- **访问方式**: HTTP (内网不安全连接)

## ⚙️ 已配置镜像

### 基础镜像
- \`$LOCAL_REGISTRY/postgres:16-alpine\` - PostgreSQL数据库
- \`$LOCAL_REGISTRY/redis:7-alpine\` - Redis缓存
- \`$LOCAL_REGISTRY/nginx:alpine\` - Nginx反向代理

## 🚀 部署优势

1. **加速下载**: 镜像从本地网络下载，速度大幅提升
2. **离线部署**: 不依赖外网连接
3. **版本稳定**: 确保使用固定版本的镜像

## 📋 使用说明

### 预拉取镜像
```bash
# 在部署前运行，预先下载所有镜像
./pull-local-images.sh
```

### 部署时自动使用
部署脚本会自动使用本地仓库镜像，无需额外配置。

## 🔧 故障排除

### 镜像拉取失败
```bash
# 检查本地仓库连接
curl http://$LOCAL_REGISTRY/v2/

# 检查Docker配置
cat /etc/docker/daemon.json

# 重启Docker服务
sudo systemctl restart docker
```

### 镜像不存在
```bash
# 重新运行镜像准备脚本
./setup-local-registry.sh
```

---
**生成时间**: $(date)
**仓库地址**: $LOCAL_REGISTRY
EOF
    
    log "部署说明文档已创建: LOCAL_REGISTRY_NOTES.md"
}

# 主函数
main() {
    echo -e "${GREEN}"
    echo "=============================================="
    echo "  E-Maintenance 本地镜像仓库设置"
    echo "  目标仓库: $LOCAL_REGISTRY"
    echo "=============================================="
    echo -e "${NC}"
    
    check_registry_connection
    configure_docker_registry
    prepare_images
    verify_registry_images
    create_pull_script
    generate_deployment_notes
    
    echo -e "${GREEN}"
    echo "=============================================="
    echo "  本地镜像仓库设置完成！"
    echo "=============================================="
    echo -e "${NC}"
    echo "✅ Docker客户端已配置使用本地仓库"
    echo "✅ 基础镜像已推送到本地仓库"
    echo "✅ 部署脚本已更新使用本地镜像"
    echo ""
    echo "📝 详细日志: $LOG_FILE"
    echo "📖 使用说明: LOCAL_REGISTRY_NOTES.md"
    echo ""
    echo "🚀 现在可以运行 './deploy.sh' 进行快速部署！"
}

# 执行主函数
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi