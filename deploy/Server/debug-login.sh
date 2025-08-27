#!/bin/bash

# E-Maintenance 登录问题调试脚本
# 用于远程服务器排查登录失败原因

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

echo "==========================================="
echo "  E-Maintenance 登录问题调试"
echo "==========================================="

# 1. 检查环境变量文件
log_info "检查环境变量配置文件..."
if [ -f ../infrastructure/.env ]; then
    log_success "找到 infrastructure/.env"
    echo "POSTGRES_PASSWORD 设置状态:"
    grep -E "^POSTGRES_PASSWORD=" ../infrastructure/.env | sed 's/=.*/=***/' || log_warning "POSTGRES_PASSWORD 未设置"
    echo "JWT_SECRET 设置状态:"
    grep -E "^JWT_SECRET=" ../infrastructure/.env | sed 's/=.*/=***/' || log_warning "JWT_SECRET 未设置"
else
    log_warning "未找到 ../infrastructure/.env"
fi

# 2. 检查用户服务容器环境变量
log_info "检查用户服务容器内的环境变量..."
echo "DATABASE_URL:"
docker exec emaintenance-user-service printenv DATABASE_URL 2>/dev/null | sed 's/:[^:]*@/:***@/' || log_error "DATABASE_URL 未设置"

echo "JWT_SECRET (前10字符):"
docker exec emaintenance-user-service printenv JWT_SECRET 2>/dev/null | head -c 10 && echo "..." || log_error "JWT_SECRET 未设置"

# 3. 测试数据库连接（从容器内部）
log_info "测试从用户服务容器内部连接数据库..."
docker exec emaintenance-user-service sh -c 'wget -qO- http://emaintenance-postgres:5432 2>&1 | head -1' | grep -q "PostgreSQL" && log_success "可以连接到数据库端口" || log_warning "无法连接到数据库端口"

# 4. 检查数据库中的用户数据
log_info "检查数据库中是否存在管理员用户..."
docker exec emaintenance-postgres psql -U postgres -d emaintenance -c "SELECT id, email, username, role FROM users WHERE username='admin' OR email='admin@emaintenance.com' LIMIT 1;" 2>/dev/null || log_error "无法查询用户数据"

# 5. 测试登录API（直接访问）
log_info "测试登录 API (直接访问容器)..."
echo "尝试使用 identifier=admin, password=admin123："
response=$(docker exec emaintenance-user-service wget -qO- --post-data='{"identifier":"admin","password":"admin123"}' --header='Content-Type: application/json' http://localhost:3001/api/auth/login 2>&1 || true)
if [ ! -z "$response" ]; then
    echo "$response" | head -200
else
    log_warning "无响应"
fi

# 6. 测试登录API（通过Nginx代理）
log_info "测试登录 API (通过Nginx代理)..."
echo "尝试通过 http://localhost:3030/api/auth/login："
curl -s -X POST http://localhost:3030/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"identifier":"admin","password":"admin123"}' 2>&1 | head -200 || log_warning "Nginx代理访问失败"

# 7. 检查用户服务日志中的错误
log_info "检查用户服务最近的错误日志..."
docker logs emaintenance-user-service --tail=20 2>&1 | grep -E "error|Error|ERROR|failed|Failed|FAILED" || log_info "没有发现明显错误"

# 8. 检查Prisma客户端
log_info "检查Prisma客户端是否正确生成..."
docker exec emaintenance-user-service ls -la node_modules/.prisma/client/ 2>/dev/null || log_warning "Prisma客户端可能未正确生成"

# 9. 检查用户服务的实际监听状态
log_info "检查用户服务的网络监听状态..."
docker exec emaintenance-user-service netstat -tlnp 2>/dev/null | grep 3001 || docker exec emaintenance-user-service ss -tlnp 2>/dev/null | grep 3001 || log_warning "端口监听检查失败"

# 10. 尝试手动执行数据库查询
log_info "尝试使用环境变量中的凭据直接连接数据库..."
# 先获取密码
if [ -f ../infrastructure/.env ]; then
    source ../infrastructure/.env
    if [ ! -z "$POSTGRES_PASSWORD" ]; then
        docker exec emaintenance-postgres psql -U postgres -d emaintenance -c "SELECT COUNT(*) as user_count FROM users;" 2>&1 | grep -E "user_count|error|FATAL" || log_error "数据库连接失败"
    fi
fi

echo ""
echo "==========================================="
log_info "调试信息收集完成"
echo "==========================================="
echo ""
log_info "可能的问题："
echo "1. 环境变量未正确传递到容器"
echo "2. 数据库连接字符串格式错误"
echo "3. Prisma客户端未正确生成"
echo "4. JWT_SECRET不匹配"
echo "5. 数据库中缺少用户数据"
echo ""
log_info "请将上述输出提供给技术支持以便进一步诊断"