# 资产批量导入功能文档

## 功能概述

资产批量导入功能允许管理员通过上传标准格式的CSV文件快速录入大量设备资产信息。系统提供完整的"下载模板 → 上传预览 → 确认导入"工作流。

## 标准CSV格式（10字段）

### 字段说明

| 字段名 | 中文名 | 必填 | 说明 |
|--------|--------|------|------|
| assetCode | 资产编码 | ✅ | 必须唯一，建议使用有意义的编码（如：ASSET001） |
| name | 资产名称 | ✅ | 设备名称 |
| category | 类别 | ❌ | MECHANICAL/ELECTRICAL/SOFTWARE/OTHER |
| location | 位置 | ✅ | 必须在Location表中存在（如：HPC-Production） |
| status | 状态 | ❌ | ACTIVE/INACTIVE，默认ACTIVE |
| installDate | 安装日期 | ❌ | 格式：YYYY-MM-DD |
| model | 设备型号 | ❌ | 型号信息 |
| manufacturer | 制造商 | ❌ | 生产厂商 |
| serialNumber | 序列号 | ❌ | 设备序列号 |
| description | 详细描述 | ❌ | 设备详细描述 |

### CSV示例

```csv
assetCode,name,category,location,status,installDate,model,manufacturer,serialNumber,description
ASSET001,Sample Equipment,MECHANICAL,HPC-Production,ACTIVE,2024-01-15,Model-X2024,ABC Manufacturing,SN123456789,这是一台示例设备
ASSET002,Test Device,ELECTRICAL,AD-Production,ACTIVE,,,,,
```

## API接口文档

### 1. 下载CSV模板

**端点**: `GET /api/import/templates/assets`

**权限**: 所有认证用户

**响应**: CSV文件（包含BOM头和2行示例数据）

**示例**:
```bash
curl -X GET "http://localhost:3003/api/import/templates/assets" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o asset_template.csv
```

---

### 2. 预览CSV文件

**端点**: `POST /api/import/preview/assets`

**权限**: 所有认证用户

**请求**: `multipart/form-data`
- `file`: CSV文件（最大5MB）

**响应**:
```json
{
  "success": true,
  "data": {
    "headers": ["assetCode", "name", "category", ...],
    "sampleData": [
      { "assetCode": "ASSET001", "name": "Sample Equipment", ... }
    ],
    "totalRows": 10,
    "validation": {
      "valid": 8,
      "invalid": 2,
      "errors": [
        {
          "row": 3,
          "field": "",
          "error": "资产编码已存在: ASSET001",
          "data": { "assetCode": "ASSET001", ... }
        }
      ]
    }
  }
}
```

**验证规则**:
- ✅ 必填字段检查（assetCode, name, location）
- ✅ assetCode唯一性验证
- ✅ location存在性验证
- ✅ 日期格式验证（YYYY-MM-DD）
- ✅ 最多返回前10行预览数据
- ✅ 最多返回50个错误详情

**示例**:
```bash
curl -X POST "http://localhost:3003/api/import/preview/assets" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@assets.csv"
```

---

### 3. 批量导入资产

**端点**: `POST /api/import/assets`

**权限**: SUPERVISOR, ADMIN

**限流**: 50次/15分钟（生产环境）

**请求**: `multipart/form-data`
- `file`: CSV文件（最大5MB）

**响应**:
```json
{
  "success": true,
  "data": {
    "total": 10,
    "successful": 8,
    "failed": 2,
    "errors": [
      {
        "row": 3,
        "data": { "assetCode": "ASSET001", ... },
        "error": "资产编码已存在"
      }
    ],
    "imported": [
      { "id": "uuid", "assetCode": "ASSET001", ... }
    ]
  }
}
```

**导入逻辑**:
1. 逐行解析CSV数据
2. 验证必填字段
3. 查找locationId（通过location名称）
4. 解析安装日期（可选）
5. 合并category和description字段
6. 创建资产记录
7. 返回成功/失败统计和错误详情

**示例**:
```bash
curl -X POST "http://localhost:3003/api/import/assets" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@assets.csv"
```

---

## 前端集成

### 页面路由
`/dashboard/assets/import`

### 工作流程

#### 1. 上传步骤
- 显示使用说明（标准10字段格式）
- 提供"下载CSV模板"按钮
- 上传文件（CSV，最大5MB）
- 自动调用预览API

#### 2. 预览步骤
- 显示导入摘要（总条数、有效、无效、错误数）
- 展示前5行数据预览
- 列出所有验证错误（行号+错误详情）
- 只有无错误时才允许确认导入

#### 3. 结果步骤
- 显示导入结果统计
- 列出失败的行和原因
- 提供"查看设备列表"和"关闭"操作

### 服务调用

```typescript
import { importService } from '@/lib/services/import-service';

// 下载模板
const blob = await importService.downloadAssetTemplate();
importService.createDownloadLink(blob, 'asset_template.csv');

// 预览CSV
const preview = await importService.previewAssetCSV(file);

// 执行导入
const result = await importService.importAssets(file);
```

---

## 数据库映射

CSV字段到数据库字段的映射关系：

| CSV字段 | 数据库字段 | 处理逻辑 |
|---------|-----------|----------|
| assetCode | assetCode | 直接映射，trim() |
| name | name | 直接映射，trim() |
| category | description | 合并到description："类别: MECHANICAL" |
| location | location + locationId | 查找Location表获取ID |
| status | isActive | "ACTIVE" → true, 其他 → false |
| installDate | installDate | 解析为Date对象 |
| model | model | 直接映射，trim() |
| manufacturer | manufacturer | 直接映射，trim() |
| serialNumber | serialNumber | 直接映射，trim() |
| description | description | 合并到description尾部 |

---

## 错误处理

### 常见错误及解决方案

| 错误信息 | 原因 | 解决方案 |
|---------|------|----------|
| "未上传文件" | 请求未包含文件 | 确保form-data包含file字段 |
| "只支持CSV文件" | 文件类型不正确 | 上传.csv文件 |
| "缺少必填字段" | CSV缺少必需列 | 确保包含assetCode, name, location |
| "资产编码已存在" | assetCode重复 | 使用唯一的资产编码 |
| "位置不存在" | location未在数据库中 | 使用系统中存在的位置名称 |
| "installDate格式错误" | 日期格式不正确 | 使用YYYY-MM-DD格式 |

---

## 测试指南

### 1. 准备测试数据

使用提供的测试CSV文件：
```
deploy/init/asset-data/test_import.csv
```

### 2. 手动测试流程

#### Step 1: 下载模板
```bash
# 访问页面
http://localhost:3000/dashboard/assets/import

# 点击"下载CSV模板"
# 验证文件包含10个字段和2行示例数据
```

#### Step 2: 上传预览
```bash
# 上传test_import.csv
# 验证显示：
# - 总条数: 3
# - 有效条数: 3（如果location存在）
# - 预览数据包含所有10个字段
```

#### Step 3: 确认导入
```bash
# 点击"确认导入"
# 验证导入结果
# 检查数据库中是否创建了3条记录
```

### 3. API测试（使用curl）

```bash
# 1. 下载模板
curl -X GET "http://localhost:3003/api/import/templates/assets" \
  -H "Authorization: Bearer $TOKEN" \
  -o template.csv

# 2. 预览
curl -X POST "http://localhost:3003/api/import/preview/assets" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_import.csv"

# 3. 导入
curl -X POST "http://localhost:3003/api/import/assets" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_import.csv"
```

### 4. 验证数据库

```sql
-- 检查导入的资产
SELECT * FROM "Asset"
WHERE "assetCode" LIKE 'TEST%'
ORDER BY "createdAt" DESC;

-- 检查location关联
SELECT a."assetCode", a."name", l."name" as location
FROM "Asset" a
JOIN "Location" l ON a."locationId" = l."id"
WHERE a."assetCode" LIKE 'TEST%';
```

---

## 性能优化建议

### 当前实现
- 逐行验证和导入
- 每行查询location表
- 适用于中小规模导入（<100条）

### 大规模导入优化（>1000条）
1. **批量验证**: 一次性加载所有location到内存
2. **事务处理**: 使用Prisma事务批量插入
3. **异步处理**: 超过1000条启用后台任务
4. **进度反馈**: WebSocket实时进度更新

---

## 安全性考虑

✅ **已实现**:
- JWT认证保护所有接口
- 角色权限控制（导入需要SUPERVISOR+）
- 文件大小限制（5MB）
- 文件类型验证（仅CSV）
- 速率限制（50次/15分钟）

⚠️ **建议增强**:
- CSV注入防护（单元格内容转义）
- 病毒扫描集成
- 导入操作审计日志
- IP白名单限制

---

## 维护和监控

### 日志记录

所有导入操作会记录到Winston日志：
```javascript
logger.info('CSV preview generated', {
  totalRows: preview.totalRows,
  validRows: preview.validation.valid,
  invalidRows: preview.validation.invalid,
});

logger.info('Bulk import completed', {
  total: result.total,
  successful: result.successful,
  failed: result.failed
});
```

### 监控指标

建议监控以下指标：
- 导入请求频率
- 平均导入耗时
- 成功率
- 常见错误类型

---

## 相关文件

### 后端
- [AssetController.ts:447-526](apps/api/asset-service/src/controllers/AssetController.ts#L447-L526) - CSV模板下载
- [AssetController.ts:732-812](apps/api/asset-service/src/controllers/AssetController.ts#L732-L812) - 预览和导入接口
- [AssetService.ts:497-733](apps/api/asset-service/src/services/AssetService.ts#L497-L733) - CSV解析和导入逻辑
- [routes/index.ts:67-83](apps/api/asset-service/src/routes/index.ts#L67-L83) - 路由配置

### 前端
- [page.tsx](apps/web/app/dashboard/assets/import/page.tsx) - 导入页面
- [import-service.ts](apps/web/lib/services/import-service.ts) - API调用服务
- [ImportPreview.tsx](apps/web/components/import/ImportPreview.tsx) - 预览组件
- [ImportResult.tsx](apps/web/components/import/ImportResult.tsx) - 结果组件

### 配置
- [CSV_FORMAT_TEMPLATE.md](deploy/init/asset-data/CSV_FORMAT_TEMPLATE.md) - 字段格式说明
- [CHANGELOG_CSV_STANDARD.md](deploy/init/CHANGELOG_CSV_STANDARD.md) - 变更日志
- [test_import.csv](deploy/init/asset-data/test_import.csv) - 测试数据

---

## 更新历史

**2025-10-01**
- ✅ 实现标准10字段CSV格式
- ✅ 后端API完整实现（模板下载、预览、导入）
- ✅ 前端页面集成和优化
- ✅ 完整的验证和错误处理
- ✅ 创建测试数据和文档
