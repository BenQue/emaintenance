#!/bin/bash

# Emaintenance 本地部署脚本 (MacBook M4 Pro)
# 用途: 在本地开发环境构建和启动所有服务

set -e  # 遇到错误立即退出

echo "🚀 开始 Emaintenance 本地部署..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker Desktop"
    exit 1
fi

# 检查 Docker Compose 是否可用
if ! docker-compose --version > /dev/null 2>&1; then
    echo "❌ Docker Compose 未安装或不可用"
    exit 1
fi

# 进入部署目录
cd "$(dirname "$0")/.."

# 创建环境文件
if [ ! -f .env ]; then
    echo "📝 创建本地环境配置文件..."
    cp env-templates/.env.example .env
    
    # 为本地开发设置合适的值
    sed -i.bak 's/NODE_ENV=production/NODE_ENV=development/' .env
    sed -i.bak 's/your-super-secret-jwt-key-change-in-production-minimum-32-characters/local-development-jwt-secret-key-for-testing-only/' .env
    
    echo "✅ 环境配置文件已创建: .env"
    echo "ℹ️  如需修改配置，请编辑 deploy/.env 文件"
fi

# 显示系统信息
echo "📋 系统信息:"
echo "   架构: $(uname -m)"
echo "   Docker: $(docker --version)"
echo "   Docker Compose: $(docker-compose --version)"

# 清理旧的容器和镜像 (可选)
read -p "🧹 是否清理旧的容器和镜像? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 清理旧的部署..."
    docker-compose down --remove-orphans --volumes || true
    docker system prune -f
fi

# 构建并启动服务
echo "🔨 构建 Docker 镜像..."
docker-compose -f docker-compose.local.yml build --no-cache

echo "🚀 启动所有服务..."
docker-compose -f docker-compose.local.yml up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 健康检查
echo "🏥 检查服务健康状态..."
./scripts/health-check.sh

echo ""
echo "🎉 本地部署完成!"
echo ""
echo "📱 访问地址:"
echo "   Web 应用:        http://localhost:3000"
echo "   用户服务:        http://localhost:3001/health"
echo "   工单服务:        http://localhost:3002/health"
echo "   资产服务:        http://localhost:3003/health"
echo "   Nginx 代理:      http://localhost/health"
echo ""
echo "🔍 查看日志:"
echo "   所有服务:        docker-compose -f docker-compose.local.yml logs"
echo "   特定服务:        docker-compose -f docker-compose.local.yml logs [service-name]"
echo ""
echo "🛑 停止服务:"
echo "   docker-compose -f docker-compose.local.yml down"