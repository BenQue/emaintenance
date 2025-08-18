# E-Maintenance System (企业设备维修管理程序)

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/emaintenance)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.x-brightgreen.svg)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/docker-%3E%3D24.0-blue.svg)](https://www.docker.com)

企业级设备维修管理系统 - 基于微服务架构的全栈应用，提供完整的设备维护工单管理、用户权限控制、KPI监控和移动端支持。

## 📊 项目状态

### 开发进度
- ✅ **核心功能完成度**: 85%
- ✅ **测试覆盖率**: 63% (526个测试文件)
- ✅ **UI重设计**: 完成 (基于shadcn/ui v4)
- ✅ **移动端集成**: Flutter 3.22+ 支持
- ⚠️ **生产就绪度**: 75% (需完善资产服务和日志系统)

### 技术债务
- 🔧 资产服务需完善 (缺少完整路由和测试)
- 🔧 需替换console.log为结构化日志 (22处)
- 🔧 构建产物需从版本控制中移除
- ✅ 已实施API速率限制

## 🚀 快速开始

### 环境要求
- Node.js v20.x LTS
- Docker 24.0+ & Docker Compose 2.20+
- PostgreSQL 16+ (通过Docker)
- Flutter SDK 3.22+ (移动开发)
- Git 2.x+

### 一键部署

```bash
# 1. 克隆项目
git clone https://github.com/yourusername/emaintenance.git
cd emaintenance

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置数据库密码等

# 4. 启动开发环境
npm run dev
```

### Docker混合部署 (推荐开发模式)

```bash
# 启动数据库和缓存服务
docker-compose -f docker-compose.hybrid.yml up -d

# 启动API服务 (支持热重载)
npm run api:start

# 启动Web应用
cd apps/web && npm run dev
```

## 🏗️ 系统架构

### 微服务架构设计

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js Web   │    │ Flutter Mobile  │    │   API Gateway   │
│    Port: 3000   │    │      App        │    │   (可选 Kong)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                      │                       │
         └──────────────────────┼───────────────────────┘
                               │
    ┌──────────────────────────┼──────────────────────────┐
    │                          │                          │
    ▼                          ▼                          ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  User Service   │    │Work Order Svc   │    │ Asset Service   │
│   Port: 3001    │    │   Port: 3002    │    │   Port: 3003    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                      │                       │
         └──────────────────────┼───────────────────────┘
                               │
                               ▼
              ┌────────────────────────────────────┐
              │         数据层                      │
              │  ┌──────────────┐ ┌──────────────┐ │
              │  │ PostgreSQL   │ │    Redis     │ │
              │  │  Port: 5432  │ │  Port: 6379  │ │
              │  └──────────────┘ └──────────────┘ │
              └────────────────────────────────────┘
```

### 技术栈详情

| 层级 | 技术选型 | 版本 | 说明 |
|------|---------|------|------|
| **前端** | Next.js | 14+ | React 18+, App Router, SSR/SSG |
| **移动端** | Flutter | 3.22+ | 跨平台移动应用 |
| **UI框架** | shadcn/ui | v4 | 基于Radix UI和Tailwind CSS |
| **后端** | Node.js/Express | 20.x/4.x | TypeScript, 微服务架构 |
| **数据库** | PostgreSQL | 16+ | 主数据存储 |
| **ORM** | Prisma | 5+ | 类型安全的数据库访问 |
| **缓存** | Redis | 7+ | 会话和数据缓存 |
| **容器化** | Docker | 24+ | 生产环境容器化部署 |
| **构建工具** | Turborepo | 2.5+ | Monorepo管理 |
| **测试** | Jest | 29+ | 单元和集成测试 |

## 📁 项目结构

```
emaintenance/
├── apps/                      # 应用程序
│   ├── web/                   # Next.js Web应用
│   │   ├── app/               # App Router页面
│   │   ├── components/        # React组件库
│   │   ├── lib/               # 服务和工具库
│   │   └── hooks/             # 自定义React Hooks
│   ├── mobile/                # Flutter移动应用
│   │   ├── lib/               # Dart源代码
│   │   ├── android/           # Android配置
│   │   └── ios/               # iOS配置
│   └── api/                   # 后端微服务
│       ├── user-service/      # 用户管理服务
│       ├── work-order-service/# 工单管理服务
│       └── asset-service/     # 资产管理服务
├── packages/                  # 共享包
│   ├── database/              # Prisma数据库模型
│   ├── shared/                # 共享工具和类型
│   ├── typescript-config/     # TypeScript配置
│   └── eslint-config/         # ESLint配置
├── docs/                      # 项目文档
│   ├── architecture/          # 架构设计文档
│   ├── prd/                   # 产品需求文档
│   └── stories/               # 开发故事追踪
├── docker/                    # Docker配置
│   ├── nginx/                 # Nginx配置
│   └── database/              # 数据库初始化脚本
└── scripts/                   # 部署和工具脚本
```

## 🔑 核心功能

### 用户角色与权限

| 角色 | 权限说明 | 主要功能 |
|------|---------|---------|
| **管理员** (ADMIN) | 完整系统权限 | 系统配置、用户管理、全局数据访问 |
| **主管** (SUPERVISOR) | 团队管理权限 | KPI监控、用户管理、资产管理、工单分配 |
| **技术员** (TECHNICIAN) | 工单处理权限 | 工单执行、状态更新、技术报告 |
| **员工** (EMPLOYEE) | 基础使用权限 | 创建工单、查看个人工单 |

### 功能模块

#### 1. 工单管理系统
- 创建、分配、追踪维修工单
- 多状态流转 (待处理→进行中→已完成)
- 照片上传和解决记录
- CSV导出和批量操作
- 高级筛选和搜索

#### 2. 用户与权限管理
- JWT无状态认证
- 基于角色的访问控制 (RBAC)
- 用户信息管理
- 部门和团队管理

#### 3. KPI仪表板
- 实时工单统计
- 完成率和效率分析
- 技术员绩效追踪
- 可视化图表展示

#### 4. 资产管理
- 设备信息录入和管理
- QR码生成和扫描
- 维护历史记录
- 资产分类管理

#### 5. 移动端支持
- Flutter原生应用
- 离线工作支持
- QR码扫描快速报修
- 实时推送通知

## 📝 API文档

### 认证接口

```bash
# 用户登录
POST /api/auth/login
Content-Type: application/json
{
  "email": "admin@emaintenance.com",
  "password": "admin123"
}

# 响应示例
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "1",
    "email": "admin@emaintenance.com",
    "role": "ADMIN",
    "name": "System Admin"
  }
}
```

### 工单接口

```bash
# 创建工单
POST /api/work-orders
Authorization: Bearer {token}
{
  "title": "设备故障",
  "description": "生产线A设备异常",
  "priority": "HIGH",
  "assetId": "asset-123"
}

# 获取工单列表
GET /api/work-orders?status=OPEN&page=1&limit=20
```

更多API文档请参考 [API规范文档](docs/architecture/5-api-规范.md)

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npm run test

# 运行特定服务测试
cd apps/api/user-service && npm test

# 运行测试覆盖率报告
npm run test:coverage

# 运行端到端测试
npm run test:e2e
```

### 测试覆盖率

| 模块 | 覆盖率 | 测试文件 |
|------|--------|----------|
| Web应用 | 65% | 46个文件 |
| User Service | 78% | 15个文件 |
| Work Order Service | 72% | 18个文件 |
| Asset Service | 45% | 8个文件 |
| **总体** | **63%** | **526个测试文件** |

## 🚢 生产部署

### 环境变量配置

创建 `.env.production` 文件：

```env
# 数据库配置
DATABASE_URL=postgresql://postgres:STRONG_PASSWORD@database:5432/emaintenance
DB_PASSWORD=STRONG_PASSWORD

# JWT配置
JWT_SECRET=PRODUCTION_SECRET_KEY_CHANGE_ME

# Redis配置
REDIS_URL=redis://redis:6379

# 环境标识
NODE_ENV=production

# API URLs (生产域名)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_USER_SERVICE_URL=https://api.yourdomain.com
NEXT_PUBLIC_WORK_ORDER_SERVICE_URL=https://api.yourdomain.com
NEXT_PUBLIC_ASSET_SERVICE_URL=https://api.yourdomain.com
```

### Docker生产部署

```bash
# 构建生产镜像
docker-compose -f docker-compose.prod.yml build

# 启动所有服务
docker-compose -f docker-compose.prod.yml up -d

# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 健康检查
./scripts/health-check.sh
```

### 部署检查清单

#### 部署前
- [ ] 服务器满足最低要求 (4核CPU, 8GB内存, 100GB SSD)
- [ ] Docker 24.0+ 和 Docker Compose 2.20+ 已安装
- [ ] SSL证书已准备 (Let's Encrypt或商业证书)
- [ ] 防火墙规则已配置 (80, 443端口开放)
- [ ] 生产环境变量已配置
- [ ] 数据库备份策略已制定

#### 部署中
- [ ] 所有Docker镜像构建成功
- [ ] 数据库迁移执行完成
- [ ] 初始种子数据导入成功
- [ ] 所有微服务健康检查通过
- [ ] Nginx反向代理配置正确
- [ ] SSL证书配置并验证

#### 部署后
- [ ] Web应用可正常访问
- [ ] 所有API端点响应正常
- [ ] 用户登录功能正常
- [ ] 文件上传功能正常
- [ ] 监控和日志系统运行
- [ ] 自动备份任务已设置

## 🔧 运维指南

### 日常维护

```bash
# 查看服务日志
docker-compose -f docker-compose.prod.yml logs -f [service-name]

# 重启特定服务
docker-compose -f docker-compose.prod.yml restart [service-name]

# 数据库备份
./scripts/backup-database.sh

# 系统健康检查
./scripts/health-check.sh
```

### 监控指标

- **系统资源**: CPU使用率 < 70%, 内存使用率 < 80%
- **响应时间**: API平均响应 < 200ms, 页面加载 < 2s
- **可用性**: 服务可用性 > 99.9%
- **错误率**: HTTP 5xx错误率 < 0.1%

## 🔒 安全措施

### 已实施的安全特性

- ✅ JWT无状态认证机制
- ✅ 基于角色的访问控制 (RBAC)
- ✅ API速率限制 (差异化限流策略)
- ✅ 密码加密存储 (bcrypt)
- ✅ SQL注入防护 (Prisma ORM)
- ✅ XSS防护 (React自动转义)
- ✅ HTTPS强制加密传输

### 待完善的安全措施

- ⚠️ CSRF令牌保护
- ⚠️ 安全响应头配置
- ⚠️ 敏感数据加密存储
- ⚠️ 审计日志系统
- ⚠️ 双因素认证 (2FA)

## 📈 性能优化

### 已实施的优化

- ✅ 数据库索引优化
- ✅ API响应缓存 (Redis)
- ✅ 前端代码分割和懒加载
- ✅ 图片优化和CDN加速
- ✅ Gzip压缩传输

### 建议的优化

- 实施数据库读写分离
- 添加应用级缓存层
- 优化N+1查询问题
- 实施GraphQL数据聚合
- 添加服务网格 (Service Mesh)

## 🐛 已知问题

### 高优先级
1. **资产服务不完整**: 缺少完整路由定义和中间件集成
2. **环境文件泄露风险**: .env文件存在于版本控制中
3. **日志系统不完善**: 使用console.log而非结构化日志

### 中优先级
1. **测试覆盖不足**: 资产服务测试覆盖率仅45%
2. **构建产物污染**: dist/和coverage/目录被提交
3. **TypeScript类型错误**: Select组件onValueChange缺少类型注解

### 低优先级
1. **移动端功能限制**: Flutter应用部分功能未实现
2. **国际化支持**: 缺少多语言支持
3. **文档不完整**: API文档需要更新

## 🗓️ 路线图

### Q1 2025
- [x] 完成UI重设计 (shadcn/ui v4)
- [x] 实施API速率限制
- [x] Android部署支持
- [ ] 完善资产服务功能
- [ ] 实施结构化日志系统

### Q2 2025
- [ ] 添加CSRF保护
- [ ] 实施审计日志
- [ ] 优化数据库性能
- [ ] 完善移动端功能
- [ ] 添加国际化支持

### Q3 2025
- [ ] 实施微服务网格
- [ ] 添加GraphQL支持
- [ ] 集成AI预测性维护
- [ ] 实施自动化测试流水线

## 👥 测试账号

| 角色 | 邮箱 | 密码 | 权限说明 |
|------|------|------|----------|
| 管理员 | admin@emaintenance.com | admin123 | 完整系统权限 |
| 主管 | supervisor@emaintenance.com | password123 | 团队管理权限 |
| 技术员 | technician@emaintenance.com | password123 | 工单处理权限 |
| 员工 | employee@emaintenance.com | password123 | 基础使用权限 |

更多测试账号请参考原始文档。

## 📚 相关文档

- [架构设计文档](docs/architecture/index.md)
- [产品需求文档](docs/prd/index.md)
- [API接口规范](docs/architecture/5-api-规范.md)
- [数据库设计](docs/architecture/8-数据库表结构.md)
- [部署指南](docs/Archive/production-deployment.md)
- [Android部署指南](docs/Android设备部署指南.md)

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### 开发规范

- 遵循 TypeScript 严格模式
- 使用 ESLint 和 Prettier 格式化代码
- 编写单元测试覆盖核心逻辑
- 提交信息遵循 Conventional Commits
- 代码审查通过后才能合并

## 📞 支持与反馈

- **问题反馈**: [GitHub Issues](https://github.com/yourusername/emaintenance/issues)
- **功能建议**: [GitHub Discussions](https://github.com/yourusername/emaintenance/discussions)
- **安全漏洞**: security@yourdomain.com
- **商业支持**: support@yourdomain.com

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

**版本**: 1.0.0  
**最后更新**: 2025-08-18  
**维护团队**: EMaintenance Development Team

Copyright © 2025 Your Company. All rights reserved.