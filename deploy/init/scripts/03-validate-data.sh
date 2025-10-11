#!/bin/bash
# ============================================
# Validate Data Script
# 数据验证脚本
# ============================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSET_DATA_DIR="$SCRIPT_DIR/../asset-data"
LOG_DIR="$SCRIPT_DIR/../logs"
LOG_FILE="$LOG_DIR/validation.log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 创建日志目录
mkdir -p "$LOG_DIR"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}数据验证${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查数据库连接
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ 错误: DATABASE_URL 环境变量未设置${NC}"
  exit 1
fi

echo "📝 日志文件: $LOG_FILE"
echo ""

# 记录开始时间
echo "开始时间: $(date)" | tee "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# 执行验证SQL
echo -e "${YELLOW}▶ 执行数据验证查询...${NC}"
echo ""

psql "$DATABASE_URL" -f "$ASSET_DATA_DIR/validate-assets.sql" | tee -a "$LOG_FILE"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 数据验证完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 记录结束时间
echo "结束时间: $(date)" | tee -a "$LOG_FILE"

echo -e "${YELLOW}💡 提示: 请检查上述验证结果，确认数据完整性${NC}"
