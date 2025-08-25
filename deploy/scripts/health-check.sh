#!/bin/bash

# Emaintenance 健康检查脚本
# 检查所有服务的健康状态

echo "🏥 开始健康检查..."

# 进入部署目录
cd "$(dirname "$0")/.."

# 确定使用的 compose 文件
if [ -f docker-compose.prod.yml ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
else
    COMPOSE_FILE="docker-compose.yml"
fi

echo "使用配置文件: $COMPOSE_FILE"

# 检查函数
check_service() {
    local service=$1
    local url=$2
    local timeout=${3:-10}
    
    echo -n "检查 $service... "
    
    if curl -f -s --max-time $timeout "$url" > /dev/null; then
        echo "✅ 健康"
        return 0
    else
        echo "❌ 不健康"
        return 1
    fi
}

# 等待服务启动
sleep 5

failed_services=()

# 检查各个服务
check_service "用户服务" "http://localhost:3001/health" || failed_services+=("user-service")
check_service "工单服务" "http://localhost:3002/health" || failed_services+=("work-order-service")  
check_service "资产服务" "http://localhost:3003/health" || failed_services+=("asset-service")
check_service "Web应用" "http://localhost:3000/api/health" || failed_services+=("web")
check_service "Nginx代理" "http://localhost/health" || failed_services+=("nginx")

# 检查数据库连接
echo -n "检查数据库连接... "
if docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ 健康"
else
    echo "❌ 不健康"
    failed_services+=("postgres")
fi

# 检查 Redis 连接
echo -n "检查 Redis 连接... "
if docker-compose -f $COMPOSE_FILE exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ 健康"
else
    echo "❌ 不健康"
    failed_services+=("redis")
fi

echo ""

# 总结结果
if [ ${#failed_services[@]} -eq 0 ]; then
    echo "🎉 所有服务健康运行!"
    echo ""
    echo "📊 容器状态:"
    docker-compose -f $COMPOSE_FILE ps
    exit 0
else
    echo "❌ 以下服务存在问题:"
    for service in "${failed_services[@]}"; do
        echo "   - $service"
    done
    echo ""
    echo "🔍 查看问题服务的日志:"
    for service in "${failed_services[@]}"; do
        echo "   docker-compose -f $COMPOSE_FILE logs $service"
    done
    echo ""
    echo "📊 容器状态:"
    docker-compose -f $COMPOSE_FILE ps
    exit 1
fi