# E-Maintenance System

企业设备维修管理程序 - Enterprise Equipment Maintenance Management System

## 项目结构

这是一个基于 Turborepo 的 Monorepo 项目，包含以下应用和包：

### Applications (apps/)
- **web**: Next.js Web 应用 (React/Next.js)
- **mobile**: Flutter 移动应用
- **api/user-service**: 用户管理微服务
- **api/work-order-service**: 工单管理微服务  
- **api/asset-service**: 资产管理微服务

### Packages (packages/)
- **database**: 共享的 Prisma 数据库配置
- **typescript-config**: 共享的 TypeScript 配置
- **eslint-config**: 共享的 ESLint 配置

## 技术栈

- **Frontend**: Next.js 14+, React 18+
- **Mobile**: Flutter 3.22+
- **Backend**: Node.js 20.x, Express.js
- **Database**: PostgreSQL 16+, Prisma ORM 5+
- **Build Tool**: Turborepo
- **Language**: TypeScript

## 开发环境要求

- Node.js v20.x
- Docker 和 Docker Compose
- PostgreSQL 16+ (推荐通过 Docker)
- Flutter SDK 3.22+
- Redis (用于缓存，可选)
- Git

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 环境配置

复制环境变量示例文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接等信息。

### 3. 数据库设置

启动 PostgreSQL 数据库（使用 Docker）：

```bash
docker run --name postgres-emaintenance -e POSTGRES_PASSWORD=password -e POSTGRES_DB=emaintenance -p 5432:5432 -d postgres:16
```

生成 Prisma 客户端：

```bash
npm run db:generate
```

推送数据库架构：

```bash
npm run db:push
```

种子数据（可选）：

```bash
npm run db:seed
```

### 4. 开发

启动所有应用的开发模式：

```bash
npm run dev
```

或单独启动特定应用：

```bash
# Web 应用
cd apps/web && npm run dev

# 用户服务
cd apps/api/user-service && npm run dev

# Flutter 应用
cd apps/mobile && flutter run
```

## 可用脚本

- `npm run build` - 构建所有应用
- `npm run dev` - 启动开发模式
- `npm run lint` - 代码检查
- `npm run format` - 代码格式化
- `npm run test` - 运行测试
- `npm run clean` - 清理构建文件

### 数据库脚本

- `npm run db:generate` - 生成 Prisma 客户端
- `npm run db:push` - 推送数据库架构
- `npm run db:migrate` - 运行数据库迁移
- `npm run db:reset` - 重置数据库
- `npm run db:seed` - 种子数据
- `npm run db:studio` - 打开 Prisma Studio

## 访问地址

- Web 应用: http://localhost:3000
- 用户服务 API: http://localhost:3001
- 工单服务 API: http://localhost:3002
- 资产服务 API: http://localhost:3003

## 测试账号

系统提供以下测试账号用于权限验证：

### 基础账号
| 角色 | 邮箱 | 用户名 | 密码 | 员工ID | 权限说明 |
|------|------|--------|------|---------|----------|
| 管理员 | admin@emaintenance.com | admin | admin123 | EMP001 | 完整系统管理权限 |
| 主管 | supervisor@emaintenance.com | supervisor | password123 | EMP002 | 团队管理、KPI查看、用户/资产管理 |
| 技术员 | technician@emaintenance.com | technician | password123 | EMP003 | 工单处理、技术更新 |
| 员工 | employee@emaintenance.com | employee | password123 | EMP004 | 基础工单创建和查看 |

### 额外技术员测试账号
| 邮箱 | 用户名 | 密码 | 员工ID | 姓名 |
|------|--------|------|---------|------|
| tech2@emaintenance.com | tech2 | password123 | EMP005 | 李明 技术员 |
| tech3@emaintenance.com | tech3 | password123 | EMP006 | 王强 技术员 |

### 额外一线员工测试账号
| 邮箱 | 用户名 | 密码 | 员工ID | 姓名 |
|------|--------|------|---------|------|
| emp2@emaintenance.com | emp2 | password123 | EMP007 | 张三 员工 |
| emp3@emaintenance.com | emp3 | password123 | EMP008 | 刘佳 员工 |
| emp4@emaintenance.com | emp4 | password123 | EMP009 | 陈伟 员工 |

**注意**: 所有测试账号的密码统一为 `password123`（管理员为 `admin123`）

## 项目架构

本项目采用微服务架构，包含：

- **前端应用**: 基于 Next.js 的管理界面
- **移动应用**: Flutter 开发的移动端
- **后端服务**: 按业务领域划分的微服务
- **数据库**: PostgreSQL 统一数据存储
- **共享包**: 通用配置和工具

## 项目文档

详细的项目文档位于 `docs/` 目录：

- **产品需求文档**: `docs/prd/` - 产品需求和史诗详情
- **架构文档**: `docs/architecture/` - 技术架构和设计规范  
- **故事文档**: `docs/stories/` - 开发故事和任务追踪

更多详细信息请参考 `docs/` 目录下的文档。

## 已知问题和注意事项

### 当前状态
✅ **已完成功能**
- 用户管理和身份验证系统
- 工单管理和完整生命周期
- KPI 仪表板和数据分析
- 用户和资产管理界面
- 高级工单过滤和 CSV 导出

⚠️ **需要注意的问题**
- 资产服务 (asset-service) 实现不完整，缺少部分路由和中间件
- 构建产物 (`dist/`, `coverage/`) 被提交到版本控制中，需要清理
- 生产代码中存在 console.log 语句，建议使用结构化日志
- JWT 令牌处理存在安全改进空间

### 测试覆盖率
- 当前测试覆盖率约 63% (119 个测试文件 vs 188 个源文件)
- 资产服务缺少测试用例
- 移动应用测试覆盖率有限

### 开发建议
- 完成资产服务的实现和测试
- 实施结构化日志记录 (Winston/Pino)
- 添加速率限制和 CSRF 保护
- 实施 Redis 缓存机制
- 清理版本控制中的构建产物

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

请确保：
- 遵循现有的代码风格和模式
- 添加适当的测试用例
- 更新相关文档
- 通过所有 lint 和测试检查

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。