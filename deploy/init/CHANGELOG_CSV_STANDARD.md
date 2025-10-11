# CSV标准化变更日志

## 📅 变更日期: 2025-10-01

## 🎯 变更目标
将生产环境资产CSV文件从5字段精简格式升级为10字段标准格式，确保与数据库Asset模型完全对齐，支持未来数据扩展。

---

## 📊 变更概览

### 变更前后对比

| 项目 | 变更前 | 变更后 |
|------|--------|--------|
| **文件名** | `asset_PR_0930_utf8.csv` | `asset_PR_0930_standard.csv` |
| **字段数量** | 5个字段 | 10个字段 |
| **总记录数** | 657行（含头部） | 657行（含头部） |
| **数据记录** | 656条资产 | 656条资产 |
| **重复编码** | 6个重复 | 0个重复（已修复） |
| **数据完整性** | ⚠️ 缺少扩展字段 | ✅ 完整对齐数据库模型 |

---

## 🔄 字段变更详情

### 原5字段格式
```csv
assetCode,name,category,status,location
BC02120086,11线UV 固化机,MECHANICAL,ACTIVE,HPC-Production
```

### 新10字段标准格式
```csv
assetCode,name,category,location,status,installDate,model,manufacturer,serialNumber,description
BC02120086,11线UV 固化机,MECHANICAL,HPC-Production,ACTIVE,,,,,
```

### 字段映射关系

| 序号 | 字段名 | 变更前 | 变更后 | 变更说明 |
|------|--------|--------|--------|----------|
| 1 | assetCode | ✅ 存在 | ✅ 保留 | 位置不变，唯一标识 |
| 2 | name | ✅ 存在 | ✅ 保留 | 位置不变，资产名称 |
| 3 | category | ✅ 存在 | ✅ 保留 | 位置3→3，设备分类 |
| 4 | location | ✅ 存在 | ✅ 保留 | 位置5→4，设备位置 |
| 5 | status | ✅ 存在 | ✅ 保留 | 位置4→5，状态标识 |
| 6 | installDate | ❌ 不存在 | 🆕 新增 | 安装日期（空值） |
| 7 | model | ❌ 不存在 | 🆕 新增 | 设备型号（空值） |
| 8 | manufacturer | ❌ 不存在 | 🆕 新增 | 制造商（空值） |
| 9 | serialNumber | ❌ 不存在 | 🆕 新增 | 序列号（空值） |
| 10 | description | ❌ 不存在 | 🆕 新增 | 描述信息（空值） |

---

## 🔧 数据修复

### 1. 重复assetCode修复

发现并修复了6个重复的资产编码：

| 原编码 | 重复次数 | 修复方案 | 示例 |
|--------|----------|----------|------|
| BC02000577 | 2次 | 第二次添加-1后缀 | BC02000577-1 |
| BC02001007 | 2次 | 第二次添加-1后缀 | BC02001007-1 |
| BC02001023 | 2次 | 第二次添加-1后缀 | BC02001023-1 |
| BC02001200 | 2次 | 第二次添加-1后缀 | BC02001200-1 |
| BC02001201 | 2次 | 第二次添加-1后缀 | BC02001201-1 |
| BC02050041 | 2次 | 第二次添加-1后缀 | BC02050041-1 |

**修复详情**:
```csv
# 原始重复（修复前）
BC02000577,索铌格2300剥线机M 2,MECHANICAL,AD-Production,ACTIVE
BC02000577,索铌格2300剥线机,MECHANICAL,HDM-Production,ACTIVE

# 修复后（唯一）
BC02000577,索铌格2300剥线机M 2,MECHANICAL,AD-Production,ACTIVE,,,,,
BC02000577-1,索铌格2300剥线机,MECHANICAL,HDM-Production,ACTIVE,,,,,
```

**修复结果**: ✅ 656条资产全部拥有唯一的assetCode

---

## 📝 导入脚本更新

### 更新文件: `import-assets.js`

#### 主要变更

1. **CSV文件路径更新**
```javascript
// 变更前
const CSV_FILE = path.join(__dirname, 'asset_PR_0930_utf8.csv');

// 变更后
const CSV_FILE = path.join(__dirname, 'asset_PR_0930_standard.csv');
```

2. **字段解析扩展**
```javascript
// 变更前（5字段）
const { assetCode, name, category, status, location } = csvRow;

// 变更后（10字段）
const {
  assetCode,
  name,
  category,
  location,
  status,
  installDate,
  model,
  manufacturer,
  serialNumber,
  description,
} = csvRow;
```

3. **新增日期解析逻辑**
```javascript
// 解析安装日期
let parsedInstallDate = null;
if (installDate && installDate.trim()) {
  try {
    parsedInstallDate = new Date(installDate);
    if (isNaN(parsedInstallDate.getTime())) {
      parsedInstallDate = null;
    }
  } catch (e) {
    console.warn(`⚠️  无效的安装日期: ${installDate}`);
  }
}
```

4. **描述字段合并逻辑**
```javascript
// 构建描述字段（合并category和description）
let finalDescription = '';
if (category) {
  finalDescription = `类别: ${category}`;
}
if (description) {
  finalDescription = finalDescription
    ? `${finalDescription}\n${description}`
    : description;
}
```

5. **数据库写入更新**
```javascript
// 变更后：映射所有标准字段
await prisma.asset.create({
  data: {
    assetCode,
    name,
    description: finalDescription || null,
    model: model || null,
    manufacturer: manufacturer || null,
    serialNumber: serialNumber || null,
    location,
    locationId,
    installDate: parsedInstallDate,
    isActive,
  }
});
```

---

## 📚 文档更新

### 1. README.md 更新
- ✅ 更新目录结构说明
- ✅ 更新CSV字段映射表
- ✅ 添加标准10字段格式说明
- ✅ 添加CSV格式演变历史

### 2. 新增文档
- 🆕 `CSV_FORMAT_TEMPLATE.md` - CSV格式详细说明和示例
- 🆕 `CSV_FORMAT_ANALYSIS.md` - CSV与数据库对齐分析报告
- 🆕 `CHANGELOG_CSV_STANDARD.md` - 本变更日志

---

## ✅ 验证结果

### 数据完整性验证

```bash
=== 最终CSV验证 ===

1. 总记录数: 657 行 (含头部)
2. 重复检查: ✅ 0 个重复编码
3. 唯一assetCode总数: 656
4. 修复的记录（带-1后缀）: 6 条记录
5. 字段数验证: 10 个字段（标准10字段）
6. 位置统计:
   - AD-Production: 52 条
   - HC-Production: 78 条
   - HDM-Production: 5 条
   - HPC-Production: 147 条
   - RS-Production: 9 条
   - SCP-Production: 362 条
   - TMP-Production: 3 条
```

### 数据库对齐验证

| 数据库字段 | CSV字段 | 映射状态 | 备注 |
|-----------|---------|----------|------|
| assetCode | assetCode | ✅ 直接映射 | 唯一标识 |
| name | name | ✅ 直接映射 | 资产名称 |
| description | category + description | ✅ 合并映射 | 格式："类别: XXX" |
| model | model | ✅ 直接映射 | 当前为空 |
| manufacturer | manufacturer | ✅ 直接映射 | 当前为空 |
| serialNumber | serialNumber | ✅ 直接映射 | 当前为空 |
| location | location | ✅ 直接映射 | 字符串存储 |
| locationId | location | ✅ 查询映射 | 外键引用 |
| installDate | installDate | ✅ 解析映射 | 当前为空 |
| isActive | status | ✅ 转换映射 | ACTIVE→true |

---

## 🎯 后续工作建议

### 短期任务（高优先级）
1. ✅ **完成**: CSV标准化和数据修复
2. ⏳ **待办**: 实现后端CSV导入API（预览和执行）
3. ⏳ **待办**: 更新前端CSV模板下载（使用标准10字段格式）
4. ⏳ **待办**: 测试完整导入流程

### 中期任务（中优先级）
1. 📝 收集实际设备的扩展信息（型号、制造商、序列号等）
2. 📝 逐步填充当前空缺的字段数据
3. 📝 建立数据维护流程和责任人

### 长期任务（低优先级）
1. 💡 考虑添加Category表实现真正的分类关联
2. 💡 实现CSV导入历史记录和回滚功能
3. 💡 添加批量更新现有资产的功能

---

## 📞 联系信息

**变更执行人**: E-Maintenance Team
**变更日期**: 2025-10-01
**变更版本**: v1.0 (标准10字段格式)

---

## 🔗 相关文档

- [CSV格式模板说明](./asset-data/CSV_FORMAT_TEMPLATE.md)
- [CSV格式对比分析](./CSV_FORMAT_ANALYSIS.md)
- [初始化完整指南](./README.md)
- [导入脚本源码](./asset-data/import-assets.js)
- [数据库Schema](../../packages/database/prisma/schema.prisma)
