# Story: userlogin-fix

## 故事标题
用户服务启动修复 - Brownfield Addition

## 用户故事

**作为** 系统管理员,
**我想要** 用户服务能够在端口3001正常启动并响应请求,
**以便于** 所有用户认证和管理功能能够正常工作，支撑整个系统的登录流程。

## 故事背景

**现有系统集成:**

- 集成对象: E-maintenance系统的用户管理微服务
- 技术栈: Node.js + Express + TypeScript + Prisma ORM + PostgreSQL
- 遵循模式: Controller-Service-Repository分层架构
- 接触点: 端口3001、JWT认证、数据库连接、Web前端登录页面

## 验收标准

**功能需求:**
1. 用户服务通过 `npm run dev` 命令能够成功启动
2. 服务在 http://localhost:3001 正常响应
3. 健康检查端点 `/health` 返回200状态和正确的JSON响应

**集成需求:**
4. 现有的认证路由 `/api/auth` 保持可访问
5. 用户管理路由 `/api/users` 正常工作
6. 与PostgreSQL数据库的连接保持稳定

**质量需求:**
7. TypeScript编译错误全部解决
8. 启动日志显示清晰的服务状态信息
9. 现有的认证功能无回归问题

## 技术备注

- **集成方法:** 修复UserRepository.ts中的TypeScript类型不匹配问题
- **现有模式参考:** 参照asset-service的工作配置和类型定义
- **关键约束:** 
  - 必须保持端口3001不变
  - 不能破坏现有的Prisma schema定义
  - 必须保持与前端登录组件的API契约

## 完成定义

- [ ] TypeScript编译错误已解决（特别是UserRepository.ts:169行的类型转换错误）
- [ ] 用户服务成功启动并监听3001端口
- [ ] 健康检查端点正常响应
- [ ] 所有认证和用户管理API端点可访问
- [ ] 现有测试用例通过
- [ ] 服务启动日志清晰且无错误信息

## 风险与兼容性检查

**最小风险评估:**
- **主要风险:** 修复类型问题时可能影响现有的用户数据查询功能
- **缓解措施:** 仔细检查Prisma select查询，确保返回的字段与期望的类型完全匹配
- **回滚:** 保留当前UserRepository.ts的备份，可快速恢复

**兼容性验证:**
- [x] 不会对现有API产生破坏性更改
- [x] 数据库更改为零（仅修复代码类型问题）
- [x] UI更改为零（纯后端修复）
- [x] 性能影响可忽略（仅类型修复）

## 验证清单

**范围验证:**
- [x] 故事可以在一个开发会话中完成（预计2小时内）
- [x] 集成方法简单直接（类型修复）
- [x] 完全遵循现有模式
- [x] 无需设计或架构工作

**清晰度检查:**
- [x] 故事需求明确无歧义
- [x] 集成点明确指定（端口3001，认证路由）
- [x] 成功标准可测试（服务启动，健康检查响应）
- [x] 回滚方法简单（文件恢复）

## 技术细节

**已识别的具体问题:**
```
错误位置: src/repositories/UserRepository.ts:169
错误类型: TS2352 - 类型转换错误
具体问题: Prisma查询返回的类型缺少 'password' 和 'domainAccount' 字段
```

**解决方案路径:**
1. 检查UserRepository.ts第169行的update方法
2. 修复select查询，确保包含所有必需的字段
3. 或者调整返回类型定义，使其与实际查询结果匹配
4. 确保类型定义与Prisma schema保持一致

**相关文件:**
- `/apps/api/user-service/src/repositories/UserRepository.ts` - 需要修复的主文件
- `/packages/database/prisma/schema.prisma` - 用户模型定义参考
- `/apps/api/user-service/src/types/User.ts` - 用户类型定义
- `/apps/api/user-service/src/index.ts` - 服务入口文件

## 成功指标

**启动成功标志:**
- 服务启动日志显示: `User service running on port 3001`
- 健康检查响应: `{"status":"ok","service":"user-service"}`
- 无TypeScript编译错误输出
- 进程保持稳定运行

**功能验证:**
- GET `/health` 返回200状态
- POST `/api/auth/login` 端点可访问
- GET `/api/users` 端点可访问（需认证）

## 优先级
**P0 - 紧急** - 阻塞所有用户登录和认证功能

## 估算
**开发时间:** 1-2小时
**复杂度:** 简单（类型修复）
**风险等级:** 低

---

*创建日期: 2025-08-06*
*创建者: Sarah (Product Owner)*
*状态: ✅ 已完成*

## 完成记录

**完成日期**: 2025-08-06  
**解决方案**: 修复了三个TypeScript编译错误
1. UserRepository.ts:169 - 修复select查询缺失字段
2. jwt.ts:17 - 修复JWT配置类型问题  
3. errorHandler.ts - 修复ZodError属性引用错误

**验证结果**: 
- ✅ 用户服务正常启动在端口3001
- ✅ 健康检查端点正常响应
- ✅ 所有认证功能恢复正常
- ✅ 用户登录流程完全可用