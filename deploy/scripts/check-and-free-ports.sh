#!/bin/bash

# 检查并释放端口脚本
# 用途：检查服务所需端口是否被占用，并提供释放方案

echo "🔍 检查 Emaintenance 服务所需端口..."

# 定义需要检查的端口
PORTS=(
    "5433:PostgreSQL"
    "6379:Redis"
    "3000:Web"
    "3001:User-Service"
    "3002:WorkOrder-Service"
    "3003:Asset-Service"
    "80:Nginx-HTTP"
    "443:Nginx-HTTPS"
)

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查端口函数
check_port() {
    local port=$1
    local service=$2
    
    echo -n "检查端口 $port ($service): "
    
    # 检查端口是否被占用
    if sudo lsof -i :$port &>/dev/null; then
        echo -e "${RED}占用${NC}"
        echo "  占用进程:"
        sudo lsof -i :$port | grep LISTEN | head -5
        return 1
    else
        echo -e "${GREEN}可用${NC}"
        return 0
    fi
}

# 统计结果
OCCUPIED_PORTS=()
FREE_PORTS=()

echo ""
echo "📊 端口状态检查:"
echo "=================="

for port_info in "${PORTS[@]}"; do
    IFS=':' read -r port service <<< "$port_info"
    if check_port $port $service; then
        FREE_PORTS+=("$port")
    else
        OCCUPIED_PORTS+=("$port:$service")
    fi
done

echo ""
echo "=================="
echo "✅ 可用端口: ${#FREE_PORTS[@]} 个"
echo "❌ 占用端口: ${#OCCUPIED_PORTS[@]} 个"

if [ ${#OCCUPIED_PORTS[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  发现端口冲突，建议执行以下操作:${NC}"
    echo ""
    
    for port_info in "${OCCUPIED_PORTS[@]}"; do
        IFS=':' read -r port service <<< "$port_info"
        echo "端口 $port ($service):"
        
        # 检查是否是 Docker 容器
        if docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -q ":$port->"; then
            echo "  🐳 Docker 容器占用，执行:"
            container=$(docker ps --format "{{.Names}}" --filter "publish=$port")
            echo "     docker stop $container"
            echo "     docker rm $container"
        # 检查是否是系统服务
        elif sudo systemctl list-units --type=service --state=running | grep -q "redis\|postgresql\|nginx"; then
            if [ "$port" = "6379" ]; then
                echo "  📦 系统 Redis 服务占用，执行:"
                echo "     sudo systemctl stop redis"
                echo "     sudo systemctl disable redis"
            elif [ "$port" = "5432" ] || [ "$port" = "5433" ]; then
                echo "  🐘 系统 PostgreSQL 服务占用，执行:"
                echo "     sudo systemctl stop postgresql"
                echo "     sudo systemctl disable postgresql"
            elif [ "$port" = "80" ] || [ "$port" = "443" ]; then
                echo "  🌐 系统 Nginx 服务占用，执行:"
                echo "     sudo systemctl stop nginx"
                echo "     sudo systemctl disable nginx"
            fi
        else
            # 其他进程
            pid=$(sudo lsof -ti :$port | head -1)
            if [ ! -z "$pid" ]; then
                process=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
                echo "  ⚙️  进程 $process (PID: $pid) 占用，执行:"
                echo "     sudo kill -9 $pid"
            fi
        fi
        echo ""
    done
    
    echo "🔧 快速清理所有冲突（危险操作）:"
    echo "=================="
    echo "#!/bin/bash"
    echo "# 停止所有相关 Docker 容器"
    echo "docker stop \$(docker ps -aq) 2>/dev/null || true"
    echo "docker rm \$(docker ps -aq) 2>/dev/null || true"
    echo ""
    echo "# 停止系统服务"
    echo "sudo systemctl stop redis postgresql nginx 2>/dev/null || true"
    echo ""
    echo "# 强制释放端口"
    for port_info in "${OCCUPIED_PORTS[@]}"; do
        IFS=':' read -r port service <<< "$port_info"
        echo "sudo fuser -k $port/tcp 2>/dev/null || true"
    done
    echo "=================="
    
else
    echo ""
    echo -e "${GREEN}✅ 所有端口都可用，可以启动服务！${NC}"
fi

echo ""
echo "📝 提示:"
echo "   - 执行清理命令前请确认不会影响其他重要服务"
echo "   - 如需保留某些服务，可以修改 .env 文件中的端口配置"
echo "   - 清理完成后运行: ./scripts/start-services-offline.sh"