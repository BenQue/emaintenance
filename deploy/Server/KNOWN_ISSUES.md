# 🐛 E-Maintenance 已知问题和解决方案

## 🔄 Redis 配置问题

### 问题描述
Redis 7.4.5 启动时报错：`Bad directive or wrong number of arguments` 在配置文件第6行 `keepalive 60`

### 错误日志
```
*** FATAL CONFIG FILE ERROR (Redis 7.4.5) ***
Reading the configuration file, at line 6
>>> 'keepalive 60'
Bad directive or wrong number of arguments
```

### 根本原因
Redis配置文件中使用了错误的指令名：
- ❌ **错误**: `keepalive 60`
- ✅ **正确**: `tcp-keepalive 60`

### 解决方案
1. **修复部署脚本** (已修复)
   ```bash
   # 文件: deploy/Server/infrastructure/deploy.sh
   # 第102行: keepalive 60 → tcp-keepalive 60
   ```

2. **手动修复现有环境**
   ```bash
   cd ~/emaintenance/deploy/Server/infrastructure/
   sed -i 's/keepalive 60/tcp-keepalive 60/g' redis.conf
   docker-compose restart redis
   ```

3. **验证修复**
   ```bash
   docker-compose logs redis --tail 5
   docker exec emaintenance-redis redis-cli ping
   ```

### 影响版本
- Redis 7.4.5
- 影响所有使用 `deploy.sh` 脚本的部署

### 状态
- ✅ **已修复**: 2025-08-26
- ✅ **文档已更新**: 部署清单和故障排查指南

## 🔌 端口冲突处理

### 常见冲突端口
- **5432** (PostgreSQL): 使用 5433 替代
- **6379** (Redis): 使用 6380 替代  
- **3000** (Web应用): 通过 Nginx 代理，内部使用无影响

### 解决策略
1. **自动检测**: 使用 `docker-safety-check.sh` 检查端口冲突
2. **端口映射**: 修改外部端口映射，保持内部端口不变
3. **环境变量**: 通过 `.env` 文件灵活配置端口

## 🗄️ 数据库初始化问题

### 问题描述
数据库初始化脚本 `init.sh` 存在多个问题：
1. 端口配置默认使用5432，但实际映射到5433
2. 服务检测逻辑有误，无法正确识别运行中的PostgreSQL
3. 缺少主数据（Master Data）初始化
4. 缺少测试数据填充

### 解决方案
使用 `manual-init.sh` 手动初始化脚本，包含：
- ✅ 正确的端口配置（5433）
- ✅ 创建数据库
- ✅ Prisma迁移（表结构）
- ✅ 主数据初始化（用户、资产、工单等）
- ✅ 测试数据填充

### 使用方法
```bash
cd deploy/Server/database/
chmod +x manual-init.sh
./manual-init.sh
```

### 影响版本
- 所有使用 `init.sh` 的部署

### 状态
- ✅ **已创建修复脚本**: 2025-08-26
- ✅ **文档已更新**: 部署清单和数据库README
- ⚠️ **表名格式问题**: manual-init.sh使用错误表名格式，已修复

## 🔧 数据库表名格式问题

### 问题描述
manual-init.sh脚本中使用了PascalCase表名格式（如"User", "Asset"），但Prisma生成的实际表名是snake_case格式（如users, assets）。

### 根本原因
- ❌ **错误**: 使用`"User"`、`"Asset"`等PascalCase格式
- ✅ **正确**: 使用`users`、`assets`等snake_case格式

### 解决方案
已修复manual-init.sh中所有SQL语句的表名格式，使用正确的snake_case表名。

### 影响
- 手动SQL插入失败，但Prisma种子脚本正常工作
- 数据库验证查询失败

### 状态
- ✅ **已修复**: 2025-08-26

## 📝 更新记录
- **2025-08-26**: 修复Redis配置问题，更新部署文档
- **2025-08-26**: 添加端口冲突自动检测和解决方案
- **2025-08-26**: 创建完整的数据库手动初始化脚本，包含主数据和测试数据
- **2025-08-26**: 修复数据库表名格式问题（PascalCase → snake_case）

---
**维护说明**: 遇到新问题时，请及时更新此文档