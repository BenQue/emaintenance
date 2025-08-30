#!/bin/bash

# E-Maintenance 服务回滚脚本
# 支持回滚到指定版本或上一个版本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$SCRIPT_DIR"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${PURPLE}"
echo "========================================="
echo "E-Maintenance 服务回滚工具"
echo "========================================="
echo -e "${NC}"

# 获取所有可用的镜像标签
get_available_tags() {
    local service="$1"
    local image_name="emaintenance-$service"
    
    # 获取本地Docker镜像的所有标签
    docker images --format "table {{.Repository}}:{{.Tag}}" | \
    grep "^$image_name:" | \
    cut -d: -f2 | \
    grep -v "latest" | \
    sort -r
}

# 获取当前运行的镜像标签
get_current_tags() {
    local services=("web" "user-service" "work-order-service" "asset-service" "nginx")
    
    echo "当前运行的服务版本:"
    for service in "${services[@]}"; do
        local container_id=$(docker-compose -f "$DEPLOY_DIR/docker-compose.yml" ps -q "$service" 2>/dev/null)
        if [[ -n "$container_id" ]]; then
            local image=$(docker inspect "$container_id" --format='{{.Config.Image}}' 2>/dev/null)
            echo "  $service: $image"
        else
            echo "  $service: 未运行"
        fi
    done
    echo ""
}

# 列出历史版本
list_history_versions() {
    log_step "可回滚的历史版本:"
    
    # 获取环境文件备份
    local backup_files=($(ls -t "$DEPLOY_DIR"/.env.backup.* 2>/dev/null | head -10 || true))
    
    if [ ${#backup_files[@]} -eq 0 ]; then
        log_warn "未找到历史版本备份"
        return 1
    fi
    
    echo ""
    echo "备份时间                 | 版本标签"
    echo "------------------------|------------------"
    
    local index=1
    for backup_file in "${backup_files[@]}"; do
        local backup_date=$(basename "$backup_file" | sed 's/.env.backup.//')
        local formatted_date=$(date -j -f "%Y%m%d_%H%M%S" "$backup_date" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "$backup_date")
        
        # 尝试从备份文件中提取版本信息
        local version_tag="unknown"
        if [[ -f "$backup_file" ]]; then
            version_tag=$(grep "WEB_IMAGE_TAG" "$backup_file" | cut -d= -f2 | head -1 || echo "unknown")
        fi
        
        printf "%2d) %s | %s\n" "$index" "$formatted_date" "$version_tag"
        ((index++))
    done
    
    echo ""
}

# 选择回滚版本
select_rollback_version() {
    local backup_files=($(ls -t "$DEPLOY_DIR"/.env.backup.* 2>/dev/null | head -10 || true))
    
    if [ ${#backup_files[@]} -eq 0 ]; then
        log_error "未找到可回滚的版本"
        return 1
    fi
    
    while true; do
        echo "选择回滚方式:"
        echo "1) 回滚到上一个版本"
        echo "2) 选择特定历史版本"
        echo "3) 手动指定版本标签"
        echo "q) 退出"
        echo ""
        echo -n "请选择 [1-3/q]: "
        read -r selection
        
        case "$selection" in
            "1")
                # 回滚到最新的备份版本
                local latest_backup="${backup_files[0]}"
                echo "$latest_backup"
                return 0
                ;;
            "2")
                # 选择特定历史版本
                list_history_versions
                echo -n "请输入版本编号 [1-${#backup_files[@]}]: "
                read -r version_num
                
                if [[ "$version_num" =~ ^[0-9]+$ ]] && [ "$version_num" -ge 1 ] && [ "$version_num" -le ${#backup_files[@]} ]; then
                    local selected_index=$((version_num - 1))
                    echo "${backup_files[$selected_index]}"
                    return 0
                else
                    log_error "无效的版本编号: $version_num"
                    continue
                fi
                ;;
            "3")
                # 手动指定版本标签
                echo -n "请输入版本标签 (例如: v20241201_143022_abc123): "
                read -r manual_tag
                
                if [[ -n "$manual_tag" ]]; then
                    echo "manual:$manual_tag"
                    return 0
                else
                    log_error "版本标签不能为空"
                    continue
                fi
                ;;
            "q"|"Q")
                log_info "已退出"
                exit 0
                ;;
            *)
                log_error "无效的选择: $selection"
                continue
                ;;
        esac
    done
}

# 验证回滚版本镜像是否存在
verify_rollback_images() {
    local tag="$1"
    local services=("web" "user-service" "work-order-service" "asset-service" "nginx")
    local missing_images=()
    
    log_step "验证回滚版本镜像..."
    
    for service in "${services[@]}"; do
        local image_name="emaintenance-$service:$tag"
        
        if ! docker image inspect "$image_name" >/dev/null 2>&1; then
            missing_images+=("$image_name")
        fi
    done
    
    if [ ${#missing_images[@]} -gt 0 ]; then
        log_error "以下镜像不存在，无法回滚:"
        printf '  - %s\n' "${missing_images[@]}"
        return 1
    fi
    
    log_info "所有回滚镜像验证通过"
    return 0
}

# 执行回滚
perform_rollback() {
    local backup_file="$1"
    local services=("web" "user-service" "work-order-service" "asset-service" "nginx")
    
    # 如果是手动指定的标签
    if [[ "$backup_file" == manual:* ]]; then
        local manual_tag="${backup_file#manual:}"
        log_step "回滚到手动指定版本: $manual_tag"
        
        # 验证镜像存在
        if ! verify_rollback_images "$manual_tag"; then
            return 1
        fi
        
        # 备份当前环境文件
        cp "$DEPLOY_DIR/.env" "$DEPLOY_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
        
        # 更新环境文件
        for service in "${services[@]}"; do
            local env_var="$(echo "$service" | tr '[:lower:]' '[:upper:]' | tr '-' '_')_IMAGE_TAG"
            sed -i.bak "s/^${env_var}=.*/${env_var}=$manual_tag/" "$DEPLOY_DIR/.env" || \
            echo "${env_var}=$manual_tag" >> "$DEPLOY_DIR/.env"
        done
        
        # 清理备份文件
        rm -f "$DEPLOY_DIR/.env.bak"
        
    else
        # 使用备份文件回滚
        local backup_date=$(basename "$backup_file" | sed 's/.env.backup.//')
        local formatted_date=$(date -j -f "%Y%m%d_%H%M%S" "$backup_date" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "$backup_date")
        
        log_step "回滚到版本: $formatted_date"
        
        # 从备份文件获取版本标签
        local rollback_tag=$(grep "WEB_IMAGE_TAG" "$backup_file" | cut -d= -f2 | head -1 || echo "")
        
        if [[ -z "$rollback_tag" ]]; then
            log_error "无法从备份文件获取版本信息"
            return 1
        fi
        
        # 验证镜像存在
        if ! verify_rollback_images "$rollback_tag"; then
            return 1
        fi
        
        # 备份当前环境文件
        cp "$DEPLOY_DIR/.env" "$DEPLOY_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
        
        # 恢复环境文件
        cp "$backup_file" "$DEPLOY_DIR/.env"
    fi
    
    log_step "重新启动服务..."
    
    cd "$DEPLOY_DIR"
    
    # 重新启动所有服务
    for service in "${services[@]}"; do
        log_info "重新启动服务: $service"
        
        # 停止并删除旧容器
        docker-compose stop "$service" 2>/dev/null || true
        docker-compose rm -f "$service" 2>/dev/null || true
        
        # 启动新容器
        docker-compose up -d "$service" || {
            log_error "服务 $service 启动失败"
            return 1
        }
        
        # 等待服务启动
        log_info "等待服务 $service 启动..."
        sleep 10
        
        # 检查服务状态
        if docker-compose ps "$service" | grep -q "Up"; then
            log_info "✅ $service 启动成功"
        else
            log_error "❌ $service 启动失败"
            docker-compose logs --tail=20 "$service"
            return 1
        fi
    done
    
    log_info "🎉 服务回滚完成！"
}

# 回滚后验证
post_rollback_verification() {
    log_step "执行回滚后验证..."
    
    # 等待所有服务完全启动
    sleep 30
    
    # 检查服务健康状态
    local services=("web" "user-service" "work-order-service" "asset-service")
    local failed_services=()
    
    for service in "${services[@]}"; do
        log_info "检查 $service 健康状态..."
        
        local container_id=$(docker-compose -f "$DEPLOY_DIR/docker-compose.yml" ps -q "$service")
        if [[ -n "$container_id" ]]; then
            local health_status=$(docker inspect "$container_id" --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
            
            if [[ "$health_status" == "healthy" ]]; then
                log_info "✅ $service 健康检查通过"
            else
                log_error "❌ $service 健康检查失败 (状态: $health_status)"
                failed_services+=("$service")
            fi
        else
            log_error "❌ $service 容器未运行"
            failed_services+=("$service")
        fi
    done
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        log_info "🎉 所有服务回滚验证通过！"
        return 0
    else
        log_error "以下服务回滚后存在问题: ${failed_services[*]}"
        return 1
    fi
}

# 显示回滚总结
show_rollback_summary() {
    log_step "回滚总结"
    
    echo ""
    echo "✅ 回滚完成！"
    echo ""
    
    get_current_tags
    
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
    cd "$DEPLOY_DIR"
    
    # 显示当前版本信息
    get_current_tags
    
    # 选择回滚版本
    backup_file=$(select_rollback_version)
    if [ $? -ne 0 ]; then
        exit 1
    fi
    
    # 确认回滚
    echo ""
    if [[ "$backup_file" == manual:* ]]; then
        local manual_tag="${backup_file#manual:}"
        log_warn "即将回滚到手动指定版本: $manual_tag"
    else
        local backup_date=$(basename "$backup_file" | sed 's/.env.backup.//')
        local formatted_date=$(date -j -f "%Y%m%d_%H%M%S" "$backup_date" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "$backup_date")
        log_warn "即将回滚到版本: $formatted_date"
    fi
    
    echo "此操作将重启所有应用服务，是否继续？(y/N): "
    read -r confirm
    
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "已取消回滚"
        exit 0
    fi
    
    # 执行回滚
    if perform_rollback "$backup_file"; then
        # 回滚后验证
        post_rollback_verification || log_warn "部分服务可能存在问题，请检查日志"
        
        # 显示回滚总结
        show_rollback_summary
    else
        log_error "回滚失败"
        exit 1
    fi
}

# 错误处理
trap 'log_error "回滚脚本执行出错，行号: $LINENO"' ERR

# 运行主函数
main "$@"