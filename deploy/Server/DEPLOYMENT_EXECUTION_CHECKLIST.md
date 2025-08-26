# 🚀 E-Maintenance 服务器部署执行清单

## 📋 部署前准备阶段

### ✅ 服务器环境检查
- [ ] **1.1** 确认服务器信息
  - 操作系统: Ubuntu 18.04+ LTS
  - 架构: x86_64 (AMD64)
  - CPU: 2核心+ (推荐4核心)
  - 内存: 4GB+ (推荐8GB)
  - 磁盘: 20GB+ 可用空间

- [ ] **1.2** 网络环境检查
  - SSH 连接正常
  - 互联网访问正常
  - 检查本地镜像仓库 `localhost:5000` 可用性

- [ ] **1.3** 权限和工具检查
  - 当前用户有 sudo 权限
  - Docker 已安装并运行
  - Docker Compose 已安装
  - Git 已安装

### ✅ 代码获取
- [ ] **2.1** 克隆项目代码
  ```bash
  git clone https://github.com/BenQue/emaintenance.git
  cd emaintenance
  ```

- [ ] **2.2** 验证代码完整性
  ```bash
  ls -la deploy/Server/
  # 应该看到: infrastructure, database, user-service, work-order-service, asset-service, web-service, nginx, scripts
  ```

## 🛡️ 安全检查阶段

### ✅ Docker 环境安全检查
- [ ] **3.1** 运行 Docker 安全检查
  ```bash
  cd deploy/Server/scripts/
  ./docker-safety-check.sh
  ```

- [ ] **3.2** 检查端口冲突
  - 确认端口 3030, 3001-3003, 5432, 6380 可用
  - 如有冲突，记录冲突服务并决定处理方案

- [ ] **3.3** 检查现有 Docker 项目
  - 确认不会影响现有容器
  - 记录现有容器和网络

## 🏗️ 基础设施部署阶段

### ✅ 镜像源配置
- [ ] **4.1** 配置中国镜像源和本地镜像仓库
  ```bash
  cd deploy/Server/infrastructure/
  ./setup-china-mirrors.sh
  ```

- [ ] **4.2** 验证镜像源配置
  ```bash
  docker info | grep -A 10 "Registry Mirrors"
  # 应该看到配置的镜像源
  ```

### ✅ 基础设施服务部署
- [ ] **5.1** 部署 PostgreSQL 和 Redis
  ```bash
  cd deploy/Server/infrastructure/
  ./deploy.sh
  ```

- [ ] **5.2** 验证基础设施服务
  ```bash
  ./health-check.sh
  # 确保 PostgreSQL 和 Redis 都正常运行
  ```

- [ ] **5.3** 记录服务状态
  ```bash
  docker ps | grep emaintenance
  # 记录容器ID和状态
  ```

## 🗄️ 数据库初始化阶段

### ✅ 数据库结构和数据
- [ ] **6.1** 初始化数据库
  ```bash
  cd deploy/Server/database/
  ./init.sh
  ```

- [ ] **6.2** 验证数据库初始化
  ```bash
  # 检查表是否创建成功
  docker exec emaintenance-postgres psql -U postgres -d emaintenance -c "\dt"
  
  # 检查基础数据是否存在
  docker exec emaintenance-postgres psql -U postgres -d emaintenance -c "SELECT COUNT(*) FROM users;"
  ```

## 👤 用户服务部署阶段

### ✅ 用户服务 (端口 3001)
- [ ] **7.1** 部署用户服务
  ```bash
  cd deploy/Server/user-service/
  ./deploy.sh
  ```

- [ ] **7.2** 验证用户服务
  ```bash
  ./health-check.sh
  curl http://localhost:3001/health
  ```

- [ ] **7.3** 测试用户服务 API
  ```bash
  # 测试健康检查端点
  curl -I http://localhost:3001/health
  # 应该返回 200 状态码
  ```

## 📋 工单服务部署阶段

### ✅ 工单服务 (端口 3002)
- [ ] **8.1** 部署工单服务
  ```bash
  cd deploy/Server/work-order-service/
  ./deploy.sh
  ```

- [ ] **8.2** 验证工单服务
  ```bash
  ./health-check.sh
  curl http://localhost:3002/health
  ```

## 🏭 资产服务部署阶段

### ✅ 资产服务 (端口 3003)
- [ ] **9.1** 部署资产服务
  ```bash
  cd deploy/Server/asset-service/
  ./deploy.sh
  ```

- [ ] **9.2** 验证资产服务
  ```bash
  ./health-check.sh
  curl http://localhost:3003/health
  ```

## 🌐 Web应用部署阶段

### ✅ Web应用 (端口 3000 内部)
- [ ] **10.1** 部署 Web 应用
  ```bash
  cd deploy/Server/web-service/
  ./deploy.sh
  ```

- [ ] **10.2** 验证 Web 应用
  ```bash
  ./health-check.sh
  curl http://localhost:3000/health
  ```

## 🔀 Nginx 代理部署阶段

### ✅ Nginx 反向代理 (端口 3030 外部)
- [ ] **11.1** 部署 Nginx 代理
  ```bash
  cd deploy/Server/nginx/
  ./deploy.sh
  ```

- [ ] **11.2** 验证 Nginx 代理
  ```bash
  curl http://localhost:3030/health
  # 应该返回 "healthy"
  ```

## 🎯 最终验证阶段

### ✅ 系统整体验证
- [ ] **12.1** 运行系统状态检查
  ```bash
  cd deploy/Server/scripts/
  ./system-status.sh
  ```

- [ ] **12.2** Web 应用访问测试
  ```bash
  # 使用浏览器或curl测试
  curl -I http://服务器IP:3030
  ```

- [ ] **12.3** 功能测试
  - [ ] 访问主页: `http://服务器IP:3030`
  - [ ] 健康检查: `http://服务器IP:3030/health`
  - [ ] 用户登录: admin@emaintenance.com / admin123
  - [ ] 创建测试工单
  - [ ] 上传测试文件

### ✅ 性能和资源检查
- [ ] **13.1** 检查系统资源使用
  ```bash
  docker stats --no-stream
  free -h
  df -h
  ```

- [ ] **13.2** 检查日志
  ```bash
  # 检查各服务日志是否正常
  docker logs emaintenance-postgres | tail -10
  docker logs emaintenance-redis | tail -10
  docker logs emaintenance-user-service | tail -10
  docker logs emaintenance-work-order-service | tail -10
  docker logs emaintenance-asset-service | tail -10
  docker logs emaintenance-web | tail -10
  docker logs emaintenance-nginx | tail -10
  ```

## 📝 部署记录

### 部署信息记录
- **部署日期**: _______________
- **部署人员**: _______________
- **服务器IP**: _______________
- **Git提交**: `a5d84b0` (或更新版本)

### 服务状态记录
```bash
# 记录最终的容器状态
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 记录服务访问地址
echo "Web主入口: http://$(hostname -I | awk '{print $1}'):3030"
```

### 问题记录
- **遇到的问题**: _______________
- **解决方案**: _______________
- **注意事项**: _______________

## 🆘 应急预案

### 如果部署失败
1. **查看具体错误**:
   ```bash
   docker logs [失败的容器名称]
   ```

2. **重新部署单个服务**:
   ```bash
   cd deploy/Server/[service-name]/
   docker-compose down
   ./deploy.sh
   ```

3. **完全重新开始**:
   ```bash
   cd deploy/Server/scripts/
   ./clean-all.sh  # 如果有此脚本
   ./deploy-all.sh
   ```

### 回滚计划
- 保留现有服务的备份
- 记录回滚步骤
- 数据库备份恢复方案

---

## 🎯 成功标准

部署成功的标准：
- [ ] 所有7个容器都在运行且健康
- [ ] Web应用可通过 http://服务器IP:3030 访问
- [ ] 可以正常登录系统
- [ ] 系统资源使用正常 (CPU < 80%, 内存 < 90%, 磁盘 < 90%)
- [ ] 所有健康检查通过

**🎉 部署完成！系统已就绪投入使用**