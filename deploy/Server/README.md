# E-Maintenance 服务端分模块部署工具

## 概述

这套部署工具支持E-Maintenance系统的分模块更新，允许选择性更新特定模块，而不影响稳定运行的服务（如数据库）。

## 🚀 核心特性

- **分模块更新**: 支持选择性更新web、微服务、nginx等模块
- **智能依赖管理**: 自动处理模块间的依赖关系
- **健康检查**: 自动验证服务更新后的运行状态
- **一键回滚**: 支持快速回滚到任何历史版本
- **实时监控**: 提供详细的服务状态监控
- **安全更新**: 保护数据库等关键服务不被意外更新

## 📁 文件结构

```
deploy/Server/
├── update-modules.sh      # 主要的分模块更新脚本
├── quick-update.sh        # 快速更新命令
├── rollback.sh           # 服务回滚脚本
├── status.sh             # 服务状态监控
├── module-config.sh      # 模块配置管理
└── README.md            # 使用说明（本文件）
```

## 🛠️ 使用方法

### 1. 分模块更新 (主要工具)

```bash
# 交互式选择更新模块
./update-modules.sh

# 选项说明：
# a - 更新所有应用模块 (web + 所有微服务)
# f - 仅更新前端 (web + nginx)  
# s - 仅更新服务 (所有微服务)
# c - 自定义选择特定模块
# q - 退出
```

### 2. 快速更新 (便捷命令)

```bash
# 更新前端相关组件
./quick-update.sh frontend

# 更新所有后端服务
./quick-update.sh backend

# 更新所有应用模块
./quick-update.sh all

# 只更新web应用
./quick-update.sh web

# 只更新特定微服务
./quick-update.sh user          # 用户服务
./quick-update.sh workorder     # 工单服务  
./quick-update.sh asset         # 资产服务
./quick-update.sh nginx         # Nginx代理
```

### 3. 服务回滚

```bash
# 启动回滚向导
./rollback.sh

# 回滚选项：
# 1) 回滚到上一个版本
# 2) 选择特定历史版本
# 3) 手动指定版本标签
```

### 4. 状态监控

```bash
# 完整状态报告
./status.sh

# 快速健康检查
./status.sh quick

# 查看特定信息
./status.sh containers    # 容器状态
./status.sh health        # 健康检查详情  
./status.sh resources     # 资源使用情况
./status.sh network       # 网络状态
./status.sh logs          # 最近错误日志
./status.sh version       # 版本信息
```

## 📋 可更新模块

### 应用模块（推荐更新）
- **web**: Next.js前端应用
- **user-service**: 用户服务（认证/用户管理）
- **work-order-service**: 工单服务（工单管理）
- **asset-service**: 资产服务（设备管理）
- **nginx**: Nginx反向代理

### 基础设施模块（建议保持稳定）
- **postgres**: PostgreSQL数据库 ⚠️ 通常不需要更新
- **redis**: Redis缓存服务 ⚠️ 通常不需要更新

## 🔄 典型更新场景

### 场景1: 前端功能更新
只修改了前端代码，需要更新web应用和nginx配置：
```bash
./quick-update.sh frontend
```

### 场景2: 后端API更新
修改了微服务代码，需要更新所有API服务：
```bash
./quick-update.sh backend
```

### 场景3: 全系统更新
大版本更新，需要更新所有应用模块：
```bash
./quick-update.sh all
```

### 场景4: 单个服务热修复
紧急修复工单服务的bug：
```bash
./quick-update.sh workorder
```

## ⚡ 更新流程

1. **检查Git状态**: 确保代码已提交
2. **模块选择**: 选择需要更新的模块
3. **构建镜像**: 为选中模块构建新的Docker镜像
4. **滚动更新**: 逐个重启选中的服务
5. **健康检查**: 验证服务更新后的运行状态
6. **完成报告**: 显示更新结果和访问信息

## 🛡️ 安全特性

- **自动备份**: 更新前自动备份环境配置
- **依赖检查**: 验证模块依赖关系
- **健康验证**: 确保服务更新后正常运行
- **原子操作**: 更新失败时自动回滚
- **权限保护**: 防止意外更新关键基础设施

## 🚨 注意事项

1. **数据库更新**: 数据库模块默认被保护，避免意外更新导致数据丢失
2. **并发更新**: 避免同时运行多个更新脚本
3. **磁盘空间**: 确保有足够空间存储新的Docker镜像
4. **网络要求**: 更新过程中需要stable的网络连接
5. **备份策略**: 重要更新前建议手动备份数据库

## 🎯 快速开始

```bash
# 1. 检查当前系统状态
./status.sh quick

# 2. 更新前端应用
./quick-update.sh frontend

# 3. 验证更新结果
./status.sh health

# 4. 如有问题，立即回滚
./rollback.sh
```

**祝您使用愉快！** 🚀