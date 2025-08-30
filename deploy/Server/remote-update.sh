#!/bin/bash

# E-Maintenance 远程服务器统一更新脚本
# 整合了最新的配置更改和部署优化

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# 脚本信息
echo -e "${PURPLE}"
echo "=================================================="
echo "E-Maintenance 远程服务器统一更新脚本"
echo "版本: 2.0.0"
echo "更新日期: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================================="
echo -e "${NC}"

# 获取项目根目录
SERVER_DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SERVER_DEPLOY_DIR/../.." && pwd)"

log_info "项目根目录: $PROJECT_ROOT"
log_info "服务器部署目录: $SERVER_DEPLOY_DIR"

# 检查必要的命令和环境
check_environment() {
    log_step "检查部署环境..."
    
    # 检查命令
    local missing_commands=()
    for cmd in docker docker-compose git; do
        if ! command -v $cmd &> /dev/null; then
            missing_commands+=($cmd)
        fi
    done
    
    if [ ${#missing_commands[@]} -ne 0 ]; then
        log_error "缺少必要的命令: ${missing_commands[*]}"
        exit 1
    fi
    
    # 检查目录结构
    if [[ ! -d "$SERVER_DEPLOY_DIR" ]]; then
        log_error "服务器部署目录不存在: $SERVER_DEPLOY_DIR"
        exit 1
    fi
    
    # 检查关键脚本
    local scripts=("update-modules.sh" "quick-update.sh" "status.sh" "rollback.sh")
    for script in "${scripts[@]}"; do
        if [[ ! -f "$SERVER_DEPLOY_DIR/$script" ]]; then
            log_warn "缺少脚本: $script"
        fi
    done
    
    log_success "环境检查完成"
}

# 同步最新代码和配置
sync_latest_changes() {
    log_step "同步最新代码和配置..."
    
    cd "$PROJECT_ROOT"
    
    # 检查git状态
    if [[ -n $(git status --porcelain) ]]; then
        log_warn "检测到未提交的更改："
        git status --short
        echo ""
        read -p "是否继续部署？[y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "部署已取消"
            exit 0
        fi
    fi
    
    # 获取最新代码
    log_info "拉取最新代码..."
    git fetch origin
    git pull origin main
    
    # 显示最近的提交
    log_info "最近的提交记录："
    git log --pretty=format:"%h %s" -5
    echo ""
    
    log_success "代码同步完成"
}

# 显示更新选项菜单
show_update_menu() {
    echo -e "${BLUE}请选择更新模式：${NC}"
    echo ""
    echo "1) 🚀 快速更新前端 (推荐用于UI修复)"
    echo "2) ⚙️  快速更新后端 (推荐用于API修复)"  
    echo "3) 🔄 全量更新所有服务 (推荐用于大版本更新)"
    echo "4) 🎯 自定义选择模块 (高级用户)"
    echo "5) 📊 查看当前状态"
    echo "6) 🔙 回滚到上一版本"
    echo "7) ❌ 退出"
    echo ""
    read -p "请输入选择 [1-7]: " choice
    echo ""
    
    case $choice in
        1)
            log_info "执行前端快速更新..."
            cd "$SERVER_DEPLOY_DIR"
            ./quick-update.sh frontend
            ;;
        2)
            log_info "执行后端快速更新..."
            cd "$SERVER_DEPLOY_DIR"
            ./quick-update.sh backend
            ;;
        3)
            log_info "执行全量更新..."
            cd "$SERVER_DEPLOY_DIR"
            ./quick-update.sh all
            ;;
        4)
            log_info "启动模块选择界面..."
            cd "$SERVER_DEPLOY_DIR"
            ./update-modules.sh
            ;;
        5)
            log_info "检查系统状态..."
            cd "$SERVER_DEPLOY_DIR"
            ./status.sh
            ;;
        6)
            log_info "启动回滚流程..."
            cd "$SERVER_DEPLOY_DIR"
            ./rollback.sh
            ;;
        7)
            log_info "退出部署脚本"
            exit 0
            ;;
        *)
            log_error "无效选择，请重新运行脚本"
            exit 1
            ;;
    esac
}

# 部署后验证
post_deployment_check() {
    log_step "执行部署后验证..."
    
    cd "$SERVER_DEPLOY_DIR"
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 执行健康检查
    if [[ -f "status.sh" ]]; then
        ./status.sh quick
    else
        log_warn "未找到状态检查脚本，跳过健康检查"
    fi
    
    log_success "部署验证完成"
}

# 显示部署结果
show_deployment_result() {
    echo ""
    echo -e "${GREEN}=================================================="
    echo "🎉 远程服务器更新完成！"
    echo "=================================================="
    echo -e "${NC}"
    
    echo -e "${CYAN}访问信息：${NC}"
    echo "• Web应用: http://your-server-ip:3000"
    echo "• API文档: http://your-server-ip:3000/api/docs"
    echo ""
    
    echo -e "${CYAN}管理命令：${NC}"
    echo "• 查看状态: cd $SERVER_DEPLOY_DIR && ./status.sh"
    echo "• 查看日志: docker-compose -f $SERVER_DEPLOY_DIR/docker-compose.yml logs -f"
    echo "• 紧急回滚: cd $SERVER_DEPLOY_DIR && ./rollback.sh"
    echo ""
    
    echo -e "${YELLOW}注意事项：${NC}"
    echo "• 请监控服务运行状态15分钟"
    echo "• 如发现问题，及时执行回滚操作"
    echo "• 建议备份当前配置以便紧急恢复"
    echo ""
}

# 主函数
main() {
    # 环境检查
    check_environment
    
    # 同步最新代码
    sync_latest_changes
    
    # 显示更新菜单并执行
    show_update_menu
    
    # 部署后验证
    post_deployment_check
    
    # 显示结果
    show_deployment_result
    
    log_success "远程服务器更新流程完成！"
}

# 信号处理
trap 'log_error "部署过程中断"; exit 1' INT TERM

# 执行主函数
main "$@"