# 工单创建流程优化变更文档

## 变更摘要
对维修工单创建流程进行简化和优化，使其更适合一线操作人员使用，并提高数据准确性。

## 变更详情

### 1. 故障描述优化

#### 当前设计
- 用户必须选择具体的"报修类别"(category)
- 用户必须选择具体的"报修原因"(reason)
- 这要求一线操作人员进行故障原因分析

#### 新设计
- **移除**: 报修类别(category)和报修原因(reason)字段
- **新增**: 常见故障表现(faultSymptoms)字段 - 多选

#### 常见故障表现选项
```
- 设备停机 (Equipment Shutdown)
- 断电 (Power Outage)
- 异常噪音 (Abnormal Noise)
- 漏油/漏液 (Leakage)
- 过热 (Overheating)
- 振动异常 (Abnormal Vibration)
- 速度异常 (Speed Abnormality)
- 显示异常 (Display Error)
- 无法启动 (Cannot Start)
- 功能失效 (Function Failure)
- 其他 (Other)
```

#### 理由
- 一线操作人员难以进行准确的故障原因分析
- 操作人员只能观察和描述故障表现，不能判断根本原因
- 故障表现更客观，容易选择，减少误判
- 技术人员可以根据故障表现进行专业诊断

### 2. 位置信息自动化

#### 当前设计
- 用户手动输入或选择"具体位置"(location)字段
- 可能导致位置信息不准确或不一致

#### 新设计
- **自动填充**: 设备选择后，自动从设备主数据(Asset)带出位置信息
- **只读显示**: 位置字段变为只读，显示设备注册位置
- **补充说明**: 保留"补充位置信息"(additionalLocation)可选字段，用于特殊情况说明

#### 实现方式
```typescript
// 当用户选择设备后
onAssetSelect(assetId) {
  const asset = getAssetById(assetId);
  form.location = asset.location; // 自动填充
  form.locationReadOnly = true;   // 设为只读
}
```

#### 理由
- 确保位置信息的一致性和准确性
- 减少用户输入错误
- 设备主数据中的位置信息更可靠
- 简化用户操作流程

### 3. 优先级规则强化

#### 当前设计
- 优先级可自由选择：低(LOW)/中(MEDIUM)/高(HIGH)/紧急(URGENT)
- 没有选择限制或业务规则

#### 新设计
- **紧急(URGENT)优先级限制条件**:
  - 只有勾选"造成生产中断"(productionInterrupted)复选框时才可选择
  - 未勾选时，紧急选项禁用

#### 实现逻辑
```typescript
interface WorkOrderForm {
  productionInterrupted: boolean; // 新增字段
  priority: Priority;
  // ...
}

// UI逻辑
if (form.productionInterrupted) {
  enablePriority(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
} else {
  enablePriority(['LOW', 'MEDIUM', 'HIGH']);
  if (form.priority === 'URGENT') {
    form.priority = 'HIGH'; // 自动降级
  }
}
```

#### 理由
- 防止优先级滥用
- 确保紧急优先级用于真正的紧急情况
- 帮助管理层更好地分配资源
- 提高工单处理效率

## 数据模型变更

### WorkOrder 模型更新
```prisma
model WorkOrder {
  id                    String          @id @default(cuid())
  title                 String
  description           String?
  // category           String          // 移除
  // reason             String          // 移除
  faultSymptoms         String[]        // 新增：故障表现数组
  location              String?         // 从设备主数据自动获取
  additionalLocation    String?         // 新增：补充位置信息
  productionInterrupted Boolean         @default(false) // 新增
  priority              Priority        @default(MEDIUM)
  // ... 其他字段保持不变
}
```

## 影响分析

### 前端影响
1. **Web端 (Next.js)**:
   - 更新 WorkOrderCreateForm 组件
   - 修改表单验证逻辑
   - 更新 work-order-service API 调用

2. **移动端 (Flutter)**:
   - 更新 WorkOrderFormScreen 组件
   - 修改表单字段和验证
   - 更新 API 请求模型

### 后端影响
1. **work-order-service**:
   - 更新 WorkOrder TypeScript 接口
   - 修改创建工单的验证逻辑
   - 更新 Prisma 模型和数据库迁移

2. **数据库**:
   - 需要数据库迁移
   - 历史数据需要处理方案

### API 影响
- POST /api/work-orders 请求体变更
- GET /api/work-orders 响应体变更
- 需要版本控制策略

## 迁移策略

### 历史数据处理
1. 保留历史工单的 category 和 reason 字段数据
2. 为历史数据创建映射关系
3. 提供数据迁移脚本

### 版本兼容性
1. API 可以同时支持新旧字段（过渡期）
2. 前端根据 API 版本显示不同表单
3. 设置迁移截止日期

## 实施计划

### Phase 1 - 后端准备 (第1周)
- [ ] 更新 Prisma schema
- [ ] 创建数据库迁移脚本
- [ ] 更新 work-order-service API
- [ ] 添加向后兼容支持

### Phase 2 - 前端更新 (第2周)
- [ ] 更新 Web 端工单创建表单
- [ ] 更新移动端工单创建表单
- [ ] 更新工单显示组件
- [ ] 测试新流程

### Phase 3 - 数据迁移 (第3周)
- [ ] 执行历史数据迁移
- [ ] 验证数据完整性
- [ ] 移除旧字段支持
- [ ] 发布最终版本

## 风险评估

### 风险项
1. **数据迁移风险**: 历史数据映射可能不完整
   - 缓解措施: 保留原始字段数据，提供回滚方案

2. **用户培训风险**: 用户需要适应新界面
   - 缓解措施: 提供用户培训和操作指南

3. **集成风险**: 第三方系统可能依赖旧字段
   - 缓解措施: 提供过渡期和API版本管理

## 批准记录

| 角色 | 姓名 | 日期 | 状态 |
|-----|-----|-----|-----|
| 产品负责人 | Sarah (PO) | 2025-09-27 | 待批准 |
| 技术负责人 | - | - | 待批准 |
| 业务负责人 | - | - | 待批准 |

## 变更日志

| 日期 | 版本 | 描述 | 作者 |
|-----|-----|-----|-----|
| 2025-09-27 | 1.0 | 初始变更文档创建 | Sarah (PO) |

---

**注**: 本文档需要相关利益方审核批准后方可执行实施。