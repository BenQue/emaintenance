#!/bin/bash

# E-Maintenance 快速启动脚本
# 一键配置和部署完整系统

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo -e "${GREEN}"
echo "========================================="
echo "E-Maintenance 快速启动向导"
echo "========================================="
echo -e "${NC}"

# 检查Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker未安装，请先安装Docker"
    exit 1
fi

if ! docker info &> /dev/null; then
    log_error "Docker未运行，请启动Docker"
    exit 1
fi

# 获取本机IP
HOST_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo -e "${BLUE}检测到的网络配置:${NC}"
echo "- 本机IP: $HOST_IP"
echo "- Docker: 运行中"

# 选择环境
echo -e "\n${BLUE}请选择部署环境:${NC}"
echo "1) 开发环境 (dev) - 适用于本地开发"
echo "2) 测试环境 (test) - 适用于团队测试" 
echo "3) 生产环境 (prod) - 适用于正式部署"
read -p "请选择 [1-3]: " env_choice

case $env_choice in
    1) ENVIRONMENT="dev" ;;
    2) ENVIRONMENT="test" ;;
    3) ENVIRONMENT="prod" ;;
    *) 
        log_warn "无效选择，使用默认开发环境"
        ENVIRONMENT="dev"
        ;;
esac

# 创建环境配置
ENV_FILE="${SCRIPT_DIR}/envs/${ENVIRONMENT}.env"
if [[ ! -f "$ENV_FILE" ]]; then
    log_info "创建环境配置文件..."
    cp "${ENV_FILE}.example" "$ENV_FILE"
    
    # 自动配置IP地址
    if [[ "$ENVIRONMENT" != "prod" ]]; then
        sed -i.bak "s/MOBILE_API_HOST=localhost/MOBILE_API_HOST=$HOST_IP/" "$ENV_FILE"
    fi
fi

# 选择部署模式
echo -e "\n${BLUE}请选择部署模式:${NC}"
echo "1) 完整部署 - 部署所有服务"
echo "2) 基础设施优先 - 先部署数据库等基础服务"
echo "3) 分步部署 - 手动控制每个模块"
read -p "请选择 [1-3]: " deploy_choice

case $deploy_choice in
    1)
        log_info "开始完整部署..."
        "${SCRIPT_DIR}/deploy-all.sh" "$ENVIRONMENT" --health-check
        ;;
    2)
        log_info "开始基础设施部署..."
        "${SCRIPT_DIR}/deploy-infrastructure.sh" "$ENVIRONMENT"
        
        echo -e "\n${YELLOW}基础设施部署完成。${NC}"
        echo "下一步请运行："
        echo "- 部署微服务: ${SCRIPT_DIR}/deploy-microservices.sh $ENVIRONMENT"
        echo "- 部署前端: ${SCRIPT_DIR}/deploy-frontend.sh $ENVIRONMENT"
        ;;
    3)
        echo -e "\n${BLUE}分步部署命令:${NC}"
        echo "1. 基础设施: ${SCRIPT_DIR}/deploy-infrastructure.sh $ENVIRONMENT"
        echo "2. 微服务: ${SCRIPT_DIR}/deploy-microservices.sh $ENVIRONMENT"  
        echo "3. 前端: ${SCRIPT_DIR}/deploy-frontend.sh $ENVIRONMENT"
        echo "4. 健康检查: ${SCRIPT_DIR}/health-check.sh $ENVIRONMENT"
        exit 0
        ;;
esac

# 显示访问信息
if [[ "$deploy_choice" == "1" ]]; then
    echo -e "\n${GREEN}========================================="
    echo -e "部署完成！"
    echo -e "=========================================${NC}"
    echo -e "\n${BLUE}访问地址:${NC}"
    echo -e "- Web应用: http://localhost"
    echo -e "- 局域网访问: http://$HOST_IP"
    echo -e "\n${BLUE}移动端配置:${NC}"
    echo -e "- 服务器地址: $HOST_IP"
    echo -e "- 端口: 80"
    echo -e "\n${BLUE}常用命令:${NC}"
    echo -e "- 健康检查: ${SCRIPT_DIR}/health-check.sh $ENVIRONMENT"
    echo -e "- 查看日志: docker-compose logs -f"
    echo -e "- 停止服务: docker-compose down"
    echo -e "- 重启服务: ${SCRIPT_DIR}/deploy-all.sh $ENVIRONMENT"
fi