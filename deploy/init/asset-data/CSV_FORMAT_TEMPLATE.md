# 资产CSV导入格式说明

## 📋 标准CSV格式（10字段）

### CSV头部
```csv
assetCode,name,category,location,status,installDate,model,manufacturer,serialNumber,description
```

### 字段说明

| 字段名 | 必填 | 类型 | 格式/枚举值 | 说明 | 示例 |
|--------|------|------|------------|------|------|
| **assetCode** | ✅ | String | 无特定格式，建议有意义 | 资产唯一编码，系统内不可重复 | BC02120086, HPC110001 |
| **name** | ✅ | String | UTF-8编码，支持中文 | 资产名称 | 11线UV 固化机 |
| **category** | ❌ | String | 建议使用枚举 | 设备分类（MECHANICAL/ELECTRICAL/SOFTWARE/OTHER） | MECHANICAL |
| **location** | ✅ | String | 必须在Location表中存在 | 设备位置，格式："部门-区域" | HPC-Production |
| **status** | ❌ | String | ACTIVE/INACTIVE | 设备状态，默认ACTIVE | ACTIVE |
| **installDate** | ❌ | Date | YYYY-MM-DD | 安装日期 | 2024-01-15 |
| **model** | ❌ | String | 自由文本 | 设备型号 | Model-X2024 |
| **manufacturer** | ❌ | String | 自由文本 | 制造商 | ABC Manufacturing |
| **serialNumber** | ❌ | String | 自由文本 | 序列号 | SN123456789 |
| **description** | ❌ | String | 自由文本，支持换行 | 详细描述信息 | 这是一台UV固化设备 |

### 必填字段检查
- ✅ `assetCode`: 必须填写且唯一
- ✅ `name`: 必须填写
- ✅ `location`: 必须填写且必须在Location表中预先存在

### 可选字段处理
- 可选字段留空时将存储为NULL
- status留空默认为ACTIVE
- 日期格式错误将忽略并存储为NULL

---

## 📝 CSV示例

### 完整字段示例
```csv
assetCode,name,category,location,status,installDate,model,manufacturer,serialNumber,description
BC02120086,11线UV 固化机,MECHANICAL,HPC-Production,ACTIVE,2024-01-15,UV-X2024,ABC Manufacturing,SN123456,高精度UV固化设备
HPC110001,11线拉拔刀,MECHANICAL,HPC-Production,ACTIVE,2023-08-20,Blade-100,XYZ Tools,BL987654,拉拔岗位专用工具
AD120001,检测仪器A,ELECTRICAL,AD-Production,ACTIVE,2024-03-10,TEST-500,QC Instruments,TEST123,自动化质检设备
```

### 仅必填字段示例（最小化）
```csv
assetCode,name,category,location,status,installDate,model,manufacturer,serialNumber,description
BC02120080,11线剥线机,MECHANICAL,HPC-Production,ACTIVE,,,,,
HPC110002,线缆烘烤机,,HPC-Production,,,,,,
```

### 当前生产数据格式
```csv
assetCode,name,category,location,status,installDate,model,manufacturer,serialNumber,description
BC02120086,11线UV 固化机,MECHANICAL,HPC-Production,ACTIVE,,,,,
BC02120080,11线WG-8023C同轴剥线机,MECHANICAL,HPC-Production,ACTIVE,,,,,
BC02001196,11线UV glue semi-automation machine-UV自动点胶设备,MECHANICAL,HPC-Production,ACTIVE,,,,,
```

---

## 🔍 数据验证规则

### 1. assetCode验证
- ❌ 不能为空
- ❌ 不能重复
- ✅ 支持字母、数字、下划线、连字符
- 建议格式：部门代码 + 流水号（如BC02120086, HPC110001）

### 2. location验证
- ❌ 不能为空
- ❌ 必须在Location主数据表中存在
- 当前有效位置（7个）：
  - HPC-Production
  - AD-Production
  - HC-Production
  - HDM-Production
  - RS-Production
  - SCP-Production
  - TMP-Production

### 3. status验证
- 有效值：ACTIVE, INACTIVE
- 无效值将被忽略，默认设为ACTIVE

### 4. installDate验证
- 格式必须为：YYYY-MM-DD
- 示例：2024-01-15, 2023-12-31
- 无效日期将被忽略，存储为NULL

---

## 🚨 常见错误及解决方案

### 错误1: 资产编码重复
```
❌ 导入失败: BC02120086 - Unique constraint failed on assetCode
```
**解决方案**: 检查CSV中是否有重复的assetCode，或该编码已在数据库中存在

### 错误2: 位置不存在
```
⚠️  位置不存在: Workshop-A
```
**解决方案**:
1. 检查location拼写是否正确
2. 确认该位置已在Location表中创建
3. 使用 `01_locations.sql` 预先创建所需位置

### 错误3: 日期格式错误
```
⚠️  无效的安装日期: 2024/01/15
```
**解决方案**: 使用标准格式 YYYY-MM-DD（如 2024-01-15）

### 错误4: 缺少必填字段
```
⚠️  跳过无效记录: assetCode=, name=
```
**解决方案**: 确保每行至少包含 assetCode, name, location 三个字段

---

## 💡 最佳实践

### 1. 数据准备
- ✅ 使用UTF-8编码保存CSV文件
- ✅ 确保Location主数据已预先创建
- ✅ 检查assetCode唯一性
- ✅ 统一日期格式为 YYYY-MM-DD
- ✅ 保留原始CSV文件作为备份

### 2. 批量导入策略
- 📊 小规模测试（10-20条记录）验证格式正确性
- 📊 分批导入大量数据（每批100-200条）
- 📊 记录每批次导入结果和失败记录
- 📊 失败记录单独修正后重新导入

### 3. 数据质量检查
```bash
# 检查CSV文件行数
wc -l asset_PR_0930_standard.csv

# 检查字段数量（应为10个字段）
head -1 asset_PR_0930_standard.csv | awk -F',' '{print NF}'

# 检查编码格式
file -I asset_PR_0930_standard.csv

# 查找重复的assetCode
awk -F',' 'NR>1 {print $1}' asset_PR_0930_standard.csv | sort | uniq -d
```

### 4. 导入后验证
```bash
# 运行验证脚本
cd deploy/init
./scripts/03-validate-data.sh

# 或手动SQL验证
psql $DATABASE_URL -f asset-data/validate-assets.sql
```

---

## 📚 相关文档

- [数据库Schema定义](../../../packages/database/prisma/schema.prisma)
- [初始化完整指南](../README.md)
- [CSV格式对比分析](../CSV_FORMAT_ANALYSIS.md)
- [导入脚本源码](./import-assets.js)

---

**最后更新**: 2025-10-01
**版本**: v1.0 (标准10字段格式)
