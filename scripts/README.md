# EMaintenance 脚本文档

> 本目录包含 EMaintenance 项目的各种自动化脚本和工具。

## 📁 脚本概览

| 脚本名称 | 功能描述 | 支持平台 |
|---------|---------|---------|
| `start-api-services.sh` | 一键启动/停止/管理所有API服务 | macOS, Linux |

## 🚀 API 服务管理脚本

### 功能特性

`start-api-services.sh` 是一个全功能的API服务管理脚本，提供以下核心功能：

- ✅ **自动端口清理**：智能检测并清理占用的端口进程
- ✅ **数据库连接验证**：确保 PostgreSQL 数据库服务可用
- ✅ **服务依赖管理**：按正确顺序启动各个微服务
- ✅ **健康状态检查**：实时验证服务启动状态和可用性
- ✅ **进程生命周期管理**：PID 文件管理和优雅关闭
- ✅ **彩色日志输出**：直观的状态信息显示
- ✅ **错误处理**：完善的异常处理和恢复机制

### 系统要求

- **操作系统**：macOS 10.15+ 或 Linux (Ubuntu 18.04+)
- **依赖工具**：
  - Node.js 18+
  - npm 8+
  - PostgreSQL 客户端工具 (psql)
  - curl
  - lsof
  - jq (可选，用于JSON解析)

### 安装与配置

#### 1. 脚本权限设置

```bash
# 确保脚本可执行
chmod +x scripts/start-api-services.sh

# 验证权限
ls -la scripts/start-api-services.sh
```

#### 2. 环境变量配置

脚本使用以下默认配置，可根据需要修改：

```bash
# 服务端口配置
USER_SERVICE_PORT=3001
WORK_ORDER_SERVICE_PORT=3002
ASSET_SERVICE_PORT=3003

# 数据库连接
DATABASE_URL="postgresql://postgres:Qzy@7091!@localhost:5433/emaintenance"

# 项目根目录
PROJECT_ROOT="/Users/benque/Project/Emaintenance"
```

#### 3. 数据库准备

确保 Docker 数据库服务正在运行：

```bash
# 启动数据库容器
docker-compose -f docker-compose.simple.yml up -d database redis

# 验证数据库连接
PGPASSWORD="Qzy@7091!" psql -h localhost -U postgres -p 5433 -d emaintenance -c "SELECT version();"
```

## 📖 使用指南

### 基本命令

#### 1. 启动所有API服务

```bash
# 方式一：直接使用脚本
./scripts/start-api-services.sh start

# 方式二：使用npm命令
npm run api:start

# 方式三：默认行为（不指定参数）
./scripts/start-api-services.sh
```

**执行过程**：
1. 检查数据库连接状态
2. 清理端口 3001、3002、3003 上的占用进程
3. 按顺序启动 user-service、work-order-service、asset-service
4. 执行健康检查验证服务状态
5. 显示服务运行状态和访问地址

#### 2. 停止所有API服务

```bash
# 方式一：脚本命令
./scripts/start-api-services.sh stop

# 方式二：npm命令
npm run api:stop
```

**执行过程**：
1. 查找并终止所有API服务进程
2. 清理临时PID文件
3. 确认所有服务已停止

#### 3. 重启所有API服务

```bash
# 方式一：脚本命令
./scripts/start-api-services.sh restart

# 方式二：npm命令
npm run api:restart
```

**执行过程**：
1. 执行停止流程
2. 等待 2 秒确保进程完全退出
3. 执行启动流程

#### 4. 查看服务状态

```bash
# 方式一：脚本命令
./scripts/start-api-services.sh status

# 方式二：npm命令
npm run api:status
```

**状态信息包括**：
- 各服务健康检查结果
- 服务运行端口和访问地址
- 服务响应时间（如可用）

#### 5. 帮助信息

```bash
./scripts/start-api-services.sh help
# 或
./scripts/start-api-services.sh -h
./scripts/start-api-services.sh --help
```

### 高级用法

#### 1. 自定义端口检查

脚本会自动检测并清理指定端口的占用进程：

```bash
# 查看端口占用情况
lsof -ti:3001 -ti:3002 -ti:3003

# 脚本会自动处理端口冲突
./scripts/start-api-services.sh start
```

#### 2. 日志文件管理

每次启动服务时，脚本会生成带时间戳的日志文件：

```bash
# 查看最新日志
ls -la /tmp/*-service-*.log

# 实时查看服务日志
tail -f /tmp/user-service-*.log
tail -f /tmp/work-order-service-*.log
tail -f /tmp/asset-service-*.log
```

#### 3. PID 文件管理

脚本使用 PID 文件追踪服务进程：

```bash
# 查看 PID 文件
ls -la /tmp/*.pid

# 手动检查进程状态
cat /tmp/user-service.pid | xargs ps -p
```

#### 4. 信号处理

脚本支持优雅的中断处理：

```bash
# 启动服务后，使用 Ctrl+C 可以优雅停止所有服务
./scripts/start-api-services.sh start
# 按 Ctrl+C 触发清理流程
```

## 🔧 集成开发环境

### VS Code 任务集成

脚本已集成到 VS Code 任务系统中，可通过以下方式使用：

1. 按 `Ctrl+Shift+P`（Mac: `Cmd+Shift+P`）
2. 输入 `Tasks: Run Task`
3. 选择相应任务：

| 任务名称 | 功能 | 快捷键 |
|---------|------|-------|
| 🚀 启动所有 API 服务 | 启动所有API服务 | - |
| ⏹️ 停止所有 API 服务 | 停止所有API服务 | - |
| 🔄 重启所有 API 服务 | 重启所有API服务 | - |
| 📊 查看 API 服务状态 | 查看服务状态 | - |
| 🐳 启动 Docker 数据库服务 | 启动数据库容器 | - |
| 🌐 启动 Web 应用 | 启动Next.js应用 | - |

### npm 脚本集成

已在根目录 `package.json` 中添加以下脚本：

```json
{
  "scripts": {
    "api:start": "./scripts/start-api-services.sh start",
    "api:stop": "./scripts/start-api-services.sh stop", 
    "api:restart": "./scripts/start-api-services.sh restart",
    "api:status": "./scripts/start-api-services.sh status"
  }
}
```

## 🚨 故障排除

### 常见问题与解决方案

#### 1. 权限错误

```bash
# 错误信息
bash: ./scripts/start-api-services.sh: Permission denied

# 解决方案
chmod +x scripts/start-api-services.sh
```

#### 2. 端口占用无法清理

```bash
# 手动查找占用进程
lsof -ti:3001
sudo kill -9 $(lsof -ti:3001)

# 或使用系统命令
sudo pkill -f "node.*3001"
```

#### 3. 数据库连接失败

```bash
# 检查数据库容器状态
docker-compose -f docker-compose.simple.yml ps database

# 重启数据库服务
docker-compose -f docker-compose.simple.yml restart database

# 检查数据库日志
docker-compose -f docker-compose.simple.yml logs database
```

#### 4. 服务启动失败

```bash
# 查看详细日志
cat /tmp/user-service-*.log
cat /tmp/work-order-service-*.log
cat /tmp/asset-service-*.log

# 检查依赖安装
cd apps/api/user-service && npm install
cd apps/api/work-order-service && npm install
cd apps/api/asset-service && npm install
```

#### 5. 健康检查失败

```bash
# 手动测试健康检查端点
curl -v http://localhost:3001/health
curl -v http://localhost:3002/health
curl -v http://localhost:3003/health

# 检查服务是否真正运行
ps aux | grep node
netstat -tlnp | grep :300
```

### 调试模式

启用详细输出进行调试：

```bash
# 设置调试模式
export DEBUG=1
./scripts/start-api-services.sh start

# 或直接在脚本中修改
set -x  # 添加到脚本开头启用调试
```

## ⚡ 性能优化

### 1. 并行启动

脚本支持服务间的智能依赖管理，优化启动时间：

- User Service 优先启动（基础服务）
- Work Order Service 依赖 User Service
- Asset Service 依赖 User Service
- 健康检查并行执行

### 2. 资源监控

监控服务资源使用情况：

```bash
# 监控脚本
cat > monitor-api-services.sh << 'EOF'
#!/bin/bash
while true; do
    echo "=== $(date) ==="
    ps aux | grep -E "(user-service|work-order-service|asset-service)" | grep -v grep
    echo "===================="
    sleep 10
done
EOF

chmod +x monitor-api-services.sh
./monitor-api-services.sh
```

### 3. 内存优化

为 Node.js 服务设置内存限制：

```bash
# 在 package.json 的 dev 脚本中添加内存限制
"dev": "NODE_ENV=development NODE_OPTIONS='--max-old-space-size=512' tsx watch src/index.ts"
```

## 🔒 安全注意事项

### 1. 敏感信息保护

- 数据库密码存储在环境变量中
- JWT 密钥应在生产环境中更换
- 不要在日志中输出敏感信息

### 2. 网络安全

```bash
# 限制服务仅本地访问（生产环境）
export BIND_ADDRESS="127.0.0.1"

# 防火墙规则
sudo ufw allow from 127.0.0.1 to any port 3001
sudo ufw allow from 127.0.0.1 to any port 3002  
sudo ufw allow from 127.0.0.1 to any port 3003
```

### 3. 进程隔离

```bash
# 使用专用用户运行服务（生产环境）
sudo useradd -r -s /bin/false emaintenance
sudo chown -R emaintenance:emaintenance /opt/emaintenance
```

## 📈 监控与日志

### 1. 系统监控

```bash
# 创建监控脚本
cat > scripts/monitor-system.sh << 'EOF'
#!/bin/bash

echo "=== API Services Status ==="
./scripts/start-api-services.sh status

echo -e "\n=== System Resources ==="
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')"
echo "Memory Usage: $(free | grep Mem | awk '{printf("%.2f%%\n", $3/$2 * 100.0)}')"
echo "Disk Usage: $(df -h / | awk 'NR==2{printf "%s\n", $5}')"

echo -e "\n=== Network Connections ==="
netstat -tlnp | grep :300
EOF

chmod +x scripts/monitor-system.sh
```

### 2. 日志聚合

```bash
# 聚合所有服务日志
cat > scripts/collect-logs.sh << 'EOF'
#!/bin/bash
LOG_DIR="/tmp/emaintenance-logs"
mkdir -p $LOG_DIR

echo "Collecting API service logs..."
cp /tmp/*-service-*.log $LOG_DIR/ 2>/dev/null || true

echo "Logs collected in: $LOG_DIR"
ls -la $LOG_DIR
EOF

chmod +x scripts/collect-logs.sh
```

## 🔄 持续集成

### Git Hooks 集成

```bash
# 创建 pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# 在提交前检查服务状态
./scripts/start-api-services.sh status
exit_code=$?

if [ $exit_code -ne 0 ]; then
    echo "警告：API服务状态检查失败"
    read -p "是否继续提交？ (y/N): " confirm
    if [[ $confirm != [yY] ]]; then
        exit 1
    fi
fi
EOF

chmod +x .git/hooks/pre-commit
```

## 📚 相关文档

- [项目主文档](../CLAUDE.md)
- [生产环境部署指南](../docs/production-deployment.md)
- [开发环境配置](../docs/development-setup.md)
- [故障排除指南](../docs/troubleshooting.md)

## 🆘 获取帮助

如遇到脚本使用问题：

1. **查看帮助信息**：`./scripts/start-api-services.sh help`
2. **查看日志文件**：检查 `/tmp/*-service-*.log` 文件
3. **检查系统状态**：运行 `./scripts/start-api-services.sh status`
4. **查阅故障排除**：参考上述故障排除章节
5. **报告问题**：在项目仓库中创建 Issue

---

*最后更新时间：2025-08-15*  
*文档版本：1.0.0*