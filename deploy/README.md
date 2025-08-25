# Emaintenance 部署指南

本目录包含 E-Maintenance 系统的所有部署配置和脚本，支持本地开发部署和生产服务器部署。

## 目录结构

```
deploy/
├── README.md                   # 部署指南 (本文件)
├── docker-compose.yml         # 本地开发 Docker Compose 配置
├── docker-compose.prod.yml    # 生产环境 Docker Compose 配置
├── SERVER_DEPLOYMENT_GUIDE.md # Linux 服务器部署详细指南
├── configs/                   # 配置文件目录
│   ├── nginx.conf             # 本地开发 Nginx 配置
│   └── nginx.prod.conf        # 生产环境 Nginx 配置
├── dockerfiles/               # Docker 镜像构建文件
│   ├── Dockerfile.api         # API 服务通用 Dockerfile
│   └── Dockerfile.web         # Next.js Web 应用 Dockerfile
├── env-templates/             # 环境变量模板
│   ├── .env.example           # 本地开发环境变量示例
│   └── .env.production        # 生产环境变量模板
└── scripts/                   # 部署脚本
    ├── deploy-local.sh        # 本地部署脚本
    ├── deploy-server.sh       # 服务器部署脚本
    ├── setup-server.sh        # 服务器环境初始化脚本
    └── health-check.sh        # 健康检查脚本
```

## 快速开始

### 本地开发部署 (MacBook M4 Pro)

1. **一键部署**
   ```bash
   cd deploy
   ./scripts/deploy-local.sh
   ```

2. **访问应用**
   - Web 应用: http://localhost:3000
   - 健康检查: http://localhost/health

### 生产服务器部署 (Linux Ubuntu)

#### 快速部署 (推荐)
```bash
# 1. 环境初始化 (仅首次需要)
curl -fsSL https://raw.githubusercontent.com/your-org/emaintenance/main/deploy/scripts/setup-server.sh | bash

# 2. 重新登录激活 Docker 权限
exit && ssh user@server

# 3. 克隆代码
git clone https://github.com/your-org/emaintenance.git
cd emaintenance/deploy

# 4. 配置环境
cp env-templates/.env.production .env
nano .env  # 修改必要的配置项

# 5. 执行部署
./scripts/deploy-server.sh
```

#### 详细步骤
请参阅 [SERVER_DEPLOYMENT_GUIDE.md](./SERVER_DEPLOYMENT_GUIDE.md) 获得完整的服务器部署指南。

## 部署架构

### 开发环境
- **Frontend**: Next.js Web 应用 (端口 3000)
- **Backend API Services**:
  - User Service (端口 3001)
  - Work Order Service (端口 3002)
  - Asset Service (端口 3003)
- **Database**: PostgreSQL 16 (端口 5433 → 5432)
- **Cache**: Redis 7 (端口 6379)
- **Proxy**: Nginx (端口 80/443)

### 生产环境
- **优化特性**:
  - 独立的生产配置文件 (`docker-compose.prod.yml`)
  - 优化的 Docker 镜像构建 (多阶段构建)
  - 生产级 Nginx 配置 (压缩、缓存、安全头)
  - 日志轮转和监控
  - 自动重启策略
  - 健康检查机制

## 环境要求

### 本地开发
- **系统**: macOS (Apple Silicon M4 Pro 推荐)
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **内存**: 8GB RAM (推荐)
- **磁盘**: 20GB 可用空间

### 生产服务器
- **系统**: Ubuntu 18.04+ LTS (推荐 20.04+)
- **架构**: x86_64 (AMD64)
- **CPU**: 2核心+ (推荐 4核心)
- **内存**: 4GB RAM+ (推荐 8GB)
- **磁盘**: 20GB+ (推荐 50GB)
- **网络**: 稳定的互联网连接

## 重要配置说明

### 必须修改的生产配置项

1. **数据库密码**
   ```bash
   POSTGRES_PASSWORD=your_secure_database_password
   ```

2. **JWT 密钥** (至少32字符)
   ```bash
   JWT_SECRET=your_super_secure_jwt_secret_key_here
   ```

3. **服务器地址**
   ```bash
   NEXT_PUBLIC_API_URL=http://your-server-ip-or-domain
   ```

### 架构兼容性

- **本地 (macOS M4 Pro)**: ARM64 架构
- **服务器 (Linux Ubuntu)**: x86_64 架构
- **Docker 构建策略**: 在目标服务器上远程构建，避免架构兼容性问题

## 配置文件说明

### Docker Compose 文件

| 文件 | 用途 | 特点 |
|-----|------|------|
| `docker-compose.yml` | 本地开发环境 | 开发模式，端口映射直接访问 |
| `docker-compose.prod.yml` | 生产环境 | 生产优化，日志轮转，重启策略 |

### Nginx 配置文件

| 文件 | 用途 | 特点 |
|-----|------|------|
| `configs/nginx.conf` | 本地开发代理 | 基础反向代理配置 |
| `configs/nginx.prod.conf` | 生产环境代理 | 压缩，缓存，安全头，速率限制 |

### Dockerfile

| 文件 | 用途 | 说明 |
|-----|------|------|
| `dockerfiles/Dockerfile.api` | API 服务构建 | 支持多服务构建参数 |
| `dockerfiles/Dockerfile.web` | Web 应用构建 | Next.js 独立模式优化 |

## 故障排查

详细的故障排查指南请参阅：
- [DEPLOYMENT_PLAN.md](../DEPLOYMENT_PLAN.md) - 完整的部署计划和问题记录
- [SERVER_DEPLOYMENT_GUIDE.md](./SERVER_DEPLOYMENT_GUIDE.md) - 服务器部署故障排查

### 快速诊断命令

```bash
# 检查服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看服务日志
docker-compose -f docker-compose.prod.yml logs --tail=50 [service-name]

# 运行健康检查
./scripts/health-check.sh

# 检查系统资源
docker stats
htop
df -h
```