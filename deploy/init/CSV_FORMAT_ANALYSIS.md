# CSV格式对比分析报告

## 📊 概述
本文档分析当前生产环境资产CSV文件格式与系统数据库模型及前端批量上传功能的对齐情况。

**分析日期**: 2025-10-01
**当前CSV文件**: `deploy/init/asset-data/asset_PR_0930_utf8.csv`
**数据库Schema**: `packages/database/prisma/schema.prisma`
**前端上传页面**: `apps/web/app/dashboard/assets/import/page.tsx`
**后端API**: `apps/api/asset-service/src/controllers/AssetController.ts`

---

## 1️⃣ 当前生产CSV格式

### CSV文件结构
```csv
assetCode,name,category,status,location
BC02120086,11线UV 固化机,MECHANICAL,ACTIVE,HPC-Production
BC02120080,11线WG-8023C同轴剥线机,MECHANICAL,ACTIVE,HPC-Production
```

### 字段说明
| 字段名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| assetCode | String | ✅ | 资产唯一编码 | BC02120086 |
| name | String | ✅ | 资产名称 | 11线UV 固化机 |
| category | String | ❌ | 设备分类 | MECHANICAL |
| status | String | ❌ | 状态标识 | ACTIVE |
| location | String | ✅ | 位置信息 | HPC-Production |

### 数据特征
- **总记录数**: 656条资产记录
- **编码格式**: 混合格式（BC开头数字编码 + HPC开头字母编码）
- **位置格式**: "部门-Production" (使用"-"连接符)
- **唯一位置**: 7个位置（HPC-Production, AD-Production, HC-Production, HDM-Production, RS-Production, SCP-Production, TMP-Production）
- **字符编码**: UTF-8

---

## 2️⃣ 数据库Asset模型

### Prisma Schema定义
```prisma
model Asset {
  id              String   @id @default(cuid())
  assetCode       String   @unique          // ✅ 对应CSV: assetCode
  name            String                     // ✅ 对应CSV: name
  description     String?                    // ❌ CSV无此字段
  model           String?                    // ❌ CSV无此字段
  manufacturer    String?                    // ❌ CSV无此字段
  serialNumber    String?                    // ❌ CSV无此字段
  location        String?                    // ✅ 对应CSV: location (向后兼容字段)
  installDate     DateTime?                  // ❌ CSV无此字段
  isActive        Boolean  @default(true)    // ✅ 对应CSV: status (映射转换)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Foreign keys
  ownerId         String?                    // ❌ CSV无此字段
  administratorId String?                    // ❌ CSV无此字段
  locationId      String?                    // ⚠️ 需要映射Location表

  // Relations
  owner           User?       @relation("AssetOwner")
  administrator   User?       @relation("AssetAdministrator")
  locationRef     Location?   @relation(fields: [locationId])
  workOrders      WorkOrder[]
  maintenanceHistory MaintenanceHistory[]
}

model Location {
  id          String   @id @default(cuid())
  name        String   @unique                // ✅ 对应CSV: location
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  assets      Asset[]
}
```

### 字段映射关系

| 数据库字段 | CSV字段 | 映射关系 | 备注 |
|-----------|---------|----------|------|
| assetCode | assetCode | ✅ 直接映射 | 必须唯一 |
| name | name | ✅ 直接映射 | 资产名称 |
| description | category | ⚠️ 间接映射 | `category`值存入`description`字段 |
| location | location | ✅ 直接映射 | 向后兼容字段 |
| locationId | location | ⚠️ 需要查询 | 通过location name查询Location表获取ID |
| isActive | status | ⚠️ 转换映射 | status="ACTIVE" → isActive=true |
| model | - | ❌ 无映射 | CSV未提供，数据库允许为null |
| manufacturer | - | ❌ 无映射 | CSV未提供，数据库允许为null |
| serialNumber | - | ❌ 无映射 | CSV未提供，数据库允许为null |
| installDate | - | ❌ 无映射 | CSV未提供，数据库允许为null |
| ownerId | - | ❌ 无映射 | CSV未提供，数据库允许为null |
| administratorId | - | ❌ 无映射 | CSV未提供，数据库允许为null |

---

## 3️⃣ 后端CSV模板格式

### API生成的模板 (`downloadCSVTemplate`)

```csv
assetCode,name,description,category,status,priority,location,department,manufacturer,model,serialNumber,purchaseDate,warrantyExpiry,purchasePrice,currentValue,specifications,maintenanceSchedule
ASSET001,Sample Equipment,This is a sample equipment for demonstration,MECHANICAL,ACTIVE,MEDIUM,Workshop A,Production,ABC Manufacturing,Model-X2024,SN123456789,2024-01-15,2026-01-15,50000,45000,"{""power"": ""220V""}","{""frequency"": ""monthly""}"
```

### 模板字段列表（17个字段）
1. assetCode ✅
2. name ✅
3. description ⚠️
4. category ⚠️
5. status ⚠️
6. priority ❌ (数据库无此字段)
7. location ✅
8. department ⚠️ (已在生产CSV中合并到location)
9. manufacturer ⚠️
10. model ⚠️
11. serialNumber ⚠️
12. purchaseDate ❌ (数据库字段为installDate)
13. warrantyExpiry ❌ (数据库无此字段)
14. purchasePrice ❌ (数据库无此字段)
15. currentValue ❌ (数据库无此字段)
16. specifications ❌ (数据库无此字段)
17. maintenanceSchedule ❌ (数据库无此字段)

---

## 4️⃣ 问题分析

### 🔴 严重问题

#### 1. CSV模板与数据库模型严重不匹配
**问题描述**:
- 后端API生成的CSV模板包含17个字段
- 数据库Asset模型只支持其中6个字段（assetCode, name, description, location, model, manufacturer, serialNumber）
- 模板中的9个字段在数据库中不存在：
  - `priority` - 数据库无此字段
  - `category` - 应该存入description字段
  - `department` - 应该合并到location字段
  - `purchaseDate` - 数据库字段为installDate
  - `warrantyExpiry` - 数据库无此字段
  - `purchasePrice` - 数据库无此字段
  - `currentValue` - 数据库无此字段
  - `specifications` - 数据库无此字段
  - `maintenanceSchedule` - 数据库无此字段

**影响**:
- ❌ 用户按照模板填写数据后，上传时会发现大量字段无法导入
- ❌ 导致用户困惑和数据丢失
- ❌ 前端预览功能会显示错误的字段映射

**建议修复**:
1. 重新设计CSV模板，仅包含数据库实际支持的字段
2. 移除所有不存在的字段（priority, warrantyExpiry, purchasePrice, currentValue, specifications, maintenanceSchedule）
3. 将purchaseDate改为installDate
4. 添加字段说明文档

---

#### 2. 缺少CSV导入预览和执行API
**问题描述**:
- 前端调用的API端点不存在：
  - `POST /api/import/preview/assets` - 预览CSV数据
  - `POST /api/import/assets` - 执行导入
- 后端仅实现了模板下载功能 `GET /api/import/templates/assets`
- 缺少CSV解析、验证和批量导入逻辑

**影响**:
- ❌ 前端批量上传功能完全无法使用
- ❌ 用户无法预览导入数据
- ❌ 无法批量创建资产

**建议修复**:
创建完整的导入API实现，包括：
```typescript
// 新增Controller方法
async previewAssetCSV(req: Request, res: Response): Promise<void>
async importAssets(req: Request, res: Response): Promise<void>

// 新增Service方法
async parseAssetCSV(file: File): Promise<ImportPreview>
async validateAssetData(rows: any[]): Promise<ValidationResult>
async bulkCreateAssets(validatedData: CreateAssetData[]): Promise<ImportResult>
```

---

#### 3. Location外键关系处理不完整
**问题描述**:
- CSV包含location字符串（如"HPC-Production"）
- 数据库需要locationId外键引用Location表
- 当前没有location名称到locationId的自动映射逻辑
- 初始化脚本创建了7个Location记录，但导入脚本未验证Location是否存在

**影响**:
- ⚠️ 导入时可能创建无效的locationId引用
- ⚠️ 如果Location记录未预先创建，导入会失败
- ⚠️ location字段和locationId字段可能不一致

**建议修复**:
1. 在导入前验证所有location值在Location表中存在
2. 自动查询Location表获取locationId
3. 在初始化脚本执行顺序中确保Location表先于Asset表填充
4. 添加location验证和错误提示

---

### 🟡 中等问题

#### 4. Category字段处理不明确
**问题描述**:
- 当前CSV的category字段值（MECHANICAL）存入description字段
- 这是临时解决方案，未来可能需要独立的Category表关联
- 缺少category值的验证和规范化

**影响**:
- ⚠️ description字段语义不清晰（混合了分类和描述信息）
- ⚠️ 未来扩展category功能时需要数据迁移

**建议**:
1. 短期：在description中添加前缀标识 `类别: MECHANICAL`
2. 长期：考虑添加Category表和外键关联
3. 统一category值的枚举定义

---

#### 5. Status字段映射逻辑未实现
**问题描述**:
- CSV的status字段（ACTIVE/INACTIVE）需要映射到isActive布尔值
- 当前导入脚本中有映射逻辑，但后端API未实现
- 缺少status值的验证

**影响**:
- ⚠️ 如果用户输入非标准status值，导入可能失败
- ⚠️ 映射逻辑重复实现（前端脚本有，后端API无）

**建议**:
1. 在后端API中统一实现status → isActive映射
2. 添加status值验证（仅允许ACTIVE/INACTIVE）
3. 提供清晰的错误提示

---

### 🟢 轻微问题

#### 6. 字段命名不一致
- CSV模板使用`department`字段
- 生产CSV已合并为`location`字段
- 可能导致用户混淆

#### 7. 缺少字段验证规则文档
- assetCode格式规范未定义
- location值必须预先存在于Location表
- name字段长度限制未说明

---

## 5️⃣ 对齐建议

### 🎯 推荐的标准CSV格式

```csv
assetCode,name,category,location,status,installDate,model,manufacturer,serialNumber,description
BC02120086,11线UV 固化机,MECHANICAL,HPC-Production,ACTIVE,2024-01-15,Model-X,ABC Corp,SN123456,设备描述信息
```

### 字段定义

| 字段名 | 必填 | 格式 | 数据库映射 | 说明 |
|--------|------|------|------------|------|
| assetCode | ✅ | 字符串 | assetCode | 唯一资产编码，不能重复 |
| name | ✅ | 字符串 | name | 资产名称 |
| category | ❌ | 枚举 | description | 分类：MECHANICAL/ELECTRICAL/SOFTWARE/OTHER |
| location | ✅ | 字符串 | location, locationId | 必须在Location表中存在 |
| status | ❌ | 枚举 | isActive | ACTIVE或INACTIVE，默认ACTIVE |
| installDate | ❌ | 日期 | installDate | 格式：YYYY-MM-DD |
| model | ❌ | 字符串 | model | 设备型号 |
| manufacturer | ❌ | 字符串 | manufacturer | 制造商 |
| serialNumber | ❌ | 字符串 | serialNumber | 序列号 |
| description | ❌ | 字符串 | description | 详细描述（与category合并） |

---

## 6️⃣ 实施计划

### 阶段1: 修复后端API（高优先级）

#### 1.1 更新CSV模板生成
```typescript
// AssetController.ts - downloadCSVTemplate()
const headers = [
  'assetCode',      // 必填
  'name',           // 必填
  'category',       // 可选
  'location',       // 必填
  'status',         // 可选
  'installDate',    // 可选
  'model',          // 可选
  'manufacturer',   // 可选
  'serialNumber',   // 可选
  'description',    // 可选
];

const sampleRow = [
  'ASSET001',
  'Sample Equipment',
  'MECHANICAL',
  'HPC-Production',
  'ACTIVE',
  '2024-01-15',
  'Model-X',
  'ABC Manufacturing',
  'SN123456',
  'Equipment description'
];
```

#### 1.2 实现CSV预览API
```typescript
// 新增路由
router.post(
  '/import/preview/assets',
  authenticate,
  upload.single('file'),
  assetController.previewAssetCSV.bind(assetController)
);

// 新增Controller方法
async previewAssetCSV(req: Request, res: Response): Promise<void> {
  // 1. 解析CSV文件
  // 2. 验证字段格式
  // 3. 检查location是否存在
  // 4. 检查assetCode是否重复
  // 5. 返回预览数据和验证结果
}
```

#### 1.3 实现CSV导入API
```typescript
// 新增路由
router.post(
  '/import/assets',
  authenticate,
  requireSupervisor,
  upload.single('file'),
  assetController.importAssets.bind(assetController)
);

// 新增Controller方法
async importAssets(req: Request, res: Response): Promise<void> {
  // 1. 解析CSV文件
  // 2. 验证所有数据
  // 3. 查询locationId
  // 4. 批量创建资产
  // 5. 返回导入结果（成功/失败统计）
}
```

---

### 阶段2: 增强数据验证（中优先级）

#### 2.1 Location预验证
```typescript
// AssetService.ts
async validateLocations(locationNames: string[]): Promise<Map<string, string>> {
  const locations = await this.prisma.location.findMany({
    where: { name: { in: locationNames } }
  });

  const locationMap = new Map(locations.map(loc => [loc.name, loc.id]));
  const missing = locationNames.filter(name => !locationMap.has(name));

  if (missing.length > 0) {
    throw new Error(`以下位置不存在: ${missing.join(', ')}`);
  }

  return locationMap;
}
```

#### 2.2 AssetCode唯一性验证
```typescript
async validateAssetCodes(codes: string[]): Promise<string[]> {
  const existing = await this.prisma.asset.findMany({
    where: { assetCode: { in: codes } },
    select: { assetCode: true }
  });

  return existing.map(a => a.assetCode);
}
```

---

### 阶段3: 优化用户体验（低优先级）

#### 3.1 添加导入进度提示
- 实现流式CSV解析
- 返回实时导入进度
- 支持大文件分批导入

#### 3.2 增强错误提示
- 为每个验证错误提供具体行号和字段名
- 提供修复建议
- 支持导出错误记录CSV

#### 3.3 添加导入历史记录
- 记录每次导入操作
- 支持查看导入日志
- 支持回滚功能

---

## 7️⃣ 总结

### ✅ 当前状态
- 前端批量上传UI已完成
- CSV模板下载API已实现
- 数据库模型支持基本字段
- 初始化脚本已准备好656条生产数据

### ❌ 主要问题
1. **CSV模板字段过多且不匹配** - 17个字段中9个数据库不支持
2. **缺少导入API实现** - 预览和执行导入API不存在
3. **Location外键映射未实现** - 缺少location name到ID的自动映射

### 🎯 关键行动项
1. ⚠️ **紧急**: 重新设计CSV模板，移除不支持的字段
2. ⚠️ **紧急**: 实现previewAssetCSV和importAssets API
3. ⚠️ **高优先级**: 实现Location验证和ID映射逻辑
4. ⚠️ **中优先级**: 统一category和status字段处理
5. 💡 **建议**: 添加完整的数据验证和错误提示

---

## 📚 参考文档
- 数据库Schema: `packages/database/prisma/schema.prisma`
- 前端上传页面: `apps/web/app/dashboard/assets/import/page.tsx`
- 后端Controller: `apps/api/asset-service/src/controllers/AssetController.ts`
- 生产CSV数据: `deploy/init/asset-data/asset_PR_0930_utf8.csv`
- 初始化文档: `deploy/init/README.md`
