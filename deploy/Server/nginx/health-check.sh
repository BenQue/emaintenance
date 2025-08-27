#!/bin/bash

# E-Maintenance 系统健康检查脚本
# 检查所有服务是否正常运行

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
echo "  E-Maintenance 系统健康检查"
echo "=========================================="

FAILED_CHECKS=0

# 检查所有Docker容器状态
log_info "检查Docker容器状态..."

SERVICES=(
    "emaintenance-postgres:5433"
    "emaintenance-redis:6379"
    "emaintenance-user-service:3001"
    "emaintenance-work-order-service:3002"
    "emaintenance-asset-service:3003"
    "emaintenance-web-service:3000"
    "emaintenance-nginx:3030"
)

for service_info in "${SERVICES[@]}"; do
    service_name=$(echo "$service_info" | cut -d':' -f1)
    service_port=$(echo "$service_info" | cut -d':' -f2)
    
    if docker ps --filter "name=${service_name}" --filter "status=running" --format "{{.Names}}" | grep -q "^${service_name}$"; then
        # 容器运行中，尝试健康检查
        case "$service_name" in
            emaintenance-postgres)
                if docker exec emaintenance-postgres pg_isready -U postgres > /dev/null 2>&1; then
                    log_success "$service_name - 运行正常"
                else
                    log_warning "$service_name - 容器运行但数据库未就绪"
                    ((FAILED_CHECKS++))
                fi
                ;;
            emaintenance-redis)
                if docker exec emaintenance-redis redis-cli ping > /dev/null 2>&1; then
                    log_success "$service_name - 运行正常"
                else
                    log_warning "$service_name - 容器运行但Redis未响应"
                    ((FAILED_CHECKS++))
                fi
                ;;
            emaintenance-user-service|emaintenance-work-order-service|emaintenance-asset-service)
                if curl -f -s "http://localhost:${service_port}/health" > /dev/null 2>&1; then
                    log_success "$service_name - 运行正常"
                else
                    log_warning "$service_name - 容器运行但健康检查失败"
                    ((FAILED_CHECKS++))
                fi
                ;;
            emaintenance-web-service)
                if curl -f -s "http://localhost:${service_port}/" > /dev/null 2>&1; then
                    log_success "$service_name - 运行正常"
                else
                    log_warning "$service_name - 容器运行但Web应用未响应"
                    ((FAILED_CHECKS++))
                fi
                ;;
            emaintenance-nginx)
                if curl -f -s "http://localhost:${service_port}/health" > /dev/null 2>&1; then
                    log_success "$service_name - 运行正常"
                else
                    log_warning "$service_name - 容器运行但Nginx未响应"
                    ((FAILED_CHECKS++))
                fi
                ;;
        esac
    else
        log_error "$service_name - 未运行"
        ((FAILED_CHECKS++))
    fi
done

echo ""

# 检查端口监听状态
log_info "检查端口监听状态..."

PORTS=(
    "5433:PostgreSQL"
    "6379:Redis"
    "3001:用户服务"
    "3002:工单服务"
    "3003:资产服务"
    "3000:Web应用"
    "3030:Nginx"
)

for port_info in "${PORTS[@]}"; do
    port=$(echo "$port_info" | cut -d':' -f1)
    service=$(echo "$port_info" | cut -d':' -f2)
    
    if ss -tuln | grep -q ":${port} "; then
        log_success "端口 $port ($service) - 已监听"
    else
        log_warning "端口 $port ($service) - 未监听"
        ((FAILED_CHECKS++))
    fi
done

echo ""

# 测试通过Nginx访问各服务
log_info "测试通过Nginx访问各服务..."

# 测试Web应用
if curl -f -s "http://localhost:3030/" > /dev/null 2>&1; then
    log_success "Nginx -> Web应用 - 正常"
else
    log_error "Nginx -> Web应用 - 失败"
    ((FAILED_CHECKS++))
fi

# 测试用户服务API
if curl -f -s "http://localhost:3030/api/auth/health" > /dev/null 2>&1; then
    log_success "Nginx -> 用户服务API - 正常"
else
    log_warning "Nginx -> 用户服务API - 未响应"
fi

# 测试工单服务API
if curl -f -s "http://localhost:3030/api/work-orders/health" > /dev/null 2>&1; then
    log_success "Nginx -> 工单服务API - 正常"
else
    log_warning "Nginx -> 工单服务API - 未响应"
fi

# 测试资产服务API
if curl -f -s "http://localhost:3030/api/assets/health" > /dev/null 2>&1; then
    log_success "Nginx -> 资产服务API - 正常"
else
    log_warning "Nginx -> 资产服务API - 未响应"
fi

echo ""
echo "=========================================="

if [ $FAILED_CHECKS -eq 0 ]; then
    log_success "✅ 系统健康检查通过！所有服务运行正常"
    exit 0
else
    log_warning "⚠️ 健康检查发现 $FAILED_CHECKS 个问题"
    log_info "请检查相关服务日志以获取更多信息"
    exit 1
fi