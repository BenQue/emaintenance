#!/bin/bash

# Emaintenance 服务器部署脚本 (Linux Ubuntu)
# 用途: 在生产/测试服务器上构建和启动所有服务

set -e  # 遇到错误立即退出

echo "🚀 开始 Emaintenance 服务器部署..."

# 检查运行环境
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "⚠️  检测到 macOS 环境，此脚本用于 Linux 服务器部署"
    echo "如需本地部署，请使用: ./deploy-local.sh"
    exit 1
fi

# 检查是否为 root 或有 sudo 权限
if [[ $EUID -eq 0 ]]; then
    echo "⚠️  不建议使用 root 用户运行部署脚本"
    read -p "继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    echo "请先安装 Docker: https://docs.docker.com/engine/install/ubuntu/"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装"
    echo "请先安装 Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# 检查 Docker 服务状态
if ! systemctl is-active --quiet docker; then
    echo "🔄 启动 Docker 服务..."
    sudo systemctl start docker
fi

# 进入部署目录
cd "$(dirname "$0")/.."

# 检查环境配置
if [ ! -f .env ]; then
    echo "❌ 环境配置文件不存在"
    echo "请先复制并配置环境文件:"
    echo "   cp env-templates/.env.example .env"
    echo "   nano .env  # 编辑配置"
    exit 1
fi

# 检查关键配置项
if grep -q "your-super-secret-jwt-key-change-in-production" .env; then
    echo "❌ 检测到默认的 JWT 密钥，请修改 .env 文件中的 JWT_SECRET"
    exit 1
fi

if grep -q "Qzy@7091!" .env && grep -q "production" .env; then
    echo "⚠️  检测到默认数据库密码，建议修改 .env 文件中的 POSTGRES_PASSWORD"
    read -p "继续使用默认密码? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 显示系统信息
echo "📋 系统信息:"
echo "   系统: $(uname -s) $(uname -r)"
echo "   架构: $(uname -m)"
echo "   Docker: $(docker --version)"
echo "   Docker Compose: $(docker-compose --version)"
echo "   内存: $(free -h | awk '/^Mem:/ {print $2}')"
echo "   磁盘: $(df -h . | awk 'NR==2 {print $4 " 可用"}')"

# 选择部署配置文件
if [ -f docker-compose.prod.yml ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "📋 使用生产环境配置: $COMPOSE_FILE"
else
    COMPOSE_FILE="docker-compose.yml"
    echo "📋 使用默认配置: $COMPOSE_FILE"
fi

# 创建数据目录
echo "📁 创建数据持久化目录..."
sudo mkdir -p /opt/emaintenance/{data,logs,ssl}
sudo chown -R $USER:$USER /opt/emaintenance/

# 停止现有服务 (如果有)
if docker-compose -f $COMPOSE_FILE ps 2>/dev/null | grep -q "Up"; then
    echo "🛑 停止现有服务..."
    docker-compose -f $COMPOSE_FILE down
fi

# 清理旧的镜像 (可选)
read -p "🧹 是否清理旧的 Docker 镜像以节省空间? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo "🧹 清理未使用的 Docker 资源..."
    docker system prune -f
fi

# 构建镜像
echo "🔨 构建 Docker 镜像 (这可能需要几分钟)..."
docker-compose -f $COMPOSE_FILE build --no-cache --parallel

# 启动服务
echo "🚀 启动所有服务..."
docker-compose -f $COMPOSE_FILE up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 45

# 数据库初始化
echo "🗄️ 初始化数据库..."
docker-compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d emaintenance -c "SELECT version();" || {
    echo "❌ 数据库连接失败"
    docker-compose -f $COMPOSE_FILE logs postgres
    exit 1
}

# 健康检查
echo "🏥 检查服务健康状态..."
./scripts/health-check.sh

# 显示服务状态
echo ""
echo "📊 服务状态:"
docker-compose -f $COMPOSE_FILE ps

echo ""
echo "🎉 服务器部署完成!"
echo ""
echo "📱 访问地址:"
if command -v curl &> /dev/null; then
    SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
    echo "   Web 应用:        http://$SERVER_IP"
    echo "   健康检查:        http://$SERVER_IP/health"
else
    echo "   Web 应用:        http://[服务器IP]"
    echo "   健康检查:        http://[服务器IP]/health"
fi
echo ""
echo "🔍 监控命令:"
echo "   查看服务状态:    docker-compose ps"
echo "   查看所有日志:    docker-compose logs"
echo "   查看特定日志:    docker-compose logs [service-name]"
echo "   重启服务:        docker-compose restart [service-name]"
echo ""
echo "🛑 停止服务:"
echo "   docker-compose down"
echo ""
echo "💾 数据备份:"
echo "   数据库:          docker-compose exec postgres pg_dump -U postgres emaintenance > backup.sql"
echo "   上传文件:        cp -r uploads/ /backup/"