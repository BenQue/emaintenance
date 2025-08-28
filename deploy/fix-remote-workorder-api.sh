#!/bin/bash

# E-Maintenance 远程服务器工单API修复脚本
# 专门修复工单分配路由 POST -> PUT 的问题

set -e

# 配置参数（根据实际情况修改）
SERVER_IP="10.163.144.13"
SSH_USER="root"  # 修改为实际的用户名
REMOTE_BASE_PATH="/opt/emaintenance"  # 修改为实际的部署路径

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
echo "  E-Maintenance 工单API远程修复"
echo "  目标服务器: $SERVER_IP"
echo "  问题: PUT /api/work-orders/:id/assign 404"
echo "=========================================="
echo ""

# 创建远程修复脚本
log_info "创建远程修复脚本..."
cat > /tmp/remote-fix-workorder.sh << 'REMOTE_SCRIPT'
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
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 部署路径
DEPLOY_PATH="${REMOTE_BASE_PATH:-/opt/emaintenance}"

log_info "开始修复工单服务..."

# 1. 进入工单服务目录
cd $DEPLOY_PATH/deploy/Server/work-order-service || {
    log_error "找不到工单服务部署目录"
    exit 1
}

# 2. 检查容器是否正在运行
if docker ps --filter "name=emaintenance-work-order-service" --format "{{.Names}}" | grep -q "emaintenance-work-order-service"; then
    log_info "工单服务容器正在运行"
else
    log_error "工单服务容器未运行"
    exit 1
fi

# 3. 修改源代码中的路由文件
log_info "修改路由配置文件..."

# 检查源代码目录是否存在
if [ -d "../../../apps/api/work-order-service/src/routes" ]; then
    ROUTES_FILE="../../../apps/api/work-order-service/src/routes/workOrders.ts"
elif [ -d "apps/api/work-order-service/src/routes" ]; then
    ROUTES_FILE="apps/api/work-order-service/src/routes/workOrders.ts"
else
    log_error "找不到路由文件目录"
    exit 1
fi

if [ -f "$ROUTES_FILE" ]; then
    # 备份原文件
    cp $ROUTES_FILE ${ROUTES_FILE}.backup.$(date +%Y%m%d%H%M%S)
    
    # 修改路由从 POST 到 PUT
    sed -i "s/router\.post('\/:id\/assign'/router.put('\/:id\/assign'/g" $ROUTES_FILE
    
    log_success "路由文件已修改"
    
    # 显示修改结果
    log_info "验证修改结果:"
    grep -n "router.*'/:id/assign'" $ROUTES_FILE || true
else
    log_error "路由文件不存在: $ROUTES_FILE"
    exit 1
fi

# 4. 重新构建Docker镜像
log_info "重新构建工单服务镜像..."

# 加载环境变量
if [ -f ../infrastructure/.env ]; then
    source ../infrastructure/.env
fi

# 确保环境变量可用
# 环境变量应该从.env文件加载
# 这些只是示例格式，实际值从环境文件读取
export DATABASE_URL
export JWT_SECRET
export REDIS_URL
export NODE_ENV

# 构建新镜像
docker-compose build --no-cache work-order-service

# 5. 重启服务
log_info "重启工单服务..."
docker-compose stop work-order-service
docker-compose up -d work-order-service

# 6. 等待服务启动
log_info "等待服务启动..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f -s "http://localhost:3002/health" > /dev/null 2>&1; then
        log_success "工单服务已启动"
        break
    fi
    
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
done
echo ""

if [ $attempt -gt $max_attempts ]; then
    log_error "服务启动超时"
    docker-compose logs --tail=50 work-order-service
    exit 1
fi

# 7. 测试修复结果
log_info "测试工单分配API..."

# 尝试调用分配API（需要有效的JWT token）
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT http://localhost:3002/api/work-orders/test/assign \
    -H "Content-Type: application/json" \
    -d '{"assignedToId": "test"}' 2>/dev/null || echo "000")

if [ "$TEST_RESPONSE" = "404" ]; then
    log_error "API仍然返回404，修复可能失败"
    exit 1
elif [ "$TEST_RESPONSE" = "401" ] || [ "$TEST_RESPONSE" = "403" ]; then
    log_success "API路由已修复（返回认证错误，这是正常的）"
elif [ "$TEST_RESPONSE" = "000" ]; then
    log_warning "无法连接到服务，请检查服务状态"
else
    log_info "API响应代码: $TEST_RESPONSE"
fi

# 8. 显示服务状态
log_info "服务状态:"
docker-compose ps work-order-service

log_info "最近日志:"
docker-compose logs --tail=20 work-order-service

echo ""
echo "=========================================="
log_success "工单服务修复完成！"
echo "=========================================="
echo ""
log_info "验证步骤："
echo "1. 访问 http://$SERVER_IP:3030 登录系统"
echo "2. 进入工单管理页面"
echo "3. 尝试分配工单给技术人员"
echo ""
log_info "如果问题仍然存在，请检查："
echo "- Nginx代理配置是否正确"
echo "- 前端是否使用正确的API地址"
echo "- 查看详细日志: docker-compose logs -f work-order-service"

REMOTE_SCRIPT

# 替换脚本中的变量
sed -i "s/\${REMOTE_BASE_PATH:-\/opt\/emaintenance}/$REMOTE_BASE_PATH/g" /tmp/remote-fix-workorder.sh

# 上传脚本到远程服务器
log_info "上传修复脚本到远程服务器..."
scp /tmp/remote-fix-workorder.sh $SSH_USER@$SERVER_IP:/tmp/fix-workorder.sh

# 执行远程修复
log_info "执行远程修复..."
ssh $SSH_USER@$SERVER_IP << 'EOF'
chmod +x /tmp/fix-workorder.sh
export REMOTE_BASE_PATH=/opt/emaintenance
/tmp/fix-workorder.sh
EOF

# 清理临时文件
rm -f /tmp/remote-fix-workorder.sh

echo ""
log_success "远程修复脚本执行完成！"
echo ""
echo "请在浏览器中访问:"
echo "  http://$SERVER_IP:3030"
echo ""
echo "测试工单分配功能是否正常工作。"