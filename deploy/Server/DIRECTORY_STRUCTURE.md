# Server 部署目录结构说明

## 📁 整理后的目录结构

```
deploy/Server/
├── 🚀 主要部署脚本
│   ├── remote-update.sh        ⭐ 统一更新入口 (推荐)
│   ├── update-modules.sh       高级模块选择更新
│   ├── quick-update.sh         快速更新命令
│   ├── rollback.sh            安全回滚脚本  
│   └── status.sh              服务状态监控
│
├── 🛠️ 辅助工具脚本
│   ├── check-web-env.sh       Web环境检查
│   ├── debug-login.sh         登录问题诊断
│   ├── diagnose-nginx.sh      Nginx诊断工具
│   └── module-config.sh       模块配置管理
│
├── 📋 文档指南
│   ├── README.md              ⭐ 主要使用指南
│   ├── REMOTE_DEPLOYMENT_GUIDE.md  完整部署参考
│   ├── DIRECTORY_STRUCTURE.md 目录结构说明
│   └── README-CHINA.md        中国服务器专用指南
│
├── 🐳 Docker配置
│   ├── docker-compose.yml     服务编排配置
│   └── .env.example          环境变量模板
│
└── 📂 服务模块目录
    ├── web-service/           Web应用配置
    ├── user-service/          用户服务配置  
    ├── work-order-service/    工单服务配置
    ├── asset-service/         资产服务配置
    ├── database/              数据库初始化
    ├── infrastructure/        基础设施脚本
    ├── nginx/                 代理服务器配置
    ├── scripts/               通用脚本工具
    └── monitoring/            监控配置
```

## ✅ 清理说明

**已移除的重复文档:**
- `DEPLOYMENT_CHECKLIST.md` → 内容整合到 `README.md`
- `DEPLOYMENT_EXECUTION_CHECKLIST.md` → 内容整合到 `REMOTE_DEPLOYMENT_GUIDE.md`
- `KNOWN_ISSUES.md` → 合并到 `../docs/KNOWN_ISSUES.md` 统一管理

**保留的核心文档:**
- `README.md` - 统一的快速参考指南
- `REMOTE_DEPLOYMENT_GUIDE.md` - 详细的完整部署流程
- `DIRECTORY_STRUCTURE.md` - 目录结构和整理说明
- `README-CHINA.md` - 针对中国服务器的特殊网络环境

## 🎯 使用优先级

### 1️⃣ 日常使用 (高频)
```bash
./remote-update.sh         # 统一更新入口
./status.sh               # 状态监控  
./rollback.sh            # 紧急回滚
```

### 2️⃣ 高级操作 (中频)  
```bash
./quick-update.sh [target]    # 快速指定更新
./update-modules.sh          # 自定义模块选择
```

### 3️⃣ 问题排查 (低频)
```bash
./check-web-env.sh          # 环境检查
./debug-login.sh           # 认证调试
./diagnose-nginx.sh        # 网络诊断  
```

## 📖 文档使用指引

| 文档 | 适用场景 | 内容概要 |
|------|----------|----------|
| `README.md` | 日常操作参考 | 快速命令和常用场景 |
| `REMOTE_DEPLOYMENT_GUIDE.md` | 新手完整部署 | 详细步骤和最佳实践 |
| `../docs/KNOWN_ISSUES.md` | 故障排除 | 常见问题解决方案 |
| `README-CHINA.md` | 中国服务器部署 | 网络优化和镜像源配置 |
| `DIRECTORY_STRUCTURE.md` | 目录说明 | 文件组织和清理记录 |

---
**目录整理完成时间**: 2024-08-30