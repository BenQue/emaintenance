# E-Maintenance 服务器部署工具

## 🎯 快速开始

**推荐：使用统一更新脚本**
```bash
# 在服务器上执行
cd /path/to/emaintenance/deploy/Server
./remote-update.sh
```

## 📁 核心文件说明

### 🚀 主要部署脚本
- **`remote-update.sh`** - 🆕 **统一更新入口** (推荐使用)
- `update-modules.sh` - 分模块更新脚本 (高级用户)
- `quick-update.sh` - 快速更新命令
- `rollback.sh` - 回滚脚本
- `status.sh` - 状态监控

### 🛠️ 辅助工具
- `check-web-env.sh` - Web环境检查
- `debug-login.sh` - 登录问题诊断
- `diagnose-nginx.sh` - Nginx诊断
- `module-config.sh` - 模块配置管理

### 📋 文档指南
- **`REMOTE_DEPLOYMENT_GUIDE.md`** - 🆕 **完整部署指南** (详细参考)
- `../docs/KNOWN_ISSUES.md` - 已知问题和解决方案

## 🔄 更新选项

| 命令 | 适用场景 | 更新内容 |
|------|----------|----------|
| `./remote-update.sh` | **推荐** | 交互式选择更新模块 |
| `./quick-update.sh frontend` | UI修复 | Web应用 + Nginx |
| `./quick-update.sh backend` | API修复 | 所有微服务 |
| `./quick-update.sh all` | 大版本 | 全部应用模块 |

## 📊 服务监控

```bash
# 查看服务状态
./status.sh

# 快速健康检查
./status.sh quick

# 查看特定信息
./status.sh health     # 健康检查
./status.sh logs       # 错误日志
./status.sh resources  # 资源使用
```

## 🛡️ 安全回滚

```bash
# 启动回滚向导
./rollback.sh

# 选项：
# 1) 回滚到上一个版本
# 2) 选择特定历史版本  
# 3) 手动指定版本标签
```

## ⚡ 常用场景

### 场景1：前端修复部署
```bash
./remote-update.sh
# 选择选项 1: 快速更新前端
```

### 场景2：后端API修复
```bash  
./remote-update.sh
# 选择选项 2: 快速更新后端
```

### 场景3：紧急回滚
```bash
./remote-update.sh
# 选择选项 6: 回滚到上一版本
```

### 场景4：单个服务热修复
```bash
./quick-update.sh workorder  # 修复工单服务
./quick-update.sh user       # 修复用户服务
./quick-update.sh asset      # 修复资产服务
```

## 📋 部署清单

### 部署前检查
- [ ] 服务器磁盘空间充足 (至少5GB)
- [ ] Docker和Docker Compose已安装运行
- [ ] 网络连接稳定
- [ ] 数据库已备份

### 部署后验证
- [ ] 所有容器状态健康
- [ ] Web应用正常访问
- [ ] API健康检查通过
- [ ] 核心功能测试通过

## 🆘 故障排除

### 容器问题
```bash
# 查看容器日志
docker-compose logs [service-name]

# 重启服务
docker-compose restart [service-name]
```

### 网络问题
```bash
# 检查端口占用
./diagnose-nginx.sh

# 检查服务连通性
./check-web-env.sh
```

### 认证问题
```bash
# 调试登录问题
./debug-login.sh
```

## 📞 支持

遇到问题时：
1. **立即回滚**: `./rollback.sh`
2. **检查状态**: `./status.sh`
3. **查看日志**: `docker-compose logs -f`

**详细文档**: 
- 完整部署流程: `REMOTE_DEPLOYMENT_GUIDE.md`
- 问题排查手册: `../docs/KNOWN_ISSUES.md`

---
**E-Maintenance 部署工具 v2.0** | 更新日期: 2024-08-30