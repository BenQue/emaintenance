# 🚨 批量导入功能缺失分析与实施方案

## 📋 问题确认

### ❌ 当前状态

经过检查，发现以下问题：

#### 1. **前端已完成**
- ✅ 上传页面：`apps/web/app/dashboard/assets/import/page.tsx`
- ✅ CSV上传组件：`apps/web/components/import/CSVUploader.tsx`
- ✅ 预览组件：`apps/web/components/import/ImportPreview.tsx`
- ✅ 结果组件：`apps/web/components/import/ImportResult.tsx`
- ✅ 服务调用：`apps/web/lib/services/import-service.ts`

#### 2. **后端缺失（关键问题）**
- ❌ `POST /api/import/preview/assets` - 预览CSV数据的API **不存在**
- ❌ `POST /api/import/assets` - 执行批量导入的API **不存在**
- ✅ `GET /api/import/templates/assets` - 下载模板API **已存在**（但模板格式不对）

#### 3. **前端调用的API**
```typescript
// import-service.ts 调用的端点
async previewAssetCSV(file: File): Promise<ImportPreview> {
  // ❌ 调用 POST /api/import/preview/assets （不存在）
}

async importAssets(file: File): Promise<ImportResult> {
  // ❌ 调用 POST /api/import/assets （不存在）
}

async downloadAssetTemplate(): Promise<Blob> {
  // ✅ 调用 GET /api/import/templates/assets （已存在，但格式错误）
}
```

### 🎯 结论

**批量上传功能目前完全无法使用**，因为后端API缺失。

---

## 🔧 实施方案

### 阶段1: 更新CSV模板API（高优先级）

#### 文件：`apps/api/asset-service/src/controllers/AssetController.ts`

**当前模板（17字段）**：
```csv
assetCode,name,description,category,status,priority,location,department,manufacturer,model,serialNumber,purchaseDate,warrantyExpiry,purchasePrice,currentValue,specifications,maintenanceSchedule
```

**标准模板（10字段）**：
```csv
assetCode,name,category,location,status,installDate,model,manufacturer,serialNumber,description
```

#### 实施代码

```typescript
// AssetController.ts - 更新 downloadCSVTemplate 方法

async downloadCSVTemplate(req: Request, res: Response): Promise<void> {
  try {
    logger.info('CSV template download requested', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // 标准10字段CSV头部（对齐数据库模型）
    const headers = [
      'assetCode',        // 资产编码 (必填, 唯一)
      'name',            // 资产名称 (必填)
      'category',        // 类别 (可选: MECHANICAL/ELECTRICAL/SOFTWARE/OTHER)
      'location',        // 位置 (必填, 必须在Location表中存在)
      'status',          // 状态 (可选: ACTIVE/INACTIVE, 默认ACTIVE)
      'installDate',     // 安装日期 (可选: YYYY-MM-DD)
      'model',           // 设备型号 (可选)
      'manufacturer',    // 制造商 (可选)
      'serialNumber',    // 序列号 (可选)
      'description',     // 详细描述 (可选)
    ];

    // 示例数据行
    const sampleRows = [
      [
        'ASSET001',
        'Sample Equipment',
        'MECHANICAL',
        'HPC-Production',
        'ACTIVE',
        '2024-01-15',
        'Model-X2024',
        'ABC Manufacturing',
        'SN123456789',
        '这是一台示例设备'
      ],
      [
        'ASSET002',
        'Test Device',
        'ELECTRICAL',
        'AD-Production',
        'ACTIVE',
        '',
        '',
        '',
        '',
        ''
      ]
    ];

    // 生成CSV内容（包含BOM for Excel兼容性）
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...sampleRows.map(row => row.join(','))
    ].join('\n');

    // 设置响应头
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="assets_import_template.csv"');
    res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));

    logger.info('CSV template generated successfully', {
      filename: 'assets_import_template.csv',
      size: Buffer.byteLength(csvContent, 'utf8'),
    });

    res.status(200).send(csvContent);
  } catch (error) {
    logger.error('Failed to generate CSV template', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to generate CSV template',
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

### 阶段2: 实现CSV预览API（高优先级）

#### 新增Service方法

**文件：`apps/api/asset-service/src/services/AssetService.ts`**

```typescript
import Papa from 'papaparse'; // 需要安装: npm install papaparse @types/papaparse

/**
 * 解析并预览CSV文件
 */
async parseAndPreviewAssetCSV(fileBuffer: Buffer): Promise<{
  headers: string[];
  sampleData: any[];
  totalRows: number;
  validation: {
    valid: number;
    invalid: number;
    errors: Array<{
      row: number;
      field: string;
      error: string;
      data: any;
    }>;
  };
}> {
  // 解析CSV
  const csvText = fileBuffer.toString('utf-8');
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV解析错误: ${parsed.errors[0].message}`);
  }

  const rows = parsed.data as any[];
  const headers = parsed.meta.fields || [];

  // 验证必需字段
  const requiredFields = ['assetCode', 'name', 'location'];
  const missingFields = requiredFields.filter(f => !headers.includes(f));

  if (missingFields.length > 0) {
    throw new Error(`缺少必填字段: ${missingFields.join(', ')}`);
  }

  // 验证数据
  const errors: any[] = [];
  let validCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowErrors: string[] = [];

    // 验证assetCode
    if (!row.assetCode || !row.assetCode.trim()) {
      rowErrors.push('assetCode不能为空');
    }

    // 验证name
    if (!row.name || !row.name.trim()) {
      rowErrors.push('name不能为空');
    }

    // 验证location
    if (!row.location || !row.location.trim()) {
      rowErrors.push('location不能为空');
    } else {
      // 检查location是否存在
      const locationExists = await this.prisma.location.findFirst({
        where: { name: row.location.trim(), isActive: true }
      });
      if (!locationExists) {
        rowErrors.push(`位置不存在: ${row.location}`);
      }
    }

    // 验证assetCode唯一性
    if (row.assetCode && row.assetCode.trim()) {
      const exists = await this.prisma.asset.findUnique({
        where: { assetCode: row.assetCode.trim() }
      });
      if (exists) {
        rowErrors.push(`资产编码已存在: ${row.assetCode}`);
      }
    }

    // 验证日期格式
    if (row.installDate && row.installDate.trim()) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(row.installDate.trim())) {
        rowErrors.push('installDate格式错误，应为YYYY-MM-DD');
      }
    }

    if (rowErrors.length > 0) {
      rowErrors.forEach(error => {
        errors.push({
          row: i + 2, // CSV行号（考虑头部）
          field: '',
          error,
          data: row
        });
      });
    } else {
      validCount++;
    }
  }

  return {
    headers,
    sampleData: rows.slice(0, 10), // 返回前10行作为预览
    totalRows: rows.length,
    validation: {
      valid: validCount,
      invalid: errors.length,
      errors: errors.slice(0, 50), // 最多返回50个错误
    }
  };
}

/**
 * 批量导入资产
 */
async bulkImportAssets(fileBuffer: Buffer): Promise<{
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    data: any;
    error: string;
  }>;
  imported: any[];
}> {
  // 解析CSV
  const csvText = fileBuffer.toString('utf-8');
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const rows = parsed.data as any[];
  const results = {
    total: rows.length,
    successful: 0,
    failed: 0,
    errors: [] as any[],
    imported: [] as any[],
  };

  // 逐行导入
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      // 验证必填字段
      if (!row.assetCode?.trim() || !row.name?.trim() || !row.location?.trim()) {
        throw new Error('缺少必填字段');
      }

      // 获取locationId
      const location = await this.prisma.location.findFirst({
        where: { name: row.location.trim(), isActive: true }
      });

      if (!location) {
        throw new Error(`位置不存在: ${row.location}`);
      }

      // 解析日期
      let installDate = null;
      if (row.installDate && row.installDate.trim()) {
        installDate = new Date(row.installDate.trim());
        if (isNaN(installDate.getTime())) {
          installDate = null;
        }
      }

      // 构建描述
      let description = '';
      if (row.category && row.category.trim()) {
        description = `类别: ${row.category.trim()}`;
      }
      if (row.description && row.description.trim()) {
        description = description
          ? `${description}\n${row.description.trim()}`
          : row.description.trim();
      }

      // 创建资产
      const asset = await this.prisma.asset.create({
        data: {
          assetCode: row.assetCode.trim(),
          name: row.name.trim(),
          description: description || null,
          model: row.model?.trim() || null,
          manufacturer: row.manufacturer?.trim() || null,
          serialNumber: row.serialNumber?.trim() || null,
          location: row.location.trim(),
          locationId: location.id,
          installDate,
          isActive: row.status?.trim().toUpperCase() === 'ACTIVE' || !row.status,
        }
      });

      results.successful++;
      results.imported.push(asset);

    } catch (error) {
      results.failed++;
      results.errors.push({
        row: i + 2,
        data: row,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return results;
}
```

#### 新增Controller方法

**文件：`apps/api/asset-service/src/controllers/AssetController.ts`**

```typescript
import multer from 'multer';

// 配置文件上传（内存存储）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('只支持CSV文件'));
    }
  }
});

/**
 * 预览CSV文件
 * POST /api/import/preview/assets
 */
async previewAssetCSV(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: '未上传文件',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const preview = await this.assetService.parseAndPreviewAssetCSV(req.file.buffer);

    logger.info('CSV preview generated', {
      totalRows: preview.totalRows,
      validRows: preview.validation.valid,
      invalidRows: preview.validation.invalid,
    });

    res.json({
      success: true,
      data: preview,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error previewing CSV', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '预览失败',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 执行批量导入
 * POST /api/import/assets
 */
async importAssetsFromCSV(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: '未上传文件',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await this.assetService.bulkImportAssets(req.file.buffer);

    logger.info('Bulk import completed', {
      total: result.total,
      successful: result.successful,
      failed: result.failed,
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error importing assets', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '导入失败',
      timestamp: new Date().toISOString(),
    });
  }
}
```

#### 新增路由

**文件：`apps/api/asset-service/src/routes/index.ts`**

```typescript
import multer from 'multer';

// 配置文件上传中间件
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('只支持CSV文件'));
    }
  }
});

// 在现有路由之前添加以下路由

// CSV预览 - POST /api/import/preview/assets
router.post(
  '/import/preview/assets',
  authenticate,
  upload.single('file'),
  assetController.previewAssetCSV.bind(assetController)
);

// CSV导入 - POST /api/import/assets
router.post(
  '/import/assets',
  strictRateLimit,
  authenticate,
  requireSupervisor, // 仅SUPERVISOR和ADMIN可以批量导入
  upload.single('file'),
  assetController.importAssetsFromCSV.bind(assetController)
);

// CSV模板下载 - GET /api/import/templates/assets
// （已存在，需要更新为标准10字段格式）
```

---

### 阶段3: 安装依赖

```bash
cd apps/api/asset-service
npm install papaparse multer
npm install --save-dev @types/papaparse @types/multer
```

---

## 📋 实施检查清单

### 后端实施（asset-service）

- [ ] 安装依赖：`papaparse`, `multer`, `@types/papaparse`, `@types/multer`
- [ ] 更新 `AssetController.downloadCSVTemplate()` - 改为标准10字段模板
- [ ] 新增 `AssetService.parseAndPreviewAssetCSV()` - CSV解析和预览
- [ ] 新增 `AssetService.bulkImportAssets()` - 批量导入逻辑
- [ ] 新增 `AssetController.previewAssetCSV()` - 预览接口
- [ ] 新增 `AssetController.importAssetsFromCSV()` - 导入接口
- [ ] 更新 `routes/index.ts` - 添加预览和导入路由
- [ ] 配置multer文件上传中间件
- [ ] 添加适当的权限控制（requireSupervisor）
- [ ] 添加日志记录

### 前端验证（web）

- [x] ✅ CSV上传页面已完成
- [x] ✅ import-service API调用已完成
- [ ] 测试完整上传流程
- [ ] 验证错误处理和用户提示

### 测试验证

- [ ] 单元测试：CSV解析逻辑
- [ ] 单元测试：数据验证逻辑
- [ ] 集成测试：完整导入流程
- [ ] 测试用例：空文件、错误格式、重复编码、无效location
- [ ] 性能测试：大文件导入（500+行）

---

## 🎯 优先级建议

### 立即实施（P0）
1. ✅ 更新CSV模板为标准10字段格式
2. ✅ 实现CSV预览API
3. ✅ 实现CSV导入API

### 近期实施（P1）
4. 添加全面的错误处理和验证
5. 实现导入进度反馈
6. 添加批量导入事务处理（全部成功或全部回滚）

### 后续优化（P2）
7. 添加导入历史记录
8. 实现部分成功导入的恢复机制
9. 支持更大文件的流式处理

---

## 📝 相关文档

- [CSV标准格式说明](./asset-data/CSV_FORMAT_TEMPLATE.md)
- [CSV格式分析报告](./CSV_FORMAT_ANALYSIS.md)
- [标准CSV文件](./asset-data/asset_PR_0930_standard.csv)
- [前端导入页面](../apps/web/app/dashboard/assets/import/page.tsx)
- [导入服务](../apps/web/lib/services/import-service.ts)

---

**创建日期**: 2025-10-01
**状态**: 待实施
**优先级**: P0 (紧急)
