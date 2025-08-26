#!/bin/bash

# E-Maintenance 基础设施服务部署脚本
# 部署 PostgreSQL 数据库和 Redis 缓存

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 脚本信息
echo "=========================================="
echo "  E-Maintenance 基础设施服务部署"
echo "  版本: v2.0"
echo "  服务: PostgreSQL, Redis"
echo "=========================================="

# 检查运行环境
log_info "检查运行环境..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    log_error "此脚本用于 Linux 服务器，检测到 macOS 环境"
    log_info "请使用本地部署脚本: ../Local/deploy-local.sh"
    exit 1
fi

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    log_error "Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 检查 Docker 服务状态
if ! systemctl is-active --quiet docker; then
    log_info "启动 Docker 服务..."
    sudo systemctl start docker
fi

# 切换到脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查环境配置文件
if [ ! -f .env ]; then
    if [ -f ../../../.env ]; then
        log_info "使用项目根目录的环境配置"
        cp ../../../.env .env
    else
        log_error "未找到环境配置文件"
        log_info "请创建 .env 文件或运行: cp ../../Local/env-templates/.env.example .env"
        exit 1
    fi
fi

# 加载环境变量
source .env

# 验证必要的环境变量
if [ -z "$POSTGRES_PASSWORD" ]; then
    log_error "POSTGRES_PASSWORD 环境变量未设置"
    exit 1
fi

# 创建必要的数据目录
log_info "创建数据持久化目录..."
sudo mkdir -p /opt/emaintenance/data/{postgres-backup,redis-backup}
sudo chown -R $USER:$USER /opt/emaintenance/

# 创建 Redis 配置文件
log_info "创建 Redis 配置文件..."
cat > redis.conf << 'EOF'
# Redis 生产环境配置
bind 0.0.0.0
protected-mode yes
port 6379
timeout 300
tcp-keepalive 60
maxclients 10000
save 900 1
save 300 10  
save 60 10000
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /data/
EOF

# 创建数据库初始化脚本目录
mkdir -p init-scripts

# 创建数据库初始化脚本
cat > init-scripts/01-init-database.sql << 'EOF'
-- E-Maintenance 数据库初始化脚本
-- 创建必要的扩展和配置

-- 启用必要的 PostgreSQL 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 设置时区
SET timezone = 'Asia/Shanghai';

-- 创建应用用户 (如果需要)
-- CREATE USER emaintenance_app WITH PASSWORD 'app_password';
-- GRANT CONNECT ON DATABASE emaintenance TO emaintenance_app;
EOF

# 停止现有的基础设施服务 (如果存在)
log_info "停止现有基础设施服务..."
docker-compose down --remove-orphans 2>/dev/null || true

# 清理旧的网络 (如果存在)
docker network rm emaintenance-network 2>/dev/null || true

# 拉取最新镜像 (支持中国镜像源)
log_info "拉取最新的 Docker 镜像..."

# 检查是否为离线部署模式
if [ "$OFFLINE_MODE" = "true" ]; then
    log_info "离线模式，跳过镜像拉取"
else
    # 尝试拉取镜像，失败时继续执行
    docker-compose pull || {
        log_warning "镜像拉取失败，可能是网络问题"
        log_info "如果已经有本地镜像，继续部署..."
        log_info "如需离线部署，请设置 OFFLINE_MODE=true"
    }
fi

# 启动基础设施服务
log_info "启动基础设施服务..."
docker-compose up -d

# 等待服务启动
log_info "等待服务启动完成..."
sleep 15

# 执行健康检查
log_info "执行健康检查..."
./health-check.sh

if [ $? -eq 0 ]; then
    log_success "基础设施服务部署成功！"
    echo ""
    log_info "服务访问地址:"
    echo "  PostgreSQL: localhost:${POSTGRES_PORT:-5432}"
    echo "  Redis: localhost:${REDIS_PORT:-6380}"
    echo ""
    log_info "下一步: 运行数据库初始化"
    echo "  cd ../database && ./init.sh"
else
    log_error "基础设施服务部署失败"
    echo ""
    log_info "查看服务日志:"
    echo "  docker-compose logs postgres"
    echo "  docker-compose logs redis"
    exit 1
fi