# E-Maintenance 远程部署故障排除指南

**适用场景**: 远程服务器部署，生产环境
**测试环境**: Ubuntu 24.04.3 LTS (中国区服务器)
**部署时间**: 2025年8月27日
**最终状态**: ✅ 完美运行

---

## 🎯 核心问题总结

### 问题根源
本次部署遇到的**所有问题**都源于一个根本原因：**本地开发环境与远程部署环境的差异**

- **本地环境**: 最新源代码 + 开发模式 + localhost网络
- **远程环境**: 容器化部署 + 生产模式 + 服务器IP网络

---

## 🔧 遇到的问题及解决方案

### 1. 前端页面数据无法显示 - API路由配置错误

**症状**：
```
浏览器Console错误:
- Failed to load notification stats: AbortError: signal is aborted without reason
- GET http://localhost:3002/api/notifications/my/stats net::ERR_CONNECTION_REFUSED
- 工单管理和设备管理页面无法显示列表内容
```

**根本原因**：
前端API客户端配置错误，直接访问微服务端口而非通过Nginx代理：
- 错误: `http://localhost:3002/api/notifications/my/stats`
- 正确: `http://10.163.144.13:3030/api/notifications/my/stats`

**解决方案**：
1. **修改Web服务部署脚本** (`deploy/Server/web-service/deploy.sh`):
   ```bash
   # 所有API服务URL都使用Nginx代理地址
   NGINX_URL="http://${SERVER_IP:-localhost}:3030"
   export NEXT_PUBLIC_USER_SERVICE_URL="${NGINX_URL}"
   export NEXT_PUBLIC_WORK_ORDER_SERVICE_URL="${NGINX_URL}"
   export NEXT_PUBLIC_ASSET_SERVICE_URL="${NGINX_URL}"
   export NEXT_PUBLIC_API_URL="${NGINX_URL}"
   ```

2. **更新Dockerfile构建参数** (`deploy/Server/web-service/Dockerfile`):
   ```dockerfile
   ARG NEXT_PUBLIC_USER_SERVICE_URL=http://localhost:3030
   ARG NEXT_PUBLIC_WORK_ORDER_SERVICE_URL=http://localhost:3030
   ARG NEXT_PUBLIC_ASSET_SERVICE_URL=http://localhost:3030
   ENV NEXT_PUBLIC_USER_SERVICE_URL=$NEXT_PUBLIC_USER_SERVICE_URL
   ENV NEXT_PUBLIC_WORK_ORDER_SERVICE_URL=$NEXT_PUBLIC_WORK_ORDER_SERVICE_URL
   ENV NEXT_PUBLIC_ASSET_SERVICE_URL=$NEXT_PUBLIC_ASSET_SERVICE_URL
   ```

3. **部署时指定服务器IP**:
   ```bash
   cd deploy/Server/web-service
   SERVER_IP=10.163.144.13 ./deploy.sh
   ```

**关键点**: Next.js在**构建时**将`NEXT_PUBLIC_*`变量嵌入静态文件，运行时无法修改

---

### 2. API端点404错误 - Nginx路由配置缺失

**症状**：
```
浏览器Network面板显示404错误:
- GET /api/notifications/my/stats 404 (Not Found)
- GET /api/settings/categories-with-reasons 404 (Not Found) 
- GET /api/settings/fault-codes 404 (Not Found)
- GET /api/assignment-rules 404 (Not Found)
```

**根本原因**：
Nginx反向代理配置中缺少部分API路由映射

**解决方案**：
修改 `deploy/Server/nginx/deploy.sh`，添加缺失的API路由：

```nginx
# 完整的API路由配置
location /api/auth {
    proxy_pass http://user_service;
    include /etc/nginx/proxy_params;
}

location /api/users {
    proxy_pass http://user_service;
    include /etc/nginx/proxy_params;
}

location /api/settings {              # 新增
    proxy_pass http://user_service;
    include /etc/nginx/proxy_params;
}

location /api/work-orders {
    proxy_pass http://work_order_service;
    include /etc/nginx/proxy_params;
}

location /api/assignment-rules {      # 新增
    proxy_pass http://work_order_service;
    include /etc/nginx/proxy_params;
}

location /api/notifications {         # 新增
    proxy_pass http://work_order_service;
    include /etc/nginx/proxy_params;
}

location /api/assets {
    proxy_pass http://asset_service;
    include /etc/nginx/proxy_params;
}
```

**API端点与微服务映射表**：
| API路径 | 微服务 | 说明 |
|---------|--------|------|
| `/api/auth` | user-service | 用户认证 |
| `/api/users` | user-service | 用户管理 |
| `/api/settings` | user-service | 系统设置(分类、故障代码) |
| `/api/work-orders` | work-order-service | 工单管理 |
| `/api/assignment-rules` | work-order-service | 工单分配规则 |
| `/api/notifications` | work-order-service | 通知管理 |
| `/api/assets` | asset-service | 资产管理 |

---

## 📋 标准远程部署流程

基于实际经验的完整部署步骤：

### 1. 环境准备
```bash
# 服务器环境检查
uname -a  # Ubuntu 24.04.3 LTS
docker --version
docker-compose --version

# 克隆最新代码
git clone https://github.com/BenQue/emaintenance.git
cd emaintenance
```

### 2. 按顺序部署服务
```bash
# 基础设施
cd deploy/Server/infrastructure
./deploy.sh

# 数据库初始化
cd ../database  
./manual-init.sh

# 微服务(按顺序)
cd ../user-service
./deploy.sh

cd ../work-order-service
./deploy.sh

cd ../asset-service
./deploy.sh

# Web服务(关键：指定服务器IP)
cd ../web-service
SERVER_IP=$(curl -s ifconfig.me) ./deploy.sh
# 或手动指定: SERVER_IP=10.163.144.13 ./deploy.sh

# Nginx反向代理
cd ../nginx
./deploy.sh
```

### 3. 部署验证
```bash
# 检查所有容器状态
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep emaintenance

# 测试登录功能
curl -X POST http://YOUR_SERVER_IP:3030/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"admin123"}' | jq

# 浏览器访问测试
# http://YOUR_SERVER_IP:3030
# 用户名: admin, 密码: admin123
```

---

## 🚨 常见错误预防

### 1. **永远不要在远程部署中使用localhost**
- ❌ 错误: `NEXT_PUBLIC_API_URL=http://localhost:3030`
- ✅ 正确: `NEXT_PUBLIC_API_URL=http://10.163.144.13:3030`

### 2. **确保所有API路由都在Nginx中配置**
每当添加新的API端点时，记得更新Nginx配置

### 3. **Web服务构建时环境变量**
Next.js构建时需要所有`NEXT_PUBLIC_*`变量，确保Dockerfile支持所有必要的ARG参数

### 4. **服务启动顺序很重要**
基础设施 → 数据库 → 微服务 → Web应用 → Nginx代理

---

## 🔍 快速故障诊断

### 症状: 页面能登录但无法显示数据
**检查**:
1. 浏览器F12 → Network面板，查看失败的API请求
2. 确认请求URL是否使用正确的服务器IP
3. 检查是否有404错误的API端点

**解决**:
```bash
# 重新构建Web服务
cd deploy/Server/web-service
SERVER_IP=YOUR_SERVER_IP ./deploy.sh

# 重新部署Nginx
cd ../nginx
./deploy.sh
```

### 症状: API返回404错误
**检查**: Nginx配置是否包含该API路由
```bash
docker exec emaintenance-nginx cat /etc/nginx/nginx.conf | grep -A2 -B2 "location.*api"
```

**解决**: 添加缺失的API路由到Nginx配置并重新部署

---

## 📊 部署成功指标

### 容器健康状态
所有容器应显示`healthy`状态：
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### API功能测试
```bash
# 获取登录token
TOKEN=$(curl -s -X POST http://YOUR_SERVER_IP:3030/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"identifier":"admin","password":"admin123"}' \
    | jq -r '.data.token')

# 测试各API端点
curl -H "Authorization: Bearer $TOKEN" http://YOUR_SERVER_IP:3030/api/work-orders
curl -H "Authorization: Bearer $TOKEN" http://YOUR_SERVER_IP:3030/api/assets  
curl -H "Authorization: Bearer $TOKEN" http://YOUR_SERVER_IP:3030/api/users
curl -H "Authorization: Bearer $TOKEN" http://YOUR_SERVER_IP:3030/api/notifications/my/stats
curl -H "Authorization: Bearer $TOKEN" http://YOUR_SERVER_IP:3030/api/settings/categories-with-reasons
```

### 前端功能验证
浏览器访问各页面应该能够：
- ✅ 正常登录
- ✅ 显示工单列表
- ✅ 显示设备管理内容  
- ✅ 所有导航页面正常
- ✅ 无Console错误

---

## 💡 关键经验教训

1. **本地与远程的根本差异**: 
   - 本地开发使用localhost，远程部署必须使用实际IP地址
   - 容器化环境的网络配置与本地开发完全不同

2. **Next.js构建时变量的特殊性**:
   - `NEXT_PUBLIC_*`变量在构建时嵌入代码，运行时无法修改
   - 必须在构建时指定正确的服务器IP

3. **系统性问题需要系统性解决**:
   - 不要头痛医头脚痛医脚
   - 先理解架构，再定位根本原因

4. **完整的测试验证很重要**:
   - API测试确认后端服务正常
   - 浏览器测试确认前端配置正确
   - 端到端测试确认完整流程

---

## 🔗 相关文档

- [快速部署指南](QUICK_DEPLOYMENT_GUIDE.md)  
- [已知问题列表](KNOWN_ISSUES.md)
- [部署问题总结](DEPLOYMENT_ISSUES_SUMMARY.md)

**部署支持**: 如遇到问题，请按照此文档中的诊断步骤排查，大部分问题都能快速解决。

---

*最后更新: 2025-08-27*  
*测试环境: Ubuntu 24.04.3 LTS (中国区服务器)*  
*部署状态: ✅ 完美运行*