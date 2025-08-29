#!/bin/bash

# E-Maintenance 安全清理脚本
# 移除deploy根目录下确定不需要的文件，保留重要文档和部署方案

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

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
echo "E-Maintenance 安全清理"
echo "========================================="
echo -e "${NC}"

# 确定可以安全删除的文件
SAFE_TO_DELETE=(
    "modular"                      # 之前的测试目录
    "fix-docker-api-access.sh"     # 已整合功能
    "quick-fix-api.sh"             # 已整合功能
)

# 需要用户确认的文件（可能有依赖）
CONFIRM_DELETE=(
    "docker-compose.yml"           # 根目录compose文件，Local已修正不再依赖
)

# 绝对不能删除的重要文件和目录
PROTECTED=(
    "Local"
    "Server" 
    "README.md"
    "*.md"
    "DEPLOYMENT_ISSUES_SUMMARY.md"
    "DOCKER_API_FIX_GUIDE.md"
    "API_FLEXIBLE_CONFIG_GUIDE.md"
    "REMOTE_DEPLOYMENT_TROUBLESHOOTING.md"
    "REMOTE_UPDATE_GUIDE.md"
    "QUICK_DEPLOYMENT_GUIDE.md"
    "KNOWN_ISSUES.md"
)

echo -e "${BLUE}当前目录分析:${NC}"
ls -la

echo -e "\n${GREEN}✅ 安全删除 (无依赖关系):${NC}"
for item in "${SAFE_TO_DELETE[@]}"; do
    if [[ -e "$item" ]]; then
        echo "  - $item"
    fi
done

echo -e "\n${YELLOW}⚠️ 需要确认删除:${NC}"
for item in "${CONFIRM_DELETE[@]}"; do
    if [[ -e "$item" ]]; then
        echo "  - $item"
    fi
done

echo -e "\n${GREEN}🛡️ 受保护 (绝不删除):${NC}"
echo "  - Local/ 目录 (本地部署方案)"
echo "  - Server/ 目录 (服务器分模块部署)"
echo "  - 所有 *.md 文档文件"

# 执行安全删除
echo -e "\n${BLUE}执行安全清理...${NC}"

deleted_items=0

# 删除确定安全的项目
for item in "${SAFE_TO_DELETE[@]}"; do
    if [[ -e "$item" ]]; then
        if [[ -d "$item" ]]; then
            log_info "删除目录: $item/"
            rm -rf "$item"
        else
            log_info "删除文件: $item"
            rm -f "$item"
        fi
        ((deleted_items++))
    fi
done

# 对需要确认的项目进行确认
for item in "${CONFIRM_DELETE[@]}"; do
    if [[ -e "$item" ]]; then
        echo -e "\n${YELLOW}发现文件: $item${NC}"
        echo "此文件可能被其他脚本引用，但Local/脚本已修正。"
        read -p "确认删除 $item ? (y/N): " confirm
        
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            if [[ -d "$item" ]]; then
                log_info "删除目录: $item/"
                rm -rf "$item"
            else
                log_info "删除文件: $item"
                rm -f "$item"
            fi
            ((deleted_items++))
        else
            log_warn "保留文件: $item"
        fi
    fi
done

# 清理完成后的结果
echo -e "\n${GREEN}========================================="
echo -e "清理完成！"
echo -e "=========================================${NC}"

echo -e "删除了 $deleted_items 个项目"

echo -e "\n${BLUE}清理后的目录结构:${NC}"
ls -la

echo -e "\n${GREEN}现在你有两个独立的部署方案:${NC}"
echo -e "  📍 ${BLUE}本地开发部署:${NC}"
echo -e "     cd Local/"
echo -e "     ./deploy-local.sh"
echo -e ""
echo -e "  📍 ${BLUE}服务器分模块部署:${NC}"
echo -e "     cd Server/"
echo -e "     ./scripts/deploy-all.sh"
echo -e ""
echo -e "  📄 ${BLUE}查看文档:${NC}"
echo -e "     cat README.md"
echo -e "     cat DOCKER_API_FIX_GUIDE.md"

# 验证关键文件存在
echo -e "\n${YELLOW}验证重要文件完整性:${NC}"

critical_files_ok=true

if [[ ! -d "Local" ]]; then
    log_error "Local/ 目录缺失！"
    critical_files_ok=false
else
    log_info "✓ Local/ 目录存在"
fi

if [[ ! -d "Server" ]]; then
    log_error "Server/ 目录缺失！"
    critical_files_ok=false
else
    log_info "✓ Server/ 目录存在"
fi

if [[ ! -f "Local/docker-compose.local.yml" ]]; then
    log_error "Local/docker-compose.local.yml 缺失！"
    critical_files_ok=false
else
    log_info "✓ Local/docker-compose.local.yml 存在"
fi

if [[ ! -f "README.md" ]]; then
    log_warn "README.md 缺失"
else
    log_info "✓ README.md 存在"
fi

if [[ "$critical_files_ok" == "true" ]]; then
    echo -e "\n${GREEN}✅ 验证通过：所有关键文件完整！${NC}"
    
    # 删除清理脚本自身
    echo -e "\n${YELLOW}清理完成，删除临时清理脚本...${NC}"
    rm -f cleanup-legacy-files.sh analyze-deploy-structure.sh safe-cleanup.sh
    log_info "临时脚本已删除"
else
    log_error "❌ 验证失败：发现缺失的关键文件！"
    exit 1
fi