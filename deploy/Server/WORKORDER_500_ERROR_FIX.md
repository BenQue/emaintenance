# Work Order 500 错误诊断和解决方案

## 🚨 错误信息
```
GET http://10.163.144.13:3030/work-order-service/api/work-orders?sortBy=reportedAt&sortOrder=desc&status=ACTIVE&page=1&limit=20 500 (Internal Server Error)
```

## 🔍 问题分析

### 可能的原因

1. **Nginx 服务名称解析失败**
   - Nginx 配置使用 `work-order-service:3002`
   - Docker Compose 容器名是 `emaintenance-work-order-service`
   - 如果不在同一个 Docker 网络中，会导致无法解析

2. **数据库连接问题**
   - Prisma 客户端无法连接到 PostgreSQL
   - DATABASE_URL 配置错误
   - 数据库密码不匹配

3. **环境变量缺失**
   - JWT_SECRET 未设置
   - POSTGRES_PASSWORD 未设置
   - 其他必需环境变量缺失

4. **Prisma 客户端未生成**
   - 容器启动时 Prisma 客户端未正确生成
   - 数据库模式不匹配

## 🛠️ 诊断步骤（在服务器上执行）

### 步骤 1: 运行自动诊断脚本

```bash
cd /opt/emaintenance/deploy/Server
./diagnose-workorder-error.sh
```

### 步骤 2: 手动检查服务状态

```bash
# 1. 检查所有容器状态
docker-compose ps

# 2. 查看 work-order-service 日志（最后100行）
docker-compose logs --tail=100 work-order-service

# 3. 查看实时日志
docker-compose logs -f work-order-service
```

### 步骤 3: 检查网络连接

```bash
# 检查 Docker 网络
docker network ls | grep emaintenance

# 检查容器是否在同一网络
docker network inspect emaintenance-network

# 从 nginx 容器测试连接到 work-order-service
docker-compose exec nginx wget -O- http://work-order-service:3002/health
```

### 步骤 4: 检查环境变量

```bash
# 检查 .env 文件
cat .env | grep -E "POSTGRES_PASSWORD|JWT_SECRET|DATABASE_URL"

# 检查容器内的环境变量
docker-compose exec work-order-service env | grep -E "DATABASE_URL|JWT_SECRET"
```

### 步骤 5: 检查数据库连接

```bash
# 测试数据库连接
docker-compose exec postgres psql -U postgres -c "SELECT 1;"

# 检查数据库是否存在
docker-compose exec postgres psql -U postgres -c "\l"

# 查看工单表
docker-compose exec postgres psql -U postgres -d emaintenance -c "SELECT COUNT(*) FROM work_orders;"
```

## ✅ 解决方案

### 方案 1: 重启服务（首选）

```bash
cd /opt/emaintenance/deploy/Server

# 重启 work-order-service
docker-compose restart work-order-service

# 查看启动日志
docker-compose logs -f work-order-service
```

### 方案 2: 修复 Nginx 服务名称（如果方案1无效）

**检查是否是服务名称问题：**

```bash
# 1. 检查 Nginx 配置中的服务名
docker-compose exec nginx cat /etc/nginx/nginx.conf | grep work_order_service

# 2. 检查实际的容器名和网络别名
docker inspect emaintenance-work-order-service | grep -A 10 NetworkSettings
```

**修复方法 A - 修改 Nginx 配置：**

编辑 `/opt/emaintenance/deploy/Server/configs/nginx.conf`，将 upstream 改为：

```nginx
upstream work_order_service {
    server emaintenance-work-order-service:3002;
}
```

然后重启 Nginx：
```bash
docker-compose restart nginx
```

**修复方法 B - 添加网络别名（推荐）：**

编辑 `/opt/emaintenance/deploy/Server/work-order-service/docker-compose.yml`，添加网络别名：

```yaml
services:
  work-order-service:
    # ... 其他配置
    networks:
      emaintenance-network:
        aliases:
          - work-order-service
```

然后重新创建容器：
```bash
docker-compose up -d work-order-service
```

### 方案 3: 重新生成 Prisma 客户端

```bash
# 进入容器
docker-compose exec work-order-service sh

# 重新生成 Prisma 客户端
cd /app
npm run db:generate

# 退出并重启
exit
docker-compose restart work-order-service
```

### 方案 4: 检查和修复环境变量

```bash
# 1. 确认 .env 文件包含所有必需变量
cd /opt/emaintenance/deploy/Server

# 2. 检查 .env 文件
cat .env

# 3. 如果缺少变量，从根目录复制
cp /opt/emaintenance/.env .env

# 4. 重新创建服务以加载新的环境变量
docker-compose up -d work-order-service
```

### 方案 5: 完全重建服务

```bash
cd /opt/emaintenance/deploy/Server

# 停止并删除容器
docker-compose down work-order-service

# 重新构建镜像
docker-compose build work-order-service

# 启动服务
docker-compose up -d work-order-service

# 查看日志确认启动成功
docker-compose logs -f work-order-service
```

## 🔧 验证修复

执行以下命令验证问题是否解决：

```bash
# 1. 检查服务健康状态
docker-compose ps work-order-service

# 2. 测试健康检查端点
curl http://localhost:3002/health

# 3. 从 Nginx 测试
docker-compose exec nginx wget -O- http://work-order-service:3002/health

# 4. 测试实际的工单列表 API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3030/work-order-service/api/work-orders?page=1&limit=10
```

## 📊 常见错误日志和解决方法

### 错误 1: "Error: P1001: Can't reach database server"

**原因**: 数据库连接失败

**解决**:
```bash
# 检查数据库容器状态
docker-compose ps postgres

# 重启数据库
docker-compose restart postgres

# 检查 DATABASE_URL 格式
docker-compose exec work-order-service env | grep DATABASE_URL
```

### 错误 2: "Error: PrismaClient is unable to run in production"

**原因**: Prisma 客户端未生成

**解决**:
```bash
docker-compose exec work-order-service npm run db:generate
docker-compose restart work-order-service
```

### 错误 3: "JsonWebTokenError: jwt must be provided"

**原因**: JWT_SECRET 环境变量未设置

**解决**:
```bash
# 检查 .env 文件
grep JWT_SECRET /opt/emaintenance/deploy/Server/.env

# 如果缺失，添加
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# 重启服务
docker-compose up -d work-order-service
```

### 错误 4: "upstream timed out"

**原因**: Nginx 无法连接到 work-order-service

**解决**:
```bash
# 检查网络连接
docker-compose exec nginx ping work-order-service

# 如果失败，检查网络配置
docker network inspect emaintenance-network

# 重启 Nginx 和 work-order-service
docker-compose restart nginx work-order-service
```

## 🚀 预防措施

### 1. 添加启动等待脚本

在 `docker-compose.yml` 中添加 `depends_on` 和健康检查：

```yaml
services:
  work-order-service:
    depends_on:
      postgres:
        condition: service_healthy
    # ... 其他配置
```

### 2. 启用详细日志

临时启用详细日志进行调试：

```bash
# 设置 LOG_LEVEL=debug
docker-compose exec work-order-service sh -c 'export LOG_LEVEL=debug && npm start'
```

### 3. 定期健康检查

添加到 crontab：

```bash
# 每5分钟检查一次服务健康
*/5 * * * * cd /opt/emaintenance/deploy/Server && ./status.sh quick >> /var/log/emaintenance-health.log 2>&1
```

## 📞 获取帮助

如果以上方案都无法解决问题，请收集以下信息：

```bash
# 收集诊断信息
cd /opt/emaintenance/deploy/Server

# 1. 服务状态
./status.sh > diagnostic-$(date +%Y%m%d-%H%M%S).log

# 2. 完整日志
docker-compose logs --tail=500 work-order-service >> diagnostic-$(date +%Y%m%d-%H%M%S).log

# 3. 环境变量（移除敏感信息后）
docker-compose config >> diagnostic-$(date +%Y%m%d-%H%M%S).log

# 4. 网络配置
docker network inspect emaintenance-network >> diagnostic-$(date +%Y%m%d-%H%M%S).log
```

将生成的 `diagnostic-*.log` 文件发送给技术支持团队。

---

**更新时间**: 2025-10-11
**文档版本**: 1.0
