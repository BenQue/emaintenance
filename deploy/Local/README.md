# E-Maintenance 本地部署管理工具

本目录提供完整的本地Docker部署管理工具集，支持快速开发、更新、回滚和监控。

## 🚀 快速开始

```bash
# 1. 启动所有服务
./local-dev.sh start

# 2. 查看服务状态
./local-dev.sh status

# 3. 查看访问地址
./local-dev.sh ports
```

## 📁 工具文件说明

### 🔧 核心工具
- `local-dev.sh` - **一站式开发工具** (推荐使用)
- `update-local.sh` - 部署更新管理
- `status-local.sh` - 服务状态监控  
- `rollback-local.sh` - 回滚和恢复工具

### ⚙️ 配置文件
- `docker-compose.local.yml` - 本地Docker编排配置
- `deploy-local.sh` - 原始部署脚本
- `configs/` - Nginx等服务配置
- `env-templates/` - 环境变量模板

## 🛠️ 主要功能

### 日常开发操作
```bash
# 服务管理
./local-dev.sh start         # 启动所有服务
./local-dev.sh stop          # 停止所有服务
./local-dev.sh restart       # 重启所有服务
./local-dev.sh rebuild       # 重新构建并启动

# 状态查看
./local-dev.sh status        # 查看服务状态
./local-dev.sh health        # 健康检查
./local-dev.sh ports         # 端口信息
./local-dev.sh logs          # 查看所有日志
./local-dev.sh logs web      # 查看特定服务日志

# 容器操作
./local-dev.sh shell postgres  # 进入数据库容器
./local-dev.sh db              # 直接连接数据库
./local-dev.sh redis           # 连接Redis
```

### 更新和部署
```bash
# 快速更新
./local-dev.sh update-quick    # 快速重启更新
./local-dev.sh update-full     # 完整重新构建
./local-dev.sh update-web      # 只更新前端
./local-dev.sh update-api      # 只更新后端API

# 交互式更新
./local-dev.sh update          # 显示更新菜单
./update-local.sh              # 直接运行更新工具
```

### 回滚和恢复
```bash
# 快速回滚
./local-dev.sh rollback        # 交互式回滚菜单
./local-dev.sh rollback-git    # Git代码回滚
./local-dev.sh reset-db        # 重置数据库

# 高级回滚
./rollback-local.sh            # 完整回滚工具
```

### 开发辅助
```bash
./local-dev.sh cleanup         # 清理Docker资源
./local-dev.sh backup-db       # 备份数据库
```

## 🌐 访问地址

启动成功后，可通过以下地址访问服务：

- **前端应用**: http://localhost
- **用户API**: http://localhost:3001/api/health
- **工单API**: http://localhost:3002/api/health  
- **资产API**: http://localhost:3003/api/health
- **数据库**: `postgresql://postgres:Qzy@7091!@localhost:5433/emaintenance`
- **Redis**: `redis://localhost:6380`

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
1. **端口冲突**: 确保端口 3000-3003, 5433, 6380 未被占用
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