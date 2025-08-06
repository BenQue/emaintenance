# 资产管理功能修复故事集 (Asset Management Fix Stories)

## 背景
当前系统存在以下关键问题：
1. 除Web服务外，所有API服务无法正常启动
2. 用户管理功能无法使用（已决定暂时屏蔽）
3. API功能未完成，服务间调用存在问题
4. 需要优先恢复资产管理功能作为系统基础

## 执行策略
- **执行团队**: Dev (主导) + QA (测试) + SM (协调)
- **方法论**: 小步快跑，每个故事独立可测试
- **优先级**: P0-紧急修复 > P1-核心功能 > P2-增强功能

---

## 故事 FIX-001: 修复Asset Service启动问题 [P0-紧急]

### 用户故事
**作为** 系统管理员，
**我想要** asset-service能够正常启动并监听3003端口，
**以便于** 提供资产管理的基础服务能力。

### 验收标准
1. ✅ 服务使用 `npm run dev` 能够成功启动
2. ✅ 服务在 http://localhost:3003 正常响应
3. ✅ 健康检查端点 `/health` 返回200状态
4. ✅ 启动日志无错误，显示"Server running on port 3003"
5. ✅ 数据库连接成功建立

### 技术任务
```typescript
// 需要检查和修复的文件
- apps/api/asset-service/src/index.ts  // 入口文件
- apps/api/asset-service/src/config/database.ts  // 数据库配置
- apps/api/asset-service/package.json  // 依赖检查
- apps/api/asset-service/.env  // 环境变量
```

### 调试步骤
1. 检查 package.json 中的启动脚本
2. 验证所有依赖是否正确安装
3. 检查环境变量配置（DATABASE_URL, PORT等）
4. 对比 user-service 的配置作为参考
5. 修复 TypeScript 编译错误
6. 确保 Prisma client 正确生成

---

## 故事 FIX-002: 实现基础CRUD路由 [P0-紧急]

### 用户故事
**作为** API消费者，
**我想要** 访问标准的REST API端点来管理资产，
**以便于** 执行基本的增删改查操作。

### 验收标准
1. ✅ GET /api/assets - 返回资产列表
2. ✅ GET /api/assets/:id - 返回单个资产详情
3. ✅ POST /api/assets - 创建新资产
4. ✅ PUT /api/assets/:id - 更新资产信息
5. ✅ DELETE /api/assets/:id - 删除资产
6. ✅ 所有端点返回正确的HTTP状态码

### 实现规范
```typescript
// Controller层示例
export class AssetController {
  async getAllAssets(req: Request, res: Response) {
    // 实现分页: ?page=1&limit=10
    // 实现排序: ?sortBy=createdAt&order=desc
  }
  
  async getAssetById(req: Request, res: Response) {
    // 包含关联数据: maintenanceHistory
  }
  
  async createAsset(req: Request, res: Response) {
    // 验证必填字段: assetCode, name, category
  }
  
  async updateAsset(req: Request, res: Response) {
    // 部分更新支持 (PATCH语义)
  }
  
  async deleteAsset(req: Request, res: Response) {
    // 软删除实现 (设置deletedAt)
  }
}
```

---

## 故事 FIX-003: 集成认证与授权中间件 [P1-核心]

### 用户故事
**作为** 系统安全管理员，
**我想要** 所有资产API端点都经过身份验证和授权，
**以便于** 确保只有授权用户才能访问和修改资产数据。

### 验收标准
1. ✅ 所有API端点需要有效的JWT token
2. ✅ 无token或token无效返回401
3. ✅ 角色权限控制：
   - EMPLOYEE: 只读访问
   - TECHNICIAN: 读取和更新
   - SUPERVISOR/ADMIN: 完全访问
4. ✅ 权限不足返回403
5. ✅ Token从请求头 `Authorization: Bearer <token>` 获取

### 实现代码
```typescript
// middleware/auth.ts
export const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// middleware/authorize.ts  
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

---

## 故事 FIX-004: 修复Web前端资产管理页面 [P1-核心]

### 用户故事
**作为** 设备主管，
**我想要** 在Web端查看和管理所有资产，
**以便于** 维护准确的设备清单。

### 验收标准
1. ✅ 资产列表页面正常加载和显示数据
2. ✅ 表格支持分页（每页10/20/50条）
3. ✅ 添加资产表单正常工作
4. ✅ 编辑资产信息并保存成功
5. ✅ 删除确认对话框和删除功能
6. ✅ 加载状态和错误提示正确显示

### 需要修复的文件
```typescript
// 前端文件清单
- apps/web/app/dashboard/assets/page.tsx  // 主页面
- apps/web/lib/services/asset-service.ts  // API客户端
- apps/web/lib/stores/asset-store.ts  // 状态管理
- apps/web/components/assets/AssetTable.tsx  // 表格组件
- apps/web/components/assets/AssetForm.tsx  // 表单组件
```

### API集成示例
```typescript
// asset-service.ts
export class AssetService {
  private baseURL = 'http://localhost:3003/api';
  
  async getAssets(params?: AssetQueryParams) {
    const response = await fetch(`${this.baseURL}/assets`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });
    return response.json();
  }
  
  async createAsset(data: CreateAssetDto) {
    const response = await fetch(`${this.baseURL}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }
}
```

---

## 故事 FIX-005: 实现搜索和高级筛选 [P2-增强]

### 用户故事
**作为** 设备主管，
**我想要** 通过多种条件快速查找特定资产，
**以便于** 提高资产管理效率。

### 验收标准
1. ✅ 支持按资产编码、名称模糊搜索
2. ✅ 支持按类别、状态、位置筛选
3. ✅ 支持日期范围筛选（购买日期、最后维护日期）
4. ✅ 支持组合多个筛选条件
5. ✅ 筛选结果实时更新
6. ✅ 可保存常用筛选条件

### API端点增强
```typescript
// GET /api/assets 支持的查询参数
interface AssetQueryParams {
  // 搜索
  search?: string;  // 搜索 assetCode, name
  
  // 筛选
  category?: string;
  status?: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';
  location?: string;
  department?: string;
  
  // 日期范围
  purchasedFrom?: Date;
  purchasedTo?: Date;
  lastMaintenanceFrom?: Date;
  lastMaintenanceTo?: Date;
  
  // 分页和排序
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}
```

---

## 故事 FIX-006: 添加综合测试覆盖 [P1-核心]

### 用户故事
**作为** QA工程师，
**我想要** 完整的测试覆盖来验证资产管理功能，
**以便于** 确保系统稳定性和防止回归。

### 验收标准
1. ✅ 单元测试覆盖率 > 80%
2. ✅ API集成测试全部通过
3. ✅ 端到端测试覆盖关键流程
4. ✅ 性能测试基准建立
5. ✅ 测试报告自动生成

### 测试计划
```typescript
// 单元测试
describe('AssetService', () => {
  test('should create asset with valid data');
  test('should validate required fields');
  test('should handle duplicate assetCode');
});

// 集成测试
describe('Asset API Endpoints', () => {
  test('GET /api/assets returns paginated results');
  test('POST /api/assets requires authentication');
  test('DELETE /api/assets/:id requires ADMIN role');
});

// E2E测试
describe('Asset Management Flow', () => {
  test('Complete asset lifecycle: create -> update -> retire');
  test('Search and filter assets');
  test('Export asset list to CSV');
});
```

---

## 故事 FIX-007: 数据迁移和初始化 [P2-增强]

### 用户故事
**作为** 系统管理员，
**我想要** 导入现有的资产数据到系统中，
**以便于** 快速启用资产管理功能。

### 验收标准
1. ✅ 提供CSV导入功能
2. ✅ 数据验证和错误报告
3. ✅ 支持批量导入（1000+条记录）
4. ✅ 导入进度实时显示
5. ✅ 支持回滚错误的导入
6. ✅ 生成导入报告

### 实现要点
- 使用事务确保数据一致性
- 分批处理大量数据
- 提供导入模板下载
- 记录导入历史日志

---

## 执行计划

### 第一阶段：紧急修复（1-2天）
- [ ] FIX-001: 修复服务启动
- [ ] FIX-002: 实现基础CRUD
- [ ] FIX-003: 集成认证中间件

### 第二阶段：功能恢复（2-3天）
- [ ] FIX-004: 修复前端页面
- [ ] FIX-006: 添加基础测试

### 第三阶段：功能增强（3-5天）
- [ ] FIX-005: 搜索和筛选
- [ ] FIX-007: 数据导入
- [ ] 性能优化和压力测试

## 风险管理

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 数据库schema不兼容 | 高 | 中 | 提前验证schema，准备迁移脚本 |
| 前后端接口不匹配 | 中 | 高 | 先定义API契约，使用mock数据测试 |
| 认证集成失败 | 高 | 低 | 复用user-service的认证代码 |
| 性能问题 | 中 | 中 | 实现分页，添加缓存层 |

## 成功标准
1. Asset Service稳定运行24小时无崩溃
2. 所有CRUD操作响应时间 < 200ms
3. 前端操作流畅，无明显卡顿
4. 测试覆盖率达到80%
5. 支持至少1000个资产的管理

## 后续优化建议
- 实现资产二维码生成和打印
- 添加资产折旧计算
- 集成IoT设备实时监控
- 实现预防性维护提醒
- 添加资产调拨工作流