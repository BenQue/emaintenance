# 🚀 E-Maintenance 服务器部署检查清单

## ⚠️ 部署前必读

### 🛡️ 安全注意事项
- ✅ **端口配置**: 使用非常见端口 (3030) 避免冲突
- ✅ **现有项目保护**: 自动检测现有 Docker 容器，避免影响
- ✅ **本地镜像仓库**: 优先使用 localhost:5000 镜像仓库
- ✅ **资源监控**: 检查磁盘和内存使用情况

### 📋 系统要求检查

#### 硬件要求
- [ ] **CPU**: 2核心以上 (推荐4核心)
- [ ] **内存**: 4GB以上 (推荐8GB)
- [ ] **磁盘**: 20GB可用空间 (推荐50GB)
- [ ] **网络**: 稳定互联网连接

#### 软件环境
- [ ] **操作系统**: Ubuntu 18.04+ LTS
- [ ] **Docker**: 20.10+ 已安装并运行
- [ ] **Docker Compose**: 2.0+ 已安装
- [ ] **当前用户**: 已加入 docker 用户组
- [ ] **权限**: 具有 sudo 权限

#### 网络环境
- [ ] **本地镜像仓库**: localhost:5000 可用 (推荐)
- [ ] **镜像源**: 可访问国内 Docker 镜像源
- [ ] **端口可用**: 3030, 3001-3003, 5432, 6380

## 🚀 部署步骤

### 方案 A: 一键部署 (推荐新手)

```bash
# 1. 进入部署目录
cd deploy/Server/scripts/

# 2. 执行全自动部署 (包含安全检查)
./deploy-all.sh --offline

# 3. 验证部署结果
./system-status.sh
```

### 方案 B: 分步骤部署 (推荐专业用户)

```bash
# 1. Docker 安全检查
cd deploy/Server/scripts/
./docker-safety-check.sh

# 2. 配置镜像源 (可选)
cd ../infrastructure/
./setup-china-mirrors.sh

# 3. 部署基础设施
./deploy.sh

# 4. 初始化数据库
cd ../database/
./init.sh

# 5. 部署微服务 (按顺序)
cd ../user-service/ && ./deploy.sh
cd ../work-order-service/ && ./deploy.sh
cd ../asset-service/ && ./deploy.sh

# 6. 部署前端和代理
cd ../web-service/ && ./deploy.sh
cd ../nginx/ && ./deploy.sh

# 7. 最终验证
cd ../scripts/
./system-status.sh
```

## 🎯 端口配置

### 外部访问端口
- **Web 主入口**: `http://服务器IP:3030`
- **HTTPS 入口**: `https://服务器IP:3443`

### 内部服务端口 (容器间通信)
- **Web 应用**: 3000 (内部)
- **用户服务**: 3001 (内部)
- **工单服务**: 3002 (内部)
- **资产服务**: 3003 (内部)
- **PostgreSQL**: 5432 (可选外部访问)
- **Redis**: 6380 (内部)

## ✅ 部署验证

### 基本功能测试
- [ ] **系统健康检查**: `http://服务器IP:3030/health`
- [ ] **Web 应用访问**: `http://服务器IP:3030`
- [ ] **用户登录**: admin@emaintenance.com / admin123
- [ ] **创建测试工单**: 验证核心功能
- [ ] **文件上传**: 测试附件功能

### 服务状态检查
```bash
# 检查所有容器状态
docker ps

# 检查系统健康状态
cd deploy/Server/scripts/ && ./system-status.sh

# 检查单个服务
cd deploy/Server/[service-name]/ && ./health-check.sh
```

## 🔧 故障排查

### 常见问题及解决方案

#### 端口冲突
```bash
# 检查端口占用
netstat -tlnp | grep :3030

# 解决方案
# 1. 停止占用端口的服务
# 2. 修改 E-Maintenance 端口配置
# 3. 使用其他可用端口
```

#### 容器启动失败
```bash
# 查看容器日志
docker logs [container-name]

# 重启单个服务
cd deploy/Server/[service-name]/
docker-compose restart

# 完全重新部署
./deploy.sh
```

#### 网络连接问题
```bash
# 测试容器间网络
docker exec [container1] ping [container2]

# 重建网络
docker network rm emaintenance-network
docker network create emaintenance-network
```

#### 数据库连接问题
```bash
# 检查数据库状态
docker exec emaintenance-postgres pg_isready -U postgres

# 重启数据库
cd deploy/Server/infrastructure/
docker-compose restart postgres
```

## 📊 性能监控

### 资源使用检查
```bash
# Docker 容器资源使用
docker stats

# 系统资源监控
htop

# 磁盘使用情况
df -h

# 查看服务日志
docker logs -f [container-name]
```

### 定期维护建议
- **每日**: 检查系统状态和日志
- **每周**: 清理 Docker 镜像和容器
- **每月**: 数据库备份和系统更新
- **每季度**: 安全漏洞检查和依赖更新

## 🆘 紧急恢复

### 快速重启所有服务
```bash
cd deploy/Server/scripts/
./restart-all.sh
```

### 完全重新部署
```bash
cd deploy/Server/scripts/
./clean-all.sh          # 清理现有部署
./deploy-all.sh         # 重新部署
```

### 数据恢复
```bash
# 从备份恢复数据库
cd deploy/Server/database/
./restore-from-backup.sh [backup-file]

# 恢复上传文件
cp -r /backup/uploads/* /opt/emaintenance/data/uploads/
```

## 📞 技术支持

### 获取帮助
1. **查看日志**: `docker logs [container-name]`
2. **健康检查**: 运行各服务的 `health-check.sh`
3. **系统状态**: 运行 `system-status.sh`
4. **官方文档**: 查看 `README-CHINA.md`

### 常用诊断命令
```bash
# 查看所有 E-Maintenance 容器
docker ps | grep emaintenance

# 查看网络状态
docker network inspect emaintenance-network

# 查看卷挂载
docker volume ls | grep emaintenance

# 查看镜像
docker images | grep emaintenance
```

---
**🛡️ 安全第一 | 🇨🇳 中国优化 | 📦 离线支持 | 🔧 专业部署**