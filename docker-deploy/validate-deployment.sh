#!/bin/bash

# E-Maintenance 部署验证脚本
# 验证所有必要文件和配置是否正确

set -e

# 颜色代码
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 验证结果计数
PASSED=0
FAILED=0
WARNINGS=0

# 函数
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

check_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 检查必要文件
check_files() {
    echo -e "${BLUE}========== 检查部署文件 ==========${NC}"
    
    files=(
        "docker-compose.production.yml"
        ".env.production"
        "deploy.sh"
        "health-check.sh"
        "backup.sh"
        "nginx/nginx.conf"
        "database/init/01-init.sql"
        "README.md"
    )
    
    for file in "${files[@]}"; do
        if [[ -f "$file" ]]; then
            check_pass "文件存在: $file"
        else
            check_fail "文件缺失: $file"
        fi
    done
}

# 检查脚本权限
check_permissions() {
    echo -e "${BLUE}========== 检查脚本权限 ==========${NC}"
    
    scripts=(
        "deploy.sh"
        "health-check.sh"
        "backup.sh"
        "create-deployment-package.sh"
        "validate-deployment.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [[ -f "$script" && -x "$script" ]]; then
            check_pass "可执行权限: $script"
        elif [[ -f "$script" ]]; then
            check_warn "缺少执行权限: $script (运行 chmod +x $script)"
        else
            check_fail "脚本文件不存在: $script"
        fi
    done
}

# 检查配置文件
check_config() {
    echo -e "${BLUE}========== 检查配置文件 ==========${NC}"
    
    # 检查Docker Compose文件语法
    if docker-compose -f docker-compose.production.yml config >/dev/null 2>&1; then
        check_pass "Docker Compose配置语法正确"
    else
        check_fail "Docker Compose配置语法错误"
    fi
    
    # 检查环境变量文件
    if [[ -f ".env.production" ]]; then
        check_pass "环境变量文件存在"
        
        # 检查关键环境变量
        if grep -q "DB_PASSWORD=" ".env.production"; then
            check_pass "数据库密码配置存在"
        else
            check_fail "数据库密码配置缺失"
        fi
        
        if grep -q "JWT_SECRET=" ".env.production"; then
            check_pass "JWT密钥配置存在"
        else
            check_fail "JWT密钥配置缺失"
        fi
        
        if grep -q "10.163.144.13" ".env.production"; then
            check_pass "服务器IP配置正确"
        else
            check_warn "服务器IP可能需要更新"
        fi
    else
        check_fail "环境变量文件缺失"
    fi
}

# 检查Nginx配置
check_nginx() {
    echo -e "${BLUE}========== 检查Nginx配置 ==========${NC}"
    
    if [[ -f "nginx/nginx.conf" ]]; then
        # 检查是否包含必要的upstream配置
        if grep -q "upstream web_backend" "nginx/nginx.conf"; then
            check_pass "Nginx upstream配置存在"
        else
            check_fail "Nginx upstream配置缺失"
        fi
        
        # 检查端口配置
        if grep -q "listen 80" "nginx/nginx.conf"; then
            check_pass "Nginx HTTP端口配置正确"
        else
            check_fail "Nginx HTTP端口配置缺失"
        fi
        
        # 检查API代理配置
        if grep -q "listen 3001\|listen 3002\|listen 3003" "nginx/nginx.conf"; then
            check_pass "API端口代理配置存在"
        else
            check_warn "API端口代理配置可能缺失"
        fi
    else
        check_fail "Nginx配置文件缺失"
    fi
}

# 检查应用源码
check_source_code() {
    echo -e "${BLUE}========== 检查应用源码 ==========${NC}"
    
    # 检查API服务Dockerfile
    api_services=("user-service" "work-order-service" "asset-service")
    for service in "${api_services[@]}"; do
        dockerfile="../apps/api/$service/Dockerfile"
        if [[ -f "$dockerfile" ]]; then
            check_pass "Dockerfile存在: $service"
        else
            check_fail "Dockerfile缺失: $service"
        fi
    done
    
    # 检查Web应用Dockerfile
    if [[ -f "../apps/web/Dockerfile" ]]; then
        check_pass "Web应用Dockerfile存在"
    else
        check_fail "Web应用Dockerfile缺失"
    fi
    
    # 检查package.json文件
    if [[ -f "../package.json" ]]; then
        check_pass "根目录package.json存在"
    else
        check_fail "根目录package.json缺失"
    fi
}

# 检查系统要求
check_system_requirements() {
    echo -e "${BLUE}========== 检查系统要求 ==========${NC}"
    
    # 检查Docker
    if command -v docker >/dev/null 2>&1; then
        docker_version=$(docker --version | cut -d' ' -f3 | sed 's/,//')
        check_pass "Docker已安装 (版本: $docker_version)"
    else
        check_warn "Docker未安装 (部署时需要安装)"
    fi
    
    # 检查Docker Compose
    if command -v docker-compose >/dev/null 2>&1; then
        compose_version=$(docker-compose --version | cut -d' ' -f3 | sed 's/,//')
        check_pass "Docker Compose已安装 (版本: $compose_version)"
    elif docker compose version >/dev/null 2>&1; then
        compose_version=$(docker compose version | cut -d' ' -f3)
        check_pass "Docker Compose已安装 (版本: $compose_version)"
    else
        check_warn "Docker Compose未安装 (部署时需要安装)"
    fi
}

# 检查网络配置
check_network() {
    echo -e "${BLUE}========== 检查网络配置 ==========${NC}"
    
    # 检查端口是否被占用
    ports=(80 3001 3002 3003 5432)
    for port in "${ports[@]}"; do
        if command -v lsof >/dev/null 2>&1; then
            if lsof -i :$port >/dev/null 2>&1; then
                check_warn "端口 $port 已被占用"
            else
                check_pass "端口 $port 可用"
            fi
        else
            check_info "无法检查端口 $port (lsof未安装)"
        fi
    done
}

# 生成部署报告
generate_report() {
    echo ""
    echo -e "${GREEN}=========================================="
    echo "  E-Maintenance 部署验证报告"
    echo "=========================================="
    echo -e "${NC}"
    echo "验证时间: $(date)"
    echo "目标服务器: 10.163.144.13"
    echo ""
    echo -e "${GREEN}通过检查: $PASSED${NC}"
    echo -e "${RED}失败检查: $FAILED${NC}"
    echo -e "${YELLOW}警告信息: $WARNINGS${NC}"
    echo ""
    
    if [[ $FAILED -eq 0 ]]; then
        echo -e "${GREEN}✅ 部署验证通过！可以继续部署。${NC}"
        echo ""
        echo "建议的部署步骤："
        echo "1. 运行 ./create-deployment-package.sh 创建部署包"
        echo "2. 上传部署包到服务器"
        echo "3. 在服务器上运行 ./deploy.sh"
    else
        echo -e "${RED}❌ 部署验证失败！请修复以上问题后重试。${NC}"
        return 1
    fi
}

# 主函数
main() {
    echo -e "${GREEN}"
    echo "=============================================="
    echo "  E-Maintenance 部署环境验证"
    echo "=============================================="
    echo -e "${NC}"
    
    check_files
    check_permissions
    check_config
    check_nginx
    check_source_code
    check_system_requirements
    check_network
    generate_report
}

# 执行验证
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi