#!/bin/bash

# 数据库初始化脚本
# 用途：初始化数据库模式并填充种子数据

set -e

echo "🗄️ 初始化数据库..."

# 确保在正确的目录执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# 加载环境变量
if [ -f "$DEPLOY_DIR/.env" ]; then
    source "$DEPLOY_DIR/.env"
else
    echo "❌ 环境文件不存在"
    exit 1
fi

# 检查数据库连接
echo "🔍 检查数据库连接..."
if ! docker exec emaintenance-postgres-prod pg_isready -U postgres > /dev/null 2>&1; then
    echo "❌ PostgreSQL 服务未运行或不可访问"
    echo "请先启动数据库服务"
    exit 1
fi

echo "✅ 数据库连接正常"

# 检查数据库是否已有数据
echo "🔍 检查现有数据..."
USER_COUNT=$(docker exec emaintenance-postgres-prod psql -U postgres -d emaintenance -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \n' || echo "0")

if [ "$USER_COUNT" -gt "0" ]; then
    echo "⚠️  数据库中已有 $USER_COUNT 个用户"
    read -p "是否重新初始化数据库？这将删除所有现有数据 (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 用户取消操作"
        exit 1
    fi
    
    echo "🗑️  重置数据库..."
    # 使用 Prisma migrate reset 会更安全
    docker exec -i emaintenance-postgres-prod psql -U postgres -d emaintenance <<EOF
-- 删除所有表（保留 _prisma_migrations）
DO \$\$ 
DECLARE 
    r RECORD;
BEGIN
    -- 删除所有外键约束
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END \$\$;
EOF
fi

# 运行 Prisma migrate deploy（生产环境安全）
echo "📋 运行数据库迁移..."
docker run --rm \
    --network deploy_emaintenance-network \
    -v "$PROJECT_ROOT/packages/database:/app/packages/database" \
    -w /app/packages/database \
    -e DATABASE_URL="$DATABASE_URL" \
    node:18-alpine sh -c "
        npm install -g prisma
        npx prisma migrate deploy
    "

if [ $? -eq 0 ]; then
    echo "✅ 数据库迁移完成"
else
    echo "❌ 数据库迁移失败"
    exit 1
fi

# 运行种子数据
echo "🌱 填充种子数据..."
docker run --rm \
    --network deploy_emaintenance-network \
    -v "$PROJECT_ROOT:/app" \
    -w /app/packages/database \
    -e DATABASE_URL="$DATABASE_URL" \
    node:18-alpine sh -c "
        npm install
        npm run db:seed
    "

if [ $? -eq 0 ]; then
    echo "✅ 种子数据填充完成"
else
    echo "⚠️  种子数据填充失败，尝试手动方式..."
    
    # 手动创建管理员用户
    docker exec -i emaintenance-postgres-prod psql -U postgres -d emaintenance <<'SQL'
-- 创建管理员用户（如果不存在）
INSERT INTO users (id, email, username, "firstName", "lastName", password, role, "isActive", "createdAt", "updatedAt")
VALUES (
    'cmenksc180000133fgx5y0vba',
    'admin@emaintenance.com',
    'admin',
    'System',
    'Administrator', 
    '$2b$10$rOzJdNgL5YlYQZJdyC.a.eKjKZoPf8YFLYMxD/DKJ8VxZqKk1XYq2', -- admin123 的哈希
    'ADMIN',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    "updatedAt" = NOW();
SQL
    echo "✅ 管理员用户已创建"
fi

# 运行主数据填充
echo "📚 填充主数据..."
docker run --rm \
    --network deploy_emaintenance-network \
    -v "$PROJECT_ROOT:/app" \
    -w /app/packages/database \
    -e DATABASE_URL="$DATABASE_URL" \
    node:18-alpine sh -c "
        npm install
        npm run db:populate
    " || echo "⚠️  主数据填充失败（可能已存在）"

# 验证初始化结果
echo ""
echo "🔍 验证初始化结果..."
USER_COUNT=$(docker exec emaintenance-postgres-prod psql -U postgres -d emaintenance -t -c "SELECT COUNT(*) FROM users;" | tr -d ' \n')
CATEGORY_COUNT=$(docker exec emaintenance-postgres-prod psql -U postgres -d emaintenance -t -c "SELECT COUNT(*) FROM categories WHERE \"isActive\"=true;" 2>/dev/null | tr -d ' \n' || echo "0")

echo "📊 数据库状态:"
echo "   用户数量: $USER_COUNT"
echo "   分类数量: $CATEGORY_COUNT"

if [ "$USER_COUNT" -gt "0" ]; then
    echo ""
    echo "✅ 数据库初始化完成!"
    echo ""
    echo "🔐 默认登录账号:"
    echo "   邮箱: admin@emaintenance.com"
    echo "   密码: admin123"
    echo "   角色: 系统管理员"
    echo ""
    echo "📝 建议首次登录后立即修改密码"
else
    echo "❌ 数据库初始化失败"
    exit 1
fi