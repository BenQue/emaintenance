# Docker 部署指南

EMaintenance 企业设备维修管理系统 Docker 容器化部署指南

## 概述

本指南提供了如何使用 Docker 和 Docker Compose 部署 EMaintenance 系统的详细步骤。系统支持开发环境和生产环境的部署配置。

## 系统架构

### 容器化组件

- **web**: Next.js 前端应用 (端口 3000)
- **user-service**: 用户管理微服务 (端口 3001)
- **work-order-service**: 工单管理微服务 (端口 3002)
- **asset-service**: 资产管理微服务 (端口 3003)
- **database**: PostgreSQL 16 数据库 (端口 5432)
- **redis**: Redis 缓存服务 (端口 6379)
- **nginx**: 反向代理 (生产环境，端口 80/443)

### 网络架构

- 所有服务运行在 `emaintenance-network` 内部网络中
- 外部访问通过指定端口映射或 Nginx 反向代理

## 快速开始

### 1. 前置要求

确保您的系统已安装：

```bash
# 检查 Docker 版本 (需要 20.10+ 版本)
docker --version

# 检查 Docker Compose 版本 (需要 2.0+ 版本)
docker-compose --version

# 检查 Docker 服务状态
docker info
```

### 2. 克隆项目并进入目录

```bash
git clone <repository-url>
cd Emaintenance
```

### 3. 使用部署脚本（推荐）

我们提供了自动化部署脚本来简化部署过程：

```bash
# 部署开发环境
./scripts/deploy.sh dev

# 部署生产环境
./scripts/deploy.sh prod

# 查看帮助
./scripts/deploy.sh help
```

## 手动部署步骤

### 开发环境部署

#### 1. 配置环境变量

```bash
# 复制环境变量模板
cp .env.docker .env

# 编辑环境变量（根据需要修改）
nano .env
```

#### 2. 构建和启动服务

```bash
# 构建所有服务
docker-compose build

# 启动数据库并等待就绪
docker-compose up -d database redis

# 等待数据库启动（约30秒）
sleep 30

# 运行数据库迁移
docker-compose --profile tools run --rm db-migrate

# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps
```

#### 3. 访问应用

- **Web 应用**: http://localhost:3000
- **用户服务**: http://localhost:3001
- **工单服务**: http://localhost:3002
- **资产服务**: http://localhost:3003
- **数据库**: localhost:5432

### 生产环境部署

#### 1. 配置生产环境变量

```bash
# 复制并配置生产环境变量
cp .env.docker .env.prod

# 编辑生产环境配置
nano .env.prod
```

**重要的生产环境配置项：**

```bash
# 强密码配置
DB_PASSWORD=your-strong-database-password
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# 生产环境 URL 配置
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_USER_SERVICE_URL=https://your-domain.com/api

# Node 环境
NODE_ENV=production
```

#### 2. 部署生产服务

```bash
# 使用生产配置构建
docker-compose -f docker-compose.prod.yml build

# 启动数据库
docker-compose -f docker-compose.prod.yml up -d database redis

# 运行数据库迁移
docker-compose -f docker-compose.prod.yml --profile tools run --rm db-migrate

# 启动所有生产服务
docker-compose -f docker-compose.prod.yml up -d

# 检查服务健康状态
docker-compose -f docker-compose.prod.yml ps
```

#### 3. SSL 证书配置（可选）

如果需要 HTTPS 支持：

```bash
# 创建 SSL 证书目录
mkdir -p docker/nginx/ssl

# 将您的证书文件放置到此目录
# cert.pem - SSL 证书
# private.key - 私钥文件

# 编辑 nginx.conf，取消注释 HTTPS 服务器配置
nano docker/nginx/nginx.conf
```

## 常用操作命令

### 服务管理

```bash
# 查看所有服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f [service-name]

# 重启特定服务
docker-compose restart [service-name]

# 停止所有服务
docker-compose down

# 停止并删除所有数据（谨慎使用）
docker-compose down -v
```

### 数据库操作

```bash
# 连接到数据库
docker-compose exec database psql -U postgres -d emaintenance

# 备份数据库
docker-compose exec database pg_dump -U postgres emaintenance > backup.sql

# 恢复数据库
cat backup.sql | docker-compose exec -T database psql -U postgres -d emaintenance

# 重新运行数据库迁移
docker-compose --profile tools run --rm db-migrate
```

### 日志和监控

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f web
docker-compose logs -f user-service

# 查看容器资源使用情况
docker stats

# 查看容器健康检查状态
docker-compose ps
```

## 故障排除

### 常见问题

#### 1. 端口冲突

```bash
# 检查端口占用
netstat -tulpn | grep :3000

# 修改 docker-compose.yml 中的端口映射
ports:
  - "3001:3000"  # 将外部端口改为 3001
```

#### 2. 数据库连接失败

```bash
# 检查数据库容器状态
docker-compose ps database

# 查看数据库日志
docker-compose logs database

# 重新启动数据库
docker-compose restart database
```

#### 3. 构建失败

```bash
# 清理 Docker 缓存
docker system prune -a

# 重新构建（不使用缓存）
docker-compose build --no-cache
```

#### 4. 权限问题

```bash
# 检查文件权限
ls -la uploads/

# 修复权限问题
sudo chown -R $USER:$USER uploads/
chmod -R 755 uploads/
```

### 性能优化

#### 开发环境

```bash
# 启用文件监听优化
export WATCHPACK_POLLING=true

# 增加内存限制
docker-compose up -d --scale web=1 --memory=2g web
```

#### 生产环境

```bash
# 启用多副本
docker-compose -f docker-compose.prod.yml up -d --scale user-service=2

# 监控资源使用
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

## 安全注意事项

### 生产环境安全清单

- [ ] 更改所有默认密码
- [ ] 配置防火墙规则
- [ ] 启用 SSL/TLS 加密
- [ ] 配置定期数据备份
- [ ] 启用日志监控
- [ ] 限制数据库外部访问
- [ ] 配置反向代理安全头
- [ ] 定期更新容器镜像

### 网络安全

```bash
# 限制数据库外部访问（生产环境）
# 在 docker-compose.prod.yml 中移除数据库端口映射
# ports:
#   - "5432:5432"  # 注释或删除此行

# 配置防火墙规则
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 5432
```

## 备份和恢复

### 数据备份策略

```bash
# 创建备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T database pg_dump -U postgres emaintenance > "backup_${DATE}.sql"
docker run --rm -v $(pwd):/backup alpine tar czf /backup/uploads_${DATE}.tar.gz -C /app uploads/
EOF

chmod +x backup.sh
```

### 自动化备份

```bash
# 添加到 crontab
crontab -e

# 每天凌晨 2 点备份
0 2 * * * /path/to/emaintenance/backup.sh
```

## 扩展和集群

### 水平扩展

```bash
# 扩展 API 服务
docker-compose -f docker-compose.prod.yml up -d --scale user-service=3 --scale work-order-service=2

# 配置负载均衡器
# 编辑 docker/nginx/nginx.conf 添加更多 upstream 服务器
```

### 监控和日志

```bash
# 启用日志聚合
docker-compose -f docker-compose.prod.yml --profile logging up -d

# 配置 Prometheus 监控（可选）
# 添加 monitoring/docker-compose.monitoring.yml
```

## 更新和维护

### 服务更新

```bash
# 拉取最新代码
git pull origin main

# 重新构建和部署
./scripts/deploy.sh build prod
./scripts/deploy.sh restart prod
```

### 数据库迁移

```bash
# 运行新的数据库迁移
docker-compose --profile tools run --rm db-migrate

# 检查迁移状态
docker-compose exec database psql -U postgres -d emaintenance -c "SELECT * FROM _prisma_migrations;"
```

## 联系支持

如果遇到问题，请：

1. 检查日志输出：`docker-compose logs -f`
2. 查看本文档的故障排除部分
3. 提交 Issue 到项目仓库
4. 联系开发团队

---

**注意**: 本部署指南基于 Docker Compose V2。如果使用旧版本，请将 `docker-compose` 命令替换为 `docker compose`。