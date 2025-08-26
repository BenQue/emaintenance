#!/bin/bash

# E-Maintenance 数据库初始化脚本
# 初始化数据库结构、运行迁移、填充基础数据

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
echo "  E-Maintenance 数据库初始化"
echo "  版本: v2.0"
echo "=========================================="

# 切换到脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查基础设施服务是否运行
log_info "检查基础设施服务状态..."
if ! docker ps | grep -q "emaintenance-postgres.*Up"; then
    log_error "PostgreSQL 服务未运行"
    log_info "请先运行: cd ../infrastructure && ./deploy.sh"
    exit 1
fi

# 加载环境变量
if [ -f ../infrastructure/.env ]; then
    source ../infrastructure/.env
elif [ -f ../../../.env ]; then
    source ../../../.env
else
    log_error "未找到环境配置文件"
    exit 1
fi

# 设置数据库连接信息
DB_HOST="localhost"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-emaintenance}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD}"

if [ -z "$DB_PASSWORD" ]; then
    log_error "数据库密码未设置，请检查环境变量 POSTGRES_PASSWORD"
    exit 1
fi

# 等待数据库完全启动
log_info "等待数据库服务完全启动..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if docker exec emaintenance-postgres pg_isready -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        log_success "数据库连接成功"
        break
    fi
    
    log_info "等待数据库启动... ($attempt/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    log_error "数据库启动超时"
    exit 1
fi

# 检查 Prisma Schema 文件
SCHEMA_FILE="../../../packages/database/prisma/schema.prisma"
if [ ! -f "$SCHEMA_FILE" ]; then
    log_error "未找到 Prisma Schema 文件: $SCHEMA_FILE"
    exit 1
fi

# 设置 DATABASE_URL 环境变量
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

log_info "数据库连接信息:"
echo "  主机: $DB_HOST:$DB_PORT"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"

# 1. 生成 Prisma 客户端
log_info "生成 Prisma 客户端..."
cd "../../../packages/database"

# 检查 npm/node 是否可用
if ! command -v npm &> /dev/null; then
    # 尝试使用 Docker 运行 npm
    log_info "使用 Docker 运行 Prisma 命令..."
    docker run --rm -v "$(pwd)":/app -w /app -e DATABASE_URL="$DATABASE_URL" \
        --network emaintenance-network node:18-alpine sh -c "npm install && npx prisma generate"
else
    npm install
    npx prisma generate
fi

# 2. 推送数据库结构 (开发环境) 或运行迁移 (生产环境)
if [ "${NODE_ENV:-development}" = "production" ]; then
    log_info "运行生产环境数据库迁移..."
    if command -v npm &> /dev/null; then
        npx prisma migrate deploy
    else
        docker run --rm -v "$(pwd)":/app -w /app -e DATABASE_URL="$DATABASE_URL" \
            --network emaintenance-network node:18-alpine sh -c "npm install && npx prisma migrate deploy"
    fi
else
    log_info "推送数据库结构 (开发模式)..."
    if command -v npm &> /dev/null; then
        npx prisma db push
    else
        docker run --rm -v "$(pwd)":/app -w /app -e DATABASE_URL="$DATABASE_URL" \
            --network emaintenance-network node:18-alpine sh -c "npm install && npx prisma db push"
    fi
fi

# 3. 验证数据库结构
log_info "验证数据库结构..."
TABLES_COUNT=$(docker exec emaintenance-postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

if [ "$TABLES_COUNT" -gt 0 ]; then
    log_success "数据库结构创建成功，共 $TABLES_COUNT 张表"
else
    log_error "数据库结构创建失败"
    exit 1
fi

# 4. 填充基础数据
log_info "填充基础数据..."
if [ -f "prisma/seed.ts" ]; then
    if command -v npm &> /dev/null; then
        npx tsx prisma/seed.ts
    else
        docker run --rm -v "$(pwd)":/app -w /app -e DATABASE_URL="$DATABASE_URL" \
            --network emaintenance-network node:18-alpine sh -c "npm install && npx tsx prisma/seed.ts"
    fi
    log_success "基础数据填充完成"
else
    log_info "未找到种子数据文件，跳过数据填充"
fi

# 5. 创建数据库备份
log_info "创建初始数据库备份..."
BACKUP_FILE="/backup/initial_backup_$(date +%Y%m%d_%H%M%S).sql"
docker exec emaintenance-postgres pg_dump -U "$DB_USER" "$DB_NAME" > "/opt/emaintenance/data/postgres-backup/initial_backup_$(date +%Y%m%d_%H%M%S).sql" 2>/dev/null || true

# 6. 验证数据完整性
log_info "验证数据完整性..."
echo ""
log_info "数据库表统计:"

# 检查主要表的数据量
MAIN_TABLES=("users" "assets" "work_orders" "categories" "locations")
for table in "${MAIN_TABLES[@]}"; do
    COUNT=$(docker exec emaintenance-postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM \"$table\" WHERE 1=1;" 2>/dev/null | tr -d ' ' || echo "0")
    echo "  $table: $COUNT 条记录"
done

# 返回到脚本目录
cd "$SCRIPT_DIR"

echo ""
echo "=========================================="
log_success "数据库初始化完成！"
echo "=========================================="
echo ""
log_info "数据库访问信息:"
echo "  连接字符串: postgresql://$DB_USER:***@$DB_HOST:$DB_PORT/$DB_NAME"
echo "  管理地址: http://localhost:$DB_PORT (如果开放)"
echo ""
log_info "下一步: 部署用户服务"
echo "  cd ../user-service && ./deploy.sh"