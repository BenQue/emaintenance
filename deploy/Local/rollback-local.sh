#!/bin/bash

# E-Maintenance 本地部署回滚脚本
# 支持Git提交级别的回滚和Docker镜像回滚

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$SCRIPT_DIR"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${PURPLE}"
echo "========================================="
echo "E-Maintenance 本地部署回滚工具"
echo "========================================="
echo -e "${NC}"

# 检查Git状态
check_git_status() {
    cd "$PROJECT_ROOT"
    
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    local current_commit=$(git rev-parse --short HEAD)
    
    log_info "当前分支: $current_branch"
    log_info "当前提交: $current_commit"
    
    # 检查是否有未提交的更改
    if ! git diff --quiet || ! git diff --cached --quiet; then
        log_warn "检测到未提交的更改"
        git status --porcelain | head -10
        echo ""
    fi
}

# 显示Git历史
show_git_history() {
    log_step "最近的提交历史:"
    echo ""
    
    cd "$PROJECT_ROOT"
    
    # 显示最近10个提交
    printf "%-3s %-12s %-20s %s\n" "序号" "提交ID" "作者" "提交信息"
    echo "--------------------------------------------------------"
    
    local index=1
    git log --oneline --format="%h|%an|%s" -n 10 | while IFS='|' read -r commit author message; do
        printf "%-3d %-12s %-20s %s\n" "$index" "$commit" "${author:0:18}" "${message:0:40}"
        ((index++))
    done
    echo ""
}

# 显示Docker镜像历史
show_docker_images() {
    log_step "可用的Docker镜像:"
    echo ""
    
    # 查找本地构建的镜像
    local images=$(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" | grep -E "(emaintenance|local)" || true)
    
    if [[ -n "$images" ]]; then
        echo "$images"
    else
        echo "没有找到相关的Docker镜像"
    fi
    echo ""
}

# 选择回滚类型
select_rollback_type() {
    log_step "选择回滚类型:"
    echo ""
    echo "1) Git代码回滚 - 回滚到指定Git提交"
    echo "2) 服务重启 - 重启服务但不回滚代码"
    echo "3) 完全重建 - 清除所有容器和镜像重新构建"
    echo "4) 数据库回滚 - 重置数据库到初始状态"
    echo "q) 退出"
    echo ""
    echo -n "请选择 [1-4/q]: "
    read -r choice
    
    case "$choice" in
        "1")
            git_rollback
            ;;
        "2")
            service_restart
            ;;
        "3")
            complete_rebuild
            ;;
        "4")
            database_rollback
            ;;
        "q"|"Q")
            log_info "已退出"
            exit 0
            ;;
        *)
            log_error "无效选择: $choice"
            return 1
            ;;
    esac
}

# Git代码回滚
git_rollback() {
    log_step "Git代码回滚"
    
    cd "$PROJECT_ROOT"
    
    # 显示历史
    show_git_history
    
    echo "选择回滚方式:"
    echo "1) 回滚到指定提交"
    echo "2) 回滚最近的N个提交"
    echo "3) 撤销最近一次提交但保留更改"
    echo ""
    echo -n "请选择 [1-3]: "
    read -r git_choice
    
    case "$git_choice" in
        "1")
            echo -n "请输入目标提交ID (前几位即可): "
            read -r target_commit
            
            if [[ -z "$target_commit" ]]; then
                log_error "提交ID不能为空"
                return 1
            fi
            
            # 验证提交是否存在
            if ! git cat-file -e "$target_commit" 2>/dev/null; then
                log_error "提交 $target_commit 不存在"
                return 1
            fi
            
            log_warn "这将重置代码到提交 $target_commit"
            echo "确定继续吗？(y/N): "
            read -r confirm
            
            if [[ "$confirm" =~ ^[Yy]$ ]]; then
                git reset --hard "$target_commit"
                log_info "已回滚到提交 $target_commit"
                
                # 重新构建服务
                rebuild_services
            fi
            ;;
        "2")
            echo -n "回滚最近几个提交？: "
            read -r commit_count
            
            if [[ ! "$commit_count" =~ ^[0-9]+$ ]]; then
                log_error "请输入有效数字"
                return 1
            fi
            
            log_warn "这将回滚最近 $commit_count 个提交"
            echo "确定继续吗？(y/N): "
            read -r confirm
            
            if [[ "$confirm" =~ ^[Yy]$ ]]; then
                git reset --hard "HEAD~$commit_count"
                log_info "已回滚最近 $commit_count 个提交"
                
                # 重新构建服务
                rebuild_services
            fi
            ;;
        "3")
            log_warn "这将撤销最近一次提交但保留代码更改"
            echo "确定继续吗？(y/N): "
            read -r confirm
            
            if [[ "$confirm" =~ ^[Yy]$ ]]; then
                git reset --soft HEAD~1
                log_info "已撤销最近一次提交，代码更改已保留"
            fi
            ;;
        *)
            log_error "无效选择"
            return 1
            ;;
    esac
}

# 服务重启
service_restart() {
    log_step "重启所有服务"
    
    cd "$DEPLOY_DIR"
    
    log_info "停止服务..."
    docker-compose -f docker-compose.local.yml stop
    
    log_info "启动服务..."
    docker-compose -f docker-compose.local.yml up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 15
    
    # 检查状态
    docker-compose -f docker-compose.local.yml ps
    
    log_info "✅ 服务重启完成"
}

# 完全重建
complete_rebuild() {
    log_warn "⚠️  完全重建将删除所有容器、镜像和数据！"
    echo "确定要完全重建吗？输入 'YES' 确认: "
    read -r confirm
    
    if [[ "$confirm" != "YES" ]]; then
        log_info "已取消重建"
        return
    fi
    
    log_step "执行完全重建..."
    
    cd "$DEPLOY_DIR"
    
    # 停止并删除所有容器
    log_info "删除容器..."
    docker-compose -f docker-compose.local.yml down -v --remove-orphans
    
    # 删除相关镜像
    log_info "删除镜像..."
    docker images | grep -E "(emaintenance|local)" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
    
    # 清理无用资源
    log_info "清理Docker资源..."
    docker system prune -f
    
    # 重新构建
    log_info "重新构建服务..."
    docker-compose -f docker-compose.local.yml build --no-cache
    
    # 启动服务
    log_info "启动服务..."
    docker-compose -f docker-compose.local.yml up -d
    
    # 初始化数据库
    log_info "初始化数据库..."
    sleep 15
    
    cd "$PROJECT_ROOT"
    npm run db:push || log_warn "数据库迁移失败"
    
    echo "是否运行数据种子？(y/N): "
    read -r run_seed
    if [[ "$run_seed" =~ ^[Yy]$ ]]; then
        npm run db:seed || log_warn "数据种子失败"
    fi
    
    log_info "✅ 完全重建完成"
}

# 数据库回滚
database_rollback() {
    log_warn "⚠️  数据库回滚将删除所有数据！"
    echo "确定要重置数据库吗？输入 'YES' 确认: "
    read -r confirm
    
    if [[ "$confirm" != "YES" ]]; then
        log_info "已取消数据库重置"
        return
    fi
    
    log_step "重置数据库..."
    
    cd "$DEPLOY_DIR"
    
    # 停止服务
    docker-compose -f docker-compose.local.yml stop
    
    # 删除数据库容器和卷
    log_info "删除数据库容器和数据..."
    docker-compose -f docker-compose.local.yml rm -f postgres
    docker volume rm local_postgres-data 2>/dev/null || true
    
    # 重新启动数据库
    log_info "重新启动数据库..."
    docker-compose -f docker-compose.local.yml up -d postgres redis
    
    # 等待数据库启动
    sleep 15
    
    # 运行迁移
    cd "$PROJECT_ROOT"
    log_info "运行数据库迁移..."
    npm run db:push || {
        log_error "数据库迁移失败"
        return 1
    }
    
    # 运行种子
    echo "是否运行数据种子？(y/N): "
    read -r run_seed
    if [[ "$run_seed" =~ ^[Yy]$ ]]; then
        npm run db:seed || log_warn "数据种子失败"
    fi
    
    # 启动其他服务
    cd "$DEPLOY_DIR"
    log_info "启动其他服务..."
    docker-compose -f docker-compose.local.yml up -d
    
    log_info "✅ 数据库重置完成"
}

# 重新构建服务
rebuild_services() {
    log_step "重新构建和部署服务..."
    
    cd "$DEPLOY_DIR"
    
    # 停止服务
    docker-compose -f docker-compose.local.yml stop
    
    # 重新构建
    docker-compose -f docker-compose.local.yml build --no-cache
    
    # 启动服务
    docker-compose -f docker-compose.local.yml up -d
    
    log_info "等待服务启动..."
    sleep 15
    
    # 检查状态
    docker-compose -f docker-compose.local.yml ps
    
    log_info "✅ 服务重建完成"
}

# 显示回滚后状态
show_status() {
    log_step "当前状态:"
    
    # Git状态
    cd "$PROJECT_ROOT"
    local current_commit=$(git rev-parse --short HEAD)
    local current_message=$(git log -1 --pretty=format:"%s")
    log_info "Git提交: $current_commit - $current_message"
    
    # 服务状态
    cd "$DEPLOY_DIR"
    log_info "服务状态:"
    docker-compose -f docker-compose.local.yml ps
    
    echo ""
    log_info "访问地址:"
    echo "  - 前端: http://localhost"
    echo "  - API: http://localhost:3001, 3002, 3003"
}

# 主函数
main() {
    check_git_status
    
    # 如果有命令行参数
    case "${1:-}" in
        "git")
            git_rollback
            ;;
        "restart")
            service_restart
            ;;
        "rebuild")
            complete_rebuild
            ;;
        "reset-db")
            database_rollback
            ;;
        "status")
            show_status
            ;;
        "help"|"-h"|"--help")
            echo "用法: $0 [命令]"
            echo ""
            echo "命令:"
            echo "  git      - Git代码回滚"
            echo "  restart  - 服务重启"
            echo "  rebuild  - 完全重建"
            echo "  reset-db - 数据库回滚"
            echo "  status   - 显示状态"
            echo "  help     - 显示帮助"
            echo ""
            echo "无参数运行将显示交互菜单"
            ;;
        "")
            # 交互模式
            select_rollback_type
            show_status
            ;;
        *)
            log_error "未知命令: $1"
            echo "使用 $0 help 查看帮助"
            exit 1
            ;;
    esac
}

# 错误处理
trap 'log_error "回滚脚本执行出错，行号: $LINENO"' ERR

# 运行主函数
main "$@"