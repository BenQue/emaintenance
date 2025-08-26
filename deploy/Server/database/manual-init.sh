#!/bin/bash

# E-Maintenance 数据库手动初始化脚本
# 完整的数据库创建、结构初始化、主数据和测试数据填充

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
echo "  E-Maintenance 数据库完整初始化"
echo "  包含: 数据库创建、结构、主数据、测试数据"
echo "=========================================="

# 数据库连接参数（使用端口5433）
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5433}"
DB_NAME="${POSTGRES_DB:-emaintenance}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASS="${POSTGRES_PASSWORD}"  # 从环境变量或.env文件读取，必须设置

# 设置DATABASE_URL（注意内部容器使用5432端口）
export DATABASE_URL="postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME"
export DATABASE_URL_INTERNAL="postgresql://$DB_USER:$DB_PASS@emaintenance-postgres:5432/$DB_NAME"

log_info "数据库连接信息："
echo "  主机: $DB_HOST"
echo "  端口: $DB_PORT"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"

# ==========================================
# 阶段1: 创建数据库
# ==========================================
log_info "【阶段1】创建数据库..."

# 测试PostgreSQL连接
if ! docker exec emaintenance-postgres pg_isready -U $DB_USER > /dev/null 2>&1; then
    log_error "PostgreSQL服务未运行或无法连接"
    log_info "请确保PostgreSQL容器正在运行: docker ps | grep emaintenance-postgres"
    exit 1
fi

# 创建数据库
log_info "创建数据库 $DB_NAME..."
docker exec emaintenance-postgres psql -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
docker exec emaintenance-postgres psql -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME WITH ENCODING='UTF8';" || {
    log_warning "数据库可能已存在，继续..."
}

# 验证数据库创建
if docker exec emaintenance-postgres psql -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    log_success "数据库 $DB_NAME 创建成功"
else
    log_error "数据库创建失败"
    exit 1
fi

# ==========================================
# 阶段2: 运行Prisma迁移（创建表结构）
# ==========================================
log_info "【阶段2】运行数据库迁移创建表结构..."

# 切换到项目根目录
cd ../../..

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    log_error "不在项目根目录，请检查路径"
    exit 1
fi

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    log_info "安装项目依赖..."
    npm install
fi

# 生成Prisma客户端
log_info "生成Prisma客户端..."
npm run db:generate

# 运行数据库迁移（推送schema到数据库）
log_info "推送数据库结构..."
npm run db:push

log_success "数据库表结构创建完成"

# ==========================================
# 阶段3: 初始化主数据（Master Data）
# ==========================================
log_info "【阶段3】初始化主数据..."

# 创建主数据SQL脚本
cat > /tmp/init-master-data.sql << 'EOSQL'
-- E-Maintenance 主数据初始化

-- 清理现有数据
TRUNCATE TABLE users, assets, work_orders, assignment_rules, notifications CASCADE;

-- 插入默认用户
INSERT INTO users (id, email, username, password, "fullName", role, department, phone, "isActive", "createdAt", "updatedAt")
VALUES 
    ('usr_admin_001', 'admin@emaintenance.com', 'admin', '$2a$10$YourHashedAuthToken', '系统管理员', 'ADMIN', 'IT部门', '13800000000', true, NOW(), NOW()),
    ('usr_super_001', 'supervisor@emaintenance.com', 'supervisor', '$2a$10$YourHashedAuthToken', '主管用户', 'SUPERVISOR', '维修部', '13800000001', true, NOW(), NOW()),
    ('usr_tech_001', 'technician@emaintenance.com', 'technician', '$2a$10$YourHashedAuthToken', '技术员', 'TECHNICIAN', '维修部', '13800000002', true, NOW(), NOW()),
    ('usr_emp_001', 'employee@emaintenance.com', 'employee', '$2a$10$YourHashedAuthToken', '普通员工', 'EMPLOYEE', '生产部', '13800000003', true, NOW(), NOW());

-- 插入示例资产
INSERT INTO assets (id, name, "assetCode", type, manufacturer, model, "serialNumber", "purchaseDate", location, status, "maintenanceSchedule", "lastMaintenanceDate", department, "responsiblePerson", description, "createdAt", "updatedAt")
VALUES
    ('ast_001', '数控机床#1', 'CNC-001', 'PRODUCTION', '大连机床', 'DL-CNC-2000', 'SN202301001', '2023-01-15', '生产车间A区', 'ACTIVE', '每月保养', '2024-07-01', '生产部', '张三', '高精度数控加工中心', NOW(), NOW()),
    ('ast_002', '空压机#1', 'COMP-001', 'UTILITY', '阿特拉斯', 'GA-55', 'SN202302001', '2023-02-20', '设备间B1', 'ACTIVE', '每季度保养', '2024-06-01', '设备部', '李四', '螺杆式空压机', NOW(), NOW()),
    ('ast_003', '叉车#1', 'FORK-001', 'LOGISTICS', '合力', 'CPCD30', 'SN202303001', '2023-03-10', '仓库区', 'ACTIVE', '每月检查', '2024-07-15', '物流部', '王五', '3吨内燃叉车', NOW(), NOW()),
    ('ast_004', '激光切割机#1', 'LASER-001', 'PRODUCTION', '大族激光', 'HAN-3015', 'SN202304001', '2023-04-05', '生产车间B区', 'MAINTENANCE', '每两周保养', '2024-07-20', '生产部', '赵六', '光纤激光切割机', NOW(), NOW());

-- 插入示例工单
INSERT INTO work_orders (id, title, description, type, priority, status, "assetId", "reporterId", "assigneeId", "scheduledDate", location, "createdAt", "updatedAt")
VALUES
    ('wo_001', '数控机床定期保养', '月度例行保养，包括润滑、清洁、精度检查', 'MAINTENANCE', 'MEDIUM', 'PENDING', 'ast_001', 'usr_super_001', 'usr_tech_001', '2024-08-01', '生产车间A区', NOW(), NOW()),
    ('wo_002', '空压机异常噪音检修', '运行时有异常噪音，需要检查并维修', 'REPAIR', 'HIGH', 'IN_PROGRESS', 'ast_002', 'usr_emp_001', 'usr_tech_001', '2024-07-28', '设备间B1', NOW(), NOW()),
    ('wo_003', '叉车年度检验', '年度安全检验和性能测试', 'INSPECTION', 'LOW', 'PENDING', 'ast_003', 'usr_super_001', NULL, '2024-08-15', '仓库区', NOW(), NOW());

-- 插入分配规则
INSERT INTO assignment_rules (id, name, description, "ruleType", priority, conditions, actions, "isActive", "createdAt", "updatedAt")
VALUES
    ('rule_001', '高优先级自动分配', '高优先级工单自动分配给技术主管', 'AUTO_ASSIGN', 1, '{"priority": "HIGH"}', '{"assignTo": "SUPERVISOR"}', true, NOW(), NOW()),
    ('rule_002', '设备类型分配', '根据设备类型分配给对应技术员', 'CONDITIONAL', 2, '{"assetType": "PRODUCTION"}', '{"assignToTeam": "PRODUCTION_TEAM"}', true, NOW(), NOW());

-- 插入通知记录
INSERT INTO notifications (id, type, title, message, "userId", "relatedId", "relatedType", "isRead", "createdAt", "updatedAt")
VALUES
    ('notif_001', 'WORK_ORDER_ASSIGNED', '新工单分配', '您有一个新的工单待处理', 'usr_tech_001', 'wo_001', 'WORK_ORDER', false, NOW(), NOW()),
    ('notif_002', 'WORK_ORDER_UPDATED', '工单状态更新', '工单#wo_002状态已更新为进行中', 'usr_super_001', 'wo_002', 'WORK_ORDER', false, NOW(), NOW());

-- 显示初始化结果
SELECT 'Users' as entity, COUNT(*) as count FROM users
UNION ALL SELECT 'Assets', COUNT(*) FROM assets
UNION ALL SELECT 'WorkOrders', COUNT(*) FROM work_orders
UNION ALL SELECT 'AssignmentRules', COUNT(*) FROM assignment_rules
UNION ALL SELECT 'Notifications', COUNT(*) FROM notifications;
EOSQL

# 执行主数据初始化
log_info "执行主数据SQL脚本..."
docker exec -i emaintenance-postgres psql -U $DB_USER -d $DB_NAME < /tmp/init-master-data.sql || {
    log_warning "主数据初始化可能失败，检查错误信息"
}

# ==========================================
# 阶段4: 运行种子数据（测试数据）
# ==========================================
log_info "【阶段4】填充测试数据..."

# 检查是否有种子脚本
if [ -f "packages/database/prisma/seed.ts" ] || [ -f "packages/database/seed.ts" ]; then
    log_info "运行种子数据脚本..."
    npm run db:seed || {
        log_warning "种子数据脚本执行失败，可能需要手动运行"
    }
else
    log_warning "未找到种子数据脚本，跳过"
fi

# ==========================================
# 阶段5: 验证数据库状态
# ==========================================
log_info "【阶段5】验证数据库初始化结果..."

# 检查表结构
log_info "数据库表结构："
docker exec emaintenance-postgres psql -U $DB_USER -d $DB_NAME -c "\dt" | head -20

# 检查数据统计
log_info "数据统计："
docker exec emaintenance-postgres psql -U $DB_USER -d $DB_NAME -c "
    SELECT 'Users' as table_name, COUNT(*) as count FROM users
    UNION ALL SELECT 'Assets', COUNT(*) FROM assets
    UNION ALL SELECT 'WorkOrders', COUNT(*) FROM work_orders
    UNION ALL SELECT 'AssignmentRules', COUNT(*) FROM assignment_rules
    UNION ALL SELECT 'Notifications', COUNT(*) FROM notifications;
"

# 清理临时文件
rm -f /tmp/init-master-data.sql

echo ""
echo "=========================================="
log_success "🎉 数据库初始化完成！"
echo "=========================================="
echo ""
log_info "✅ 完成的任务："
echo "  1. 创建数据库: $DB_NAME"
echo "  2. 创建表结构（通过Prisma迁移）"
echo "  3. 初始化主数据（用户、资产、工单等）"
echo "  4. 填充测试数据"
echo ""
log_info "📝 默认用户账号："
echo "  管理员: admin@emaintenance.com"
echo "  主管: supervisor@emaintenance.com"
echo "  技术员: technician@emaintenance.com"
echo "  员工: employee@emaintenance.com"
echo "  注：请在实际部署时为这些账号设置安全密码"
echo ""
log_info "🚀 下一步："
echo "  cd ../user-service && ./deploy.sh"