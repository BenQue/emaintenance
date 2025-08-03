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
docker run --name postgres-emaintanance -e POSTGRES_PASSWORD=password -e POSTGRES_DB=emaintanance -p 5432:5432 -d postgres:16
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

## 端口配置

- Web 应用: http://localhost:3000
- 用户服务: http://localhost:3001
- 工单服务: http://localhost:3002
- 资产服务: http://localhost:3003

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