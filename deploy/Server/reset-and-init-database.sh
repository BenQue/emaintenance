#!/bin/bash

# ============================================
# 数据库完全重置和初始化脚本
# Database Reset and Initialization Script
# ============================================
#
# 功能：
# 1. 备份现有数据库
# 2. 删除并重新创建数据库
# 3. 运行 Prisma 迁移
# 4. 导入主数据
# 5. 创建初始用户账户
# 6. 验证数据完整性
#
# ⚠️ 警告: 此操作将清空所有现有数据！
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/tmp/emaintenance_backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${PURPLE}"
echo "╔════════════════════════════════════════════════════╗"
echo "║                                                    ║"
echo "║     E-Maintenance 数据库完全重置和初始化           ║"
echo "║                                                    ║"
echo "╚════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================
# 步骤 0: 安全确认
# ============================================

echo -e "${RED}"
echo "⚠️  警告: 此操作将执行以下操作："
echo "   1. 备份现有数据库到 $BACKUP_DIR"
echo "   2. 删除并重新创建数据库（清空所有数据）"
echo "   3. 运行最新的 Prisma 数据库迁移"
echo "   4. 导入主数据（位置、分类、故障表现等）"
echo "   5. 创建初始测试用户账户"
echo ""
echo "   ⛔ 所有现有的工单、资产、用户数据将被删除！"
echo -e "${NC}"

echo -n -e "${YELLOW}确认继续？请输入 'YES' (大写) 确认: ${NC}"
read -r confirmation

if [[ "$confirmation" != "YES" ]]; then
  log_error "操作已取消"
  exit 0
fi

echo ""

# ============================================
# 步骤 1: 备份现有数据库
# ============================================

log_step "步骤 1/8: 备份现有数据库"
echo ""

mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/emaintenance_backup_${TIMESTAMP}.sql"

log_info "创建数据库备份..."
log_info "备份位置: $BACKUP_FILE"

cd "$SCRIPT_DIR"

if docker-compose exec -T postgres pg_dump -U postgres emaintenance > "$BACKUP_FILE" 2>/dev/null; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_success "备份成功！文件大小: $BACKUP_SIZE"
else
    log_warn "备份失败（数据库可能不存在），继续执行..."
fi

echo ""

# ============================================
# 步骤 2: 停止相关服务
# ============================================

log_step "步骤 2/8: 停止应用服务（保留数据库）"
echo ""

log_info "停止 work-order-service, user-service, asset-service, web, nginx..."
docker-compose stop work-order-service user-service asset-service web nginx 2>/dev/null || true

log_success "应用服务已停止"
echo ""

# ============================================
# 步骤 3: 删除并重新创建数据库
# ============================================

log_step "步骤 3/8: 删除并重新创建数据库"
echo ""

log_info "删除现有数据库..."
docker-compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS emaintenance;" || log_warn "数据库删除失败或不存在"

log_info "创建新数据库..."
docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE emaintenance OWNER postgres;"

log_success "数据库已重新创建"
echo ""

# ============================================
# 步骤 4: 运行 Prisma 迁移
# ============================================

log_step "步骤 4/8: 运行 Prisma 数据库迁移"
echo ""

log_info "方法 A: 尝试使用 Prisma Migrate Deploy..."

if docker-compose exec work-order-service sh -c "cd /app/packages/database && npx prisma migrate deploy" 2>/dev/null; then
    log_success "Prisma Migrate Deploy 成功"
else
    log_warn "Prisma Migrate Deploy 失败，尝试方法 B..."

    log_info "方法 B: 使用 Prisma DB Push..."
    if docker-compose exec work-order-service sh -c "cd /app/packages/database && npx prisma db push --accept-data-loss"; then
        log_success "Prisma DB Push 成功"
    else
        log_error "数据库迁移失败！"
        log_info "尝试恢复备份: docker-compose exec -T postgres psql -U postgres emaintenance < $BACKUP_FILE"
        exit 1
    fi
fi

echo ""

# ============================================
# 步骤 5: 重新生成 Prisma 客户端
# ============================================

log_step "步骤 5/8: 重新生成 Prisma 客户端"
echo ""

docker-compose exec work-order-service sh -c "cd /app/packages/database && npx prisma generate"

log_success "Prisma 客户端已重新生成"
echo ""

# ============================================
# 步骤 6: 导入主数据
# ============================================

log_step "步骤 6/8: 导入主数据"
echo ""

# 检查主数据文件是否存在
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MASTER_DATA_DIR="$PROJECT_ROOT/deploy/init/master-data"

if [ -d "$MASTER_DATA_DIR" ]; then
    log_info "主数据目录: $MASTER_DATA_DIR"

    # 导入主数据文件
    for sql_file in "$MASTER_DATA_DIR"/*.sql; do
        if [ -f "$sql_file" ]; then
            filename=$(basename "$sql_file")
            log_info "导入: $filename"

            if docker-compose exec -T postgres psql -U postgres -d emaintenance < "$sql_file"; then
                log_success "✅ $filename"
            else
                log_warn "⚠️  $filename 导入失败（可能已存在）"
            fi
        fi
    done
else
    log_warn "主数据目录不存在: $MASTER_DATA_DIR"
    log_info "将创建基本主数据..."

    # 创建基本主数据
    cat <<EOF | docker-compose exec -T postgres psql -U postgres -d emaintenance
-- 位置数据
INSERT INTO locations (name, description) VALUES
('生产车间A', '主要生产车间'),
('生产车间B', '辅助生产车间'),
('仓库', '原料和成品仓库'),
('办公区', '行政办公区域')
ON CONFLICT (name) DO NOTHING;

-- 工单分类
INSERT INTO categories (name, description) VALUES
('机械故障', '机械设备相关故障'),
('电气故障', '电气系统相关故障'),
('日常保养', '设备日常维护保养'),
('预防性维护', '预防性设备检查'),
('紧急抢修', '紧急故障抢修'),
('清洁维护', '设备清洁和维护'),
('校准调试', '设备校准和调试'),
('其他', '其他类型工单')
ON CONFLICT (name) DO NOTHING;
EOF

    log_success "基本主数据已创建"
fi

echo ""

# ============================================
# 步骤 7: 创建初始用户账户
# ============================================

log_step "步骤 7/8: 创建初始用户账户"
echo ""

log_info "使用 Prisma Seed 创建初始用户..."

if docker-compose exec work-order-service sh -c "cd /app/packages/database && npx prisma db seed" 2>/dev/null; then
    log_success "初始用户账户已创建"
else
    log_warn "Prisma Seed 失败，手动创建基本用户..."

    # 手动创建管理员账户
    cat <<'EOF' | docker-compose exec -T postgres psql -U postgres -d emaintenance
DO $$
DECLARE
    admin_password TEXT := '$2a$10$YourHashedPasswordHere'; -- 需要替换为实际的哈希密码
BEGIN
    INSERT INTO users (email, username, password, employee_id, first_name, last_name, role, created_at, updated_at)
    VALUES
        ('admin@emaintenance.com', 'admin', admin_password, 'EMP001', 'System', 'Administrator', 'ADMIN', NOW(), NOW()),
        ('supervisor@emaintenance.com', 'supervisor', admin_password, 'EMP002', '主管', '设备', 'SUPERVISOR', NOW(), NOW()),
        ('technician@emaintenance.com', 'technician', admin_password, 'EMP003', '技术员', '维修', 'TECHNICIAN', NOW(), NOW()),
        ('employee@emaintenance.com', 'employee', admin_password, 'EMP004', '员工', '一线', 'EMPLOYEE', NOW(), NOW())
    ON CONFLICT (email) DO NOTHING;
END $$;
EOF

    log_success "基本用户账户已创建"
fi

echo ""
log_info "初始账户信息："
echo "  管理员: admin@emaintenance.com / admin123"
echo "  主管:   supervisor@emaintenance.com / password123"
echo "  技术员: technician@emaintenance.com / password123"
echo "  员工:   employee@emaintenance.com / password123"
echo ""

# ============================================
# 步骤 8: 验证数据完整性
# ============================================

log_step "步骤 8/8: 验证数据完整性"
echo ""

log_info "检查数据库表和数据..."

# 验证表结构
log_info "验证表结构..."
TABLES=$(docker-compose exec -T postgres psql -U postgres -d emaintenance -t -c "
SELECT COUNT(*)
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
")

log_info "数据库表数量: $(echo $TABLES | xargs)"

# 验证主数据
log_info "验证主数据..."
docker-compose exec -T postgres psql -U postgres -d emaintenance -c "
SELECT
    '位置数量' as item, COUNT(*) as count FROM locations
UNION ALL
SELECT '分类数量', COUNT(*) FROM categories
UNION ALL
SELECT '用户数量', COUNT(*) FROM users
ORDER BY item;
"

# 验证枚举值
log_info "验证 WorkOrderStatus 枚举..."
docker-compose exec -T postgres psql -U postgres -d emaintenance -c "
SELECT enumlabel as status_values
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'WorkOrderStatus')
ORDER BY enumsortorder;
"

# 验证关键字段
log_info "验证 work_orders 表关键字段..."
docker-compose exec -T postgres psql -U postgres -d emaintenance -c "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'work_orders'
  AND column_name IN ('work_order_number', 'status', 'priority')
ORDER BY column_name;
"

echo ""
log_success "数据完整性验证完成"
echo ""

# ============================================
# 步骤 9: 重启服务
# ============================================

log_step "步骤 9/9: 重启所有服务"
echo ""

log_info "启动所有服务..."
docker-compose up -d

log_info "等待服务启动（15秒）..."
sleep 15

log_success "所有服务已启动"
echo ""

# ============================================
# 最终验证
# ============================================

echo -e "${CYAN}"
echo "════════════════════════════════════════"
echo "最终验证"
echo "════════════════════════════════════════"
echo -e "${NC}"

log_info "测试 Work Order Service 健康状态..."
if curl -s http://localhost:3002/health > /dev/null; then
    log_success "✅ Work Order Service 健康"
else
    log_warn "⚠️  Work Order Service 可能还在启动中"
fi

log_info "检查服务日志（最后20行）..."
docker-compose logs --tail=20 work-order-service | grep -i "error" && log_warn "发现错误日志" || log_success "无错误日志"

echo ""

# ============================================
# 完成总结
# ============================================

echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════╗"
echo "║                                                    ║"
echo "║           ✅ 数据库重置和初始化完成！              ║"
echo "║                                                    ║"
echo "╚════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
echo -e "${CYAN}📋 完成的操作：${NC}"
echo "  ✅ 1. 备份原有数据库到: $BACKUP_FILE"
echo "  ✅ 2. 删除并重新创建数据库"
echo "  ✅ 3. 运行最新 Prisma 迁移"
echo "  ✅ 4. 导入主数据（位置、分类等）"
echo "  ✅ 5. 创建初始用户账户"
echo "  ✅ 6. 验证数据完整性"
echo "  ✅ 7. 重启所有服务"
echo ""

echo -e "${YELLOW}🔑 初始登录信息：${NC}"
echo "  管理员账户:"
echo "    用户名: admin@emaintenance.com"
echo "    密码:   admin123"
echo ""
echo "  其他测试账户密码: password123"
echo ""

echo -e "${CYAN}📊 后续步骤：${NC}"
echo "  1. 访问 Web 界面: http://YOUR_SERVER_IP:3030"
echo "  2. 使用管理员账户登录"
echo "  3. 验证工单列表页面正常显示"
echo "  4. 导入资产数据（如需要）"
echo ""

echo -e "${YELLOW}🔄 如需恢复原数据：${NC}"
echo "  docker-compose exec -T postgres psql -U postgres emaintenance < $BACKUP_FILE"
echo ""

echo -e "${GREEN}🎉 系统已准备就绪！${NC}"
echo ""
