#!/bin/bash

# 数据库模式修复脚本 - 解决 WorkOrderStatus 和 workOrderNumber 问题
# 问题：数据库模式与代码不匹配，导致 500 错误

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
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

echo -e "${CYAN}"
echo "========================================="
echo "数据库模式修复脚本"
echo "执行时间: $(date)"
echo "========================================="
echo -e "${NC}"

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 步骤 1: 检查当前数据库模式
log_info "步骤 1: 检查当前数据库模式"
echo ""

log_info "检查 WorkOrderStatus 枚举值..."
docker-compose exec -T postgres psql -U postgres -d emaintenance -c "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'WorkOrderStatus');" || log_warn "无法查询枚举值"
echo ""

log_info "检查 work_orders 表结构..."
docker-compose exec -T postgres psql -U postgres -d emaintenance -c "\d work_orders" | head -30 || log_warn "无法查询表结构"
echo ""

# 步骤 2: 备份数据库
log_info "步骤 2: 备份数据库（重要！）"
echo ""

BACKUP_FILE="/tmp/emaintenance_backup_$(date +%Y%m%d_%H%M%S).sql"
log_info "创建数据库备份到: $BACKUP_FILE"
docker-compose exec -T postgres pg_dump -U postgres emaintenance > "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_success "备份成功！文件大小: $BACKUP_SIZE"
else
    log_error "备份失败！"
    exit 1
fi
echo ""

# 步骤 3: 应用数据库迁移
log_info "步骤 3: 应用 Prisma 数据库迁移"
echo ""

log_info "方法 A: 使用 Prisma Migrate Deploy（生产环境推荐）"
echo ""
docker-compose exec work-order-service sh -c "cd /app && npx prisma migrate deploy" || {
    log_warn "Prisma Migrate Deploy 失败，尝试方法 B..."
    echo ""

    log_info "方法 B: 使用 Prisma DB Push（开发环境）"
    echo ""
    docker-compose exec work-order-service sh -c "cd /app && npx prisma db push --skip-generate" || {
        log_error "数据库迁移失败！"
        log_info "恢复备份: docker-compose exec -T postgres psql -U postgres emaintenance < $BACKUP_FILE"
        exit 1
    }
}
echo ""

# 步骤 4: 验证数据库模式
log_info "步骤 4: 验证数据库模式修复结果"
echo ""

log_info "验证 WorkOrderStatus 枚举值（应该包含 CLOSED）..."
ENUM_VALUES=$(docker-compose exec -T postgres psql -U postgres -d emaintenance -t -c "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'WorkOrderStatus');" | tr '\n' ',' | sed 's/[[:space:]]//g')
echo "当前枚举值: $ENUM_VALUES"

if echo "$ENUM_VALUES" | grep -q "CLOSED"; then
    log_success "✅ WorkOrderStatus 包含 CLOSED 值"
else
    log_warn "⚠️  WorkOrderStatus 不包含 CLOSED 值"
fi
echo ""

log_info "验证 work_orders 表字段（应该包含 workOrderNumber 或 work_order_number）..."
TABLE_COLUMNS=$(docker-compose exec -T postgres psql -U postgres -d emaintenance -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'work_orders';" | tr '\n' ',' | sed 's/[[:space:]]//g')
echo "当前字段: $TABLE_COLUMNS"

if echo "$TABLE_COLUMNS" | grep -q "work_order_number\|workOrderNumber"; then
    log_success "✅ work_orders 表包含 work_order_number 字段"
else
    log_warn "⚠️  work_orders 表不包含 work_order_number 字段"
fi
echo ""

# 步骤 5: 重新生成 Prisma 客户端
log_info "步骤 5: 重新生成 Prisma 客户端"
echo ""
docker-compose exec work-order-service sh -c "cd /app && npx prisma generate"
log_success "Prisma 客户端重新生成完成"
echo ""

# 步骤 6: 重启服务
log_info "步骤 6: 重启 Work Order Service"
echo ""
docker-compose restart work-order-service
log_success "服务重启完成"
echo ""

# 步骤 7: 等待服务启动
log_info "步骤 7: 等待服务启动（10秒）..."
sleep 10
echo ""

# 步骤 8: 测试服务
log_info "步骤 8: 测试服务健康状态"
echo ""

if docker-compose exec work-order-service wget -q -O- http://localhost:3002/health; then
    log_success "✅ 服务健康检查通过"
else
    log_warn "⚠️  服务健康检查失败，查看日志："
    docker-compose logs --tail=20 work-order-service
fi
echo ""

# 步骤 9: 显示最近日志
log_info "步骤 9: 显示服务最近日志（检查错误）"
echo ""
docker-compose logs --tail=30 work-order-service | grep -i "error\|ready\|listening" || echo "无明显错误"
echo ""

# 完成总结
echo -e "${CYAN}"
echo "========================================="
echo "修复脚本执行完成"
echo "========================================="
echo -e "${NC}"

echo -e "${GREEN}✅ 完成步骤:${NC}"
echo "1. ✅ 数据库备份: $BACKUP_FILE"
echo "2. ✅ 数据库迁移已应用"
echo "3. ✅ Prisma 客户端已重新生成"
echo "4. ✅ 服务已重启"
echo ""

echo -e "${YELLOW}📋 后续验证:${NC}"
echo "1. 访问工单列表 API 测试："
echo "   curl http://localhost:3002/api/work-orders?page=1&limit=10"
echo ""
echo "2. 从浏览器访问："
echo "   http://10.163.144.13:3030/work-order-service/api/work-orders?page=1&limit=10"
echo ""
echo "3. 如果还有问题，查看完整日志："
echo "   docker-compose logs -f work-order-service"
echo ""

echo -e "${CYAN}📁 备份文件位置: $BACKUP_FILE${NC}"
echo ""
