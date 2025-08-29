#!/bin/bash

# Docker API访问修复脚本
# 解决Docker部署环境下API访问404问题

set -e

echo "========================================="
echo "E-Maintenance Docker API访问修复工具"
echo "========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查Docker是否运行
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}错误: Docker未运行或无权限访问${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker正在运行${NC}"
}

# 获取本机IP地址
get_host_ip() {
    # macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    # Linux
    else
        IP=$(hostname -I | awk '{print $1}')
    fi
    echo "$IP"
}

# 检查服务健康状态
check_services() {
    echo -e "\n${YELLOW}检查服务状态...${NC}"
    
    services=("nginx" "web" "user-service" "work-order-service" "asset-service")
    all_healthy=true
    
    for service in "${services[@]}"; do
        if docker-compose -f docker-compose.yml ps | grep -q "emaintenance-$service.*Up"; then
            echo -e "${GREEN}✓ $service 运行中${NC}"
        else
            echo -e "${RED}✗ $service 未运行${NC}"
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = false ]; then
        echo -e "${YELLOW}某些服务未运行，是否启动所有服务？ (y/n)${NC}"
        read -r answer
        if [ "$answer" = "y" ]; then
            docker-compose -f docker-compose.yml up -d
            sleep 10
        fi
    fi
}

# 测试API访问
test_api_access() {
    echo -e "\n${YELLOW}测试API访问...${NC}"
    
    # 测试通过Nginx的访问
    echo "测试Nginx代理访问:"
    
    # 健康检查
    if curl -s http://localhost/health > /dev/null; then
        echo -e "${GREEN}✓ Nginx健康检查通过${NC}"
    else
        echo -e "${RED}✗ Nginx健康检查失败${NC}"
    fi
    
    # 测试各个API端点
    endpoints=(
        "/api/users/health:::用户服务"
        "/api/work-orders:::工单服务"
        "/api/assets/health:::资产服务"
    )
    
    for endpoint_info in "${endpoints[@]}"; do
        IFS=':::' read -r endpoint name <<< "$endpoint_info"
        response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost$endpoint)
        
        if [ "$response" = "200" ] || [ "$response" = "401" ] || [ "$response" = "403" ]; then
            echo -e "${GREEN}✓ $name ($endpoint): $response${NC}"
        else
            echo -e "${RED}✗ $name ($endpoint): $response${NC}"
        fi
    done
}

# 生成环境配置
generate_env_config() {
    echo -e "\n${YELLOW}生成环境配置...${NC}"
    
    HOST_IP=$(get_host_ip)
    
    if [ ! -f .env ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ 创建.env文件${NC}"
    fi
    
    echo -e "\n${YELLOW}推荐的环境配置:${NC}"
    echo "----------------------------------------"
    echo "# 用于局域网访问（包括移动端）"
    echo "API_GATEWAY_URL=http://$HOST_IP"
    echo "MOBILE_API_HOST=$HOST_IP"
    echo "MOBILE_API_PORT=80"
    echo "MOBILE_API_PROTOCOL=http"
    echo "----------------------------------------"
    
    echo -e "\n${YELLOW}是否应用这些配置到.env文件？ (y/n)${NC}"
    read -r answer
    
    if [ "$answer" = "y" ]; then
        # 备份原文件
        cp .env .env.backup
        
        # 更新配置
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|API_GATEWAY_URL=.*|API_GATEWAY_URL=http://$HOST_IP|" .env
            sed -i '' "s|MOBILE_API_HOST=.*|MOBILE_API_HOST=$HOST_IP|" .env
        else
            sed -i "s|API_GATEWAY_URL=.*|API_GATEWAY_URL=http://$HOST_IP|" .env
            sed -i "s|MOBILE_API_HOST=.*|MOBILE_API_HOST=$HOST_IP|" .env
        fi
        
        echo -e "${GREEN}✓ 配置已更新${NC}"
        echo -e "${YELLOW}需要重启服务以应用新配置${NC}"
    fi
}

# 重启服务
restart_services() {
    echo -e "\n${YELLOW}是否重启服务？ (y/n)${NC}"
    read -r answer
    
    if [ "$answer" = "y" ]; then
        echo "停止服务..."
        docker-compose -f docker-compose.yml down
        
        echo "重新构建Web服务..."
        docker-compose -f docker-compose.yml build web
        
        echo "启动服务..."
        docker-compose -f docker-compose.yml up -d
        
        echo -e "${GREEN}✓ 服务已重启${NC}"
        
        # 等待服务启动
        echo "等待服务启动..."
        sleep 15
        
        # 重新测试
        test_api_access
    fi
}

# 显示访问信息
show_access_info() {
    HOST_IP=$(get_host_ip)
    
    echo -e "\n========================================="
    echo -e "${GREEN}配置完成！${NC}"
    echo -e "========================================="
    echo -e "\n访问地址:"
    echo -e "- Web应用: ${GREEN}http://localhost:3000${NC}"
    echo -e "- 局域网访问: ${GREEN}http://$HOST_IP${NC}"
    echo -e "\n移动端配置:"
    echo -e "- API服务器: ${GREEN}$HOST_IP${NC}"
    echo -e "- 端口: ${GREEN}80${NC}"
    echo -e "\nAPI端点:"
    echo -e "- 用户服务: ${GREEN}http://$HOST_IP/api/users${NC}"
    echo -e "- 工单服务: ${GREEN}http://$HOST_IP/api/work-orders${NC}"
    echo -e "- 资产服务: ${GREEN}http://$HOST_IP/api/assets${NC}"
}

# 主流程
main() {
    cd "$(dirname "$0")"
    
    check_docker
    check_services
    test_api_access
    generate_env_config
    restart_services
    show_access_info
}

# 运行主流程
main