#!/bin/bash

# Docker 镜像源配置脚本（解决国内访问 Docker Hub 问题）

echo "🔧 配置 Docker 镜像加速..."

# 备份原有配置
if [ -f /etc/docker/daemon.json ]; then
    echo "📋 备份现有配置..."
    sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.bak
fi

# 创建 Docker 配置目录
sudo mkdir -p /etc/docker

# 配置镜像加速源
echo "📝 写入镜像源配置..."
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com"
  ],
  "insecure-registries": [],
  "debug": false,
  "experimental": false,
  "live-restore": true,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

echo "✅ 镜像源配置完成"

# 重启 Docker 服务
echo "🔄 重启 Docker 服务..."
sudo systemctl daemon-reload
sudo systemctl restart docker

# 等待 Docker 启动
echo "⏳ 等待 Docker 服务启动..."
sleep 5

# 验证 Docker 服务状态
if sudo systemctl is-active --quiet docker; then
    echo "✅ Docker 服务运行正常"
else
    echo "❌ Docker 服务启动失败"
    sudo systemctl status docker
    exit 1
fi

# 测试镜像拉取
echo ""
echo "🧪 测试镜像源速度..."
echo "尝试拉取 alpine:latest 测试镜像..."
time docker pull alpine:latest

echo ""
echo "✅ Docker 镜像源配置完成!"
echo ""
echo "📋 已配置的镜像源:"
echo "   1. 腾讯云镜像: mirror.ccs.tencentyun.com"
echo "   2. 中科大镜像: docker.mirrors.ustc.edu.cn"
echo "   3. 网易镜像: hub-mirror.c.163.com"
echo ""
echo "🔍 查看配置:"
echo "   cat /etc/docker/daemon.json"
echo ""
echo "📦 拉取常用镜像:"
echo "   docker pull postgres:16"
echo "   docker pull redis:7-alpine"
echo "   docker pull nginx:alpine"