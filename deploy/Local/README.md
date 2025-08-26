# E-Maintenance 本地部署配置

本目录包含已经在 MacBook M4 Pro 上成功验证的本地部署配置。

## 📁 文件说明

### 核心配置文件
- `docker-compose.local.yml` - 本地开发环境的 Docker Compose 配置
- `deploy-local.sh` - 一键本地部署脚本

### 配置文件目录
- `configs/` - Nginx 和其他服务的本地配置
  - `nginx.conf` - 本地开发用 Nginx 配置
  - `nginx.prod.conf` - 生产级 Nginx 配置 (参考用)
- `env-templates/` - 环境变量模板文件
  - `.env.example` - 本地开发环境变量示例
  - `.env.production` - 生产环境变量模板

## 🚀 本地部署使用方法

### 快速启动
```bash
cd deploy/Local
./deploy-local.sh
```

### 手工启动
```bash
cd deploy/Local

# 1. 配置环境变量
cp env-templates/.env.example .env
# 根据需要修改 .env 文件

# 2. 启动服务
docker-compose -f docker-compose.local.yml up -d

# 3. 验证部署
curl http://localhost:3000/health
```

### 访问地址
- **Web 应用**: http://localhost:3000
- **用户服务 API**: http://localhost:3001
- **工单服务 API**: http://localhost:3002
- **资产服务 API**: http://localhost:3003
- **数据库**: localhost:5433 (外部访问)
- **Redis**: localhost:6379

## ⚙️ 本地环境特点

### 架构信息
- **平台**: macOS (Apple Silicon M4 Pro)
- **架构**: ARM64
- **Docker**: 原生 ARM64 镜像支持

### 网络配置
- **端口映射**: 直接映射到主机端口，便于开发调试
- **服务发现**: 容器名称 + Docker 网络
- **代理**: Nginx 反向代理统一入口

### 开发友好特性
- **热重载**: 开发模式下的代码热重载
- **日志输出**: 直接输出到终端，便于调试
- **数据持久化**: 本地卷挂载，数据不会丢失

## 🔧 故障排查

### 常用调试命令
```bash
# 查看所有服务状态
docker-compose -f docker-compose.local.yml ps

# 查看特定服务日志
docker-compose -f docker-compose.local.yml logs [service-name]

# 重启服务
docker-compose -f docker-compose.local.yml restart [service-name]

# 进入容器调试
docker-compose -f docker-compose.local.yml exec [service-name] /bin/bash
```

### 常见问题
1. **端口冲突**: 确保端口 3000-3003, 5433, 6379 未被占用
2. **权限问题**: 确保 Docker 有足够权限访问项目目录
3. **内存不足**: M4 Pro 一般不会遇到，但请确保有足够的可用内存

## 📝 与服务器部署的区别

| 特性 | 本地部署 | 服务器部署 |
|------|----------|------------|
| 架构 | ARM64 | x86_64 |
| 环境 | 开发环境 | 生产环境 |
| 端口 | 直接映射 | Nginx 代理 |
| 日志 | 终端输出 | 文件轮转 |
| 数据 | 开发数据 | 生产数据 |
| 安全 | 开发配置 | 生产安全配置 |

## 🚨 重要提醒

此配置仅用于**本地开发和测试**，请勿直接用于生产环境。生产部署请使用 `../Server/` 目录下的配置。