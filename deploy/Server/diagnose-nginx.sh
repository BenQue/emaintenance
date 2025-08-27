#!/bin/bash

# E-Maintenance Nginx 代理诊断脚本
# 用于远程服务器排查Nginx代理问题

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
echo "  E-Maintenance Nginx 代理诊断"
echo "==========================================="

# 1. 检查所有容器状态
log_info "1. 检查所有容器运行状态..."
echo "容器状态："
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep emaintenance || log_warning "没有找到emaintenance容器"

# 2. 检查端口监听状态
log_info "2. 检查端口监听状态..."
echo "端口监听状态："
netstat -tlnp 2>/dev/null | grep -E ":3000|:3001|:3002|:3003|:3030" || ss -tlnp | grep -E ":3000|:3001|:3002|:3003|:3030" || log_warning "无法获取端口信息"

# 3. 检查Nginx容器日志
log_info "3. 检查Nginx容器错误日志..."
echo "Nginx最近日志 (最后10行)："
docker logs emaintenance-nginx --tail=10 2>/dev/null || log_error "无法获取Nginx日志"

# 4. 检查Nginx配置文件
log_info "4. 检查Nginx配置..."
echo "检查Nginx配置语法："
docker exec emaintenance-nginx nginx -t 2>/dev/null || log_error "Nginx配置语法错误"

echo -e "\n检查upstream配置："
docker exec emaintenance-nginx cat /etc/nginx/conf.d/emaintenance.conf 2>/dev/null | grep -A2 -B2 "upstream\|server.*3001" || log_warning "无法读取Nginx配置"

# 5. 测试Nginx内部连接
log_info "5. 测试Nginx到后端服务的连接..."

echo "测试到用户服务的连接 (从Nginx容器内部)："
docker exec emaintenance-nginx sh -c 'apk add --no-cache curl 2>/dev/null; curl -s -o /dev/null -w "%{http_code}" http://emaintenance-user-service:3001/health --connect-timeout 5' 2>/dev/null || log_error "Nginx无法连接用户服务"

echo "测试到工单服务的连接："
docker exec emaintenance-nginx sh -c 'curl -s -o /dev/null -w "%{http_code}" http://emaintenance-work-order-service:3002/health --connect-timeout 5' 2>/dev/null || log_error "Nginx无法连接工单服务"

# 6. 测试外部到Nginx的连接
log_info "6. 测试外部访问Nginx..."

echo "测试直接访问Nginx健康检查："
curl -s -o /dev/null -w "HTTP状态码: %{http_code}, 响应时间: %{time_total}s\n" http://localhost:3030/health --connect-timeout 10 || log_error "无法访问Nginx健康检查"

echo "测试通过Nginx访问用户服务API："
curl -s -w "HTTP状态码: %{http_code}\n" http://localhost:3030/api/auth/login --connect-timeout 10 || log_error "无法通过Nginx访问登录API"

# 7. 检查防火墙和网络
log_info "7. 检查网络和防火墙..."
echo "检查Docker网络："
docker network ls | grep emaintenance || log_warning "emaintenance网络不存在"

echo "检查防火墙状态："
sudo ufw status 2>/dev/null || iptables -L -n 2>/dev/null | head -5 || log_info "无法检查防火墙状态"

# 8. 检查Web服务的实际API配置
log_info "8. 检查Web服务的API配置..."
echo "检查Web容器内的API URL："
docker exec emaintenance-web-service printenv | grep NEXT_PUBLIC || echo "没有找到NEXT_PUBLIC环境变量"

echo "检查构建后的静态文件中的API URL："
docker exec emaintenance-web-service find /app/.next/static -name "*.js" -exec grep -l "localhost:30" {} \; 2>/dev/null | head -3 || echo "未在静态文件中找到API URL"

# 9. 尝试重启Nginx
log_info "9. 尝试重启Nginx服务..."
docker restart emaintenance-nginx && sleep 5 && log_success "Nginx已重启"

echo "重启后端口检查："
sleep 2
netstat -tlnp 2>/dev/null | grep :3030 || ss -tlnp | grep :3030 || log_warning "Nginx端口3030未监听"

# 10. 最终测试
log_info "10. 最终连接测试..."
echo "最终测试登录API："
response=$(curl -s -X POST http://localhost:3030/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"identifier":"admin","password":"admin123"}' \
    --connect-timeout 15 --max-time 30 2>&1)

if [ $? -eq 0 ] && echo "$response" | grep -q "success"; then
    log_success "登录API测试成功！"
    echo "响应: $response" | head -100
else
    log_error "登录API测试失败"
    echo "错误: $response"
fi

echo ""
echo "==========================================="
log_info "诊断完成"
echo "==========================================="