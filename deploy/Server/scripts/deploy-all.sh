#!/bin/bash

# E-Maintenance 全系统部署脚本
# 按照正确顺序部署所有服务

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
echo "  🚀 E-Maintenance 全系统部署"
echo "  版本: v2.0"
echo "  中国服务器优化版"
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# 检查参数
SKIP_INFRASTRUCTURE=false
SKIP_DATABASE=false
OFFLINE_MODE=false

for arg in "$@"; do
    case $arg in
        --skip-infrastructure)
            SKIP_INFRASTRUCTURE=true
            ;;
        --skip-database)
            SKIP_DATABASE=true
            ;;
        --offline)
            OFFLINE_MODE=true
            export OFFLINE_MODE=true
            ;;
        --help|-h)
            echo "用法: $0 [选项]"
            echo "选项:"
            echo "  --skip-infrastructure  跳过基础设施部署 (PostgreSQL, Redis)"
            echo "  --skip-database        跳过数据库初始化"
            echo "  --offline              离线模式部署"
            echo "  --help, -h             显示帮助信息"
            exit 0
            ;;
    esac
done

# 记录开始时间
START_TIME=$(date +%s)

log_info "部署模式: $([ "$OFFLINE_MODE" = "true" ] && echo "离线部署" || echo "在线部署")"

# Docker 安全检查
echo ""
log_info "🛡️  执行 Docker 安全检查..."
echo "==========================================="
cd scripts
./docker-safety-check.sh || {
    log_error "Docker 安全检查失败"
    read -p "是否继续部署? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
}
cd ..

# 阶段 1: 基础设施部署
if [ "$SKIP_INFRASTRUCTURE" = "false" ]; then
    echo ""
    log_info "🏗️  阶段 1/6: 部署基础设施服务 (PostgreSQL, Redis)"
    echo "===========================================" 
    cd infrastructure
    
    # 配置中国镜像源 (仅在线模式)
    if [ "$OFFLINE_MODE" = "false" ]; then
        log_info "配置中国镜像源..."
        ./setup-china-mirrors.sh || log_warning "镜像源配置可能失败，继续部署..."
    fi
    
    ./deploy.sh || {
        log_error "基础设施部署失败"
        exit 1
    }
    cd ..
else
    log_info "⏭️  跳过基础设施部署"
fi

# 阶段 2: 数据库初始化
if [ "$SKIP_DATABASE" = "false" ]; then
    echo ""
    log_info "🗄️  阶段 2/6: 初始化数据库"
    echo "==========================================="
    cd database
    ./init.sh || {
        log_error "数据库初始化失败"
        exit 1
    }
    cd ..
else
    log_info "⏭️  跳过数据库初始化"
fi

# 阶段 3: 用户服务部署
echo ""
log_info "👤 阶段 3/6: 部署用户服务"
echo "==========================================="
cd user-service
./deploy.sh || {
    log_error "用户服务部署失败"
    exit 1
}
cd ..

# 阶段 4: 工单服务部署
echo ""
log_info "📋 阶段 4/6: 部署工单服务"
echo "==========================================="
cd work-order-service
./deploy.sh || {
    log_error "工单服务部署失败"
    exit 1
}
cd ..

# 阶段 5: 资产服务部署
echo ""
log_info "🏭 阶段 5/6: 部署资产服务"
echo "==========================================="
cd asset-service
./deploy.sh || {
    log_error "资产服务部署失败"
    exit 1
}
cd ..

# 阶段 6: Web应用和Nginx部署
echo ""
log_info "🌐 阶段 6a/6: 部署Web应用"
echo "==========================================="
cd web-service
./deploy.sh || {
    log_error "Web应用部署失败"
    exit 1
}
cd ..

echo ""
log_info "🔀 阶段 6b/6: 部署Nginx反向代理"
echo "==========================================="
cd nginx
./deploy.sh || {
    log_error "Nginx部署失败"
    exit 1
}
cd ..

# 计算部署时间
END_TIME=$(date +%s)
DEPLOY_TIME=$((END_TIME - START_TIME))
DEPLOY_MINUTES=$((DEPLOY_TIME / 60))
DEPLOY_SECONDS=$((DEPLOY_TIME % 60))

# 最终系统检查
echo ""
log_info "🔍 执行最终系统检查..."
echo "==========================================="
cd scripts
./system-status.sh

echo ""
echo "=========================================="
echo "🎉 E-Maintenance 系统部署完成！"
echo "=========================================="
echo ""
log_success "部署统计信息:"
echo "  总用时: ${DEPLOY_MINUTES}分${DEPLOY_SECONDS}秒"
echo "  部署模式: $([ "$OFFLINE_MODE" = "true" ] && echo "离线部署" || echo "在线部署")"
echo "  服务总数: 6个 (PostgreSQL, Redis, User, WorkOrder, Asset, Web, Nginx)"
echo ""
log_info "🌐 系统访问地址:"
SERVER_IP=$(hostname -I | awk '{print $1}' || echo "localhost")
echo "  主应用: http://$SERVER_IP:3030"
echo "  健康检查: http://$SERVER_IP:3030/health"
echo "  管理后台: http://$SERVER_IP:3030/admin"
echo ""
log_info "📋 默认管理员账号:"
echo "  邮箱: admin@emaintenance.com"
echo "  密码: admin123"
echo ""
log_info "🔧 管理命令:"
echo "  查看系统状态: cd scripts && ./system-status.sh"
echo "  备份数据: cd scripts && ./backup-all.sh"
echo "  停止所有服务: cd scripts && ./stop-all.sh"
echo "  重启系统: cd scripts && ./restart-all.sh"
echo ""
log_info "📚 文档和支持:"
echo "  部署文档: deploy/Server/README.md"
echo "  中国部署指南: deploy/Server/README-CHINA.md"
echo "  故障排查: 每个服务目录下的 health-check.sh"
echo ""
log_success "部署成功！系统已就绪 🚀"