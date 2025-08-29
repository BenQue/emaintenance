#!/bin/bash

# 一键修复Docker API访问问题
# 快速解决Web端和移动端API访问404错误

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}正在修复Docker API访问问题...${NC}"

cd "$(dirname "$0")"

# 获取本机IP
HOST_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

# 创建.env文件
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ 创建.env配置文件${NC}"
fi

# 更新配置
echo "# 自动配置 - $(date)" >> .env
echo "API_GATEWAY_URL=http://$HOST_IP" >> .env
echo "MOBILE_API_HOST=$HOST_IP" >> .env

# 重新部署
echo -e "${YELLOW}重新构建和部署服务...${NC}"
docker-compose down
docker-compose build --no-cache web
docker-compose up -d

echo -e "${GREEN}✓ 修复完成！${NC}"
echo -e "\n访问地址:"
echo -e "- Web应用: ${GREEN}http://localhost${NC} 或 ${GREEN}http://$HOST_IP${NC}"
echo -e "- 移动端服务器: ${GREEN}$HOST_IP:80${NC}"