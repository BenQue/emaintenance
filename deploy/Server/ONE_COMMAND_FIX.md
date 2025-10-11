# 🚀 一键修复命令 - Work Order 500 错误

## 问题诊断

你遇到的是**数据库模式不匹配**问题：
1. ❌ `WorkOrderStatus` 枚举缺少 `CLOSED` 值
2. ❌ `work_orders` 表缺少 `work_order_number` 字段
3. ⚠️  Nginx 服务异常

---

## ⚡ 方案 1: 一键自动修复（推荐）

**直接复制粘贴到服务器执行**:

```bash
cd /opt/emaintenance/deploy/Server && ./fix-database-schema.sh
```

**执行内容**:
- ✅ 自动备份数据库
- ✅ 应用 Prisma 迁移
- ✅ 重新生成客户端
- ✅ 重启服务
- ✅ 验证修复结果

---

## ⚡ 方案 2: 快速手动修复（3 分钟）

### 在服务器上复制粘贴执行：

```bash
# ========== 步骤 1: 进入目录 ==========
cd /opt/emaintenance/deploy/Server

# ========== 步骤 2: 备份数据库 ==========
echo "📦 备份数据库..."
docker-compose exec -T postgres pg_dump -U postgres emaintenance > /tmp/db_backup_$(date +%Y%m%d_%H%M%S).sql && echo "✅ 备份完成"

# ========== 步骤 3: 应用数据库迁移 ==========
echo "🔄 应用数据库迁移..."
docker-compose exec work-order-service sh -c "cd /app/packages/database && npx prisma migrate deploy" || \
docker-compose exec work-order-service sh -c "cd /app/packages/database && npx prisma db push --accept-data-loss"

# ========== 步骤 4: 重新生成 Prisma 客户端 ==========
echo "🔧 重新生成 Prisma 客户端..."
docker-compose exec work-order-service sh -c "cd /app/packages/database && npx prisma generate"

# ========== 步骤 5: 重启服务 ==========
echo "♻️  重启服务..."
docker-compose restart work-order-service nginx

# ========== 步骤 6: 等待服务启动 ==========
echo "⏳ 等待服务启动..."
sleep 10

# ========== 步骤 7: 验证修复 ==========
echo "✅ 验证修复结果..."
docker-compose logs --tail=20 work-order-service | grep -i "error" && echo "⚠️  发现错误" || echo "✅ 无错误，修复成功！"

# ========== 步骤 8: 测试健康检查 ==========
echo "🏥 测试健康检查..."
curl -s http://localhost:3002/health && echo "" && echo "✅ 服务健康" || echo "❌ 服务异常"
```

---

## ⚡ 方案 3: 超级简化版（1 分钟）

**如果迁移文件不在容器中**，使用 `db push`:

```bash
cd /opt/emaintenance/deploy/Server && \
docker-compose exec -T postgres pg_dump -U postgres emaintenance > /tmp/backup_$(date +%Y%m%d_%H%M%S).sql && \
docker-compose exec work-order-service sh -c "cd /app/packages/database && npx prisma db push --accept-data-loss && npx prisma generate" && \
docker-compose restart work-order-service nginx && \
sleep 10 && \
echo "✅ 修复完成，查看日志：" && \
docker-compose logs --tail=20 work-order-service
```

---

## 🔍 验证修复成功

### 检查 1: 数据库枚举值

```bash
docker-compose exec postgres psql -U postgres -d emaintenance -c "
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'WorkOrderStatus')
ORDER BY enumsortorder;
"
```

**应该看到**:
```
PENDING
ASSIGNED
IN_PROGRESS
WAITING_FOR_PARTS
ON_HOLD
COMPLETED
CLOSED      ← 这个必须存在
CANCELLED
```

### 检查 2: 数据库字段

```bash
docker-compose exec postgres psql -U postgres -d emaintenance -c "
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'work_orders'
AND column_name LIKE '%order%number%'
ORDER BY column_name;
"
```

**应该看到**:
```
work_order_number   ← 这个必须存在
```

### 检查 3: 服务日志

```bash
docker-compose logs --tail=50 work-order-service | grep -i "error\|listening\|ready"
```

**应该看到类似**:
```
Server is listening on port 3002
Ready to accept connections
```

**不应该看到**:
```
❌ invalid input value for enum "WorkOrderStatus": "CLOSED"
❌ The column `work_orders.workOrderNumber` does not exist
```

### 检查 4: API 测试

```bash
# 测试健康检查
curl http://localhost:3002/health

# 测试工单列表（会返回 401 是正常的，因为没有 token）
curl http://localhost:3002/api/work-orders?page=1&limit=10
```

### 检查 5: Nginx 连接

```bash
# 从 Nginx 容器测试连接
docker-compose exec nginx wget -q -O- http://work-order-service:3002/health && echo "✅ Nginx 连接正常" || echo "❌ Nginx 连接失败"
```

---

## 🚨 如果还是失败

### 问题 A: Prisma 找不到迁移文件

**症状**:
```
Error: Could not find a schema.prisma file
```

**解决**:
```bash
# 从项目根目录复制 Prisma 文件到容器
docker cp /opt/emaintenance/packages/database/prisma \
  emaintenance-work-order-service:/app/packages/database/

# 重新执行迁移
docker-compose exec work-order-service sh -c "cd /app/packages/database && npx prisma migrate deploy"
```

### 问题 B: Nginx 无法解析 work-order-service

**症状**:
```
upstream timed out
no live upstreams
```

**解决 - 添加网络别名**:

```bash
# 1. 编辑 docker-compose.yml
nano /opt/emaintenance/deploy/Server/work-order-service/docker-compose.yml

# 2. 在 networks 部分添加：
# networks:
#   emaintenance-network:
#     aliases:
#       - work-order-service

# 3. 重新创建容器
cd /opt/emaintenance/deploy/Server
docker-compose up -d work-order-service nginx
```

**或者快速修复（临时）**:

```bash
# 在 Nginx 配置中使用容器名而不是服务名
docker-compose exec nginx sed -i 's/work-order-service/emaintenance-work-order-service/g' /etc/nginx/nginx.conf
docker-compose restart nginx
```

### 问题 C: 迁移后还是同样错误

**可能原因**: Prisma 客户端缓存

**解决**:
```bash
# 清除 Prisma 客户端缓存
docker-compose exec work-order-service sh -c "rm -rf /app/node_modules/.prisma /app/node_modules/@prisma"

# 重新安装和生成
docker-compose exec work-order-service sh -c "cd /app && npm install @prisma/client && cd /app/packages/database && npx prisma generate"

# 重启服务
docker-compose restart work-order-service
```

---

## 📊 完整诊断命令

如果需要收集完整诊断信息：

```bash
cd /opt/emaintenance/deploy/Server

# 创建诊断报告
{
  echo "========== 服务状态 =========="
  docker-compose ps

  echo ""
  echo "========== WorkOrderStatus 枚举值 =========="
  docker-compose exec postgres psql -U postgres -d emaintenance -c "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'WorkOrderStatus');"

  echo ""
  echo "========== work_orders 表字段 =========="
  docker-compose exec postgres psql -U postgres -d emaintenance -c "\d work_orders"

  echo ""
  echo "========== Work Order Service 日志 =========="
  docker-compose logs --tail=50 work-order-service

  echo ""
  echo "========== Nginx 日志 =========="
  docker-compose logs --tail=30 nginx

  echo ""
  echo "========== 网络连接测试 =========="
  docker-compose exec nginx wget -O- http://work-order-service:3002/health 2>&1

} > diagnostic_report_$(date +%Y%m%d_%H%M%S).txt

# 查看报告
cat diagnostic_report_*.txt
```

---

## ✅ 成功标志

修复成功后，你应该能够：

1. ✅ 访问 `http://10.163.144.13:3030/work-order-service/api/work-orders` 不再返回 500
2. ✅ 服务日志中没有 `invalid input value for enum` 错误
3. ✅ 服务日志中没有 `column does not exist` 错误
4. ✅ Nginx 可以正常连接到 work-order-service
5. ✅ 工单列表页面正常显示

---

**预计修复时间**: 3-5 分钟
**风险等级**: 低（已包含数据库备份）
**回滚方法**: 使用备份的 SQL 文件恢复数据库
