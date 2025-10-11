# 🔄 数据库完全重置指南

## 📋 概述

本指南用于**完全清空服务器数据库并重新初始化**，解决数据库模式不匹配问题。

### ⚠️ 重要警告

**此操作将删除所有现有数据，包括：**
- ✅ 所有工单记录
- ✅ 所有资产数据
- ✅ 所有用户账户
- ✅ 所有历史记录

**执行前会自动创建备份，但请务必确认！**

---

## 🎯 适用场景

### ✅ 应该使用数据库重置的情况

1. **数据库模式严重不匹配**
   - 本地开发环境修改了数据库字段
   - 服务器数据库缺少新增的表或字段
   - 枚举类型不匹配（如 WorkOrderStatus 缺少 CLOSED）

2. **数据库损坏或不一致**
   - 数据完整性问题
   - 迁移失败导致数据不一致

3. **全新部署或测试环境**
   - 重新开始测试
   - 清理测试数据

### ❌ 不应该使用数据库重置的情况

1. **生产环境有重要数据**
   - 如果有真实业务数据，应该使用增量迁移而不是重置

2. **只是小的模式更新**
   - 可以使用 `fix-database-schema.sh` 进行增量更新

---

## ⚡ 快速执行（推荐）

### 一键重置命令

```bash
cd /opt/emaintenance/deploy/Server
./reset-and-init-database.sh
```

脚本会提示你输入 `YES`（大写）确认。

---

## 📖 详细执行步骤

### 步骤 1: 进入部署目录

```bash
cd /opt/emaintenance/deploy/Server
```

### 步骤 2: 确认准备工作

**检查清单**：
- [ ] 已确认可以删除所有现有数据
- [ ] 已通知相关人员系统将暂时不可用
- [ ] 已准备好主数据文件（位于 `deploy/init/master-data/`）
- [ ] 服务器磁盘空间充足（至少 5GB）

### 步骤 3: 运行重置脚本

```bash
./reset-and-init-database.sh
```

### 步骤 4: 确认执行

脚本会显示警告信息，输入 `YES`（必须大写）确认：

```
⚠️  警告: 此操作将执行以下操作：
   1. 备份现有数据库到 /tmp/emaintenance_backups
   2. 删除并重新创建数据库（清空所有数据）
   3. 运行最新的 Prisma 数据库迁移
   4. 导入主数据（位置、分类、故障表现等）
   5. 创建初始测试用户账户

   ⛔ 所有现有的工单、资产、用户数据将被删除！

确认继续？请输入 'YES' (大写) 确认:
```

### 步骤 5: 等待完成

脚本会自动执行 9 个步骤：

1. ✅ 备份现有数据库
2. ✅ 停止应用服务
3. ✅ 删除并重新创建数据库
4. ✅ 运行 Prisma 迁移
5. ✅ 重新生成 Prisma 客户端
6. ✅ 导入主数据
7. ✅ 创建初始用户账户
8. ✅ 验证数据完整性
9. ✅ 重启所有服务

**预计时间**: 3-5 分钟

---

## 🔑 初始账户信息

重置后会创建以下测试账户：

| 角色 | 邮箱 | 用户名 | 密码 | 权限 |
|------|------|--------|------|------|
| 管理员 | admin@emaintenance.com | admin | admin123 | 全部权限 |
| 主管 | supervisor@emaintenance.com | supervisor | password123 | 管理权限 |
| 技术员 | technician@emaintenance.com | technician | password123 | 技术员权限 |
| 员工 | employee@emaintenance.com | employee | password123 | 基本权限 |

---

## 📊 导入的主数据

### 自动导入的主数据

重置脚本会自动导入以下主数据（如果文件存在）：

1. **位置数据** (`01_locations.sql`)
   - 生产车间A、生产车间B
   - 仓库、办公区等

2. **工单分类** (`02_categories.sql`)
   - 机械故障、电气故障
   - 日常保养、预防性维护
   - 紧急抢修、清洁维护
   - 校准调试、其他

3. **故障表现** (`03_fault_symptoms.sql`)
   - 各类设备故障表现

4. **故障代码** (`04_fault_codes.sql`)
   - 标准故障代码

5. **优先级** (`05_priority_levels.sql`)
   - 低、中、高、紧急

6. **原因代码** (`06_reasons.sql`)
   - 各类故障原因

### 主数据文件位置

```
/opt/emaintenance/deploy/init/master-data/
├── 01_locations.sql
├── 02_categories.sql
├── 03_fault_symptoms.sql
├── 04_fault_codes.sql
├── 05_priority_levels.sql
└── 06_reasons.sql
```

---

## ✅ 验证重置成功

### 检查 1: 服务状态

```bash
cd /opt/emaintenance/deploy/Server
./status.sh quick
```

**期望结果**: 所有服务运行正常

### 检查 2: 数据库内容

```bash
# 检查主数据
docker-compose exec postgres psql -U postgres -d emaintenance -c "
SELECT
    '位置数量' as item, COUNT(*) as count FROM locations
UNION ALL
SELECT '分类数量', COUNT(*) FROM categories
UNION ALL
SELECT '用户数量', COUNT(*) FROM users;
"
```

**期望结果**:
```
    item     | count
-------------+-------
 位置数量    |     4
 分类数量    |     8
 用户数量    |     4
```

### 检查 3: Web 界面访问

1. 访问: `http://YOUR_SERVER_IP:3030`
2. 使用管理员账户登录:
   - 用户名: `admin@emaintenance.com`
   - 密码: `admin123`
3. 访问工单列表页面
4. 确认页面正常显示（应该没有工单数据）

### 检查 4: API 测试

```bash
# 测试健康检查
curl http://localhost:3002/health

# 测试工单列表 API（需要先获取 token）
# 应该返回空列表，而不是 500 错误
```

---

## 🔧 手动执行（高级用户）

如果自动脚本失败，可以手动执行每个步骤：

### 1. 备份数据库

```bash
cd /opt/emaintenance/deploy/Server
docker-compose exec -T postgres pg_dump -U postgres emaintenance > /tmp/backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 停止服务

```bash
docker-compose stop work-order-service user-service asset-service web nginx
```

### 3. 删除并重新创建数据库

```bash
# 删除数据库
docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS emaintenance;"

# 创建新数据库
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE emaintenance OWNER postgres;"
```

### 4. 运行 Prisma 迁移

```bash
# 方法 A: Prisma Migrate Deploy
docker-compose exec work-order-service sh -c "cd /app/packages/database && npx prisma migrate deploy"

# 或者方法 B: Prisma DB Push
docker-compose exec work-order-service sh -c "cd /app/packages/database && npx prisma db push --accept-data-loss"
```

### 5. 重新生成 Prisma 客户端

```bash
docker-compose exec work-order-service sh -c "cd /app/packages/database && npx prisma generate"
```

### 6. 导入主数据

```bash
# 从项目根目录复制主数据文件
PROJECT_ROOT="/opt/emaintenance"
MASTER_DATA_DIR="$PROJECT_ROOT/deploy/init/master-data"

# 导入每个 SQL 文件
for sql_file in $MASTER_DATA_DIR/*.sql; do
    echo "导入: $(basename $sql_file)"
    docker-compose exec -T postgres psql -U postgres -d emaintenance < "$sql_file"
done
```

### 7. 创建初始用户

```bash
docker-compose exec work-order-service sh -c "cd /app/packages/database && npx prisma db seed"
```

### 8. 重启服务

```bash
docker-compose up -d
sleep 15
./status.sh quick
```

---

## 🚨 故障排除

### 问题 1: 备份失败

**错误**:
```
pg_dump: error: connection to server failed
```

**解决**:
```bash
# 检查 PostgreSQL 服务状态
docker-compose ps postgres

# 重启数据库
docker-compose restart postgres
sleep 5

# 重新运行脚本
./reset-and-init-database.sh
```

### 问题 2: Prisma 迁移失败

**错误**:
```
Error: Could not find a schema.prisma file
```

**解决**:
```bash
# 从项目根目录复制 Prisma 文件到容器
docker cp /opt/emaintenance/packages/database/prisma \
  emaintenance-work-order-service:/app/packages/database/

# 重新运行迁移
docker-compose exec work-order-service sh -c "cd /app/packages/database && npx prisma db push --accept-data-loss"
```

### 问题 3: 主数据文件不存在

**错误**:
```
主数据目录不存在
```

**解决**:

脚本会自动创建基本主数据，但你也可以手动创建：

```bash
# 创建位置数据
docker-compose exec -T postgres psql -U postgres -d emaintenance <<EOF
INSERT INTO locations (name, description) VALUES
('生产车间A', '主要生产车间'),
('生产车间B', '辅助生产车间'),
('仓库', '原料和成品仓库'),
('办公区', '行政办公区域')
ON CONFLICT (name) DO NOTHING;
EOF

# 创建工单分类
docker-compose exec -T postgres psql -U postgres -d emaintenance <<EOF
INSERT INTO categories (name, description) VALUES
('机械故障', '机械设备相关故障'),
('电气故障', '电气系统相关故障'),
('日常保养', '设备日常维护保养'),
('预防性维护', '预防性设备检查'),
('紧急抢修', '紧急故障抢修'),
('清洁维护', '设备清洁和维护'),
('校准调试', '设备校准和调试'),
('其他', '其他类型工单')
ON CONFLICT (name) DO NOTHING;
EOF
```

### 问题 4: 服务启动后仍有错误

**症状**: 重置完成但工单列表仍返回 500 错误

**解决**:
```bash
# 1. 检查服务日志
docker-compose logs --tail=50 work-order-service | grep -i "error"

# 2. 验证数据库模式
docker-compose exec postgres psql -U postgres -d emaintenance -c "\d work_orders"

# 3. 清除 Prisma 客户端缓存
docker-compose exec work-order-service sh -c "rm -rf /app/node_modules/.prisma && cd /app/packages/database && npx prisma generate"

# 4. 重启服务
docker-compose restart work-order-service nginx
```

---

## 🔄 恢复备份数据

如果需要恢复重置前的数据：

```bash
# 找到备份文件
ls -lh /tmp/emaintenance_backups/

# 恢复最新备份
LATEST_BACKUP=$(ls -t /tmp/emaintenance_backups/*.sql | head -1)

# 停止服务
cd /opt/emaintenance/deploy/Server
docker-compose stop work-order-service user-service asset-service web nginx

# 删除当前数据库
docker-compose exec postgres psql -U postgres -c "DROP DATABASE emaintenance;"

# 创建新数据库
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE emaintenance OWNER postgres;"

# 恢复备份
docker-compose exec -T postgres psql -U postgres emaintenance < "$LATEST_BACKUP"

# 重启服务
docker-compose up -d
```

---

## 📋 后续步骤

重置完成后：

### 1. 修改默认密码

⚠️ **重要**: 生产环境必须修改默认密码！

```bash
# 登录系统后，在"用户管理"页面修改所有账户密码
```

### 2. 导入资产数据（可选）

如果有资产数据需要导入：

```bash
cd /opt/emaintenance/deploy/init
./scripts/02-import-assets.sh
```

### 3. 配置自动分配规则（可选）

在 Web 界面中配置工单自动分配规则。

### 4. 创建实际用户账户

在"用户管理"页面创建实际的员工账户。

---

## 📞 获取帮助

如果遇到问题：

1. 查看完整日志:
   ```bash
   docker-compose logs --tail=200 work-order-service postgres > full_logs.txt
   ```

2. 检查数据库状态:
   ```bash
   ./status.sh
   ```

3. 运行诊断脚本:
   ```bash
   ./diagnose-workorder-error.sh
   ```

---

**文档版本**: 2.0
**最后更新**: 2025-10-11
**适用环境**: 服务器部署环境
