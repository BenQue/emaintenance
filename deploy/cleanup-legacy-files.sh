#!/bin/bash

# E-Maintenance 清理废弃部署文件脚本
# 清理 deploy/ 根目录下与部署无关的文件，保留文档和有用工具

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
echo "E-Maintenance 废弃文件清理工具"  
echo "========================================="
echo -e "${NC}"

# 需要删除的文件列表（根目录下与部署无关的文件）
FILES_TO_DELETE=(
    "docker-compose.yml"           # 根目录下的废弃compose文件
    "fix-docker-api-access.sh"     # 已整合到其他工具中
    "quick-fix-api.sh"             # 已整合到其他工具中
)

# 需要删除的目录列表
DIRS_TO_DELETE=(
    "modular"                      # 之前创建的测试目录
)

# 需要保留的文件（文档和有用工具）
KEEP_FILES=(
    "*.md"                         # 所有Markdown文档
    "README.md"
    "API_FLEXIBLE_CONFIG_GUIDE.md"
    "DEPLOYMENT_ISSUES_SUMMARY.md" 
    "DOCKER_API_FIX_GUIDE.md"
    "KNOWN_ISSUES.md"
    "QUICK_DEPLOYMENT_GUIDE.md"
    "REMOTE_DEPLOYMENT_TROUBLESHOOTING.md"
    "REMOTE_UPDATE_GUIDE.md"
    "Local/"                       # 本地部署目录
    "Server/"                      # 服务器部署目录
)

# 显示当前文件结构
echo -e "${BLUE}当前 deploy/ 目录结构:${NC}"
ls -la

echo -e "\n${YELLOW}即将删除以下文件/目录:${NC}"

# 检查要删除的文件
for file in "${FILES_TO_DELETE[@]}"; do
    if [[ -f "$file" ]]; then
        echo "  - 文件: $file"
    fi
done

# 检查要删除的目录
for dir in "${DIRS_TO_DELETE[@]}"; do
    if [[ -d "$dir" ]]; then
        echo "  - 目录: $dir/"
    fi
done

echo -e "\n${GREEN}将保留以下重要文件:${NC}"
echo "  - 所有 *.md 文档文件"
echo "  - Local/ 目录（本地部署）"
echo "  - Server/ 目录（服务器部署）"

# 确认操作
echo -e "\n${YELLOW}是否继续清理？这个操作不可逆！${NC}"
read -p "输入 'yes' 确认删除: " confirm

if [[ "$confirm" != "yes" ]]; then
    log_info "操作已取消"
    exit 0
fi

echo -e "\n${BLUE}开始清理...${NC}"

# 删除文件
deleted_count=0
for file in "${FILES_TO_DELETE[@]}"; do
    if [[ -f "$file" ]]; then
        log_info "删除文件: $file"
        rm -f "$file"
        ((deleted_count++))
    else
        log_warn "文件不存在: $file"
    fi
done

# 删除目录
for dir in "${DIRS_TO_DELETE[@]}"; do
    if [[ -d "$dir" ]]; then
        log_info "删除目录: $dir/"
        rm -rf "$dir"
        ((deleted_count++))
    else
        log_warn "目录不存在: $dir/"
    fi
done

echo -e "\n${GREEN}清理完成！${NC}"
echo "- 删除了 $deleted_count 个文件/目录"

echo -e "\n${BLUE}清理后的 deploy/ 目录结构:${NC}"
ls -la

echo -e "\n${GREEN}========================================="
echo -e "清理总结"
echo -e "=========================================${NC}"
echo -e "${GREEN}保留的重要内容:${NC}"
echo -e "  ✅ Local/ - 本地部署方案"
echo -e "  ✅ Server/ - 服务器分模块部署方案"
echo -e "  ✅ 所有文档和故障排除指南"
echo -e ""
echo -e "${GREEN}清理的废弃内容:${NC}"
echo -e "  🗑️ 根目录下的废弃 docker-compose.yml"
echo -e "  🗑️ 重复的API修复脚本"
echo -e "  🗑️ 测试用的modular目录"
echo -e ""
echo -e "${BLUE}现在你有两个清晰的部署方案:${NC}"
echo -e "  📍 本地开发: cd Local/ && ./deploy-local.sh"
echo -e "  📍 服务器部署: cd Server/ && ./scripts/deploy-all.sh"