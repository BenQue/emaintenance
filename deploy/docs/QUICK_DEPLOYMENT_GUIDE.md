# E-Maintenance 快速部署指南

基于实际部署经验的完整部署流程，包含所有关键修复。

---

## 📋 部署前准备

### 1. 服务器环境要求
- **操作系统**: Ubuntu 24.04.3 LTS (推荐)
- **内存**: 最低4GB，推荐8GB
- **存储**: 最低20GB可用空间
- **网络**: 稳定的互联网连接

### 2. 必需软件安装
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Docker和Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# 安装Node.js (用于某些构建步骤)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
docker --version
docker-compose --version
node --version
```

### 3. 克隆项目代码
```bash
git clone https://github.com/BenQue/emaintenance.git
cd emaintenance
```

---

## 🚀 标准部署流程

### 步骤1: 部署基础设施服务
```bash
cd deploy/Server/infrastructure
./deploy.sh
```

**检查**: 确保PostgreSQL和Redis容器正常运行
```bash
docker ps | grep emaintenance
```

### 步骤2: 初始化数据库
```bash
cd ../database
./manual-init.sh
```

**检查**: 验证数据库初始化成功
```bash
docker exec emaintenance-postgres psql -U postgres -d emaintenance -c "SELECT COUNT(*) FROM users;"
```

### 步骤3: 部署微服务 (按顺序)

#### 3.1 部署用户服务
```bash
cd ../user-service
./deploy.sh
```

#### 3.2 部署工单服务
```bash
cd ../work-order-service
./deploy.sh
```

#### 3.3 部署资产服务
```bash
cd ../asset-service
./deploy.sh
```

**检查**: 验证所有API服务正常
```bash
curl http://localhost:3001/health
curl http://localhost:3002/health  
curl http://localhost:3003/health
```

### 步骤4: 部署Web应用 (关键步骤)

⚠️ **重要**: 必须指定服务器IP地址

```bash
cd ../web-service

# 方法1: 自动检测IP (推荐)
SERVER_IP=$(curl -s ifconfig.me) ./deploy.sh

# 方法2: 手动指定IP (如果自动检测失败)
SERVER_IP=YOUR_SERVER_IP ./deploy.sh

# 示例
SERVER_IP=10.163.144.13 ./deploy.sh
```

**检查**: 验证Web服务API配置正确
```bash
docker exec emaintenance-web-service printenv NEXT_PUBLIC_API_URL
# 应该输出: http://YOUR_SERVER_IP:3030
```

### 步骤5: 部署Nginx反向代理
```bash
cd ../nginx
./deploy.sh
```

**检查**: 验证Nginx代理正常工作
```bash
curl http://localhost:3030/health
curl -X POST http://localhost:3030/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"admin123"}'
```

---

## ✅ 部署验证

### 1. 容器状态检查
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

应该看到所有容器都显示"健康"状态：
- emaintenance-postgres (healthy)
- emaintenance-redis (healthy)  
- emaintenance-user-service (healthy)
- emaintenance-work-order-service (healthy)
- emaintenance-asset-service (healthy)
- emaintenance-web-service (healthy)
- emaintenance-nginx

### 2. API功能测试
```bash
# 测试登录API
curl -X POST http://localhost:3030/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"admin123"}' | jq
```

应该返回包含JWT token的成功响应。

### 3. Web界面测试
在浏览器中访问: `http://YOUR_SERVER_IP:3030`

使用管理员账户登录:
- **用户名**: admin
- **密码**: admin123

---

## 🔧 常见问题快速修复

### 问题1: Web前端登录失败 (ERR_CONNECTION_REFUSED)
```bash
# 重新构建Web服务，指定正确的服务器IP
cd deploy/Server/web-service
SERVER_IP=YOUR_ACTUAL_IP ./deploy.sh
```

### 问题2: 数据库连接失败
```bash
# 检查环境变量是否正确导出
cd deploy/Server/infrastructure
cat .env | grep POSTGRES_PASSWORD

# 重新部署所有微服务
cd ../user-service && ./deploy.sh
cd ../work-order-service && ./deploy.sh  
cd ../asset-service && ./deploy.sh
```

### 问题3: 服务健康检查失败
```bash
# 检查容器日志
docker logs emaintenance-user-service --tail=50
docker logs emaintenance-work-order-service --tail=50
docker logs emaintenance-asset-service --tail=50
```

### 问题4: Nginx代理不工作
```bash
# 重启Nginx服务
docker restart emaintenance-nginx

# 检查Nginx配置
docker exec emaintenance-nginx nginx -t
```

---

## 🛠️ 调试工具使用

项目提供了多个调试脚本来快速排查问题：

### 1. 登录问题诊断
```bash
cd deploy/Server
./debug-login.sh
```

### 2. Nginx代理诊断  
```bash
cd deploy/Server
./diagnose-nginx.sh
```

### 3. Web服务环境检查
```bash
cd deploy/Server  
./check-web-env.sh
```

---

## 📦 完整服务重置

如果需要完全重新部署:

```bash
# 停止所有服务
docker-compose -f deploy/Server/*/docker-compose.yml down

# 清理容器和网络
docker system prune -f
docker network prune -f

# 重新创建网络
docker network create emaintenance-network

# 按照标准流程重新部署
```

---

## 🌍 访问信息

部署成功后，系统访问信息:

- **主入口**: `http://YOUR_SERVER_IP:3030`
- **管理员账户**: admin / admin123
- **API基础地址**: `http://YOUR_SERVER_IP:3030/api`

**各服务直接访问** (调试用途):
- Web应用: `http://YOUR_SERVER_IP:3000`
- 用户服务: `http://YOUR_SERVER_IP:3001`
- 工单服务: `http://YOUR_SERVER_IP:3002`  
- 资产服务: `http://YOUR_SERVER_IP:3003`
- PostgreSQL: `YOUR_SERVER_IP:5433`
- Redis: `YOUR_SERVER_IP:6380`

---

## 💡 部署成功经验总结

1. **按顺序部署**: 基础设施 → 数据库 → 微服务 → Web应用 → 代理
2. **环境变量管理**: 确保所有密码和配置正确导出
3. **网络配置**: 容器间使用容器名，外部访问使用实际IP
4. **Web服务构建**: 必须在构建时指定正确的服务器IP
5. **调试工具**: 充分利用提供的调试脚本快速定位问题
6. **验证测试**: 每个步骤都进行必要的验证确保正确性

## 🚨 关键注意事项 (2025-08-27更新)

### Web服务部署必须指定服务器IP
```bash
cd deploy/Server/web-service
# 关键: 必须指定SERVER_IP，不能使用localhost
SERVER_IP=10.163.144.13 ./deploy.sh
```

### Nginx路由配置完整性
确保所有API端点都在Nginx中配置了路由：
- `/api/auth` → user-service
- `/api/users` → user-service  
- `/api/settings` → user-service
- `/api/work-orders` → work-order-service
- `/api/assignment-rules` → work-order-service
- `/api/notifications` → work-order-service
- `/api/assets` → asset-service

### 常见问题快速解决
如果遇到页面无法显示数据或API 404错误：
1. 检查 [远程部署故障排除指南](REMOTE_DEPLOYMENT_TROUBLESHOOTING.md)
2. 重新构建Web服务（指定服务器IP）
3. 重新部署Nginx服务

遵循这个指南可以避免大部分常见问题，实现一次性成功部署。