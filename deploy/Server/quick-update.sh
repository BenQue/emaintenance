#!/bin/bash

# E-Maintenance 快速更新脚本
# 提供常用的快捷更新命令

set -e

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPDATE_SCRIPT="$SCRIPT_DIR/update-modules.sh"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# 显示使用帮助
show_usage() {
    echo -e "${BLUE}E-Maintenance 快速更新工具${NC}"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "快捷命令:"
    echo "  frontend, f    - 只更新前端 (web + nginx)"
    echo "  backend, b     - 只更新后端服务 (所有微服务)"
    echo "  all, a         - 更新所有应用模块"
    echo "  web, w         - 只更新web应用"
    echo "  user, u        - 只更新用户服务"
    echo "  workorder, wo  - 只更新工单服务"
    echo "  asset, as      - 只更新资产服务"
    echo "  nginx, n       - 只更新nginx代理"
    echo ""
    echo "示例:"
    echo "  $0 frontend     # 更新前端相关组件"
    echo "  $0 backend      # 更新所有微服务"
    echo "  $0 web          # 只更新web应用"
    echo ""
}

# 检查更新脚本是否存在
if [[ ! -f "$UPDATE_SCRIPT" ]]; then
    log_warn "更新脚本不存在: $UPDATE_SCRIPT"
    exit 1
fi

# 解析命令行参数
case "${1:-}" in
    "frontend"|"f")
        log_info "🌐 更新前端相关组件 (web + nginx)"
        echo "f" | bash "$UPDATE_SCRIPT"
        ;;
    "backend"|"b"|"services"|"s")
        log_info "⚙️ 更新后端服务 (所有微服务)"
        echo "s" | bash "$UPDATE_SCRIPT"
        ;;
    "all"|"a")
        log_info "🚀 更新所有应用模块"
        echo "a" | bash "$UPDATE_SCRIPT"
        ;;
    "web"|"w")
        log_info "🌐 只更新web应用"
        echo "c
1" | bash "$UPDATE_SCRIPT"
        ;;
    "user"|"u")
        log_info "👤 只更新用户服务"
        echo "c
2" | bash "$UPDATE_SCRIPT"
        ;;
    "workorder"|"wo")
        log_info "📋 只更新工单服务"
        echo "c
3" | bash "$UPDATE_SCRIPT"
        ;;
    "asset"|"as")
        log_info "🏭 只更新资产服务"
        echo "c
4" | bash "$UPDATE_SCRIPT"
        ;;
    "nginx"|"n")
        log_info "🔀 只更新nginx代理"
        echo "c
5" | bash "$UPDATE_SCRIPT"
        ;;
    "help"|"-h"|"--help"|"")
        show_usage
        ;;
    *)
        log_warn "未知的命令: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac