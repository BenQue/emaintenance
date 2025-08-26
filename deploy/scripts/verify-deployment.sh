#!/bin/bash

# 部署验证脚本
# 用途：验证整个系统部署状态并提供诊断信息

set -e

echo "🔍 验证部署状态..."

# 确保在正确的目录执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$DEPLOY_DIR"

SERVER_IP=$(hostname -I | awk '{print $1}')
echo "📋 服务器 IP: $SERVER_IP"

# 检查 Docker 服务状态
echo ""
echo "🐳 Docker 服务状态:"
echo "===================="
SERVICES=(
    "emaintenance-postgres-prod:PostgreSQL 数据库"
    "emaintenance-redis-prod:Redis 缓存"  
    "emaintenance-user-service-prod:用户服务"
    "emaintenance-work-order-service-prod:工单服务"
    "emaintenance-asset-service-prod:资产服务"
    "emaintenance-web-prod:Web 应用"
    "emaintenance-nginx-prod:Nginx 代理"
)

ALL_HEALTHY=true
for service in "${SERVICES[@]}"; do
    IFS=':' read -r container_name description <<< "$service"
    if docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
        status=$(docker ps --format "{{.Status}}" --filter "name=${container_name}")
        echo "  ✅ $description ($container_name): $status"
    else
        echo "  ❌ $description ($container_name): 未运行"
        ALL_HEALTHY=false
    fi
done

# 检查端口连接性
echo ""
echo "🔌 端口连接性测试:"
echo "===================="
PORTS=(
    "5433:PostgreSQL 数据库"
    "6380:Redis 缓存"
    "3001:用户服务 API"
    "3002:工单服务 API" 
    "3003:资产服务 API"
    "3000:Web 应用"
    "3030:Nginx 代理"
)

for port_info in "${PORTS[@]}"; do
    IFS=':' read -r port description <<< "$port_info"
    if curl -s --connect-timeout 3 "http://localhost:$port/health" > /dev/null 2>&1; then
        echo "  ✅ $description (端口 $port): 可访问"
    elif nc -z localhost "$port" 2>/dev/null; then
        echo "  ⚠️  $description (端口 $port): 端口开放但服务可能未就绪"
    else
        echo "  ❌ $description (端口 $port): 不可访问"
        ALL_HEALTHY=false
    fi
done

# 数据库连接和数据检查
echo ""
echo "🗄️ 数据库状态:"
echo "================"
if docker exec emaintenance-postgres-prod pg_isready -U postgres > /dev/null 2>&1; then
    echo "  ✅ PostgreSQL 连接正常"
    
    # 检查数据
    USER_COUNT=$(docker exec emaintenance-postgres-prod psql -U postgres -d emaintenance -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \n' || echo "0")
    CATEGORY_COUNT=$(docker exec emaintenance-postgres-prod psql -U postgres -d emaintenance -t -c "SELECT COUNT(*) FROM categories WHERE \"isActive\"=true;" 2>/dev/null | tr -d ' \n' || echo "0")
    
    echo "  📊 数据统计:"
    echo "     用户数量: $USER_COUNT"
    echo "     分类数量: $CATEGORY_COUNT" 
    
    if [ "$USER_COUNT" -gt "0" ]; then
        echo "  ✅ 数据库已初始化"
    else
        echo "  ⚠️  数据库可能未初始化"
        ALL_HEALTHY=false
    fi
else
    echo "  ❌ PostgreSQL 连接失败"
    ALL_HEALTHY=false
fi

# API 健康检查详细测试
echo ""
echo "🩺 API 健康检查:"
echo "================"
API_ENDPOINTS=(
    "http://localhost:3001/health:用户服务"
    "http://localhost:3002/health:工单服务"
    "http://localhost:3003/health:资产服务"
    "http://localhost:3030/health:Nginx 代理"
    "http://localhost:3030/api/auth/health:认证 API"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
    IFS=':' read -r url description <<< "$endpoint"
    response=$(curl -s -w "%{http_code}" -o /tmp/health_check "$url" 2>/dev/null || echo "000")
    if [ "$response" = "200" ]; then
        echo "  ✅ $description: HTTP 200"
    else
        echo "  ❌ $description: HTTP $response"
        ALL_HEALTHY=false
    fi
done

# 前端访问测试
echo ""
echo "🌐 前端访问测试:"
echo "================"
if curl -s "http://localhost:3030" > /dev/null 2>&1; then
    echo "  ✅ Web 应用可通过 Nginx 访问"
else
    echo "  ❌ Web 应用无法访问"
    ALL_HEALTHY=false
fi

# 显示访问信息
echo ""
echo "🌐 访问地址:"
echo "============"
echo "  主应用: http://$SERVER_IP:3030"
echo "  健康检查: http://$SERVER_IP:3030/health"
echo "  用户 API: http://$SERVER_IP:3030/api/auth/health"

# 显示默认登录信息
if [ "$USER_COUNT" -gt "0" ]; then
    echo ""
    echo "🔐 默认登录信息:"
    echo "================"
    echo "  邮箱: admin@emaintenance.com"
    echo "  密码: admin123"
    echo "  角色: 系统管理员"
fi

# 故障排除信息
echo ""
echo "🔧 故障排除命令:"
echo "================"
echo "  查看所有容器: docker ps -a"
echo "  查看 Nginx 日志: docker logs -f emaintenance-nginx-prod"
echo "  查看用户服务日志: docker logs -f emaintenance-user-service-prod"  
echo "  重启 Nginx: docker restart emaintenance-nginx-prod"
echo "  数据库连接测试: docker exec emaintenance-postgres-prod pg_isready -U postgres"

# 最终状态
echo ""
if [ "$ALL_HEALTHY" = true ]; then
    echo "✅ 部署验证通过! 系统运行正常"
    exit 0
else
    echo "⚠️  部署验证发现问题，请检查上述错误信息"
    echo ""
    echo "💡 常见解决方案:"
    echo "  1. 如果数据库未初始化: ./scripts/initialize-database.sh"
    echo "  2. 如果 Nginx 有问题: ./scripts/fix-nginx-final.sh"
    echo "  3. 如果服务未启动: docker-compose -f docker-compose.prod.yml up -d"
    exit 1
fi