# 🆘 故障排查索引 - E-Maintenance 服务器部署

## 快速导航

根据你遇到的问题类型，选择对应的文档：

---

## 🚨 当前问题：Work Order 500 错误

### ⚡ 立即修复

**症状**: 访问工单列表返回 500 错误，日志显示：
- `invalid input value for enum "WorkOrderStatus": "CLOSED"`
- `The column work_orders.workOrderNumber does not exist`

**解决方案**: 数据库模式不匹配 → **运行数据库迁移**

#### 🎯 推荐方案（按优先级）

1. **一键修复命令**（最快）
   ```bash
   cd /opt/emaintenance/deploy/Server
   ./fix-database-schema.sh
   ```
   📖 详见: `ONE_COMMAND_FIX.md`

2. **手动修复步骤**（更灵活）
   📖 详见: `DATABASE_SCHEMA_FIX.md`

3. **详细诊断和解决方案**（深度排查）
   📖 详见: `WORKORDER_500_ERROR_FIX.md`

---

## 📚 完整文档列表

### 🚀 部署和更新

| 文档 | 用途 | 使用场景 |
|------|------|----------|
| `README.md` | 部署工具概览 | 首次部署、了解工具 |
| `REMOTE_DEPLOYMENT_GUIDE.md` | 完整部署指南 | 详细部署流程 |
| `remote-update.sh` | 统一更新入口 | 更新服务 |
| `update-modules.sh` | 分模块更新 | 高级用户更新 |
| `quick-update.sh` | 快速更新 | 紧急修复 |

### 🔧 故障排查

| 文档/脚本 | 问题类型 | 快速命令 |
|-----------|----------|----------|
| `ONE_COMMAND_FIX.md` | Work Order 500 错误 | `./fix-database-schema.sh` |
| `DATABASE_SCHEMA_FIX.md` | 数据库模式不匹配 | 详细手动步骤 |
| `WORKORDER_500_ERROR_FIX.md` | 工单服务错误 | 完整诊断流程 |
| `QUICK_FIX_500.md` | 500 错误快速修复 | 常见错误解决 |
| `diagnose-workorder-error.sh` | 自动诊断 | `./diagnose-workorder-error.sh` |
| `debug-login.sh` | 登录问题 | `./debug-login.sh` |
| `diagnose-nginx.sh` | Nginx 问题 | `./diagnose-nginx.sh` |

### 📊 监控和状态

| 脚本 | 用途 | 快速命令 |
|------|------|----------|
| `status.sh` | 完整状态报告 | `./status.sh` |
| `status.sh quick` | 快速健康检查 | `./status.sh quick` |
| `status.sh health` | 健康检查详情 | `./status.sh health` |
| `status.sh logs` | 错误日志 | `./status.sh logs` |

### 🔄 回滚和恢复

| 脚本 | 用途 | 快速命令 |
|------|------|----------|
| `rollback.sh` | 服务回滚 | `./rollback.sh` |

---

## 🎯 常见问题快速解决

### 问题 1: 工单列表 500 错误

**错误日志**:
```
invalid input value for enum "WorkOrderStatus": "CLOSED"
The column work_orders.workOrderNumber does not exist
```

**解决**:
```bash
cd /opt/emaintenance/deploy/Server
./fix-database-schema.sh
```

📖 **详细文档**: `ONE_COMMAND_FIX.md`

---

### 问题 2: Nginx 无法连接到服务

**错误日志**:
```
upstream timed out
no live upstreams
```

**解决**:
```bash
cd /opt/emaintenance/deploy/Server

# 测试连接
docker-compose exec nginx wget -O- http://work-order-service:3002/health

# 如果失败，重启服务
docker-compose restart work-order-service nginx
```

📖 **详细文档**: `DATABASE_SCHEMA_FIX.md` → Nginx 问题修复部分

---

### 问题 3: 数据库连接失败

**错误日志**:
```
Error: P1001: Can't reach database server
Connection refused
```

**解决**:
```bash
cd /opt/emaintenance/deploy/Server

# 检查数据库
docker-compose ps postgres

# 重启数据库和服务
docker-compose restart postgres work-order-service
```

📖 **详细文档**: `QUICK_FIX_500.md` → 错误类型 A

---

### 问题 4: 环境变量缺失

**错误日志**:
```
JWT_SECRET is not defined
DATABASE_URL is required
```

**解决**:
```bash
cd /opt/emaintenance/deploy/Server

# 复制环境变量文件
cp /opt/emaintenance/.env .env

# 重新创建容器
docker-compose up -d work-order-service
```

📖 **详细文档**: `QUICK_FIX_500.md` → 错误类型 C

---

### 问题 5: Prisma 客户端问题

**错误日志**:
```
PrismaClient is unable to run in production
Invalid prisma.xxx.findMany() invocation
```

**解决**:
```bash
docker-compose exec work-order-service sh -c "cd /app/packages/database && npx prisma generate"
docker-compose restart work-order-service
```

📖 **详细文档**: `QUICK_FIX_500.md` → 错误类型 B

---

## 🔍 诊断工具

### 自动诊断脚本

```bash
cd /opt/emaintenance/deploy/Server

# Work Order 服务诊断
./diagnose-workorder-error.sh

# Nginx 诊断
./diagnose-nginx.sh

# 登录问题诊断
./debug-login.sh
```

### 手动诊断命令

```bash
# 查看所有服务状态
./status.sh

# 快速健康检查
./status.sh quick

# 查看错误日志
./status.sh logs

# 查看特定服务日志
docker-compose logs --tail=100 work-order-service
docker-compose logs --tail=100 nginx
docker-compose logs --tail=100 postgres
```

---

## 📞 获取帮助

### 收集诊断信息

```bash
cd /opt/emaintenance/deploy/Server

# 生成完整诊断报告
./status.sh > diagnostic_$(date +%Y%m%d_%H%M%S).log

# 收集服务日志
docker-compose logs --tail=500 work-order-service > workorder_logs_$(date +%Y%m%d_%H%M%S).log

# 收集数据库信息
docker-compose exec postgres psql -U postgres -d emaintenance -c "\d work_orders" > db_schema_$(date +%Y%m%d_%H%M%S).log
```

### 联系支持时提供

1. 诊断报告文件
2. 错误日志文件
3. 数据库模式文件
4. 具体的错误截图

---

## 🛡️ 预防措施

### 定期健康检查

添加到 crontab:

```bash
# 每5分钟检查一次
*/5 * * * * cd /opt/emaintenance/deploy/Server && ./status.sh quick >> /var/log/emaintenance-health.log 2>&1
```

### 自动备份

```bash
# 每天凌晨2点备份数据库
0 2 * * * docker-compose -f /opt/emaintenance/deploy/Server/infrastructure/docker-compose.yml exec -T postgres pg_dump -U postgres emaintenance > /backup/emaintenance_$(date +\%Y\%m\%d).sql
```

### 日志监控

```bash
# 监控错误日志
tail -f /var/log/emaintenance-health.log | grep -i "error\|warn"
```

---

## 📋 快速命令参考

```bash
# 进入部署目录
cd /opt/emaintenance/deploy/Server

# 查看服务状态
./status.sh

# 修复数据库问题（当前问题）
./fix-database-schema.sh

# 重启所有服务
docker-compose restart

# 重启单个服务
docker-compose restart work-order-service

# 查看日志
docker-compose logs -f work-order-service

# 更新服务
./remote-update.sh

# 回滚服务
./rollback.sh
```

---

**文档更新**: 2025-10-11
**版本**: 2.0
**适用环境**: 服务器部署环境
