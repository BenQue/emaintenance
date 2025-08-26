# 📊 E-Maintenance 数据库部署

## 📁 目录说明

- `init.sh` - 自动初始化脚本（需要修复）
- `manual-init.sh` - 手动初始化脚本（推荐使用）
- `migrate.sh` - 数据库迁移脚本
- `seed.sh` - 种子数据填充脚本
- `backup.sh` - 数据库备份脚本

## 🚀 数据库初始化

### 方法一：手动初始化（推荐）

```bash
# 给脚本执行权限
chmod +x manual-init.sh

# 运行手动初始化
./manual-init.sh
```

### 方法二：分步执行

```bash
# 1. 创建数据库
docker exec emaintenance-postgres psql -U postgres -d postgres -c "CREATE DATABASE emaintenance;"

# 2. 运行Prisma迁移（在项目根目录）
cd ../../..
npm run db:generate
npm run db:push

# 3. 初始化主数据
docker exec -i emaintenance-postgres psql -U postgres -d emaintenance < init-master-data.sql

# 4. 运行种子数据
npm run db:seed
```

## ⚠️ 已知问题

### 端口配置问题
- **问题**: 自动脚本使用默认端口5432，但实际PostgreSQL映射到5433
- **解决**: 使用 `manual-init.sh` 或设置环境变量 `POSTGRES_PORT=5433`

### 连接参数问题
- **外部连接**: `postgresql://postgres:password@localhost:5433/emaintenance`
- **容器内部**: `postgresql://postgres:password@emaintenance-postgres:5432/emaintenance`

## 📝 数据库内容

### 主数据（Master Data）
初始化后包含：
- **用户**: 4个默认用户（管理员、主管、技术员、员工）
- **资产**: 4个示例资产（数控机床、空压机、叉车、激光切割机）
- **工单**: 3个示例工单（保养、维修、检验）
- **分配规则**: 2个自动分配规则
- **通知**: 2个示例通知

### 默认账号
| 角色 | 邮箱 | 用户名 |
|------|------|------|
| 管理员 | admin@emaintenance.com | admin |
| 主管 | supervisor@emaintenance.com | supervisor |
| 技术员 | technician@emaintenance.com | technician |
| 员工 | employee@emaintenance.com | employee |

*注：默认账号需要在实际部署时设置安全密码*

## 🔧 故障排查

### PostgreSQL连接失败
```bash
# 检查容器状态
docker ps | grep emaintenance-postgres

# 检查端口监听
netstat -tlnp | grep 5433

# 测试连接
docker exec emaintenance-postgres pg_isready -U postgres
```

### Prisma迁移失败
```bash
# 清理并重新生成
rm -rf node_modules/.prisma
npm run db:generate
npm run db:push
```

## 📊 验证数据库

```bash
# 查看所有表
docker exec emaintenance-postgres psql -U postgres -d emaintenance -c "\dt"

# 查看数据统计
docker exec emaintenance-postgres psql -U postgres -d emaintenance -c "
    SELECT 'Users' as entity, COUNT(*) FROM \"User\"
    UNION ALL SELECT 'Assets', COUNT(*) FROM \"Asset\"
    UNION ALL SELECT 'WorkOrders', COUNT(*) FROM \"WorkOrder\";
"

# 查看用户列表
docker exec emaintenance-postgres psql -U postgres -d emaintenance -c "SELECT email, role FROM \"User\";"
```

## 🔄 数据库备份与恢复

### 备份
```bash
# 运行备份脚本
./backup.sh

# 或手动备份
docker exec emaintenance-postgres pg_dump -U postgres emaintenance > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 恢复
```bash
# 恢复数据库
docker exec -i emaintenance-postgres psql -U postgres -d emaintenance < backup_file.sql
```