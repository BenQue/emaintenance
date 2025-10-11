# E-Maintenance System 生产环境初始化指南

## 📋 概述

本目录包含生产环境部署所需的所有初始化脚本、主数据种子和资产清单数据。

## 🗂️ 目录结构

```
init/
├── README.md                      # 本文档
├── master-data/                   # 主数据SQL种子文件
│   ├── 01_locations.sql          # 位置/部门主数据
│   ├── 02_categories.sql         # 工单分类主数据
│   ├── 03_fault_symptoms.sql     # 故障表现主数据
│   ├── 04_fault_codes.sql        # 故障代码主数据
│   ├── 05_priority_levels.sql    # 优先级主数据
│   └── 06_reasons.sql            # 原因主数据
├── asset-data/                    # 资产数据
│   ├── asset_PR_0930_utf8.csv    # 原始5字段CSV（UTF-8）
│   ├── asset_PR_0930_standard.csv # 标准10字段CSV（推荐使用）
│   ├── import-assets.js          # Node.js导入脚本（支持标准格式）
│   └── validate-assets.sql       # 数据验证查询
├── user-data/                     # 用户数据
│   └── initial-users.sql         # 初始管理员账户
├── scripts/                       # 初始化Shell脚本
│   ├── 01-create-master-data.sh  # 创建主数据
│   ├── 02-import-assets.sh       # 导入资产
│   ├── 03-validate-data.sh       # 验证数据完整性
│   └── full-init.sh              # 完整初始化流程
└── logs/                          # 执行日志目录
```

## 🚀 快速开始

### 前置要求

- PostgreSQL 16+ 已安装并运行
- Node.js 18+ 已安装
- 已配置 `DATABASE_URL` 环境变量
- Prisma Client 已生成

### 完整初始化流程

```bash
# 进入初始化目录
cd deploy/init

# 执行完整初始化（包含所有步骤）
./scripts/full-init.sh

# 或者分步执行
./scripts/01-create-master-data.sh  # 创建主数据
./scripts/02-import-assets.sh       # 导入资产数据
./scripts/03-validate-data.sh       # 验证数据完整性
```

## 📊 数据映射说明

### 标准CSV格式（10字段）

当前使用的标准CSV格式包含以下字段：

```csv
assetCode,name,category,location,status,installDate,model,manufacturer,serialNumber,description
BC02120086,11线UV 固化机,MECHANICAL,HPC-Production,ACTIVE,,,,,
```

### CSV字段 → 数据库字段映射

| CSV字段 | 必填 | 数据库字段 | 处理方式 |
|---------|------|-----------|---------|
| `assetCode` | ✅ | `assetCode` | 直接映射，唯一标识 |
| `name` | ✅ | `name` | 直接映射（UTF-8编码） |
| `category` | ❌ | `description` | 与description合并，格式："类别: MECHANICAL" |
| `location` | ✅ | `location` + `locationId` | 字符串存入location，解析后映射到locationId外键 |
| `status` | ❌ | `isActive` | ACTIVE → true, 其他 → false, 默认true |
| `installDate` | ❌ | `installDate` | 日期格式YYYY-MM-DD，解析为DateTime |
| `model` | ❌ | `model` | 直接映射，设备型号 |
| `manufacturer` | ❌ | `manufacturer` | 直接映射，制造商 |
| `serialNumber` | ❌ | `serialNumber` | 直接映射，序列号 |
| `description` | ❌ | `description` | 与category合并到description字段 |

### CSV文件说明

- **原始文件**: `asset_PR_0930_utf8.csv` (5字段，UTF-8编码)
- **标准文件**: `asset_PR_0930_standard.csv` (10字段标准格式)
- **总记录数**: 656条资产记录
- **唯一位置**: 7个位置（HPC-Production, AD-Production, HC-Production, HDM-Production, RS-Production, SCP-Production, TMP-Production）

### CSV格式演变

1. **原始CSV**: 16字段，GB18030编码
2. **精简CSV**: 5字段（assetCode, name, category, status, location）
3. **标准CSV**: 10字段（添加installDate, model, manufacturer, serialNumber, description）
   - 对齐数据库Asset模型所有支持字段
   - 缺失字段用空值填充
   - 支持未来数据扩展

## 🔐 安全注意事项

- **初始管理员账户**: 首次登录后立即修改密码
- **数据库备份**: 初始化前务必备份现有数据
- **环境变量**: 确保 `DATABASE_URL` 和 `JWT_SECRET` 已正确配置
- **日志审查**: 检查 `logs/` 目录中的执行日志

## 📝 执行日志

所有初始化脚本的执行日志保存在 `logs/` 目录：

- `master-data.log`: 主数据创建日志
- `asset-import.log`: 资产导入日志
- `validation.log`: 数据验证日志

## 🔍 数据验证

初始化完成后，运行验证脚本确认数据完整性：

```bash
./scripts/03-validate-data.sh
```

验证项目包括：
- ✅ 主数据记录数量
- ✅ 资产记录数量和唯一性
- ✅ Location外键引用完整性
- ✅ 资产编码唯一性约束

## 🛠️ 故障排查

### 常见问题

1. **编码问题**: 确保CSV文件为UTF-8编码
2. **外键冲突**: 确保Location主数据已先创建
3. **唯一约束冲突**: 检查assetCode是否重复
4. **数据库连接**: 验证DATABASE_URL配置正确

### 回滚操作

如需回滚初始化数据：

```sql
-- 删除资产数据（谨慎操作！）
DELETE FROM assets WHERE "createdAt" > 'YYYY-MM-DD';

-- 删除主数据（谨慎操作！）
DELETE FROM locations;
DELETE FROM categories;
-- ... 其他主数据表
```

## 📞 联系与支持

如遇到初始化问题，请检查：
1. 日志文件 (`logs/` 目录)
2. 数据库连接配置
3. Prisma Client 是否最新

---

**最后更新**: 2025-10-01
**维护者**: E-Maintenance Team
