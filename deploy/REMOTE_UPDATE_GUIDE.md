# E-Maintenance 远程服务器更新部署指南

## 更新流程概述
本指南说明如何在远程服务器上更新已部署的E-Maintenance系统。

## 前置条件
- 远程服务器IP: 10.163.144.13
- SSH访问权限
- Docker和Docker Compose已安装
- 系统已完成首次部署

## 更新方法

### 方法1: 快速补丁更新（推荐用于小修复）

适用场景：修复API路由、配置文件等小问题

```bash
# 1. SSH连接到服务器
ssh user@10.163.144.13

# 2. 进入项目目录
cd /path/to/emaintenance/deploy/Server

# 3. 直接修改需要更新的文件
# 例如：修复工单分配API路由
vi work-order-service/src/routes/workOrders.ts

# 4. 重新构建受影响的服务镜像
cd work-order-service
docker build -t emaintenance-work-order-service:latest .

# 5. 重启服务
docker-compose stop emaintenance-work-order-service
docker-compose up -d emaintenance-work-order-service

# 6. 验证服务状态
docker-compose ps
docker-compose logs --tail=20 emaintenance-work-order-service
```

### 方法2: 完整代码更新（推荐用于功能更新）

适用场景：新功能、多服务更新、大版本升级

```bash
# 1. 在本地准备更新包
cd /Users/benque/Project/Emaintenance

# 创建部署包（只包含必要文件）
tar -czf emaintenance-update.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=coverage \
  --exclude=dist \
  --exclude=.next \
  apps/ packages/ deploy/ docker-compose.yml package.json

# 2. 上传到服务器
scp emaintenance-update.tar.gz user@10.163.144.13:/tmp/

# 3. SSH连接到服务器
ssh user@10.163.144.13

# 4. 备份当前版本
cd /path/to/emaintenance
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz deploy/

# 5. 解压更新包
tar -xzf /tmp/emaintenance-update.tar.gz -C /tmp/emaintenance-update/

# 6. 更新代码（保留配置）
cp -r /tmp/emaintenance-update/apps/* deploy/Server/
cp -r /tmp/emaintenance-update/packages/* deploy/Server/

# 7. 重新构建所有服务
cd deploy/Server
./build-all.sh  # 需要创建此脚本

# 8. 滚动更新服务（零停机）
docker-compose up -d --no-deps --build emaintenance-user-service
sleep 10
docker-compose up -d --no-deps --build emaintenance-work-order-service
sleep 10
docker-compose up -d --no-deps --build emaintenance-asset-service
sleep 10
docker-compose up -d --no-deps --build emaintenance-web
sleep 10
docker-compose restart emaintenance-nginx

# 9. 验证所有服务
docker-compose ps
./health-check.sh  # 需要创建此脚本
```

### 方法3: Git仓库更新（推荐用于持续集成）

适用场景：已建立Git仓库的自动化部署

```bash
# 1. SSH连接到服务器
ssh user@10.163.144.13

# 2. 进入项目目录
cd /path/to/emaintenance

# 3. 拉取最新代码
git pull origin main

# 4. 安装依赖（如有必要）
npm install

# 5. 构建并更新服务
cd deploy/Server
docker-compose build --no-cache
docker-compose up -d

# 6. 验证更新
docker-compose ps
docker-compose logs --tail=50
```

## 特定问题修复流程

### 修复工单分配API（PUT vs POST）问题

```bash
# 1. SSH到服务器
ssh user@10.163.144.13

# 2. 进入工单服务目录
cd /path/to/emaintenance/deploy/Server/work-order-service

# 3. 编辑路由文件
vi apps/api/work-order-service/src/routes/workOrders.ts
# 将 router.post('/:id/assign' 改为 router.put('/:id/assign'

# 4. 重新构建镜像
docker build -t emaintenance-work-order-service:latest .

# 5. 重启服务
cd ..
docker-compose restart emaintenance-work-order-service

# 6. 验证修复
curl -X PUT http://10.163.144.13:3030/api/work-orders/test/assign \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"assignedToId": "user123"}'
```

### 修复Web前端API地址问题

```bash
# 1. SSH到服务器
ssh user@10.163.144.13

# 2. 设置正确的API地址环境变量
export NEXT_PUBLIC_API_URL="http://10.163.144.13:3030"

# 3. 重新构建Web服务
cd /path/to/emaintenance/deploy/Server/web-service
docker build --build-arg NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL -t emaintenance-web:latest .

# 4. 重启Web服务
cd ..
docker-compose restart emaintenance-web

# 5. 清理浏览器缓存并测试
# 访问 http://10.163.144.13:3000
```

## 自动化部署脚本

### build-all.sh - 批量构建脚本
```bash
#!/bin/bash
# deploy/Server/build-all.sh

echo "Building all services..."

# 设置环境变量
export SERVER_IP=10.163.144.13
export NEXT_PUBLIC_API_URL="http://${SERVER_IP}:3030"

# 构建各个服务
services=("user-service" "work-order-service" "asset-service" "web-service")

for service in "${services[@]}"; do
  echo "Building $service..."
  cd $service
  docker build -t emaintenance-$service:latest .
  cd ..
done

echo "All services built successfully!"
```

### health-check.sh - 健康检查脚本
```bash
#!/bin/bash
# deploy/Server/health-check.sh

echo "Checking service health..."

# 检查Docker容器状态
echo "Container Status:"
docker-compose ps

# 检查API健康端点
echo -e "\nAPI Health Checks:"
curl -f http://localhost:3001/health || echo "User Service: FAILED"
curl -f http://localhost:3002/health || echo "Work Order Service: FAILED"
curl -f http://localhost:3003/health || echo "Asset Service: FAILED"

# 检查Web服务
echo -e "\nWeb Service:"
curl -f http://localhost:3000/api/health || echo "Web Service: FAILED"

# 检查数据库连接
echo -e "\nDatabase Connection:"
docker-compose exec emaintenance-postgres pg_isready || echo "Database: FAILED"

echo -e "\nHealth check complete!"
```

### rollback.sh - 回滚脚本
```bash
#!/bin/bash
# deploy/Server/rollback.sh

if [ -z "$1" ]; then
  echo "Usage: ./rollback.sh backup-filename.tar.gz"
  exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "Rolling back to $BACKUP_FILE..."

# 停止所有服务
docker-compose down

# 恢复备份
tar -xzf $BACKUP_FILE

# 重新启动服务
docker-compose up -d

echo "Rollback complete!"
```

## 更新检查清单

### 更新前检查
- [ ] 备份当前数据库
- [ ] 备份当前配置文件
- [ ] 记录当前版本号
- [ ] 检查磁盘空间
- [ ] 通知用户维护窗口

### 更新中监控
- [ ] 监控Docker构建日志
- [ ] 检查容器启动状态
- [ ] 验证服务健康端点
- [ ] 检查错误日志

### 更新后验证
- [ ] 所有服务运行正常
- [ ] API端点响应正确
- [ ] 前端页面可访问
- [ ] 数据库连接正常
- [ ] 用户登录功能正常
- [ ] 工单创建和分配功能正常

## 常见更新问题

### 1. Docker镜像构建失败
```bash
# 清理Docker缓存
docker system prune -a
docker builder prune

# 重新构建
docker-compose build --no-cache service-name
```

### 2. 服务启动失败
```bash
# 查看详细日志
docker-compose logs --tail=100 service-name

# 检查环境变量
docker-compose config

# 重启Docker守护进程
sudo systemctl restart docker
```

### 3. 数据库迁移问题
```bash
# 手动运行迁移
docker-compose exec emaintenance-web npx prisma migrate deploy

# 重置数据库（谨慎使用）
docker-compose exec emaintenance-web npx prisma migrate reset
```

### 4. 网络连接问题
```bash
# 重建Docker网络
docker-compose down
docker network prune
docker-compose up -d
```

## 版本管理建议

### 版本标记
```bash
# 使用时间戳作为版本号
VERSION=$(date +%Y%m%d-%H%M%S)
docker build -t emaintenance-service:$VERSION .
docker tag emaintenance-service:$VERSION emaintenance-service:latest
```

### 保留历史版本
```bash
# 保留最近3个版本
docker images | grep emaintenance | tail -n +4 | awk '{print $3}' | xargs docker rmi
```

## 监控和日志

### 实时日志监控
```bash
# 监控所有服务日志
docker-compose logs -f

# 监控特定服务
docker-compose logs -f emaintenance-work-order-service
```

### 日志归档
```bash
# 导出日志到文件
docker-compose logs > logs-$(date +%Y%m%d).txt

# 定期清理旧日志
find /var/log/emaintenance -name "*.log" -mtime +30 -delete
```

## 安全建议

1. **使用私有镜像仓库**: 避免在生产环境直接构建
2. **环境变量管理**: 使用.env文件或密钥管理服务
3. **定期更新基础镜像**: 修复安全漏洞
4. **限制SSH访问**: 使用密钥认证，禁用密码登录
5. **备份策略**: 定期自动备份数据和配置

## 紧急回滚流程

如果更新后出现严重问题：

```bash
# 1. 立即停止有问题的服务
docker-compose stop service-name

# 2. 回滚到上一个版本
docker tag emaintenance-service:previous emaintenance-service:latest

# 3. 重启服务
docker-compose up -d service-name

# 4. 验证服务恢复
./health-check.sh
```

## 联系支持

如遇到无法解决的问题，请联系技术支持：
- 邮箱: support@emaintenance.com
- 电话: +86-xxx-xxxx-xxxx
- 远程协助: TeamViewer/AnyDesk

记录以下信息以便支持：
- 服务器IP和访问凭据
- 错误日志和截图
- 更新前后的版本号
- 执行的具体操作步骤