#!/bin/bash
# ============================================
# Import Assets Script
# 导入资产数据脚本
# ============================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ASSET_DATA_DIR="$SCRIPT_DIR/../asset-data"
LOG_DIR="$SCRIPT_DIR/../logs"
LOG_FILE="$LOG_DIR/asset-import.log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 创建日志目录
mkdir -p "$LOG_DIR"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}导入资产数据${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查数据库连接
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ 错误: DATABASE_URL 环境变量未设置${NC}"
  exit 1
fi

# 检查CSV文件
CSV_FILE="$ASSET_DATA_DIR/asset_PR_0930_utf8.csv"
if [ ! -f "$CSV_FILE" ]; then
  echo -e "${RED}❌ 错误: CSV文件不存在: $CSV_FILE${NC}"
  exit 1
fi

echo "📁 资产数据目录: $ASSET_DATA_DIR"
echo "📄 CSV文件: $CSV_FILE"
echo "📝 日志文件: $LOG_FILE"
echo ""

# 记录开始时间
echo "开始时间: $(date)" | tee "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# 执行Node.js导入脚本
echo -e "${YELLOW}▶ 执行资产导入脚本...${NC}"
echo ""

cd "$ASSET_DATA_DIR"
node import-assets.js | tee -a "$LOG_FILE"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 资产导入完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 记录结束时间
echo "结束时间: $(date)" | tee -a "$LOG_FILE"
