#!/bin/bash

# 简化版API服务启动脚本
echo "🚀 启动 EMaintenance API 服务..."

# 检查数据库容器
if ! docker ps | grep -q "emaintenance-db"; then
    echo "❌ 数据库容器未运行！请先启动："
    echo "   docker-compose -f docker-compose.hybrid.yml up -d database redis"
    exit 1
fi

echo "✅ 数据库容器运行正常"

# 设置数据库连接
export DATABASE_URL="postgresql://postgres:Qzy@7091!@localhost:5433/emaintenance"

# 清理可能占用的端口
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true  
lsof -ti:3003 | xargs kill -9 2>/dev/null || true

echo "🔧 启动用户服务 (端口3001)..."
cd /Users/benque/Project/Emaintenance/apps/api/user-service
npm run dev > /tmp/user-service.log 2>&1 &
USER_PID=$!

echo "🔧 启动工单服务 (端口3002)..."
cd /Users/benque/Project/Emaintenance/apps/api/work-order-service
npm run dev > /tmp/work-order-service.log 2>&1 &
WORK_PID=$!

echo "🔧 启动资产服务 (端口3003)..."
cd /Users/benque/Project/Emaintenance/apps/api/asset-service
npm run dev > /tmp/asset-service.log 2>&1 &
ASSET_PID=$!

echo "⏳ 等待服务启动..."
sleep 5

echo "🎉 API服务启动完成！"
echo "用户服务: http://localhost:3001 (PID: $USER_PID)"
echo "工单服务: http://localhost:3002 (PID: $WORK_PID)"
echo "资产服务: http://localhost:3003 (PID: $ASSET_PID)"
echo ""
echo "日志文件："
echo "  tail -f /tmp/user-service.log"
echo "  tail -f /tmp/work-order-service.log"  
echo "  tail -f /tmp/asset-service.log"
echo ""
echo "停止服务："
echo "  kill $USER_PID $WORK_PID $ASSET_PID"

# 保存PID以便后续管理
echo "$USER_PID" > /tmp/user-service.pid
echo "$WORK_PID" > /tmp/work-order-service.pid
echo "$ASSET_PID" > /tmp/asset-service.pid