#!/bin/bash

# E-Maintenance 服务端分模块更新部署脚本
# 支持选择性更新模块，跳过不需要更新的服务（如数据库）

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 日志函数（输出到 stderr 避免污染函数返回值）
log_info() { echo -e "${GREEN}[INFO]${NC} $1" >&2; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
log_debug() { echo -e "${BLUE}[DEBUG]${NC} $1" >&2; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1" >&2; }

# 脚本信息
echo -e "${PURPLE}"
echo "========================================="
echo "E-Maintenance 服务端分模块更新部署工具"
echo "版本: 1.0.0"
echo "更新日期: $(date '+%Y-%m-%d')"
echo "========================================="
echo -e "${NC}"

# 检查必要的命令
check_requirements() {
    local missing_commands=()
    
    for cmd in docker docker-compose git; do
        if ! command -v $cmd &> /dev/null; then
            missing_commands+=($cmd)
        fi
    done
    
    if [ ${#missing_commands[@]} -ne 0 ]; then
        log_error "缺少必要的命令: ${missing_commands[*]}"
        log_error "请先安装 Docker, Docker Compose 和 Git"
        exit 1
    fi
}

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="$PROJECT_ROOT/deploy/Server"

log_info "项目根目录: $PROJECT_ROOT"
log_info "部署目录: $DEPLOY_DIR"

# 检查目录结构
if [[ ! -d "$DEPLOY_DIR" ]]; then
    log_error "部署目录不存在: $DEPLOY_DIR"
    exit 1
fi

cd "$PROJECT_ROOT"

# 定义可更新的模块
declare -A MODULES=(
    ["web"]="前端应用 (Next.js)"
    ["user-service"]="用户服务 (认证/用户管理)"
    ["work-order-service"]="工单服务 (工单管理)"
    ["asset-service"]="资产服务 (设备管理)"
    ["nginx"]="Nginx 代理服务器"
    ["redis"]="Redis 缓存服务"
)

# 不建议更新的服务（数据库等）
declare -A STABLE_MODULES=(
    ["postgres"]="PostgreSQL 数据库"
)

# 获取当前运行的容器
get_running_containers() {
    local containers=$(docker-compose -f "$DEPLOY_DIR/docker-compose.yml" ps --services --filter "status=running" 2>/dev/null || true)
    echo "$containers"
}

# 显示模块选择菜单
show_module_menu() {
    local running_containers=$(get_running_containers)
    
    log_step "可更新的模块："
    echo ""
    
    local index=1
    local module_keys=()
    
    for module in "${!MODULES[@]}"; do
        local status=""
        if echo "$running_containers" | grep -q "^${module}$"; then
            status="${GREEN}[运行中]${NC}"
        else
            status="${YELLOW}[未运行]${NC}"
        fi
        
        printf "%2d) %-20s - %s %s\n" "$index" "$module" "${MODULES[$module]}" "$status"
        module_keys+=("$module")
        ((index++))
    done
    
    echo ""
    log_warn "以下服务建议保持稳定，通常不需要更新："
    for module in "${!STABLE_MODULES[@]}"; do
        local status=""
        if echo "$running_containers" | grep -q "^${module}$"; then
            status="${GREEN}[运行中]${NC}"
        else
            status="${YELLOW}[未运行]${NC}"
        fi
        printf "   %-20s - %s %s\n" "$module" "${STABLE_MODULES[$module]}" "$status"
    done
    
    echo ""
    echo "快捷选项："
    echo "  a) 更新所有应用模块 (web + 所有微服务)"
    echo "  f) 仅更新前端 (web + nginx)"
    echo "  s) 仅更新服务 (所有微服务)"
    echo "  c) 自定义选择"
    echo "  q) 退出"
    echo ""
}

# 解析模块选择
parse_selection() {
    local selection="$1"
    local selected_modules=()
    
    case "$selection" in
        "a"|"A")
            selected_modules=("web" "user-service" "work-order-service" "asset-service" "nginx")
            log_info "选择了所有应用模块"
            ;;
        "f"|"F")
            selected_modules=("web" "nginx")
            log_info "选择了前端相关模块"
            ;;
        "s"|"S")
            selected_modules=("user-service" "work-order-service" "asset-service")
            log_info "选择了所有微服务"
            ;;
        "c"|"C")
            echo "请输入要更新的模块编号 (用空格分隔，例如: 1 2 3):"
            read -r custom_selection
            
            local module_keys=($(printf '%s\n' "${!MODULES[@]}" | sort))
            
            for num in $custom_selection; do
                if [[ "$num" =~ ^[0-9]+$ ]] && [ "$num" -ge 1 ] && [ "$num" -le ${#module_keys[@]} ]; then
                    local index=$((num - 1))
                    selected_modules+=("${module_keys[$index]}")
                else
                    log_warn "无效的编号: $num"
                fi
            done
            ;;
        "q"|"Q")
            log_info "已退出"
            exit 0
            ;;
        *)
            log_error "无效的选择: $selection"
            return 1
            ;;
    esac
    
    if [ ${#selected_modules[@]} -eq 0 ]; then
        log_error "未选择任何模块"
        return 1
    fi
    
    echo "${selected_modules[@]}"
}

# 检查Git状态并提示提交
check_git_status() {
    log_step "检查Git状态..."
    
    if ! git diff --quiet; then
        log_warn "检测到未提交的更改"
        echo "未提交的文件："
        git status --porcelain
        echo ""
        echo "是否要先提交更改？(y/N): "
        read -r commit_changes
        
        if [[ "$commit_changes" =~ ^[Yy]$ ]]; then
            echo "请输入提交信息: "
            read -r commit_message
            git add .
            git commit -m "$commit_message"
            log_info "已提交更改"
        else
            log_warn "继续使用未提交的更改进行构建"
        fi
    fi
    
    # 获取当前分支和提交信息
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    local current_commit=$(git rev-parse --short HEAD)
    local commit_message=$(git log -1 --pretty=format:"%s")
    
    log_info "当前分支: $current_branch"
    log_info "当前提交: $current_commit - $commit_message"
    
    echo "current_branch=$current_branch" > "$DEPLOY_DIR/.env.build"
    echo "current_commit=$current_commit" >> "$DEPLOY_DIR/.env.build"
}

# 构建指定的模块
build_modules() {
    local modules=("$@")
    local build_tag="v$(date +%Y%m%d_%H%M%S)_$(git rev-parse --short HEAD)"
    
    log_step "开始构建模块，标签: $build_tag"
    
    # 生成构建环境文件
    cat > "$DEPLOY_DIR/.env.build" << EOF
# 构建信息
BUILD_TAG=$build_tag
BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
GIT_COMMIT=$(git rev-parse HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
BUILD_USER=$(git config user.name || echo "unknown")
BUILD_HOST=$(hostname)

# 镜像标签
WEB_IMAGE_TAG=$build_tag
USER_SERVICE_IMAGE_TAG=$build_tag
WORK_ORDER_SERVICE_IMAGE_TAG=$build_tag
ASSET_SERVICE_IMAGE_TAG=$build_tag
NGINX_IMAGE_TAG=$build_tag
EOF
    
    log_info "构建信息已保存到 $DEPLOY_DIR/.env.build"
    
    # 构建选中的模块
    for module in "${modules[@]}"; do
        log_step "构建模块: $module"
        
        case "$module" in
            "web")
                log_info "构建前端应用..."
                docker build -t "emaintenance-web:$build_tag" \
                    -f apps/web/Dockerfile \
                    --build-arg BUILD_TAG="$build_tag" \
                    . || {
                    log_error "前端应用构建失败"
                    return 1
                }
                ;;
            "user-service")
                log_info "构建用户服务..."
                docker build -t "emaintenance-user-service:$build_tag" \
                    -f apps/api/user-service/Dockerfile \
                    --build-arg BUILD_TAG="$build_tag" \
                    . || {
                    log_error "用户服务构建失败"
                    return 1
                }
                ;;
            "work-order-service")
                log_info "构建工单服务..."
                docker build -t "emaintenance-work-order-service:$build_tag" \
                    -f apps/api/work-order-service/Dockerfile \
                    --build-arg BUILD_TAG="$build_tag" \
                    . || {
                    log_error "工单服务构建失败"
                    return 1
                }
                ;;
            "asset-service")
                log_info "构建资产服务..."
                docker build -t "emaintenance-asset-service:$build_tag" \
                    -f apps/api/asset-service/Dockerfile \
                    --build-arg BUILD_TAG="$build_tag" \
                    . || {
                    log_error "资产服务构建失败"
                    return 1
                }
                ;;
            "nginx")
                log_info "Nginx 使用官方镜像，跳过构建..."
                log_info "将使用 nginx:alpine 官方镜像"
                # Nginx 不需要构建，使用官方镜像 + 配置文件挂载
                ;;
            *)
                log_warn "跳过未知模块: $module"
                ;;
        esac
        
        log_info "✅ $module 构建完成"
    done
    
    log_info "所有选中模块构建完成，标签: $build_tag"
    echo "$build_tag"
}

# 更新服务
update_services() {
    local modules=("$@")
    local build_tag="$1"
    shift
    modules=("$@")
    
    log_step "更新Docker Compose服务..."
    
    cd "$DEPLOY_DIR"
    
    # 备份当前的环境文件
    if [[ -f ".env" ]]; then
        cp ".env" ".env.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "已备份当前环境文件"
    fi
    
    # 更新环境文件中的镜像标签
    log_info "更新镜像标签到: $build_tag"
    
    # 只更新选中模块的镜像标签
    for module in "${modules[@]}"; do
        case "$module" in
            "web")
                sed -i.bak "s/^WEB_IMAGE_TAG=.*/WEB_IMAGE_TAG=$build_tag/" .env || \
                echo "WEB_IMAGE_TAG=$build_tag" >> .env
                ;;
            "user-service")
                sed -i.bak "s/^USER_SERVICE_IMAGE_TAG=.*/USER_SERVICE_IMAGE_TAG=$build_tag/" .env || \
                echo "USER_SERVICE_IMAGE_TAG=$build_tag" >> .env
                ;;
            "work-order-service")
                sed -i.bak "s/^WORK_ORDER_SERVICE_IMAGE_TAG=.*/WORK_ORDER_SERVICE_IMAGE_TAG=$build_tag/" .env || \
                echo "WORK_ORDER_SERVICE_IMAGE_TAG=$build_tag" >> .env
                ;;
            "asset-service")
                sed -i.bak "s/^ASSET_SERVICE_IMAGE_TAG=.*/ASSET_SERVICE_IMAGE_TAG=$build_tag/" .env || \
                echo "ASSET_SERVICE_IMAGE_TAG=$build_tag" >> .env
                ;;
            "nginx")
                # Nginx 使用官方镜像，不需要更新镜像标签
                log_info "Nginx 使用 nginx:alpine 官方镜像，跳过标签更新"
                ;;
        esac
    done
    
    # 清理备份文件
    rm -f .env.bak
    
    # 重新启动选中的服务
    log_step "重新启动选中的服务..."
    for module in "${modules[@]}"; do
        log_info "重新启动服务: $module"
        
        # 停止旧容器
        docker-compose stop "$module" 2>/dev/null || true
        docker-compose rm -f "$module" 2>/dev/null || true
        
        # 启动新容器
        docker-compose up -d "$module" || {
            log_error "服务 $module 启动失败"
            return 1
        }
        
        # 等待服务启动
        log_info "等待服务 $module 启动..."
        sleep 5
        
        # 检查服务状态
        if docker-compose ps "$module" | grep -q "Up"; then
            log_info "✅ $module 启动成功"
        else
            log_error "❌ $module 启动失败"
            log_info "查看日志:"
            docker-compose logs --tail=20 "$module"
            return 1
        fi
    done
    
    log_info "所有选中服务已成功更新"
}

# 健康检查
health_check() {
    local modules=("$@")
    
    log_step "执行服务健康检查..."
    
    local failed_services=()
    
    for module in "${modules[@]}"; do
        case "$module" in
            "web"|"user-service"|"work-order-service"|"asset-service")
                log_info "检查 $module 健康状态..."
                
                # 等待服务完全启动
                sleep 10
                
                # 获取容器状态
                local container_status=$(docker-compose -f "$DEPLOY_DIR/docker-compose.yml" ps -q "$module" | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
                
                if [[ "$container_status" == "healthy" ]]; then
                    log_info "✅ $module 健康检查通过"
                elif [[ "$container_status" == "starting" ]]; then
                    log_warn "⏳ $module 正在启动中..."
                    # 再等待一段时间
                    sleep 15
                    container_status=$(docker-compose -f "$DEPLOY_DIR/docker-compose.yml" ps -q "$module" | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
                    if [[ "$container_status" == "healthy" ]]; then
                        log_info "✅ $module 健康检查通过"
                    else
                        log_error "❌ $module 健康检查失败"
                        failed_services+=("$module")
                    fi
                else
                    log_error "❌ $module 健康检查失败 (状态: $container_status)"
                    failed_services+=("$module")
                fi
                ;;
            *)
                log_info "跳过 $module 的健康检查"
                ;;
        esac
    done
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        log_info "🎉 所有服务健康检查通过！"
        return 0
    else
        log_error "以下服务健康检查失败: ${failed_services[*]}"
        
        log_info "故障排除建议："
        for service in "${failed_services[@]}"; do
            echo "• 查看 $service 日志: docker-compose -f $DEPLOY_DIR/docker-compose.yml logs $service"
        done
        
        return 1
    fi
}

# 显示更新总结
show_summary() {
    local modules=("$@")
    local build_tag="$1"
    shift
    modules=("$@")
    
    log_step "更新总结"
    echo ""
    echo "✅ 更新完成！"
    echo ""
    echo "📊 更新信息:"
    echo "  - 构建标签: $build_tag"
    echo "  - 更新时间: $(date)"
    echo "  - 更新的模块: ${modules[*]}"
    echo ""
    echo "🔍 验证命令:"
    echo "  - 查看所有服务状态: docker-compose -f $DEPLOY_DIR/docker-compose.yml ps"
    echo "  - 查看服务日志: docker-compose -f $DEPLOY_DIR/docker-compose.yml logs [服务名]"
    echo ""
    echo "🌐 访问地址:"
    echo "  - 前端应用: http://服务器IP:80"
    echo "  - API文档: http://服务器IP:80/api/docs"
    echo ""
}

# 主函数
main() {
    check_requirements
    
    # 进入项目根目录
    cd "$PROJECT_ROOT"
    
    # 检查Git状态
    check_git_status
    
    # 显示模块菜单
    while true; do
        show_module_menu
        echo -n "请选择要更新的模块 (a/f/s/c/q): "
        read -r selection
        
        selected_modules=$(parse_selection "$selection")
        if [ $? -eq 0 ]; then
            break
        fi
    done
    
    local modules_array=($selected_modules)
    
    # 确认更新
    echo ""
    log_warn "即将更新以下模块: ${modules_array[*]}"
    echo "是否继续？(y/N): "
    read -r confirm
    
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "已取消更新"
        exit 0
    fi
    
    # 构建模块
    build_tag=$(build_modules "${modules_array[@]}")
    if [ $? -ne 0 ]; then
        log_error "构建失败，更新终止"
        exit 1
    fi
    
    # 更新服务
    update_services "$build_tag" "${modules_array[@]}"
    if [ $? -ne 0 ]; then
        log_error "服务更新失败"
        exit 1
    fi
    
    # 健康检查
    health_check "${modules_array[@]}"
    if [ $? -ne 0 ]; then
        log_warn "部分服务可能存在问题，请检查日志"
    fi
    
    # 显示更新总结
    show_summary "$build_tag" "${modules_array[@]}"
    
    log_info "🎉 模块更新部署完成！"
}

# 错误处理
trap 'log_error "脚本执行出错，行号: $LINENO"' ERR

# 运行主函数
main "$@"