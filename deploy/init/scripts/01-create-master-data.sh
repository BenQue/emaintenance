#!/bin/bash
# ============================================
# Create Master Data Script
# 创建主数据脚本
# ============================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
MASTER_DATA_DIR="$SCRIPT_DIR/../master-data"
LOG_DIR="$SCRIPT_DIR/../logs"
LOG_FILE="$LOG_DIR/master-data.log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 创建日志目录
mkdir -p "$LOG_DIR"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}创建主数据${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查数据库连接
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ 错误: DATABASE_URL 环境变量未设置${NC}"
  exit 1
fi

echo "📁 主数据目录: $MASTER_DATA_DIR"
echo "📝 日志文件: $LOG_FILE"
echo ""

# 记录开始时间
echo "开始时间: $(date)" | tee "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# 执行SQL文件的函数
execute_sql() {
  local sql_file=$1
  local description=$2

  echo -e "${YELLOW}▶ 执行: $description${NC}"
  echo "执行: $sql_file" >> "$LOG_FILE"

  if psql "$DATABASE_URL" -f "$sql_file" >> "$LOG_FILE" 2>&1; then
    echo -e "${GREEN}✅ 成功${NC}"
    echo "" >> "$LOG_FILE"
  else
    echo -e "${RED}❌ 失败 - 查看日志: $LOG_FILE${NC}"
    exit 1
  fi
}

# 按顺序执行主数据SQL文件
execute_sql "$MASTER_DATA_DIR/01_locations.sql" "位置主数据"
execute_sql "$MASTER_DATA_DIR/02_categories.sql" "工单分类主数据"
execute_sql "$MASTER_DATA_DIR/03_fault_symptoms.sql" "故障表现主数据"
execute_sql "$MASTER_DATA_DIR/04_fault_codes.sql" "故障代码主数据"
execute_sql "$MASTER_DATA_DIR/05_priority_levels.sql" "优先级主数据"
execute_sql "$MASTER_DATA_DIR/06_reasons.sql" "原因主数据"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 主数据创建完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 记录结束时间
echo "结束时间: $(date)" | tee -a "$LOG_FILE"
