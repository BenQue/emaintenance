# E-Maintenance 服务器端部署方案 (v2.0)

本目录实现**模块化、可调试、分步骤**的服务器端部署策略。

## 设计原则

### 🎯 核心理念
- **分离关注点**: 每个服务独立部署，问题隔离
- **可调试性**: 每步都可独立验证和调试  
- **双模式支持**: 自动化脚本 + 手工操作
- **渐进式部署**: 从基础设施到应用服务逐步构建

### 📁 目录结构
```
Server/
├── README.md                    # 本文件
├── infrastructure/              # 基础设施服务 (PostgreSQL, Redis)
│   ├── build.sh                # 构建基础设施镜像
│   ├── deploy.sh               # 部署基础设施服务
│   ├── manual-deploy.md        # 手工部署步骤
│   ├── docker-compose.yml      # 基础设施服务配置
│   └── health-check.sh         # 健康检查脚本
├── database/                   # 数据库相关
│   ├── init.sh                 # 数据库初始化
│   ├── migrate.sh              # 数据库迁移
│   ├── seed.sh                 # 数据填充
│   └── backup.sh               # 数据备份
├── user-service/               # 用户服务
│   ├── build.sh                # 构建用户服务镜像
│   ├── deploy.sh               # 部署用户服务
│   ├── manual-deploy.md        # 手工部署指南
│   ├── Dockerfile              # 服务专用 Dockerfile
│   ├── docker-compose.yml      # 服务配置
│   └── health-check.sh         # 健康检查
├── work-order-service/         # 工单服务
│   └── [同用户服务结构]
├── asset-service/              # 资产服务  
│   └── [同用户服务结构]
├── web-service/                # Web 前端服务
│   └── [同用户服务结构]
├── nginx/                      # Nginx 反向代理
│   ├── build.sh                # 构建 Nginx 配置
│   ├── deploy.sh               # 部署 Nginx
│   ├── configs/                # Nginx 配置文件
│   │   ├── nginx.conf          # 主配置
│   │   ├── upstream.conf       # 上游配置
│   │   └── ssl.conf            # SSL 配置 (可选)
│   └── manual-deploy.md
├── monitoring/                 # 监控和日志
│   ├── logs/                   # 日志收集配置
│   ├── metrics/                # 指标收集
│   └── health-dashboard.sh     # 健康检查仪表板
└── scripts/                    # 全局脚本
    ├── deploy-all.sh           # 全量部署脚本
    ├── deploy-services.sh      # 仅部署应用服务
    ├── clean-all.sh            # 清理脚本
    ├── backup-all.sh           # 全系统备份
    └── rollback.sh             # 回滚脚本
```

## 🚀 部署流程

### 阶段 1: 基础设施部署
```bash
# 自动化部署
cd infrastructure && ./deploy.sh

# 手工部署 (问题调试时)
cd infrastructure && cat manual-deploy.md
```

### 阶段 2: 数据库初始化
```bash
cd database && ./init.sh
```

### 阶段 3: 微服务部署 (按依赖顺序)
```bash
# 1. 用户服务 (基础服务)
cd user-service && ./deploy.sh

# 2. 工单服务 (依赖用户服务)
cd work-order-service && ./deploy.sh

# 3. 资产服务 (独立服务)
cd asset-service && ./deploy.sh
```

### 阶段 4: 前端和代理
```bash
# Web 服务
cd web-service && ./deploy.sh

# Nginx 代理
cd nginx && ./deploy.sh
```

## 🛠 故障排查

### 分层诊断策略
1. **基础设施层**: 检查 PostgreSQL, Redis 连接
2. **网络层**: 验证容器间网络通信
3. **服务层**: 逐个验证微服务健康状态
4. **代理层**: 检查 Nginx 配置和路由

### 常用调试命令
```bash
# 查看特定服务状态
cd [service-directory] && ./health-check.sh

# 查看服务日志
docker-compose logs [service-name]

# 进入服务容器调试
docker-compose exec [service-name] /bin/bash
```

### 常见问题和解决方案

#### 🔄 Redis配置错误
**问题**: Redis 7.4.5 启动失败，报错 `Bad directive or wrong number of arguments` at line 6 `keepalive 60`

**解决方案**:
```bash
# 1. 检查错误日志
docker-compose logs redis

# 2. 修复配置文件 (已在最新版本修复)
sed -i 's/keepalive 60/tcp-keepalive 60/g' redis.conf

# 3. 重启Redis
docker-compose restart redis

# 4. 验证修复
docker exec emaintenance-redis redis-cli ping
```

#### 🔌 端口冲突处理
**问题**: 端口 5432, 6379, 3000 被现有服务占用

**解决方案**:
```bash
# 1. 运行安全检查
cd deploy/Server/scripts/ && ./docker-safety-check.sh

# 2. 使用替代端口 (已在配置中设置)
# PostgreSQL: 5432 → 5433
# Redis: 6379 → 6380
# Web应用: 通过Nginx代理访问，无冲突

# 3. 在.env文件中确认端口配置
grep -E "(POSTGRES_PORT|REDIS_PORT|NGINX_HTTP_PORT)" .env
```

## 🔧 手工部署支持

每个服务目录都包含 `manual-deploy.md` 文件，提供：
- 详细的手工部署步骤
- 常见问题的解决方案
- 配置参数说明
- 验证检查清单

## 🎯 优势对比

| 特性 | 旧方案 | 新方案 |
|------|--------|--------|
| 问题隔离 | ❌ 单体脚本，难以定位 | ✅ 服务级别隔离 |
| 调试能力 | ❌ 黑盒部署，难以调试 | ✅ 每步可验证 |
| 回滚机制 | ❌ 全量重新部署 | ✅ 服务级别回滚 |
| 文档完整性 | ❌ 分散的修复脚本 | ✅ 结构化文档 |
| 部署速度 | ❌ 失败后全部重来 | ✅ 增量部署和修复 |

## 📋 部署前检查清单

- [ ] 服务器环境准备 (Docker, Docker Compose)
- [ ] 网络端口开放 (80, 443, 5432, 6380, 3001-3003)
- [ ] 磁盘空间检查 (至少 20GB 可用)
- [ ] 环境变量配置完成
- [ ] SSH 密钥和访问权限确认

使用此新架构，您可以：
1. **逐步部署**: 从基础设施开始，逐层构建
2. **精确调试**: 任何环节出问题都可以单独修复
3. **快速恢复**: 单个服务问题不影响整体系统
4. **持续改进**: 每个服务独立优化和升级