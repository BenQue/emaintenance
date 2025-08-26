#!/bin/bash

# E-Maintenance 系统状态检查脚本
# 检查所有服务的运行状态和健康度

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
echo "  📊 E-Maintenance 系统状态检查"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# 检查 Docker 服务状态
log_info "🐳 Docker 服务状态"
if systemctl is-active --quiet docker; then
    log_success "Docker 服务运行正常"
else
    log_error "Docker 服务未运行"
    exit 1
fi

# 定义所有服务
SERVICES=(
    "emaintenance-postgres:PostgreSQL数据库:5432"
    "emaintenance-redis:Redis缓存:6379"
    "emaintenance-user-service:用户服务:3001"
    "emaintenance-work-order-service:工单服务:3002"
    "emaintenance-asset-service:资产服务:3003"
    "emaintenance-web:Web应用:3000"
    "emaintenance-nginx:Nginx代理:80"
)

echo ""
log_info "📋 服务运行状态"
echo "----------------------------------------"

HEALTHY_COUNT=0
TOTAL_COUNT=${#SERVICES[@]}

for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r container_name service_desc port <<< "$service_info"
    
    # 检查容器状态
    container_status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "not_found")
    health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")
    
    case $container_status in
        "running")
            if [ "$health_status" = "healthy" ] || [ "$health_status" = "none" ]; then
                log_success "✅ $service_desc ($container_name)"
                HEALTHY_COUNT=$((HEALTHY_COUNT + 1))
            else
                log_warning "⚠️  $service_desc ($container_name) - 健康检查异常: $health_status"
            fi
            ;;
        "exited")
            log_error "❌ $service_desc ($container_name) - 已退出"
            ;;
        "not_found")
            log_error "❓ $service_desc ($container_name) - 容器不存在"
            ;;
        *)
            log_warning "⚠️  $service_desc ($container_name) - 状态: $container_status"
            ;;
    esac
done

echo ""
echo "服务健康度: $HEALTHY_COUNT/$TOTAL_COUNT"

# 端口监听检查
echo ""
log_info "🔌 端口监听状态"
echo "----------------------------------------"

PORTS=(
    "80:Nginx HTTP"
    "443:Nginx HTTPS"
    "5432:PostgreSQL"
    "6380:Redis"
    "3000:Web应用"
    "3001:用户服务"
    "3002:工单服务"
    "3003:资产服务"
)

for port_info in "${PORTS[@]}"; do
    IFS=':' read -r port desc <<< "$port_info"
    
    if netstat -ln 2>/dev/null | grep -q ":$port " || ss -ln 2>/dev/null | grep -q ":$port "; then
        log_success "✅ $desc (端口 $port)"
    else
        log_warning "⚠️  $desc (端口 $port) - 未监听"
    fi
done

# HTTP 端点检查
echo ""
log_info "🌐 HTTP 端点检查"
echo "----------------------------------------"

ENDPOINTS=(
    "http://localhost/health:系统健康检查"
    "http://localhost:Web应用主页"
    "http://localhost:3001/health:用户服务健康检查"
    "http://localhost:3002/health:工单服务健康检查"
    "http://localhost:3003/health:资产服务健康检查"
)

for endpoint_info in "${ENDPOINTS[@]}"; do
    IFS=':' read -r url desc <<< "$endpoint_info"
    
    if curl -f -s --connect-timeout 5 "$url" > /dev/null 2>&1; then
        log_success "✅ $desc"
    else
        log_warning "⚠️  $desc - 无响应"
    fi
done

# 系统资源检查
echo ""
log_info "💻 系统资源使用"
echo "----------------------------------------"

# 内存使用
TOTAL_MEM=$(free -m | awk '/^Mem:/ {print $2}')
USED_MEM=$(free -m | awk '/^Mem:/ {print $3}')
MEM_USAGE=$((USED_MEM * 100 / TOTAL_MEM))

if [ $MEM_USAGE -lt 70 ]; then
    log_success "内存使用: ${MEM_USAGE}% (${USED_MEM}MB/${TOTAL_MEM}MB)"
elif [ $MEM_USAGE -lt 85 ]; then
    log_warning "内存使用: ${MEM_USAGE}% (${USED_MEM}MB/${TOTAL_MEM}MB)"
else
    log_error "内存使用过高: ${MEM_USAGE}% (${USED_MEM}MB/${TOTAL_MEM}MB)"
fi

# 磁盘使用
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 70 ]; then
    log_success "磁盘使用: ${DISK_USAGE}%"
elif [ $DISK_USAGE -lt 85 ]; then
    log_warning "磁盘使用: ${DISK_USAGE}%"
else
    log_error "磁盘使用过高: ${DISK_USAGE}%"
fi

# CPU 负载
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
log_info "CPU 负载: $LOAD_AVG"

# Docker 资源使用
echo ""
log_info "🐳 Docker 容器资源使用"
echo "----------------------------------------"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | grep emaintenance || log_warning "无法获取容器资源信息"

# 数据库连接测试
echo ""
log_info "🗄️  数据库连接测试"
echo "----------------------------------------"

if docker exec emaintenance-postgres pg_isready -U postgres > /dev/null 2>&1; then
    log_success "PostgreSQL 连接正常"
    
    # 检查数据库统计
    TABLE_COUNT=$(docker exec emaintenance-postgres psql -U postgres -d emaintenance -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")
    log_info "数据库表数量: $TABLE_COUNT"
else
    log_error "PostgreSQL 连接失败"
fi

if docker exec emaintenance-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
    log_success "Redis 连接正常"
else
    log_error "Redis 连接失败"
fi

# 日志文件检查
echo ""
log_info "📝 日志文件状态"
echo "----------------------------------------"

LOG_DIR="/opt/emaintenance/logs"
if [ -d "$LOG_DIR" ]; then
    LOG_SIZE=$(du -sh "$LOG_DIR" 2>/dev/null | awk '{print $1}' || echo "未知")
    log_info "日志目录大小: $LOG_SIZE"
    
    # 检查各服务日志
    for service in user-service work-order-service asset-service nginx; do
        if [ -d "$LOG_DIR/$service" ]; then
            log_success "$service 日志目录存在"
        else
            log_warning "$service 日志目录不存在"
        fi
    done
else
    log_warning "日志目录不存在: $LOG_DIR"
fi

# 网络连通性检查
echo ""
log_info "🌐 网络连通性检查"
echo "----------------------------------------"

# 检查 Docker 网络
if docker network inspect emaintenance-network > /dev/null 2>&1; then
    log_success "Docker 网络 emaintenance-network 存在"
    
    # 检查网络中的容器
    NETWORK_CONTAINERS=$(docker network inspect emaintenance-network --format='{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || echo "")
    if [ -n "$NETWORK_CONTAINERS" ]; then
        log_info "网络中的容器: $NETWORK_CONTAINERS"
    fi
else
    log_error "Docker 网络 emaintenance-network 不存在"
fi

# 总结
echo ""
echo "=========================================="
if [ $HEALTHY_COUNT -eq $TOTAL_COUNT ]; then
    log_success "🎉 系统状态: 全部服务正常 ($HEALTHY_COUNT/$TOTAL_COUNT)"
    echo ""
    log_info "🌐 访问地址:"
    SERVER_IP=$(hostname -I | awk '{print $1}' || echo "localhost")
    echo "  主应用: http://$SERVER_IP"
    echo "  健康检查: http://$SERVER_IP/health"
elif [ $HEALTHY_COUNT -gt 0 ]; then
    log_warning "⚠️  系统状态: 部分服务异常 ($HEALTHY_COUNT/$TOTAL_COUNT)"
else
    log_error "❌ 系统状态: 所有服务异常 ($HEALTHY_COUNT/$TOTAL_COUNT)"
fi
echo "=========================================="