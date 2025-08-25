#!/bin/bash

# 服务器环境设置脚本 (Linux Ubuntu)
# 用途: 在全新的 Ubuntu 服务器上安装必要的软件和配置环境

set -e  # 遇到错误立即退出

echo "🔧 开始服务器环境设置..."

# 检查是否为 Ubuntu 系统
if [ ! -f /etc/lsb-release ] || ! grep -q "Ubuntu" /etc/lsb-release; then
    echo "❌ 此脚本仅支持 Ubuntu 系统"
    exit 1
fi

# 检查系统版本
UBUNTU_VERSION=$(lsb_release -rs | cut -d. -f1)
if [ "$UBUNTU_VERSION" -lt 18 ]; then
    echo "❌ 需要 Ubuntu 18.04 或更高版本"
    exit 1
fi

# 更新系统包
echo "📦 更新系统包..."
sudo apt update && sudo apt upgrade -y

# 安装基础工具
echo "🛠️ 安装基础工具..."
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    nano \
    ufw \
    fail2ban \
    ca-certificates \
    gnupg \
    lsb-release

# 安装 Node.js 18
echo "📦 安装 Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "Node.js 已安装: $(node --version)"
fi

# 安装 Docker
echo "🐳 安装 Docker..."
if ! command -v docker &> /dev/null; then
    # 添加 Docker 官方 GPG 密钥
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    # 设置 Docker 仓库
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # 安装 Docker Engine
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # 启动 Docker 服务
    sudo systemctl enable docker
    sudo systemctl start docker

    # 将当前用户添加到 docker 组
    sudo usermod -aG docker $USER
    echo "⚠️  请注销并重新登录以使 Docker 用户组权限生效"
else
    echo "Docker 已安装: $(docker --version)"
fi

# 安装 Docker Compose (独立版本)
echo "🐳 安装 Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_VERSION="2.24.6"
    sudo curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    # 创建符号链接
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
else
    echo "Docker Compose 已安装: $(docker-compose --version)"
fi

# 配置防火墙
echo "🔒 配置防火墙..."
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允许 SSH 连接
sudo ufw allow ssh

# 允许 HTTP 和 HTTPS
sudo ufw allow http
sudo ufw allow https

# 启用防火墙
sudo ufw --force enable

# 创建应用目录
echo "📁 创建应用目录..."
sudo mkdir -p /opt/emaintenance/{data,logs,ssl,backup}
sudo chown -R $USER:$USER /opt/emaintenance/

# 配置 fail2ban
echo "🔒 配置 fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 安装 nginx (可选，用于 SSL 终端)
read -p "📦 是否安装 Nginx 用于 SSL 终端? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo ufw allow 'Nginx Full'
    echo "✅ Nginx 已安装并配置"
fi

# 设置系统优化
echo "⚡ 系统优化配置..."

# 增加文件描述符限制
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# 配置内核参数
cat << EOF | sudo tee -a /etc/sysctl.conf
# 网络优化
net.core.somaxconn = 65536
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_probes = 3
net.ipv4.tcp_keepalive_intvl = 90

# 内存管理
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOF

# 应用内核参数
sudo sysctl -p

# 创建日志轮转配置
echo "📊 配置日志轮转..."
cat << EOF | sudo tee /etc/logrotate.d/emaintenance
/opt/emaintenance/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    copytruncate
    notifempty
    create 0644 $USER $USER
}
EOF

# 显示系统信息
echo ""
echo "🎉 服务器环境设置完成!"
echo ""
echo "📋 系统信息:"
echo "   操作系统: $(lsb_release -d | cut -f2)"
echo "   内核版本: $(uname -r)"
echo "   CPU 核心: $(nproc)"
echo "   内存大小: $(free -h | awk '/^Mem:/ {print $2}')"
echo "   磁盘空间: $(df -h / | awk 'NR==2 {print $4 " 可用"}')"
echo "   Docker: $(docker --version)"
echo "   Docker Compose: $(docker-compose --version)"
echo "   Node.js: $(node --version)"
echo "   npm: $(npm --version)"
echo ""
echo "🔧 接下来的步骤:"
echo "1. 注销并重新登录以使 Docker 用户组权限生效"
echo "2. 克隆项目代码: git clone <repository-url>"
echo "3. 配置环境变量: cp deploy/env-templates/.env.production deploy/.env"
echo "4. 运行部署脚本: cd deploy && ./scripts/deploy-server.sh"
echo ""
echo "📚 有用的命令:"
echo "   检查防火墙状态: sudo ufw status"
echo "   查看 Docker 状态: sudo systemctl status docker"
echo "   查看系统资源: htop"
echo "   查看日志: journalctl -f"