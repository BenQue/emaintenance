#!/bin/bash
# ============================================
# Full Initialization Script
# 完整初始化脚本
# ============================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  E-Maintenance System                 ║${NC}"
echo -e "${BLUE}║  完整初始化流程                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# 检查数据库连接
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ 错误: DATABASE_URL 环境变量未设置${NC}"
  echo "请设置 DATABASE_URL 环境变量，例如："
  echo "export DATABASE_URL='postgresql://user:password@localhost:5432/emaintenance'"
  exit 1
fi

echo -e "${GREEN}✅ 数据库连接已配置${NC}"
echo "DATABASE_URL: ${DATABASE_URL%%@*}@***"
echo ""

# 确认执行
echo -e "${YELLOW}⚠️  警告: 此操作将向数据库插入主数据和资产数据${NC}"
echo -n "确认继续？(y/N): "
read -r confirmation

if [[ ! "$confirmation" =~ ^[Yy]$ ]]; then
  echo -e "${RED}❌ 操作已取消${NC}"
  exit 0
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}步骤 1/3: 创建主数据${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

bash "$SCRIPT_DIR/01-create-master-data.sh"

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}步骤 2/3: 导入资产数据${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

bash "$SCRIPT_DIR/02-import-assets.sh"

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}步骤 3/3: 验证数据完整性${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

bash "$SCRIPT_DIR/03-validate-data.sh"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ 初始化完成！                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📋 后续步骤：${NC}"
echo "1. 检查日志文件确认无错误: deploy/init/logs/"
echo "2. 创建初始用户账户（可选）"
echo "3. 配置自动分配规则（可选）"
echo ""

echo -e "${GREEN}🎉 系统已准备就绪！${NC}"
