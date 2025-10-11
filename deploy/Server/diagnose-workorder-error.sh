#!/bin/bash

# Work Order Service 错误诊断脚本
# 用于诊断 500 Internal Server Error

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo -e "${CYAN}"
echo "========================================="
echo "Work Order Service 错误诊断"
echo "诊断时间: $(date)"
echo "========================================="
echo -e "${NC}"

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. 检查服务状态
log_info "1. 检查服务容器状态"
echo ""
docker-compose ps work-order-service
echo ""

# 2. 查看最近的服务日志（最后100行）
log_info "2. 查看 Work Order Service 最近日志（最后100行）"
echo ""
echo -e "${YELLOW}查找错误信息...${NC}"
docker-compose logs --tail=100 work-order-service | grep -i "error\|exception\|fail" || echo "未发现明显错误"
echo ""
echo -e "${YELLOW}完整日志（最后50行）:${NC}"
docker-compose logs --tail=50 work-order-service
echo ""

# 3. 检查数据库连接
log_info "3. 检查数据库连接状态"
echo ""
docker-compose ps postgres
echo ""

# 测试数据库连接
log_info "测试数据库连接..."
if docker-compose exec -T postgres psql -U postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 数据库连接正常${NC}"
else
    echo -e "${RED}❌ 数据库连接失败${NC}"
fi
echo ""

# 4. 检查环境变量
log_info "4. 检查 Work Order Service 环境变量"
echo ""
docker-compose exec work-order-service env | grep -E "DATABASE_URL|JWT_SECRET|NODE_ENV|PORT" || echo "无法获取环境变量"
echo ""

# 5. 检查 Nginx 配置和日志
log_info "5. 检查 Nginx 配置和日志"
echo ""
docker-compose ps nginx
echo ""
echo -e "${YELLOW}Nginx 错误日志（最后30行）:${NC}"
docker-compose logs --tail=30 nginx | grep -i "error\|warn" || echo "未发现 Nginx 错误"
echo ""

# 6. 测试服务健康检查
log_info "6. 测试服务健康检查端点"
echo ""

# 获取 work-order-service 容器名称
CONTAINER_NAME=$(docker-compose ps -q work-order-service)

if [[ -n "$CONTAINER_NAME" ]]; then
    log_info "从容器内部测试健康检查..."
    docker exec "$CONTAINER_NAME" curl -s http://localhost:3002/health || echo "健康检查失败"
    echo ""
fi

# 7. 检查网络连接
log_info "7. 检查服务间网络连接"
echo ""
docker-compose exec web curl -s http://work-order-service:3002/health || echo "Web 无法连接到 Work Order Service"
echo ""

# 8. 数据库查询测试
log_info "8. 测试数据库查询（查看工单表）"
echo ""
docker-compose exec -T postgres psql -U postgres -d emaintenance -c "SELECT COUNT(*) as total_work_orders FROM work_orders;" 2>&1 || echo "数据库查询失败"
echo ""

# 9. 显示建议
echo -e "${CYAN}========================================="
echo "诊断完成 - 常见解决方案"
echo "=========================================${NC}"
echo ""
echo "如果发现以下问题："
echo ""
echo "1. ${YELLOW}数据库连接失败${NC}"
echo "   解决方案: 检查 DATABASE_URL 环境变量"
echo "   命令: docker-compose restart postgres work-order-service"
echo ""
echo "2. ${YELLOW}环境变量缺失${NC}"
echo "   解决方案: 检查 .env 文件是否包含所有必需变量"
echo "   命令: cat .env | grep -E 'DATABASE_URL|JWT_SECRET'"
echo ""
echo "3. ${YELLOW}Prisma 客户端问题${NC}"
echo "   解决方案: 重新生成 Prisma 客户端"
echo "   命令: docker-compose exec work-order-service npm run db:generate"
echo ""
echo "4. ${YELLOW}服务启动失败${NC}"
echo "   解决方案: 重启服务并查看完整日志"
echo "   命令: docker-compose restart work-order-service && docker-compose logs -f work-order-service"
echo ""
echo "5. ${YELLOW}Nginx 代理问题${NC}"
echo "   解决方案: 检查 Nginx 配置并重启"
echo "   命令: ./diagnose-nginx.sh"
echo ""

echo -e "${CYAN}========================================="
echo "查看实时日志:"
echo "docker-compose logs -f work-order-service"
echo "=========================================${NC}"
