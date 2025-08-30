# E-Maintenance 部署架构总结

## 当前部署方案

经过整理和优化，E-Maintenance 现在有两个独立、清晰的部署方案：

### 📍 **本地开发部署** (`Local/`)
- **用途**: 开发人员本地测试和调试
- **架构**: 单体部署，所有服务在同一compose文件中
- **特点**: 简单、快速、适合开发
- **启动**: `cd Local && ./deploy-local.sh`

### 📍 **服务器分模块部署** (`Server/`)
- **用途**: 生产环境和测试服务器
- **架构**: 分模块部署，每个服务独立管理
- **特点**: 可扩展、可独立更新、适合生产
- **启动**: `cd Server && ./scripts/deploy-all.sh`

## 架构对比

| 特性 | 本地部署 (Local/) | 服务器部署 (Server/) |
|------|------------------|---------------------|
| **复杂度** | 简单 | 中等 |
| **启动速度** | 快 | 中等 |
| **资源占用** | 低 | 中等 |
| **可扩展性** | 有限 | 高 |
| **故障隔离** | 有限 | 优秀 |
| **独立更新** | 不支持 | 支持 |
| **监控能力** | 基础 | 完整 |
| **适用场景** | 开发测试 | 生产环境 |

## 目录结构

```
deploy/
├── Local/                           # 本地开发部署方案
│   ├── docker-compose.local.yml    # 本地部署配置
│   ├── deploy-local.sh              # 一键本地部署脚本
│   ├── configs/                     # Nginx等配置文件
│   ├── env-templates/               # 环境变量模板
│   └── scripts/                     # 辅助脚本
│
├── Server/                          # 服务器分模块部署方案
│   ├── infrastructure/              # 基础设施(数据库、Redis、Nginx)
│   │   ├── docker-compose.yml
│   │   ├── deploy.sh
│   │   └── health-check.sh
│   ├── user-service/                # 用户服务模块
│   ├── work-order-service/          # 工单服务模块  
│   ├── asset-service/               # 资产服务模块
│   ├── web-service/                 # Web前端模块
│   ├── database/                    # 数据库管理
│   ├── scripts/                     # 全局脚本
│   │   ├── deploy-all.sh            # 完整部署
│   │   ├── system-status.sh         # 系统状态检查
│   │   └── offline-deployment.sh   # 离线部署
│   └── monitoring/                  # 监控配置
│
├── README.md                        # 主要说明文档
├── API_FLEXIBLE_CONFIG_GUIDE.md     # API配置指南
├── DOCKER_API_FIX_GUIDE.md          # Docker API问题修复
├── DEPLOYMENT_ISSUES_SUMMARY.md     # 部署问题总结  
├── REMOTE_DEPLOYMENT_TROUBLESHOOTING.md # 远程部署故障排除
├── REMOTE_UPDATE_GUIDE.md           # 远程更新指南
├── QUICK_DEPLOYMENT_GUIDE.md        # 快速部署指南
└── KNOWN_ISSUES.md                  # 已知问题
```

## 使用指南

### 🔧 本地开发

```bash
# 进入本地部署目录
cd /Users/benque/Project/Emaintenance/deploy/Local

# 一键部署所有服务
./deploy-local.sh

# 访问服务
open http://localhost:3000  # Web应用
open http://localhost/health # Nginx健康检查
```

### 🚀 服务器部署

```bash
# 进入服务器部署目录
cd /Users/benque/Project/Emaintenance/deploy/Server

# 完整部署所有模块
./scripts/deploy-all.sh

# 或分步部署
./infrastructure/deploy.sh      # 先部署基础设施
./user-service/deploy.sh        # 然后部署各个服务
./work-order-service/deploy.sh
./asset-service/deploy.sh
./web-service/deploy.sh
```

### 📱 移动端配置

部署完成后，移动端配置：
- **本地开发**: 使用本机IP地址
- **服务器部署**: 使用服务器IP地址或域名
- **端口**: 默认80 (HTTP) 或 443 (HTTPS)

## 清理说明

已清理的废弃文件：
- ❌ `deploy/docker-compose.yml` - 根目录废弃配置
- ❌ `deploy/modular/` - 测试目录
- ❌ `deploy/fix-docker-api-access.sh` - 已整合功能
- ❌ `deploy/quick-fix-api.sh` - 已整合功能

保留的重要文件：
- ✅ 所有 `*.md` 文档
- ✅ `Local/` 完整目录
- ✅ `Server/` 完整目录

## 更新和维护

### 本地环境更新
```bash
cd Local/
git pull origin main
./deploy-local.sh
```

### 服务器环境更新
```bash
cd Server/
git pull origin main

# 更新特定服务
./user-service/deploy.sh

# 或完整更新
./scripts/deploy-all.sh
```

## 故障排除

### 常见问题
1. **API 404错误** → 参考 `DOCKER_API_FIX_GUIDE.md`
2. **服务启动失败** → 参考 `DEPLOYMENT_ISSUES_SUMMARY.md`
3. **远程部署问题** → 参考 `REMOTE_DEPLOYMENT_TROUBLESHOOTING.md`

### 健康检查
```bash
# 本地环境
cd Local/ && ./scripts/health-check.sh

# 服务器环境  
cd Server/ && ./scripts/system-status.sh
```

## 未来规划

- [ ] 添加自动化CI/CD流水线
- [ ] 集成容器监控和日志聚合
- [ ] 支持Kubernetes部署
- [ ] 添加蓝绿部署支持

---

**总结**: 现在有了两个清晰、独立的部署方案，既满足了开发便捷性，又提供了生产环境的灵活性。每个方案都有完整的文档和脚本支持。