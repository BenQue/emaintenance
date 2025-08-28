#!/bin/bash

# E-Maintenance 工单服务重新部署脚本（远程服务器）
# 基于现有部署脚本，修复工单分配API问题并重新部署

set -e

# ========== 配置部分 ==========
# 请根据实际情况修改这些参数
SERVER_IP="10.163.144.13"
SSH_USER="root"
REMOTE_DEPLOY_PATH="/opt/emaintenance/deploy/Server"

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

echo "============================================"
echo "  E-Maintenance 工单服务重新部署"
echo "  目标服务器: $SERVER_IP"  
echo "  部署路径: $REMOTE_DEPLOY_PATH"
echo "============================================"
echo ""

# 1. 首先修复本地代码
log_info "修复本地工单服务代码..."
WORKORDER_ROUTES="/Users/benque/Project/Emaintenance/apps/api/work-order-service/src/routes/workOrders.ts"

if [ -f "$WORKORDER_ROUTES" ]; then
    # 检查是否已经是PUT方法
    if grep -q "router.put('/:id/assign'" "$WORKORDER_ROUTES"; then
        log_success "路由文件已经是正确的PUT方法"
    else
        log_warning "需要修改路由文件"
        # 这应该已经修复了，但为了保险起见再检查一次
        sed -i '' "s/router\.post('\/:id\/assign'/router.put('\/:id\/assign'/g" "$WORKORDER_ROUTES"
        log_success "路由文件已修复为PUT方法"
    fi
else
    log_error "找不到本地路由文件"
    exit 1
fi

# 2. 打包需要更新的文件
log_info "打包工单服务文件..."
cd /Users/benque/Project/Emaintenance

# 创建临时打包目录
TEMP_DIR="/tmp/workorder-service-update-$(date +%Y%m%d%H%M%S)"
mkdir -p $TEMP_DIR

# 复制必要的文件（不包括node_modules等）
cp -r apps/api/work-order-service $TEMP_DIR/
cp -r packages $TEMP_DIR/
cp package*.json $TEMP_DIR/
cp -r deploy/Server/work-order-service $TEMP_DIR/deploy-config/

# 创建压缩包
tar -czf /tmp/workorder-update.tar.gz -C $TEMP_DIR .
log_success "文件打包完成"

# 3. 上传到远程服务器
log_info "上传文件到远程服务器..."
scp /tmp/workorder-update.tar.gz $SSH_USER@$SERVER_IP:/tmp/

# 4. 创建远程部署脚本
cat > /tmp/remote-redeploy.sh << 'REMOTE_SCRIPT'
#!/bin/bash

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

DEPLOY_PATH="/opt/emaintenance/deploy/Server"

echo "=========================================="
echo "  远程服务器工单服务重新部署"
echo "=========================================="

# 1. 解压更新文件
log_info "解压更新文件..."
cd /tmp
tar -xzf workorder-update.tar.gz

# 2. 备份现有服务
log_info "备份现有工单服务..."
if [ -d "$DEPLOY_PATH/work-order-service" ]; then
    mv $DEPLOY_PATH/work-order-service $DEPLOY_PATH/work-order-service.backup.$(date +%Y%m%d%H%M%S)
fi

if [ -d "$DEPLOY_PATH/../../../apps/api/work-order-service" ]; then
    cp -r $DEPLOY_PATH/../../../apps/api/work-order-service $DEPLOY_PATH/../../../apps/api/work-order-service.backup.$(date +%Y%m%d%H%M%S)
fi

# 3. 更新源代码
log_info "更新工单服务源代码..."
mkdir -p $DEPLOY_PATH/../../../apps/api
cp -r /tmp/apps/api/work-order-service $DEPLOY_PATH/../../../apps/api/

# 更新packages
cp -r /tmp/packages/* $DEPLOY_PATH/../../../packages/

# 更新部署配置
cp -r /tmp/deploy-config $DEPLOY_PATH/work-order-service

# 4. 进入工单服务部署目录
cd $DEPLOY_PATH/work-order-service

# 5. 加载环境变量
if [ -f ../infrastructure/.env ]; then
    log_info "加载环境变量..."
    source ../infrastructure/.env
else
    log_error "找不到环境变量文件"
    exit 1
fi

# 6. 验证依赖服务
log_info "检查依赖服务..."

# 检查PostgreSQL
if ! docker ps --filter "name=emaintenance-postgres" --filter "status=running" | grep -q "emaintenance-postgres"; then
    log_error "PostgreSQL服务未运行"
    exit 1
fi

# 检查Redis
if ! docker ps --filter "name=emaintenance-redis" --filter "status=running" | grep -q "emaintenance-redis"; then
    log_error "Redis服务未运行"
    exit 1
fi

# 检查用户服务
if ! docker ps --filter "name=emaintenance-user-service" --filter "status=running" | grep -q "emaintenance-user-service"; then
    log_error "用户服务未运行"
    exit 1
fi

log_success "所有依赖服务正常"

# 7. 停止现有工单服务
log_info "停止现有工单服务..."
docker-compose down || true

# 8. 设置环境变量
# 从环境文件加载的变量，导出供docker-compose使用
export DATABASE_URL
export JWT_SECRET
export REDIS_URL
export NODE_ENV
export USER_SERVICE_URL="http://emaintenance-user-service:3001"
export WORK_ORDER_SERVICE_PORT="${WORK_ORDER_SERVICE_PORT:-3002}"

# 9. 构建新镜像
log_info "构建新的工单服务镜像..."
docker-compose build --no-cache work-order-service

if [ $? -ne 0 ]; then
    log_error "镜像构建失败"
    exit 1
fi

# 10. 启动新服务
log_info "启动工单服务..."
docker-compose up -d work-order-service

# 11. 等待服务启动
log_info "等待服务启动..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f -s "http://localhost:3002/health" > /dev/null 2>&1; then
        log_success "工单服务启动成功"
        break
    fi
    
    log_info "等待服务启动... ($attempt/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    log_error "服务启动超时"
    docker-compose logs --tail=50 work-order-service
    exit 1
fi

# 12. 执行健康检查
log_info "执行健康检查..."
HEALTH_RESPONSE=$(curl -s http://localhost:3002/health)
echo "健康检查响应: $HEALTH_RESPONSE"

# 13. 测试工单分配API
log_info "测试工单分配API端点..."
API_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X PUT http://localhost:3002/api/work-orders/test/assign \
    -H "Content-Type: application/json" \
    -d '{"assignedToId": "test"}' 2>/dev/null || echo "000")

if [ "$API_TEST" = "404" ]; then
    log_error "API仍然返回404"
    docker-compose logs --tail=30 work-order-service
    exit 1
elif [ "$API_TEST" = "401" ] || [ "$API_TEST" = "403" ]; then
    log_success "API路由正确（需要认证）"
elif [ "$API_TEST" = "500" ]; then
    log_warning "服务器内部错误，但路由存在"
else
    log_info "API响应代码: $API_TEST"
fi

# 14. 显示服务信息
echo ""
echo "=========================================="
log_success "工单服务重新部署完成！"
echo "=========================================="
echo ""
log_info "服务信息:"
echo "  容器名称: emaintenance-work-order-service"
echo "  内部端口: 3002"
echo "  健康检查: http://localhost:3002/health"
echo ""

# 显示容器状态
docker-compose ps work-order-service

# 显示最新日志
log_info "最新日志:"
docker-compose logs --tail=20 work-order-service

# 清理临时文件
log_info "清理临时文件..."
rm -rf /tmp/workorder-update.tar.gz /tmp/apps /tmp/packages /tmp/deploy-config

log_success "部署完成！"
REMOTE_SCRIPT

# 5. 上传并执行远程部署脚本
log_info "上传部署脚本到远程服务器..."
scp /tmp/remote-redeploy.sh $SSH_USER@$SERVER_IP:/tmp/

log_info "执行远程部署..."
ssh $SSH_USER@$SERVER_IP "chmod +x /tmp/remote-redeploy.sh && /tmp/remote-redeploy.sh"

# 6. 清理本地临时文件
log_info "清理本地临时文件..."
rm -rf $TEMP_DIR
rm -f /tmp/workorder-update.tar.gz
rm -f /tmp/remote-redeploy.sh

# 7. 最终验证
echo ""
echo "=========================================="
log_success "工单服务已在远程服务器重新部署！"
echo "=========================================="
echo ""
echo "请执行以下验证步骤："
echo ""
echo "1. 测试Web界面:"
echo "   访问: http://$SERVER_IP:3030"
echo "   登录后进入工单管理页面"
echo ""
echo "2. 测试工单分配功能:"
echo "   创建新工单并尝试分配给技术人员"
echo ""
echo "3. 直接测试API (需要有效的JWT token):"
echo "   curl -X PUT http://$SERVER_IP:3030/api/work-orders/{workOrderId}/assign \\"
echo "     -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"assignedToId\": \"technicianUserId\"}'"
echo ""
echo "4. 查看远程服务日志:"
echo "   ssh $SSH_USER@$SERVER_IP 'cd $REMOTE_DEPLOY_PATH/work-order-service && docker-compose logs -f work-order-service'"
echo ""