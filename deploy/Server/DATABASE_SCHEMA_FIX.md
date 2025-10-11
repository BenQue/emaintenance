# 🔧 数据库模式修复 - 500 错误解决方案

## 🚨 问题诊断

你的服务器遇到了两个数据库模式不匹配的问题：

### 错误 1: 枚举值缺失
```
invalid input value for enum "WorkOrderStatus": "CLOSED"
```
→ 数据库的 `WorkOrderStatus` 枚举缺少 `CLOSED` 值

### 错误 2: 字段不存在
```
The column `work_orders.workOrderNumber` does not exist
```
→ 数据库表缺少 `work_order_number` 字段

**根本原因**: 服务器数据库没有运行最新的 Prisma 迁移

---

## ⚡ 快速修复（推荐）

### 方法 A: 自动修复脚本

```bash
cd /opt/emaintenance/deploy/Server

# 运行自动修复脚本（包含备份）
./fix-database-schema.sh
```

脚本会自动完成：
- ✅ 备份当前数据库
- ✅ 应用 Prisma 迁移
- ✅ 重新生成 Prisma 客户端
- ✅ 重启服务
- ✅ 验证修复结果

---

### 方法 B: 手动执行（更灵活）

#### 步骤 1: 备份数据库（必需！）

```bash
cd /opt/emaintenance/deploy/Server

# 创建备份
docker-compose exec -T postgres pg_dump -U postgres emaintenance > /tmp/emaintenance_backup_$(date +%Y%m%d_%H%M%S).sql

# 验证备份文件
ls -lh /tmp/emaintenance_backup_*.sql
```

#### 步骤 2: 检查当前数据库状态

```bash
# 检查 WorkOrderStatus 枚举值
docker-compose exec postgres psql -U postgres -d emaintenance -c "
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'WorkOrderStatus')
ORDER BY enumsortorder;
"

# 检查 work_orders 表字段
docker-compose exec postgres psql -U postgres -d emaintenance -c "\d work_orders"
```

#### 步骤 3: 应用数据库迁移

**选项 A - 生产环境推荐（Prisma Migrate Deploy）**:

```bash
# 从项目根目录复制迁移文件到容器（如果需要）
docker cp /opt/emaintenance/packages/database/prisma/migrations \
  emaintenance-work-order-service:/app/packages/database/prisma/

# 应用迁移
docker-compose exec work-order-service sh -c "
cd /app/packages/database &&
npx prisma migrate deploy
"
```

**选项 B - 快速修复（Prisma DB Push）**:

```bash
# 直接推送模式更改到数据库
docker-compose exec work-order-service sh -c "
cd /app/packages/database &&
npx prisma db push --accept-data-loss
"
```

#### 步骤 4: 重新生成 Prisma 客户端

```bash
docker-compose exec work-order-service sh -c "
cd /app/packages/database &&
npx prisma generate
"
```

#### 步骤 5: 重启服务

```bash
docker-compose restart work-order-service

# 等待服务启动
sleep 10

# 查看启动日志
docker-compose logs --tail=30 work-order-service
```

#### 步骤 6: 验证修复

```bash
# 1. 检查健康状态
curl http://localhost:3002/health

# 2. 测试工单列表 API（需要 JWT token）
curl http://localhost:3002/api/work-orders?page=1&limit=10

# 3. 从浏览器访问
# http://10.163.144.13:3030/work-order-service/api/work-orders?page=1&limit=10

# 4. 检查日志中是否还有错误
docker-compose logs --tail=50 work-order-service | grep -i "error"
```

---

## 🔍 验证数据库模式修复成功

### 检查 WorkOrderStatus 枚举

修复后应该包含这些值：
```bash
docker-compose exec postgres psql -U postgres -d emaintenance -c "
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'WorkOrderStatus')
ORDER BY enumsortorder;
"
```

**期望输出**:
```
 enumlabel
-----------
 PENDING
 ASSIGNED
 IN_PROGRESS
 WAITING_FOR_PARTS
 ON_HOLD
 COMPLETED
 CLOSED
 CANCELLED
```

### 检查 work_orders 表字段

```bash
docker-compose exec postgres psql -U postgres -d emaintenance -c "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'work_orders'
AND column_name IN ('work_order_number', 'workOrderNumber')
ORDER BY column_name;
"
```

**期望输出**:
```
    column_name     | data_type
--------------------+-----------
 work_order_number  | text
```

---

## 🚨 Nginx 问题修复

你提到 Nginx 服务也不正常，检查和修复：

### 检查 Nginx 状态

```bash
# 查看 Nginx 容器状态
docker-compose ps nginx

# 查看 Nginx 日志
docker-compose logs --tail=50 nginx

# 查看 Nginx 错误日志
docker-compose logs nginx | grep -i "error\|warn"
```

### 修复 Nginx 服务

```bash
# 测试 Nginx 配置
docker-compose exec nginx nginx -t

# 如果配置有误，重新加载配置
docker cp /opt/emaintenance/deploy/Server/configs/nginx.conf \
  emaintenance-nginx:/etc/nginx/nginx.conf

# 重启 Nginx
docker-compose restart nginx

# 验证 Nginx 可以连接到后端服务
docker-compose exec nginx wget -O- http://work-order-service:3002/health
```

### 如果 Nginx 无法解析服务名

添加网络别名到 `work-order-service/docker-compose.yml`:

```yaml
services:
  work-order-service:
    # ... 其他配置
    networks:
      emaintenance-network:
        aliases:
          - work-order-service  # 添加这行
```

然后重新创建容器：
```bash
docker-compose up -d work-order-service nginx
```

---

## 📋 完整重启流程（如果上述方法都不行）

```bash
cd /opt/emaintenance/deploy/Server

# 1. 备份数据库
docker-compose exec -T postgres pg_dump -U postgres emaintenance > /tmp/backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 停止所有服务
docker-compose down

# 3. 启动基础设施（数据库、Redis）
docker-compose -f infrastructure/docker-compose.yml up -d

# 4. 等待数据库就绪
sleep 10

# 5. 应用数据库迁移
docker-compose -f infrastructure/docker-compose.yml exec postgres psql -U postgres -d emaintenance -c "SELECT 1;"

# 6. 启动 work-order-service 并应用迁移
docker-compose -f work-order-service/docker-compose.yml up -d
sleep 5
docker-compose -f work-order-service/docker-compose.yml exec work-order-service sh -c "cd /app/packages/database && npx prisma migrate deploy"

# 7. 重启 work-order-service
docker-compose -f work-order-service/docker-compose.yml restart work-order-service

# 8. 启动其他服务
docker-compose -f user-service/docker-compose.yml up -d
docker-compose -f asset-service/docker-compose.yml up -d
docker-compose -f web-service/docker-compose.yml up -d
docker-compose -f nginx/docker-compose.yml up -d

# 9. 检查所有服务状态
./status.sh quick
```

---

## ✅ 验证完整修复

```bash
# 1. 检查所有容器状态
docker-compose ps

# 2. 检查服务健康
./status.sh health

# 3. 测试工单列表 API
curl http://localhost:3030/work-order-service/api/work-orders?page=1&limit=10

# 4. 查看最近日志（应该没有错误）
docker-compose logs --tail=50 work-order-service nginx | grep -i "error" || echo "无错误"
```

---

## 🔄 如果需要回滚

```bash
# 恢复数据库备份
docker-compose exec -T postgres psql -U postgres -d emaintenance < /tmp/emaintenance_backup_YYYYMMDD_HHMMSS.sql

# 重启服务
docker-compose restart work-order-service
```

---

## 📞 常见问题

### Q1: Prisma Migrate Deploy 失败怎么办？

使用 `db push` 作为替代：
```bash
docker-compose exec work-order-service sh -c "cd /app/packages/database && npx prisma db push"
```

### Q2: 迁移后还是报同样的错误？

检查 Prisma 客户端是否正确重新生成：
```bash
# 删除旧的客户端
docker-compose exec work-order-service rm -rf /app/node_modules/.prisma

# 重新生成
docker-compose exec work-order-service sh -c "cd /app/packages/database && npx prisma generate"

# 重启服务
docker-compose restart work-order-service
```

### Q3: Nginx 无法连接到 work-order-service？

```bash
# 检查网络
docker network inspect emaintenance-network | grep work-order

# 从 Nginx 容器测试连接
docker-compose exec nginx ping work-order-service

# 如果失败，添加网络别名（见上文）
```

---

**文档更新**: 2025-10-11
**问题类型**: 数据库模式不匹配
**修复时间**: 约 5-10 分钟
