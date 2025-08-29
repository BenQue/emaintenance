#!/bin/bash

# E-Maintenance 部署结构分析工具
# 分析当前部署目录结构，识别有用文件和废弃文件

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${GREEN}"
echo "========================================="
echo "E-Maintenance 部署结构分析"
echo "========================================="
echo -e "${NC}"

echo -e "${BLUE}📁 当前部署目录结构分析:${NC}\n"

# 分析根目录文件
echo -e "${PURPLE}=== 根目录文件分析 ===${NC}"

for file in *.yml *.yaml *.sh; do
    if [[ -f "$file" ]]; then
        case "$file" in
            "docker-compose.yml"|"docker-compose.yaml")
                echo -e "  🗑️  ${RED}$file${NC} - 废弃的单体部署配置，可删除"
                # 检查是否被其他文件引用
                if grep -r "$file" Local/ Server/ 2>/dev/null | grep -v "\.git" >/dev/null; then
                    echo -e "      ⚠️  警告: 该文件被其他脚本引用"
                fi
                ;;
            "*fix*api*.sh"|"quick-fix*.sh")
                echo -e "  🗑️  ${RED}$file${NC} - API修复脚本，已整合到其他工具"
                ;;
            "cleanup-legacy-files.sh"|"analyze-deploy-structure.sh")
                echo -e "  🔧  ${YELLOW}$file${NC} - 临时清理工具，可在清理后删除"
                ;;
            *)
                echo -e "  ❓  ${YELLOW}$file${NC} - 需要人工确认用途"
                ;;
        esac
    fi
done

# 分析文档文件
echo -e "\n${PURPLE}=== 文档文件分析 ===${NC}"
for file in *.md; do
    if [[ -f "$file" ]]; then
        echo -e "  📄  ${GREEN}$file${NC} - 保留（部署文档）"
    fi
done

# 分析目录结构
echo -e "\n${PURPLE}=== 目录结构分析 ===${NC}"

if [[ -d "Local" ]]; then
    echo -e "  📂  ${GREEN}Local/${NC} - 本地部署方案（单体架构）"
    echo -e "      包含: $(ls Local/ | wc -l) 个文件"
    if [[ -f "Local/docker-compose.local.yml" ]]; then
        echo -e "      ✅ 包含本地部署配置"
    fi
fi

if [[ -d "Server" ]]; then
    echo -e "  📂  ${GREEN}Server/${NC} - 服务器部署方案（分模块架构）"
    echo -e "      包含: $(find Server/ -type f | wc -l) 个文件"
    
    # 检查分模块结构
    for module in infrastructure user-service work-order-service asset-service web-service; do
        if [[ -d "Server/$module" ]]; then
            echo -e "      ✅ $module/ 模块"
        fi
    done
fi

if [[ -d "modular" ]]; then
    echo -e "  🗑️  ${RED}modular/${NC} - 测试目录，可删除"
fi

# 检查依赖关系
echo -e "\n${PURPLE}=== 依赖关系检查 ===${NC}"

echo -e "${YELLOW}检查 Local/ 目录依赖...${NC}"
if [[ -d "Local" ]]; then
    # 检查Local目录的脚本是否引用根目录文件
    for script in Local/*.sh; do
        if [[ -f "$script" ]]; then
            # 查找对根目录文件的引用
            if grep -q "\.\./docker-compose\.yml" "$script" 2>/dev/null; then
                echo -e "  ⚠️  $(basename $script) 引用了根目录的 docker-compose.yml"
            fi
        fi
    done
fi

echo -e "${YELLOW}检查 Server/ 目录依赖...${NC}"
if [[ -d "Server" ]]; then
    # Server目录应该是独立的
    echo -e "  ✅ Server/ 目录结构独立，不依赖根目录文件"
fi

# 提供清理建议
echo -e "\n${GREEN}========================================="
echo -e "清理建议"
echo -e "=========================================${NC}"

echo -e "${GREEN}✅ 安全可删除:${NC}"
echo -e "  • modular/ 目录（如果存在）"
echo -e "  • fix-docker-api-access.sh"
echo -e "  • quick-fix-api.sh"

echo -e "\n${YELLOW}⚠️ 需要检查后删除:${NC}"
echo -e "  • docker-compose.yml（确认Local/不依赖它）"

echo -e "\n${GREEN}✅ 必须保留:${NC}"
echo -e "  • Local/ 目录及其所有内容"
echo -e "  • Server/ 目录及其所有内容"
echo -e "  • 所有 *.md 文档文件"

echo -e "\n${BLUE}推荐操作:${NC}"
echo -e "  1. 运行 ./cleanup-legacy-files.sh 清理废弃文件"
echo -e "  2. 保持当前的两套部署方案:"
echo -e "     - Local/  用于本地开发"
echo -e "     - Server/ 用于服务器部署"

# 显示最终建议的目录结构
echo -e "\n${PURPLE}建议的最终目录结构:${NC}"
cat << 'EOF'
deploy/
├── Local/                           # 本地部署方案
│   ├── docker-compose.local.yml
│   ├── deploy-local.sh
│   ├── configs/
│   └── ...
├── Server/                          # 服务器分模块部署方案  
│   ├── infrastructure/
│   ├── user-service/
│   ├── work-order-service/
│   ├── asset-service/
│   ├── web-service/
│   ├── scripts/
│   └── ...
├── README.md                        # 主要部署说明
├── API_FLEXIBLE_CONFIG_GUIDE.md     # API配置指南
├── DOCKER_API_FIX_GUIDE.md          # Docker API问题修复
├── DEPLOYMENT_ISSUES_SUMMARY.md     # 部署问题总结
├── REMOTE_DEPLOYMENT_TROUBLESHOOTING.md # 远程部署故障排除
└── 其他文档...
EOF

echo -e "\n${GREEN}分析完成！${NC}"