#!/bin/bash

# Docker 安全检查脚本
# 确保不会影响服务器上现有的 Docker 项目

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
echo "  🛡️  E-Maintenance Docker 安全检查"
echo "  检查端口冲突和现有项目"
echo "=========================================="

# 检查现有容器
log_info "检查现有 Docker 容器..."
EXISTING_CONTAINERS=$(docker ps -a --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}" | grep -v "NAMES" || true)

if [ -n "$EXISTING_CONTAINERS" ]; then
    echo "现有容器列表:"
    echo "$EXISTING_CONTAINERS"
    echo ""
fi

# 检查端口占用情况
log_info "检查关键端口占用..."

# E-Maintenance 使用的端口
EMAINTENANCE_PORTS=(
    "3030:Nginx主入口"
    "3443:Nginx HTTPS"
    "3000:Web应用内部"
    "3001:用户服务内部"
    "3002:工单服务内部"
    "3003:资产服务内部"
    "5432:PostgreSQL"
    "6380:Redis"
)

PORT_CONFLICTS=false

for port_info in "${EMAINTENANCE_PORTS[@]}"; do
    IFS=':' read -r port desc <<< "$port_info"
    
    if netstat -ln 2>/dev/null | grep -q ":$port " || ss -ln 2>/dev/null | grep -q ":$port "; then
        # 检查是否是 E-Maintenance 自己的容器
        CONTAINER_USING_PORT=$(docker ps --format "{{.Names}}" --filter "publish=$port" | grep emaintenance || true)
        
        if [ -n "$CONTAINER_USING_PORT" ]; then
            log_info "端口 $port ($desc) 被 E-Maintenance 容器使用: $CONTAINER_USING_PORT"
        else
            log_warning "⚠️  端口 $port ($desc) 被其他进程占用"
            PORT_CONFLICTS=true
            
            # 尝试识别占用进程
            PROCESS_INFO=$(lsof -i :$port 2>/dev/null | tail -n +2 | head -1 || echo "未知进程")
            echo "  占用进程: $PROCESS_INFO"
        fi
    else
        log_success "端口 $port ($desc) 可用"
    fi
done

# 检查 Docker 网络
log_info "检查 Docker 网络..."
EXISTING_NETWORKS=$(docker network ls --format "table {{.Name}}\t{{.Driver}}" | grep -v "NAME" || true)
echo "现有网络:"
echo "$EXISTING_NETWORKS"

if docker network inspect emaintenance-network > /dev/null 2>&1; then
    log_info "E-Maintenance 网络已存在"
else
    log_info "E-Maintenance 网络不存在，部署时将创建"
fi

# 检查 Docker 卷
log_info "检查 Docker 卷..."
EXISTING_VOLUMES=$(docker volume ls --format "table {{.Name}}\t{{.Driver}}" | grep -v "NAME" || true)
if [ -n "$EXISTING_VOLUMES" ]; then
    echo "现有卷:"
    echo "$EXISTING_VOLUMES"
fi

# 检查磁盘空间
log_info "检查磁盘空间..."
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}')

log_info "可用磁盘空间: $AVAILABLE_SPACE (使用率: ${DISK_USAGE}%)"

if [ $DISK_USAGE -gt 90 ]; then
    log_error "磁盘空间不足 (>${DISK_USAGE}%)，建议清理后再部署"
    exit 1
elif [ $DISK_USAGE -gt 80 ]; then
    log_warning "磁盘空间使用率较高 (${DISK_USAGE}%)，请注意监控"
fi

# 检查内存
log_info "检查内存使用..."
TOTAL_MEM=$(free -m | awk '/^Mem:/ {print $2}')
USED_MEM=$(free -m | awk '/^Mem:/ {print $3}')
MEM_USAGE=$((USED_MEM * 100 / TOTAL_MEM))

log_info "内存使用: ${USED_MEM}MB/${TOTAL_MEM}MB (${MEM_USAGE}%)"

if [ $MEM_USAGE -gt 85 ]; then
    log_warning "内存使用率较高 (${MEM_USAGE}%)，可能影响部署"
fi

# 安全建议
echo ""
log_info "🛡️  安全建议："

if [ "$PORT_CONFLICTS" = true ]; then
    echo "  ❗ 发现端口冲突，建议："
    echo "    1. 检查冲突的端口是否可以释放"
    echo "    2. 或修改 E-Maintenance 的端口配置"
    echo "    3. 确保不会影响现有业务"
fi

echo "  ✅ 推荐的安全实践："
echo "    1. 仅启动必要的 E-Maintenance 服务"
echo "    2. 使用独立的 Docker 网络隔离"
echo "    3. 定期备份现有容器和数据"
echo "    4. 监控系统资源使用情况"

# Docker 守护进程检查
log_info "检查 Docker 守护进程配置..."
if [ -f /etc/docker/daemon.json ]; then
    log_info "当前 Docker 配置:"
    cat /etc/docker/daemon.json | jq . 2>/dev/null || cat /etc/docker/daemon.json
else
    log_info "Docker 守护进程使用默认配置"
fi

echo ""
echo "=========================================="
if [ "$PORT_CONFLICTS" = true ]; then
    log_warning "⚠️  发现潜在冲突，请谨慎部署"
    echo ""
    log_info "解决方案："
    echo "  1. 使用不同的端口映射"
    echo "  2. 停止冲突的服务 (如果安全)"
    echo "  3. 仅部署不冲突的服务"
    echo ""
    echo "继续部署请确保已解决所有冲突"
else
    log_success "✅ 安全检查通过，可以安全部署"
fi
echo "=========================================="

exit 0