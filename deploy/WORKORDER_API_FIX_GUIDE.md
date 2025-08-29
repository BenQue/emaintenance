# 工单分配API修复指南

## 问题描述

远程服务器上工单分配API返回404错误：

```
请求网址: http://10.163.144.13:3030/api/work-orders/wo001/assign
请求方法: PUT
状态代码: 404 Not Found
```

## 问题根因分析

经过分析，问题出现的原因是：

1. **路由方法不匹配**: 前端使用`PUT`方法，但后端定义的是`POST`方法
2. **代码未同步**: 本地修复的代码未部署到远程服务器
3. **服务未重启**: 即使代码修复，容器需要重新构建才能生效

## 解决方案

### 方案1: 快速状态检查

首先运行状态检查脚本，了解当前问题：

```bash
./deploy/check-remote-workorder-api.sh
```

**输出说明:**
- ✅ `HTTP 401/403` = API正常，需要认证
- ❌ `HTTP 404` = API路由不存在，需要修复
- ⚠️ `HTTP 500` = 服务器错误，需要检查日志

### 方案2: 自动修复部署

运行综合修复脚本：

```bash
./deploy/fix-workorder-assignment-remote.sh
```

**修复流程:**
1. 检查服务器连接和服务状态
2. 自动定位源代码文件
3. 备份并修改路由配置
4. 重新构建Docker镜像
5. 重启工单服务
6. 验证API端点功能

### 方案3: 手动修复步骤

如果自动修复失败，可以手动执行：

```bash
# 1. SSH连接到服务器
ssh root@10.163.144.13

# 2. 进入工单服务部署目录
cd /opt/emaintenance/deploy/Server/work-order-service

# 3. 找到路由文件
find .. -name "workOrders.ts" -type f

# 4. 编辑路由文件
vi ../../../apps/api/work-order-service/src/routes/workOrders.ts
# 将 router.post('/:id/assign' 改为 router.put('/:id/assign'

# 5. 重新构建和部署
./deploy.sh
```

## 脚本详细说明

### `check-remote-workorder-api.sh`

**功能**: 全面检查远程服务器API状态

**检查项目**:
- Docker容器运行状态
- 工单服务健康检查
- API端点响应测试
- Nginx代理状态
- 外部访问测试

**使用方法**:
```bash
./deploy/check-remote-workorder-api.sh
```

### `fix-workorder-assignment-remote.sh`

**功能**: 自动修复工单分配API问题

**修复步骤**:
1. 服务器连接验证
2. 容器状态检查
3. 源代码路径定位
4. 路由文件备份和修改
5. Docker镜像重新构建
6. 服务重启和健康检查
7. API端点验证

**使用方法**:
```bash
./deploy/fix-workorder-assignment-remote.sh
```

## 配置参数

修改脚本顶部的配置参数以适应你的环境：

```bash
# 服务器配置
SERVER_IP="10.163.144.13"          # 远程服务器IP
SSH_USER="root"                     # SSH用户名
REMOTE_DEPLOY_PATH="/opt/emaintenance/deploy/Server/work-order-service"
```

## 验证步骤

修复完成后，按以下步骤验证：

### 1. 服务器端验证
```bash
# SSH到服务器
ssh root@10.163.144.13

# 检查容器状态
docker ps | grep emaintenance

# 测试API端点
curl -X PUT http://localhost:3002/api/work-orders/test/assign \
  -H "Content-Type: application/json" \
  -d '{"assignedToId": "test"}'

# 应该返回401或403（需要认证），而不是404
```

### 2. 浏览器验证
1. 打开浏览器访问: `http://10.163.144.13:3030`
2. 登录系统
3. 创建新工单
4. 尝试分配工单给技术人员
5. 检查是否成功，不再出现404错误

### 3. 网络调试
如果问题仍然存在，使用浏览器开发者工具：
- 打开 Network 标签
- 执行工单分配操作
- 查看API请求的详细信息
- 检查请求URL、方法和响应

## 常见问题排查

### 问题1: SSH连接失败
```
无法连接到远程服务器
```

**解决方案**:
- 检查服务器IP地址
- 确认SSH用户名和密码/密钥
- 检查网络连接和防火墙设置

### 问题2: Docker容器未运行
```
工单服务容器未运行
```

**解决方案**:
```bash
# 检查所有容器
docker ps -a

# 启动基础设施
cd /opt/emaintenance/deploy/Server/infrastructure
./deploy.sh

# 启动工单服务
cd ../work-order-service
./deploy.sh
```

### 问题3: 路由修改未生效
```
API仍然返回404
```

**解决方案**:
- 确认代码修改正确
- 重新构建Docker镜像: `docker-compose build --no-cache`
- 完全重启服务: `docker-compose down && docker-compose up -d`
- 检查Nginx代理配置

### 问题4: 权限问题
```
permission denied
```

**解决方案**:
```bash
# 修复文件权限
sudo chown -R $USER:$USER /opt/emaintenance
sudo chmod -R 755 /opt/emaintenance/deploy
```

## 技术原理

### 路由配置差异
```javascript
// 错误配置（后端）
router.post('/:id/assign', ...)

// 正确配置（后端）  
router.put('/:id/assign', ...)

// 前端调用
workOrderServiceClient.put(`/api/work-orders/${workOrderId}/assign`, ...)
```

### Docker部署流程
```
源代码修改 → Docker构建 → 容器重启 → 服务生效
```

### 网络请求路径
```
浏览器 → Nginx(3030) → 工单服务(3002) → 数据库
```

## 日志分析

### 查看服务日志
```bash
# 工单服务日志
docker-compose logs -f work-order-service

# Nginx日志
docker logs emaintenance-nginx

# 系统日志
journalctl -u docker
```

### 日志关键信息
- 路由注册信息
- HTTP请求和响应
- 数据库连接状态
- 错误堆栈信息

## 预防措施

1. **版本控制**: 确保代码修改同步到所有环境
2. **自动化测试**: API端点回归测试
3. **监控告警**: 设置API可用性监控
4. **文档维护**: 及时更新部署文档

## 联系支持

如果问题仍然无法解决，请提供以下信息：

1. 脚本执行完整输出
2. Docker容器状态: `docker ps -a`
3. 服务日志: `docker-compose logs work-order-service`
4. 网络请求详情（浏览器开发者工具截图）
5. 服务器环境信息: `uname -a`、`docker version`

通过GitHub Issues或技术支持渠道报告问题。