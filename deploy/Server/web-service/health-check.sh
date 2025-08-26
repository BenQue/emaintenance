#!/bin/bash

# E-Maintenance Web服务健康检查脚本

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
echo "  Web服务健康检查"
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 加载环境变量
if [ -f ../infrastructure/.env ]; then
    source ../infrastructure/.env
fi

WEB_SERVICE_PORT="${WEB_SERVICE_PORT:-3000}"
HEALTH_STATUS=0

# 1. 检查容器状态
log_info "检查Web服务容器状态..."
if docker ps --format "{{.Names}}\t{{.Status}}" | grep -q "emaintenance-web-service.*Up.*healthy"; then
    log_success "Web服务容器运行正常且健康"
elif docker ps --format "{{.Names}}\t{{.Status}}" | grep -q "emaintenance-web-service.*Up"; then
    log_warning "Web服务容器运行中但健康检查可能未通过"
else
    log_error "Web服务容器未运行或状态异常"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep web-service || echo "未找到Web服务容器"
    HEALTH_STATUS=1
fi

# 2. 检查端口监听
log_info "检查服务端口监听..."
if netstat -ln 2>/dev/null | grep -q ":$WEB_SERVICE_PORT" || ss -ln 2>/dev/null | grep -q ":$WEB_SERVICE_PORT"; then
    log_success "Web服务端口 $WEB_SERVICE_PORT 正在监听"
else
    log_error "Web服务端口 $WEB_SERVICE_PORT 未监听"
    HEALTH_STATUS=1
fi

# 3. 健康检查端点测试
log_info "测试健康检查端点..."
if curl -f -s "http://localhost:$WEB_SERVICE_PORT/api/health" > /dev/null 2>&1; then
    HEALTH_RESPONSE=$(curl -s "http://localhost:$WEB_SERVICE_PORT/api/health")
    log_success "健康检查端点响应正常"
    echo "响应内容: $HEALTH_RESPONSE"
else
    log_error "健康检查端点无响应"
    HEALTH_STATUS=1
fi

# 4. 主页面加载测试
log_info "测试主页面加载..."
if curl -f -s "http://localhost:$WEB_SERVICE_PORT/" > /dev/null 2>&1; then
    log_success "主页面加载正常"
else
    log_error "主页面无法加载"
    HEALTH_STATUS=1
fi

# 5. 关键页面测试
log_info "测试关键应用页面..."

# 测试重要页面 (不需要认证的)
PAGES=(
    "/login"
    "/register"
    "/_next/static/chunks/pages/_app.js"
)

for page in "${PAGES[@]}"; do
    if curl -f -s "http://localhost:$WEB_SERVICE_PORT$page" > /dev/null 2>&1; then
        log_success "页面 $page 加载正常"
    else
        log_warning "页面 $page 加载失败 (可能需要认证或页面不存在)"
    fi
done

# 6. 静态资源测试
log_info "测试静态资源服务..."
if curl -f -s "http://localhost:$WEB_SERVICE_PORT/favicon.ico" > /dev/null 2>&1; then
    log_success "静态资源服务正常"
else
    log_warning "静态资源可能无法正常访问"
fi

# 7. API 路由测试
log_info "测试内置 API 路由..."

# 测试 Next.js API 路由
API_ROUTES=(
    "/api/health"
)

for route in "${API_ROUTES[@]}"; do
    if curl -f -s "http://localhost:$WEB_SERVICE_PORT$route" > /dev/null 2>&1; then
        log_success "API 路由 $route 响应正常"
    else
        log_warning "API 路由 $route 无响应"
    fi
done

# 8. 后端服务连通性测试
log_info "测试后端服务连通性..."

# 检查对后端 API 服务的连接
BACKEND_SERVICES=(
    "emaintenance-user-service:3001"
    "emaintenance-work-order-service:3002"
    "emaintenance-asset-service:3003"
)

for service in "${BACKEND_SERVICES[@]}"; do
    service_name=$(echo $service | cut -d':' -f1)
    service_port=$(echo $service | cut -d':' -f2)
    
    if docker exec emaintenance-web-service curl -f -s "http://$service_name:$service_port/health" > /dev/null 2>&1; then
        log_success "Web服务可以连接到 $service_name"
    else
        log_error "Web服务无法连接到 $service_name"
        HEALTH_STATUS=1
    fi
done

# 9. 服务日志检查
log_info "检查服务日志 (最近10行)..."
echo "最近的服务日志:"
docker logs --tail=10 emaintenance-web-service 2>/dev/null | head -10 | while read line; do
    echo "  $line"
done

# 10. 资源使用检查
log_info "检查服务资源使用..."
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" emaintenance-web-service 2>/dev/null || log_warning "无法获取资源使用信息"

# 11. Next.js 构建检查
log_info "检查 Next.js 构建状态..."
if docker exec emaintenance-web-service ls -la /app/apps/web/.next > /dev/null 2>&1; then
    log_success "Next.js 构建文件存在"
else
    log_error "Next.js 构建文件缺失"
    HEALTH_STATUS=1
fi

# 12. 性能测试 (简单的响应时间检查)
log_info "测试响应时间..."
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "http://localhost:$WEB_SERVICE_PORT/" 2>/dev/null || echo "999")
if (( $(echo "$RESPONSE_TIME < 5" | bc -l 2>/dev/null || echo "0") )); then
    log_success "首页响应时间正常: ${RESPONSE_TIME}秒"
else
    log_warning "首页响应时间较慢: ${RESPONSE_TIME}秒 (可能是首次冷启动)"
fi

# 13. 缓存目录检查
log_info "检查缓存和日志目录..."
if docker exec emaintenance-web-service ls -la /app/.next/cache > /dev/null 2>&1; then
    log_success "Next.js 缓存目录存在"
else
    log_warning "Next.js 缓存目录可能不存在"
fi

if docker exec emaintenance-web-service ls -la /app/logs > /dev/null 2>&1; then
    log_success "日志目录存在且可访问"
else
    log_warning "日志目录可能不存在或权限不足"
fi

echo ""
echo "=========================================="
if [ $HEALTH_STATUS -eq 0 ]; then
    log_success "Web服务健康检查通过！"
    echo ""
    log_info "应用访问信息:"
    echo "  应用首页: http://localhost:$WEB_SERVICE_PORT"
    echo "  用户登录: http://localhost:$WEB_SERVICE_PORT/login"
    echo "  用户注册: http://localhost:$WEB_SERVICE_PORT/register"
    echo "  健康检查: http://localhost:$WEB_SERVICE_PORT/api/health"
    echo ""
    log_info "主要功能模块:"
    echo "  • 用户管理和认证"
    echo "  • 工单创建和管理"
    echo "  • 资产管理和二维码扫描"
    echo "  • KPI 仪表板和报告"
    echo "  • 移动端自适应界面"
    echo ""
    log_info "管理员账户信息:"
    echo "  默认用户名: admin@emaintenance.com"
    echo "  默认密码: admin123 (请首次登录后修改)"
    echo ""
    log_info "技术栈信息:"
    echo "  前端框架: Next.js 14+ (App Router)"
    echo "  UI 组件: Tailwind CSS + shadcn/ui"
    echo "  状态管理: Zustand"
    echo "  运行模式: 生产模式 (Standalone)"
else
    log_error "Web服务健康检查失败！"
    echo ""
    log_info "故障排查建议:"
    echo "  1. 查看详细日志: docker logs -f emaintenance-web-service"
    echo "  2. 检查环境变量: docker exec emaintenance-web-service env"
    echo "  3. 进入容器调试: docker exec -it emaintenance-web-service /bin/sh"
    echo "  4. 检查后端服务: docker ps | grep emaintenance"
    echo "  5. 检查网络连接: docker network ls"
    echo "  6. 重启服务: docker-compose restart web-service"
    echo "  7. 重新部署: docker-compose down && ./deploy.sh"
    echo ""
    log_info "常见问题解决:"
    echo "  • 如果后端API连接失败，请检查所有API服务是否正常运行"
    echo "  • 如果页面加载缓慢，可能是首次启动的正常现象"
    echo "  • 如果静态资源404，检查构建过程是否成功完成"
fi
echo "=========================================="

exit $HEALTH_STATUS