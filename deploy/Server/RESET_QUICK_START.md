# 🚀 数据库重置 - 快速开始

> **问题**: 本地开发环境修改了数据库字段，服务器数据库模式不匹配
> **解决**: 清空服务器数据库并重新初始化

---

## ⚡ 一分钟快速重置

### 在服务器上执行（3个命令）

```bash
# 1. 进入目录
cd /opt/emaintenance/deploy/Server

# 2. 运行重置脚本
./reset-and-init-database.sh

# 3. 当提示时输入 YES 确认
```

**完成！** 🎉

---

## 🎯 重置完成后

### 1. 访问系统

```
URL: http://YOUR_SERVER_IP:3030
```

### 2. 使用管理员账户登录

```
邮箱: admin@emaintenance.com
密码: admin123
```

### 3. 验证工单列表

- 访问"工单管理"页面
- 应该看到空列表（没有 500 错误）
- ✅ 成功！

---

## 📊 重置后的系统状态

### 数据库状态

| 项目 | 状态 |
|------|------|
| 数据库模式 | ✅ 最新（与代码匹配）|
| 主数据 | ✅ 已导入（位置、分类等）|
| 用户账户 | ✅ 4个测试账户 |
| 工单数据 | ❌ 空（需要手动创建）|
| 资产数据 | ❌ 空（可选导入）|

### 可用的测试账户

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@emaintenance.com | admin123 |
| 主管 | supervisor@emaintenance.com | password123 |
| 技术员 | technician@emaintenance.com | password123 |
| 员工 | employee@emaintenance.com | password123 |

---

## 🔄 如果重置失败

### 问题 1: 脚本找不到

```bash
# 给脚本添加执行权限
chmod +x /opt/emaintenance/deploy/Server/reset-and-init-database.sh

# 重新运行
./reset-and-init-database.sh
```

### 问题 2: Prisma 迁移失败

```bash
# 使用简化版命令
cd /opt/emaintenance/deploy/Server

# 备份
docker-compose exec -T postgres pg_dump -U postgres emaintenance > /tmp/backup_$(date +%Y%m%d_%H%M%S).sql

# 删除并重新创建数据库
docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS emaintenance; CREATE DATABASE emaintenance OWNER postgres;"

# 推送模式（快速方法）
docker-compose exec work-order-service sh -c "cd /app/packages/database && npx prisma db push --accept-data-loss && npx prisma generate"

# 重启服务
docker-compose restart work-order-service user-service asset-service web nginx
```

### 问题 3: 服务启动失败

```bash
# 查看日志
docker-compose logs --tail=50 work-order-service

# 检查环境变量
docker-compose exec work-order-service env | grep -E "DATABASE_URL|JWT_SECRET"

# 重启所有服务
docker-compose restart
```

---

## 📋 重置前检查清单

在执行重置前，确认：

- [ ] 已确认可以删除所有现有数据
- [ ] 已通知相关人员系统将暂时不可用（约5分钟）
- [ ] 服务器磁盘空间充足（至少 5GB）
- [ ] 已准备好主数据文件（通常已包含在项目中）

---

## 🆘 紧急回滚

如果重置后发现问题，立即恢复备份：

```bash
cd /opt/emaintenance/deploy/Server

# 找到最新备份
ls -lht /tmp/emaintenance_backups/

# 恢复备份（替换 TIMESTAMP 为实际时间戳）
docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS emaintenance; CREATE DATABASE emaintenance OWNER postgres;"
docker-compose exec -T postgres psql -U postgres emaintenance < /tmp/emaintenance_backups/emaintenance_backup_TIMESTAMP.sql

# 重启服务
docker-compose restart
```

---

## 📞 需要帮助？

1. **查看详细文档**:
   ```bash
   cat /opt/emaintenance/deploy/Server/DATABASE_RESET_GUIDE.md
   ```

2. **运行诊断**:
   ```bash
   ./diagnose-workorder-error.sh
   ```

3. **查看故障排查索引**:
   ```bash
   cat /opt/emaintenance/deploy/Server/TROUBLESHOOTING_INDEX.md
   ```

---

## ⏱️ 预计时间

| 操作 | 时间 |
|------|------|
| 备份现有数据库 | 10-30秒 |
| 删除并重新创建数据库 | 5秒 |
| 运行 Prisma 迁移 | 30-60秒 |
| 导入主数据 | 10-20秒 |
| 创建初始用户 | 5-10秒 |
| 重启服务 | 15-30秒 |
| **总计** | **3-5分钟** |

---

**快速参考版本**: 1.0
**最后更新**: 2025-10-11
