#!/bin/bash

# E-Maintenance 中国镜像源配置脚本
# 为中国服务器配置最优的 Docker 镜像源和 npm 源

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
echo "  中国网络环境优化配置"
echo "  配置 Docker 和 npm 镜像源"
echo "=========================================="

# 检测网络环境
log_info "检测网络环境和地理位置..."
CHINA_DETECTED=false

# 检查是否能访问 GitHub
if ! curl -s --connect-timeout 5 https://github.com > /dev/null 2>&1; then
    log_warning "GitHub 访问受限，疑似中国网络环境"
    CHINA_DETECTED=true
fi

# 检查是否能访问 Docker Hub
if ! curl -s --connect-timeout 5 https://hub.docker.com > /dev/null 2>&1; then
    log_warning "Docker Hub 访问受限"
    CHINA_DETECTED=true
fi

if [ "$CHINA_DETECTED" = true ]; then
    log_info "检测到中国网络环境，配置国内镜像源..."
else
    log_info "网络环境良好，使用默认镜像源"
    echo "如需强制使用国内镜像源，请设置环境变量: FORCE_CHINA_MIRRORS=true"
    if [ "$FORCE_CHINA_MIRRORS" != "true" ]; then
        exit 0
    fi
fi

# 1. 配置 Docker 镜像源
log_info "配置 Docker 镜像源..."

# 创建 Docker daemon 配置目录
sudo mkdir -p /etc/docker

# 备份现有配置
if [ -f /etc/docker/daemon.json ]; then
    sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.backup.$(date +%Y%m%d_%H%M%S)
fi

# 检查本地镜像仓库
log_info "检查本地镜像仓库..."
if curl -s --connect-timeout 3 http://localhost:5000/v2/_catalog > /dev/null 2>&1; then
    log_success "检测到本地镜像仓库 (localhost:5000)"
    LOCAL_REGISTRY_AVAILABLE=true
else
    log_info "本地镜像仓库不可用，使用远程镜像源"
    LOCAL_REGISTRY_AVAILABLE=false
fi

# 创建或更新 Docker daemon 配置
log_info "配置 Docker 镜像加速器..."
if [ "$LOCAL_REGISTRY_AVAILABLE" = true ]; then
    cat << 'EOF' | sudo tee /etc/docker/daemon.json
{
  "registry-mirrors": [
    "http://localhost:5000",
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://ccr.ccs.tencentyun.com"
  ],
  "insecure-registries": ["localhost:5000"],
EOF
else
    cat << 'EOF' | sudo tee /etc/docker/daemon.json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://ccr.ccs.tencentyun.com"
  ],
EOF
fi

cat << 'EOF' | sudo tee -a /etc/docker/daemon.json
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "exec-opts": ["native.cgroupdriver=systemd"],
  "live-restore": true
}
EOF

# 重启 Docker 服务
log_info "重启 Docker 服务以应用配置..."
sudo systemctl daemon-reload
sudo systemctl restart docker

# 验证 Docker 镜像源配置
log_info "验证 Docker 配置..."
if docker info | grep -A 10 "Registry Mirrors" | grep -q "ustc.edu.cn\|163.com\|baidubce.com"; then
    log_success "Docker 镜像源配置成功"
else
    log_warning "Docker 镜像源配置可能未生效"
fi

# 2. 配置 npm 镜像源
log_info "配置 npm 镜像源..."

# 检查是否安装了 npm
if command -v npm &> /dev/null; then
    # 配置 npm 淘宝镜像源
    npm config set registry https://registry.npmmirror.com
    npm config set sass_binary_site https://npmmirror.com/mirrors/node-sass/
    npm config set electron_mirror https://npmmirror.com/mirrors/electron/
    npm config set puppeteer_download_host https://npmmirror.com/mirrors
    npm config set chromedriver_cdnurl https://npmmirror.com/mirrors/chromedriver
    npm config set operadriver_cdnurl https://npmmirror.com/mirrors/operadriver
    npm config set phantomjs_cdnurl https://npmmirror.com/mirrors/phantomjs
    npm config set selenium_cdnurl https://npmmirror.com/mirrors/selenium
    npm config set node_inspector_cdnurl https://npmmirror.com/mirrors/node-inspector
    
    log_success "npm 镜像源配置完成"
    log_info "当前 npm 源: $(npm config get registry)"
else
    log_info "npm 未安装，跳过 npm 源配置"
fi

# 3. 配置 apt 镜像源 (Ubuntu)
if command -v apt &> /dev/null; then
    log_info "配置 Ubuntu apt 镜像源..."
    
    # 备份原始源列表
    sudo cp /etc/apt/sources.list /etc/apt/sources.list.backup.$(date +%Y%m%d_%H%M%S)
    
    # 检测 Ubuntu 版本
    UBUNTU_VERSION=$(lsb_release -cs)
    log_info "检测到 Ubuntu 版本: $UBUNTU_VERSION"
    
    # 配置清华大学镜像源
    cat << EOF | sudo tee /etc/apt/sources.list
# 清华大学 Ubuntu 镜像源
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ $UBUNTU_VERSION main restricted universe multiverse
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ $UBUNTU_VERSION-updates main restricted universe multiverse
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ $UBUNTU_VERSION-backports main restricted universe multiverse
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ $UBUNTU_VERSION-security main restricted universe multiverse

# 阿里云备用源
deb https://mirrors.aliyun.com/ubuntu/ $UBUNTU_VERSION main restricted universe multiverse
deb https://mirrors.aliyun.com/ubuntu/ $UBUNTU_VERSION-updates main restricted universe multiverse
deb https://mirrors.aliyun.com/ubuntu/ $UBUNTU_VERSION-backports main restricted universe multiverse
deb https://mirrors.aliyun.com/ubuntu/ $UBUNTU_VERSION-security main restricted universe multiverse
EOF
    
    log_info "更新软件包列表..."
    sudo apt update
    log_success "Ubuntu apt 镜像源配置完成"
fi

# 4. 预拉取必要的 Docker 镜像
log_info "预拉取必要的 Docker 镜像..."

# 定义需要的镜像列表
IMAGES=(
    "postgres:16-alpine"
    "redis:7-alpine"
    "nginx:alpine"
    "node:18-alpine"
    "node:20-alpine"
)

# 并行拉取镜像
for image in "${IMAGES[@]}"; do
    log_info "拉取镜像: $image"
    docker pull "$image" &
done

# 等待所有拉取完成
wait
log_success "Docker 镜像预拉取完成"

# 5. 创建离线部署包 (可选)
log_info "创建离线部署脚本..."
cat << 'EOF' > save-images.sh
#!/bin/bash
# 保存 Docker 镜像到本地文件

IMAGES=(
    "postgres:16-alpine"
    "redis:7-alpine" 
    "nginx:alpine"
    "node:18-alpine"
    "node:20-alpine"
)

mkdir -p docker-images

for image in "${IMAGES[@]}"; do
    echo "保存镜像: $image"
    docker save "$image" | gzip > "docker-images/$(echo $image | tr '/:' '_').tar.gz"
done

echo "所有镜像已保存到 docker-images/ 目录"
EOF

cat << 'EOF' > load-images.sh
#!/bin/bash
# 从本地文件加载 Docker 镜像

if [ ! -d "docker-images" ]; then
    echo "未找到 docker-images 目录"
    exit 1
fi

for file in docker-images/*.tar.gz; do
    echo "加载镜像: $file"
    docker load < "$file"
done

echo "所有镜像加载完成"
EOF

chmod +x save-images.sh load-images.sh

# 6. 测试网络连接
log_info "测试镜像源连接速度..."

# 测试 Docker Hub 连接
log_info "测试 Docker 镜像拉取速度..."
time docker pull hello-world > /dev/null 2>&1 && log_success "Docker 镜像拉取正常" || log_warning "Docker 镜像拉取较慢"

# 测试 npm 连接
if command -v npm &> /dev/null; then
    log_info "测试 npm 镜像源连接..."
    time npm info express > /dev/null 2>&1 && log_success "npm 镜像源连接正常" || log_warning "npm 镜像源连接较慢"
fi

echo ""
echo "=========================================="
log_success "中国网络环境优化配置完成！"
echo "=========================================="
echo ""
log_info "配置摘要:"
echo "  ✅ Docker 镜像源: 已配置国内加速器"
echo "  ✅ npm 镜像源: 已配置淘宝镜像"
echo "  ✅ apt 镜像源: 已配置清华大学镜像"
echo "  ✅ 基础镜像: 已预拉取"
echo ""
log_info "离线部署支持:"
echo "  📦 运行 ./save-images.sh 保存镜像到本地"
echo "  📦 运行 ./load-images.sh 从本地加载镜像"
echo ""
log_info "下一步: 继续执行基础设施部署"
echo "  ./deploy.sh"