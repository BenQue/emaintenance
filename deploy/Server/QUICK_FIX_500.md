# 🚨 Work Order 500 错误 - 快速修复指南

> **问题**: 本地正常，服务器上 500 错误 → 这是部署环境配置问题

## ⚡ 立即执行（在服务器上）

### 第一步：查看错误日志（找到根本原因）

```bash
cd /opt/emaintenance/deploy/Server

# 查看 work-order-service 最近的错误
docker-compose logs --tail=50 work-order-service | grep -i "error"
```

**根据日志类型跳转到对应解决方案** ⬇️

---

## 🔥 常见错误和快速修复

### 错误类型 A: 数据库连接失败

**日志特征**:
```
Error: P1001: Can't reach database server
Connection refused
ECONNREFUSED
```

**快速修复**:
```bash
# 1. 检查数据库容器
docker-compose ps postgres

# 2. 如果未运行，启动数据库
docker-compose up -d postgres

# 3. 重启 work-order-service
docker-compose restart work-order-service

# 4. 验证
docker-compose logs --tail=20 work-order-service
```

---

### 错误类型 B: Prisma 客户端问题

**日志特征**:
```
PrismaClient is unable to run in production
Invalid `prisma.xxx.findMany()` invocation
Module not found: @prisma/client
```

**快速修复**:
```bash
# 进入容器重新生成 Prisma 客户端
docker-compose exec work-order-service sh -c "cd /app && npm run db:generate"

# 重启服务
docker-compose restart work-order-service

# 查看日志确认
docker-compose logs --tail=20 work-order-service
```

---

### 错误类型 C: 环境变量缺失

**日志特征**:
```
JWT_SECRET is not defined
DATABASE_URL is required
POSTGRES_PASSWORD is missing
```

**快速修复**:
```bash
# 1. 检查环境变量文件
cd /opt/emaintenance/deploy/Server
cat .env | grep -E "JWT_SECRET|POSTGRES_PASSWORD|DATABASE_URL"

# 2. 如果 .env 不存在或缺少变量，从项目根目录复制
cp /opt/emaintenance/.env .env

# 3. 验证必需变量存在
grep -E "JWT_SECRET|POSTGRES_PASSWORD" .env

# 4. 如果还是缺少，手动添加
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "POSTGRES_PASSWORD=YourStrongPassword123" >> .env

# 5. 重新创建容器以加载新环境变量
docker-compose up -d work-order-service

# 6. 验证环境变量已加载
docker-compose exec work-order-service env | grep -E "JWT_SECRET|DATABASE_URL"
```

---

### 错误类型 D: Nginx 无法连接到服务

**日志特征**:
```
upstream timed out
no live upstreams
Connection refused (work-order-service)
```

**快速修复**:
```bash
# 1. 测试 Nginx 到 work-order-service 的连接
docker-compose exec nginx wget -O- http://work-order-service:3002/health

# 2. 如果失败，检查网络
docker network inspect emaintenance-network | grep work-order

# 3. 重启 Nginx 和 work-order-service
docker-compose restart nginx work-order-service

# 4. 再次测试连接
docker-compose exec nginx wget -O- http://work-order-service:3002/health
```

**如果还是失败**，服务名称解析有问题，需要添加网络别名：

```bash
# 编辑 work-order-service 的 docker-compose.yml
nano /opt/emaintenance/deploy/Server/work-order-service/docker-compose.yml

# 在 networks 部分修改为：
# networks:
#   emaintenance-network:
#     aliases:
#       - work-order-service

# 重新创建容器
cd /opt/emaintenance/deploy/Server
docker-compose up -d work-order-service
```

---

### 错误类型 E: 端口冲突或未监听

**日志特征**:
```
EADDRINUSE: address already in use
bind() to 0.0.0.0:3002 failed
```

**快速修复**:
```bash
# 1. 检查端口占用
netstat -tulnp | grep 3002

# 2. 找出占用进程并停止
lsof -i :3002
# 或
kill -9 $(lsof -t -i:3002)

# 3. 重启服务
docker-compose restart work-order-service
```

---

## 🎯 通用修复（适用于所有情况）

如果上面的方案都不管用，执行完全重建：

```bash
cd /opt/emaintenance/deploy/Server

# 1. 停止所有服务
docker-compose down

# 2. 确保 .env 文件正确
cp /opt/emaintenance/.env .env

# 3. 重新启动基础设施（数据库、Redis）
docker-compose -f infrastructure/docker-compose.yml up -d

# 4. 等待数据库就绪（重要！）
sleep 10

# 5. 启动 work-order-service
docker-compose -f work-order-service/docker-compose.yml up -d

# 6. 启动其他服务
docker-compose -f user-service/docker-compose.yml up -d
docker-compose -f asset-service/docker-compose.yml up -d
docker-compose -f web-service/docker-compose.yml up -d
docker-compose -f nginx/docker-compose.yml up -d

# 7. 检查所有服务状态
./status.sh quick
```

---

## ✅ 验证修复成功

```bash
# 1. 检查服务健康
docker-compose ps work-order-service

# 2. 测试健康检查
curl http://localhost:3002/health

# 3. 查看最新日志（应该没有错误）
docker-compose logs --tail=30 work-order-service

# 4. 从浏览器测试工单列表 API
# 访问: http://10.163.144.13:3030/work-order-service/api/work-orders?page=1&limit=10
```

---

## 🔍 如果问题仍然存在

运行完整诊断脚本：

```bash
cd /opt/emaintenance/deploy/Server
./diagnose-workorder-error.sh > diagnosis-$(date +%Y%m%d-%H%M%S).log

# 查看诊断结果
cat diagnosis-*.log
```

或查看详细修复文档：
```bash
cat WORKORDER_500_ERROR_FIX.md
```

---

## 📋 最可能的问题排序（基于经验）

1. **80%**: 环境变量未正确加载 → 检查 .env 文件
2. **15%**: 数据库连接失败 → 重启 postgres 和 work-order-service
3. **3%**: Nginx 服务名称解析失败 → 添加网络别名
4. **2%**: Prisma 客户端未生成 → 重新生成客户端

---

**快速联系**: 如果急需解决，请提供完整的错误日志：
```bash
docker-compose logs --tail=100 work-order-service > error.log
```
