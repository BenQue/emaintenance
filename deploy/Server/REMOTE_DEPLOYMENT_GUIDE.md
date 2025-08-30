# E-Maintenance 远程服务器部署指南

## 🎯 部署方案总结

经过深入分析，我们确定了统一的远程服务器更新策略：

### 📁 目录结构说明
```
deploy/
├── Server/              ✅ 生产环境 (当前远程服务器使用)
│   ├── update-modules.sh    # 分模块更新脚本
│   ├── quick-update.sh      # 快速更新命令
│   ├── status.sh           # 状态监控
│   └── rollback.sh         # 回滚脚本
├── modular/             🚧 下一代架构 (未来迁移目标)
│   └── ...             
├── Local/               💻 本地开发
│   └── ...
└── remote-update.sh     🆕 统一更新入口 (新建)
```

### 🔄 推荐部署流程

#### 1️⃣ 立即使用 - 统一更新脚本

```bash
# 在远程服务器上执行
cd /path/to/your/emaintenance/deploy
./remote-update.sh
```

**功能特性：**
- 🔄 自动同步最新代码
- 🎯 提供多种更新选项
- ✅ 内置部署后验证  
- 📊 详细的状态反馈

#### 2️⃣ 更新选项说明

| 选项 | 适用场景 | 更新内容 | 推荐使用 |
|------|----------|----------|----------|
| **前端更新** | UI修复、样式调整 | Web应用 + Nginx | 🟢 高频使用 |
| **后端更新** | API修复、业务逻辑 | 所有微服务 | 🟢 高频使用 |
| **全量更新** | 大版本升级 | 所有应用模块 | 🟡 谨慎使用 |
| **自定义更新** | 特定模块修复 | 选择性更新 | 🔵 高级用户 |

#### 3️⃣ 安全更新建议

**更新前：**
```bash
# 1. 备份当前配置
cp -r /path/to/emaintenance /backup/emaintenance-$(date +%Y%m%d)

# 2. 检查服务状态
cd /path/to/emaintenance/deploy/Server
./status.sh quick
```

**更新后：**
```bash
# 1. 验证服务健康
./status.sh health

# 2. 检查关键功能
curl http://localhost:3000/api/health
curl http://localhost:3001/health  # 用户服务
curl http://localhost:3002/health  # 工单服务
curl http://localhost:3003/health  # 资产服务
```

## 🚀 快速开始指南

### 第一次部署到远程服务器

```bash
# 1. 登录远程服务器
ssh user@your-server-ip

# 2. 进入项目目录
cd /path/to/emaintenance/deploy

# 3. 执行统一更新脚本
./remote-update.sh

# 4. 选择 "3) 全量更新所有服务"

# 5. 等待部署完成并验证
```

### 日常更新流程

```bash
# 前端修复 (最常用)
./remote-update.sh
# 选择选项 1

# 后端修复  
./remote-update.sh  
# 选择选项 2

# 紧急回滚
./remote-update.sh
# 选择选项 6
```

## ⚡ 高级使用场景

### 场景1：紧急热修复
```bash
# 1. 快速修复单个服务
cd deploy/Server
./quick-update.sh workorder  # 修复工单服务

# 2. 立即验证
./status.sh health
```

### 场景2：分批更新
```bash
# 1. 先更新不影响用户的服务
./quick-update.sh asset

# 2. 验证无问题后更新核心服务  
./quick-update.sh workorder
./quick-update.sh user
```

### 场景3：版本回滚
```bash
# 1. 启动回滚向导
cd deploy/Server
./rollback.sh

# 2. 选择回滚目标版本
# 3. 确认回滚操作
```

## 🔍 故障排除

### 常见问题解决

**问题1：容器启动失败**
```bash
# 查看具体错误
docker-compose -f deploy/Server/docker-compose.yml logs [service-name]

# 重启特定服务
docker-compose -f deploy/Server/docker-compose.yml restart [service-name]
```

**问题2：数据库连接失败**
```bash
# 检查数据库状态
docker-compose -f deploy/Server/docker-compose.yml ps postgres

# 检查数据库连接
docker exec -it emaintenance-postgres psql -U postgres -d emaintenance
```

**问题3：Nginx配置错误**
```bash
# 验证nginx配置
docker exec -it emaintenance-nginx nginx -t

# 重新加载nginx配置
docker exec -it emaintenance-nginx nginx -s reload
```

### 监控和日志

```bash
# 实时监控所有服务日志
docker-compose -f deploy/Server/docker-compose.yml logs -f

# 监控特定服务
docker-compose -f deploy/Server/docker-compose.yml logs -f web

# 查看资源使用情况
docker stats $(docker-compose -f deploy/Server/docker-compose.yml ps -q)
```

## 📋 部署清单

### 部署前检查
- [ ] 服务器磁盘空间充足 (至少5GB可用)
- [ ] Docker和Docker Compose已安装并运行
- [ ] 网络连接稳定
- [ ] 数据库已备份
- [ ] 确认更新的代码已提交到main分支

### 部署后验证  
- [ ] 所有容器状态为健康 (healthy)
- [ ] Web应用可以正常访问
- [ ] API健康检查端点响应正常
- [ ] 用户可以正常登录和使用核心功能
- [ ] 数据库连接正常，数据完整性验证通过

### 回滚准备
- [ ] 记录当前版本的Git commit hash
- [ ] 保存当前的环境变量配置
- [ ] 确认回滚脚本可用
- [ ] 准备紧急联系方式

## 🔮 未来迁移计划

**短期目标 (1-2个月)：**
- 继续优化Server方案的脚本和监控
- 完善自动化测试和部署验证
- 建立完整的备份和恢复流程

**中期目标 (3-6个月)：**
- 逐步迁移到modular架构
- 引入容器编排 (Kubernetes/Docker Swarm)
- 实现蓝绿部署和金丝雀发布

**长期目标 (6个月+)：**
- 完整的DevOps流水线
- 自动化监控和告警系统
- 多环境管理 (dev/test/staging/prod)

---

## 🆘 紧急联系

如遇到严重问题无法解决：

1. **立即回滚**：`cd deploy/Server && ./rollback.sh`
2. **检查服务状态**：`./status.sh`  
3. **查看错误日志**：`docker-compose logs -f`
4. **联系技术支持**：记录错误信息和操作步骤

**祝部署顺利！** 🚀