# 🔧 数据库重置工具集

## 当前问题

你在服务器上遇到了 **500 Internal Server Error**，根本原因是：

1. ❌ **数据库模式不匹配**: `WorkOrderStatus` 枚举缺少 `CLOSED` 值
2. ❌ **缺少字段**: `work_orders` 表缺少 `work_order_number` 字段
3. ❌ **本地开发环境已更新**: 字段已调整，但服务器数据库未同步

---

## 🎯 推荐解决方案

### 方案选择

| 方案 | 适用场景 | 数据保留 | 风险 | 时间 |
|------|----------|----------|------|------|
| **完全重置** | 测试环境/可以清空数据 | ❌ 全部清空 | 低 | 3-5分钟 |
| 增量迁移 | 生产环境/需保留数据 | ✅ 保留 | 中 | 5-10分钟 |

**你的情况推荐**: ✅ **完全重置**（因为本地开发环境字段已调整）

---

## ⚡ 执行重置（3步）

### 步骤 1: SSH 登录服务器

```bash
ssh user@YOUR_SERVER_IP
```

### 步骤 2: 进入部署目录

```bash
cd /opt/emaintenance/deploy/Server
```

### 步骤 3: 运行重置脚本

```bash
./reset-and-init-database.sh
```

**提示输入时**，键入 `YES`（必须大写）确认

---

## 📁 可用工具和文档

### 🚀 自动化脚本

| 脚本 | 功能 | 用途 |
|------|------|------|
| `reset-and-init-database.sh` | 完全重置数据库 | **主要工具**（推荐） |
| `fix-database-schema.sh` | 增量修复模式 | 仅修复模式问题 |
| `diagnose-workorder-error.sh` | 诊断错误 | 分析问题 |

### 📖 详细文档

| 文档 | 内容 | 何时查看 |
|------|------|----------|
| `RESET_QUICK_START.md` | 快速开始指南 | **首先看这个** |
| `DATABASE_RESET_GUIDE.md` | 完整重置指南 | 需要详细步骤 |
| `ONE_COMMAND_FIX.md` | 一键修复命令 | 只需快速修复 |
| `TROUBLESHOOTING_INDEX.md` | 故障排查索引 | 遇到问题 |

---

## 🔑 重置后的初始账户

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@emaintenance.com | admin123 |
| 主管 | supervisor@emaintenance.com | password123 |
| 技术员 | technician@emaintenance.com | password123 |
| 员工 | employee@emaintenance.com | password123 |

⚠️ **重要**: 生产环境必须立即修改这些默认密码！

---

## 📊 重置后系统状态

### ✅ 已完成

- ✅ 数据库模式更新到最新
- ✅ 所有必需的枚举值已添加
- ✅ 所有必需的字段已创建
- ✅ 主数据已导入（位置、分类、故障表现等）
- ✅ 初始测试账户已创建

### ❌ 需要手动完成

- ❌ 资产数据（可选，如需要请手动导入）
- ❌ 实际用户账户（在 Web 界面创建）
- ❌ 工单自动分配规则（可选配置）

---

## ✅ 验证重置成功

### 快速验证（30秒）

```bash
# 1. 检查服务状态
./status.sh quick

# 2. 测试健康检查
curl http://localhost:3002/health

# 3. 检查主数据
docker-compose exec postgres psql -U postgres -d emaintenance -c "
SELECT '位置' as type, COUNT(*) FROM locations
UNION ALL SELECT '分类', COUNT(*) FROM categories
UNION ALL SELECT '用户', COUNT(*) FROM users;"
```

### Web 界面验证

1. 访问: `http://YOUR_SERVER_IP:3030`
2. 登录: `admin@emaintenance.com` / `admin123`
3. 访问"工单管理"页面
4. ✅ 应该看到空列表（不是 500 错误）

---

## 🚨 常见问题

### Q1: 重置会删除哪些数据？

**A**: 会删除所有数据，包括：
- 所有工单记录
- 所有资产数据
- 所有用户账户
- 所有历史记录

**但会保留**:
- 数据库备份（在 `/tmp/emaintenance_backups/`）
- Docker 镜像和容器配置
- 应用代码

### Q2: 重置需要多长时间？

**A**: 通常 3-5 分钟，包括：
- 备份: 10-30秒
- 重置: 1-2分钟
- 导入: 30-60秒
- 验证: 30秒

### Q3: 如果重置失败怎么办？

**A**:
1. 脚本自动创建了备份
2. 查看备份位置: `ls -lh /tmp/emaintenance_backups/`
3. 恢复备份: 参见 `DATABASE_RESET_GUIDE.md` 的"恢复备份"部分

### Q4: 需要停机吗？

**A**:
- 重置期间服务会暂时不可用（约5分钟）
- 建议在维护窗口执行
- 或在用户较少时执行

### Q5: 生产环境可以用吗？

**A**:
- ⚠️ **谨慎使用**
- 仅在确认可以清空所有数据时使用
- 生产环境更推荐增量迁移
- 务必先在测试环境验证

---

## 📞 获取帮助

### 查看文档

```bash
cd /opt/emaintenance/deploy/Server

# 快速开始
cat RESET_QUICK_START.md

# 详细指南
cat DATABASE_RESET_GUIDE.md

# 故障排查
cat TROUBLESHOOTING_INDEX.md
```

### 运行诊断

```bash
# 诊断 Work Order 错误
./diagnose-workorder-error.sh

# 检查系统状态
./status.sh

# 查看完整日志
docker-compose logs --tail=100 work-order-service postgres
```

---

## 🔄 下次如何避免此问题？

### 开发流程建议

1. **本地开发环境修改数据库后**:
   - 运行 `npx prisma migrate dev` 创建迁移文件
   - 提交迁移文件到 Git

2. **部署到服务器时**:
   - 运行 `npx prisma migrate deploy` 应用迁移
   - 不要直接 `db push`

3. **定期同步**:
   - 定期将开发环境的迁移部署到服务器
   - 使用 CI/CD 自动化迁移流程

---

**工具版本**: 2.0
**最后更新**: 2025-10-11
**维护者**: E-Maintenance Team
