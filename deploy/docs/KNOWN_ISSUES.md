# E-Maintenance 部署已知问题和解决方案

## 问题汇总 (2025年8月)

**总计**: 22个已识别问题
- ✅ **已完全修复**: 20个问题
- ⚠️ **临时修复**: 1个问题 (Nginx网络连接)
- 📊 **影响最大**: 前后端API路由不匹配问题

**最新更新**: 2025-09-09 - 修复Android设备报修照片上传Docker卷挂载权限问题

### 0. 系统设置API 404错误(本地开发环境) - 已解决
**问题**: 系统设置页面功能完全无法使用
```
GET http://localhost/api/settings/locations?page=1&limit=20 404 (Not Found)
GET http://localhost/api/settings/categories?page=1&limit=20 404 (Not Found)
```

**根本原因**: 本地开发环境Nginx配置缺少`/api/settings/`路由代理

**解决方案**: 
```nginx
# 在nginx.conf中添加
location /api/settings/ {
    proxy_pass http://user_service/api/settings/;
    # ... 其他代理配置
}
```

**影响范围**: 仅影响本地开发环境，远程服务器配置无问题
**修复状态**: ✅ 已修复 (2025-08-30)
**详细文档**: [SETTINGS_API_404_FIX.md](./SETTINGS_API_404_FIX.md)

---

### 1. Web前端API地址配置问题(远程部署) - 最关键
**问题**: 浏览器访问远程服务器时出现连接拒绝错误
```
POST http://localhost:3030/api/auth/login net::ERR_CONNECTION_REFUSED
```

**根本原因**: 浏览器中的`localhost:3030`指向用户本地计算机，而不是远程服务器

**解决方案**: Web服务构建时使用服务器实际IP地址
```bash
# 自动检测并使用服务器IP构建Web服务
cd deploy/Server/web-service
SERVER_IP=10.163.144.13 ./deploy.sh
```

**技术细节**: Next.js在构建时将NEXT_PUBLIC_*环境变量嵌入静态文件，必须在构建时指定正确的API地址
**修复状态**: ✅ 已修复 (commit db20ed3)

---

### 1. 容器间数据库连接地址错误
**问题**: 微服务无法连接数据库服务
```
Can't reach database server at `localhost:5432`
Can't reach database server at `localhost:5433`
```

**根本原因**: 部署脚本中DATABASE_URL使用了`localhost`，但容器间通信必须使用容器网络名称

**错误配置**:
```bash
DATABASE_URL="postgresql://...@localhost:5432/..."  # ❌ 错误
DATABASE_URL="postgresql://...@localhost:5433/..."  # ❌ 错误  
```

**正确配置**:
```bash
DATABASE_URL="postgresql://...@emaintenance-postgres:5432/..."  # ✅ 正确
```

**影响服务**: 用户服务、工单服务、资产服务
**修复状态**: ✅ 已修复 (commit 45f1d61)

---

### 2. 数据库认证失败 - POSTGRES_PASSWORD环境变量未导出
**问题**: 所有服务的docker-compose无法正确解析${POSTGRES_PASSWORD}变量
```
Authentication failed against database server at `emaintenance-postgres`, 
the provided database credentials for `postgres` are not valid.
```

**根本原因**: 部署脚本中缺少 `export POSTGRES_PASSWORD` 导致docker-compose无法访问该环境变量

**解决方案**: 在所有服务部署脚本中添加环境变量导出
```bash
# 在所有 deploy.sh 中添加
export POSTGRES_PASSWORD
export DATABASE_URL
export JWT_SECRET
export REDIS_URL
export NODE_ENV
```

**影响服务**: 用户服务、工单服务、资产服务、Web服务
**修复状态**: ✅ 已修复 (commit 37999c1)

---

### 1. Docker权限问题
**问题**: 非root用户无法执行docker命令
```bash
Got permission denied while trying to connect to the Docker daemon socket
```

**解决方案**:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Redis 7.4.5 配置语法问题  
**问题**: Redis配置文件中`keepalive`指令语法错误
```
Bad directive or wrong number of arguments at line 6 'keepalive 60'
```

**解决方案**: Redis 7.x版本中`keepalive`改为`tcp-keepalive`
```bash
# 错误配置
keepalive 60

# 正确配置  
tcp-keepalive 60
```

**影响文件**: `deploy/Server/infrastructure/deploy.sh:102`

### 3. PostgreSQL端口冲突
**问题**: 默认5432端口被本地PostgreSQL占用

**解决方案**: 使用替代端口5433
```bash
# 所有配置文件中的数据库连接
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5433/emaintenance"
POSTGRES_PORT=5433
```

**影响文件**: 
- `deploy/Server/infrastructure/docker-compose.yml`
- `deploy/Server/database/manual-init.sh`
- 所有服务的部署脚本

### 4. 数据库初始化脚本缺失
**问题**: 手动数据库初始化脚本不存在

**解决方案**: 创建完整的`manual-init.sh`脚本，包含：
- 数据库创建和连接测试
- Prisma迁移和客户端生成  
- 主数据初始化(categories, locations, fault_codes等)
- 测试数据创建

**新增文件**: `deploy/Server/database/manual-init.sh`

### 5. TypeScript导入类型错误
**问题**: 构建阶段找不到Prisma类型定义
```typescript
Cannot find module '@prisma/client' or its corresponding type declarations
```

**解决方案**: 在database包中添加显式类型导出
```typescript
// packages/database/src/index.ts
export * from '@prisma/client';
export type { User, UserRole, Asset, WorkOrder, Category, Location, FaultCodeMaster, Reason, PriorityLevel } from '@prisma/client';
```

### 6. Docker容器名称冲突
**问题**: 重复的服务定义导致容器启动失败

**解决方案**: 检查并移除docker-compose.yml中重复的服务定义

### 7. JWT_SECRET环境变量传递问题
**问题**: docker-compose无法访问shell环境变量

**解决方案**: 在所有部署脚本中显式导出环境变量
```bash
# 在docker-compose命令前添加
export DATABASE_URL
export JWT_SECRET  
export REDIS_URL
export NODE_ENV
docker-compose up -d service-name
```

### 8. Prisma二进制目标不匹配
**问题**: Alpine Linux容器中Prisma客户端找不到正确的查询引擎
```
PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime 'linux-musl-openssl-3.0.x'
```

**解决方案**: 在`schema.prisma`中添加完整的二进制目标列表
```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl", "linux-musl-arm64-openssl-1.1.x", "linux-musl-openssl-3.0.x"]
}
```

**影响**: 所有使用数据库的微服务

### 9. Alpine Linux运行时依赖缺失
**问题**: Prisma需要特定的系统库才能在Alpine Linux中运行

**解决方案**: 在所有服务Dockerfile中安装必要依赖
```dockerfile
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache \
    libc6-compat \
    openssl \
    ca-certificates \
    curl \
    wget
```

### 10. 网络性能优化
**问题**: 中国服务器访问Docker Hub和NPM仓库速度慢

**解决方案**: 
- 配置Alpine Linux使用阿里云镜像源
- 在.npmrc中配置淘宝NPM镜像
- 预拉取基础镜像到本地

### 11. TypeScript构建包含测试文件
**问题**: Docker生产构建中包含了测试设置文件，导致Jest类型错误
```
src/test-setup.ts(5,1): error TS2304: Cannot find name 'jest'.
```

**解决方案**: 在所有服务的tsconfig.json中排除测试设置文件
```json
{
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.test.tsx", "**/__tests__/**", "**/test-setup.ts"]
}
```

**影响服务**: user-service, work-order-service, asset-service

### 12. Docker容器内目录创建权限问题
**问题**: 应用启动时无法在uploads目录下创建子目录
```
Error: EACCES: permission denied, mkdir '/app/uploads/work-orders'
```

**解决方案**: 在Dockerfile中预先创建所有必要的子目录
```dockerfile
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser && \
    mkdir -p /app/logs /app/uploads/work-orders /app/uploads/attachments && \
    chown -R apiuser:nodejs /app/logs /app/uploads
```

**影响服务**: user-service, work-order-service, asset-service

### 13. 卷挂载权限覆盖问题
**问题**: Docker卷挂载覆盖了容器内预创建的目录结构和权限
```yaml
volumes:
  - /opt/emaintenance/data/work-order-uploads:/app/uploads  # 覆盖容器内目录
```

**解决方案**: 在部署脚本中预创建宿主机目录结构和权限
```bash
sudo mkdir -p /opt/emaintenance/data/work-order-uploads/work-orders/{2024,2025,2026}/{01,02,03,04,05,06,07,08,09,10,11,12}/thumbnails
sudo chown -R 1001:1001 /opt/emaintenance/data/work-order-uploads
```

**影响服务**: 所有使用卷挂载的服务

### 14. 数据库连接主机名配置错误
**问题**: docker-compose.yml中DATABASE_URL使用错误的主机名和端口
```
DATABASE_URL=${DATABASE_URL}  # 可能指向 postgres:5433 (错误)
```

**解决方案**: 明确指定容器间通信的正确主机名
```yaml
environment:
  - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@emaintenance-postgres:5432/emaintenance
```

**影响服务**: work-order-service, asset-service (可能)

### 15. 资产服务健康检查端点路径不匹配
**问题**: 健康检查端点注册在错误的路径下导致404错误
```
warn: Route not found {"path":"/health","method":"GET","service":"asset-service"}
```

**解决方案**: 将健康检查端点从`/api/health`移至根路径`/health`
```typescript
// 在主应用文件中直接注册健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'asset-service',
    timestamp: new Date().toISOString()
  });
});
```

**影响服务**: asset-service
**影响文件**: `apps/api/asset-service/src/index.ts`

### 16. 工单分配API方法不匹配（PUT vs POST）
**问题**: 前端使用PUT方法调用工单分配API，但后端路由定义为POST方法
```
PUT /api/work-orders/wo001/assign 404 Not Found
```

**根本原因**: 前后端HTTP方法定义不一致
- 前端: `workOrderServiceClient.put('/api/work-orders/${workOrderId}/assign')`
- 后端: `router.post('/:id/assign', ...)`

**解决方案**: 修改后端路由支持PUT方法
```typescript
// apps/api/work-order-service/src/routes/workOrders.ts
router.put('/:id/assign',  // 改为PUT方法
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
  workOrderController.assignWorkOrder
);
```

**影响服务**: work-order-service
**影响功能**: 工单分配功能
**修复状态**: ✅ 已修复

### 17. Nginx容器网络连接和DNS解析问题
**问题**: Nginx无法解析后端服务容器名称导致API代理失败
```
** server can't find emaintenance-user-service.bizlinkbgin.com: NXDOMAIN
```

**解决方案**: Docker重启Nginx后网络连接正常，但DNS解析仍有问题
```bash
# 重启Nginx容器重新加载网络配置
docker restart emaintenance-nginx

# 验证容器间连通性(ping成功即可，DNS解析失败不影响)
docker exec emaintenance-nginx ping -c 2 emaintenance-user-service
```

**根本原因**: Docker容器网络在某些情况下需要重新初始化连接

**预防措施**: 
- 按正确顺序部署服务(先后端服务，后Nginx)
- 如果API代理失败，重启Nginx容器
- 考虑在Nginx配置中使用IP地址而非域名

**影响服务**: nginx反向代理
**影响功能**: 所有API路由(/api/auth, /api/users, /api/work-orders, /api/assets)

---

### 18. Nginx代理不传递查询参数导致筛选功能失效
**问题**: 工单管理页面的筛选功能不起作用，所有筛选条件都返回相同结果
```
# 前端发送正确的API请求
GET /api/work-orders?status=COMPLETED&page=1&limit=20

# 但后端收到的是空参数
Raw query: {}
```

**根本原因**: Nginx配置中的正则表达式只捕获路径部分，没有传递查询参数
```nginx
# 错误配置
location ~ ^/api/work-orders(.*)$ {
    proxy_pass http://work_order_service/api/work-orders$1;  # 缺少查询参数
}
```

**解决方案**: 在proxy_pass指令中添加 `$is_args$args` 来传递查询参数
```nginx
# 正确配置
location ~ ^/api/work-orders(.*)$ {
    proxy_pass http://work_order_service/api/work-orders$1$is_args$args;
}
```

**影响范围**: 
- 所有使用查询参数的API端点
- 工单筛选功能（状态、优先级、类别等）
- 分页参数传递
- 搜索功能

**影响文件**: 
- `deploy/Local/configs/nginx.conf`
- `deploy/Server/nginx/deploy.sh` （服务器端配置）

**修复状态**: ✅ 已修复（本地部署），⚠️ 需检查服务器端部署

---

### 19. 数据库表名格式问题
**问题**: manual-init.sh脚本中使用了PascalCase表名格式（如"User", "Asset"），但Prisma生成的实际表名是snake_case格式（如users, assets）
```sql
-- 错误的表名格式
INSERT INTO "User" (name, email, role) VALUES (...);  -- ❌ 错误

-- 正确的表名格式  
INSERT INTO users (name, email, role) VALUES (...);   -- ✅ 正确
```

**根本原因**: 
- ❌ **错误**: 使用`"User"`、`"Asset"`等PascalCase格式
- ✅ **正确**: 使用`users`、`assets`等snake_case格式

**解决方案**: 修复manual-init.sh中所有SQL语句的表名格式
```bash
# 已修复所有表名格式
- "User" → users  
- "Asset" → assets
- "WorkOrder" → work_orders
- "Category" → categories
- "Location" → locations
```

**影响**: 
- 手动SQL插入失败，但Prisma种子脚本正常工作
- 数据库验证查询失败

**影响文件**: `deploy/Server/database/manual-init.sh`
**修复状态**: ✅ 已修复 (2025-08-26)

---

### 20. 工单状态更新前后端API路由不匹配 - 已解决
**问题**: 工单状态更新功能完全失效，前端报告404错误
```javascript
PUT http://localhost/api/work-orders/wo005/status 404 (Not Found)
```

**根本原因**: 前后端API契约不一致
- 前端调用: `PUT /api/work-orders/:id/status`
- 后端路由: `POST /:id/status`  
- HTTP方法不匹配导致路由无法找到

**解决方案**: 修改前端HTTP方法与后端保持一致
```typescript
// apps/web/lib/services/work-order-service.ts
// 修复前: method: 'PUT'
// 修复后: method: 'POST'
```

**影响范围**: 
- 工单状态更新功能完全失效
- 用户无法完成工单处理流程
- 影响核心业务功能体验

**修复状态**: ✅ 已修复 (2025-08-30)
**详细文档**: [API_ROUTE_MISMATCH_ISSUES.md](./API_ROUTE_MISMATCH_ISSUES.md)

---

### 21. 工单状态历史记录路由不匹配 - 已解决  
**问题**: 工单状态更新后无法加载历史记录，显示"加载失败"
```
Route /api/work-orders/wo005/status-history not found
```

**根本原因**: 前后端路由路径命名不一致
- 前端调用: `GET /api/work-orders/:id/status-history`
- 后端路由: `GET /:id/history`
- 路径命名规范不统一

**解决方案**: 修改前端调用路径与后端路由匹配
```typescript
// apps/web/lib/services/work-order-service.ts  
// 修复前: `/api/work-orders/${id}/status-history`
// 修复后: `/api/work-orders/${id}/history`
```

**影响范围**:
- 状态更新成功但历史记录加载失败
- 用户无法查看工单处理历程
- 影响工单跟踪和审计功能

**修复状态**: ✅ 已修复 (2025-08-30)
**详细文档**: [API_ROUTE_MISMATCH_ISSUES.md](./API_ROUTE_MISMATCH_ISSUES.md)

---

### 22. Android设备报修照片上传Docker卷挂载权限问题 - 已解决
**问题**: Android设备报修可以提交订单，但照片上传立即返回500错误
```
照片上传失败: 500 Internal Server Error
```

**症状表现**:
- 工单创建成功，但照片无法上传
- 错误立即返回（非超时问题）
- 照片文件很小，排除大小限制问题
- 测试环境正常，生产环境失败

**根本原因**: Docker卷挂载覆盖容器内预创建的目录权限和结构
```bash
# Docker配置冲突
# Dockerfile预创建: /app/uploads/work-orders/{year}/{month}/thumbnails (权限: 1001:1001)
# 卷挂载覆盖: /opt/emaintenance/data/work-order-uploads:/app/uploads
# 如果宿主机目录缺少年月子目录或权限不正确，PhotoStorageService.savePhoto()失败
```

**技术细节**: 
- `PhotoStorageService.ts:33-46` 中的`fs.mkdir(yearMonthDir, {recursive: true})`操作失败
- 容器以`apiuser(1001:1001)`身份运行，但宿主机目录权限不匹配
- Docker卷挂载覆盖了容器内预设的目录结构和权限

**解决方案**: 修复宿主机Docker卷挂载目录权限
```bash
# 1. 检查当前目录权限
ls -la /opt/emaintenance/data/work-order-uploads/

# 2. 创建当前年月目录结构（需根据实际年月调整）
sudo mkdir -p /opt/emaintenance/data/work-order-uploads/work-orders/2025/09/thumbnails

# 3. 修复权限（1001:1001对应容器内apiuser:nodejs）
sudo chown -R 1001:1001 /opt/emaintenance/data/work-order-uploads/
sudo chmod -R 755 /opt/emaintenance/data/work-order-uploads/

# 4. 重启工单服务使权限生效
docker-compose restart emaintenance-work-order-service
```

**预防措施**:
```bash
# 在工单服务部署脚本中添加完整的目录结构创建
# deploy/Server/work-order-service/deploy.sh 已包含基础结构，但需确保当前年月目录存在
CURRENT_YEAR=$(date +%Y)
CURRENT_MONTH=$(date +%m)
sudo mkdir -p /opt/emaintenance/data/work-order-uploads/work-orders/$CURRENT_YEAR/$CURRENT_MONTH/thumbnails
```

**影响服务**: work-order-service
**影响功能**: Android移动端照片上传（Web端使用不同的上传路径，可能不受影响）
**影响文件**: 
- `apps/api/work-order-service/src/services/PhotoStorageService.ts`
- `deploy/Server/work-order-service/deploy.sh`
- `deploy/Server/work-order-service/docker-compose.yml`

**修复状态**: ✅ 已修复 (2025-09-09)
**验证方法**: 使用Android设备创建工单并上传照片，确认照片上传成功

## 修复状态追踪

| 问题 | 状态 | 修复文件 | 备注 |
|------|------|----------|------|  
| Docker权限 | ✅ 已修复 | 系统配置 | 用户组配置 |
| Redis配置语法 | ✅ 已修复 | infrastructure/deploy.sh | tcp-keepalive |
| PostgreSQL端口 | ✅ 已修复 | 多个配置文件 | 5432→5433 |
| 数据库初始化 | ✅ 已修复 | database/manual-init.sh | 新创建 |
| TypeScript类型 | ✅ 已修复 | packages/database/src/index.ts | 显式导出 |
| 容器名冲突 | ✅ 已修复 | docker-compose.yml | 清理重复 |
| 环境变量传递 | ✅ 已修复 | 所有部署脚本 | 显式export |
| Prisma二进制目标 | ✅ 已修复 | packages/database/prisma/schema.prisma | 添加目标 |
| Alpine Linux依赖 | ✅ 已修复 | 所有Dockerfile | 运行时库 |
| 中国镜像源 | ✅ 已修复 | 所有Dockerfile | 阿里云镜像 |
| TypeScript测试文件 | ✅ 已修复 | 所有服务tsconfig.json | 排除test-setup.ts |
| Docker容器目录权限 | ✅ 已修复 | 所有服务Dockerfile | 预先创建子目录 |
| 卷挂载权限覆盖问题 | ✅ 已修复 | 工单服务部署脚本 | 宿主机预创建+权限 |
| 数据库连接主机名错误 | ✅ 已修复 | 工单服务docker-compose.yml | 容器名修正 |
| 资产服务健康检查端点路径 | ✅ 已修复 | asset-service/src/index.ts | /health路径修正 |
| 工单分配API方法不匹配 | ✅ 已修复 | work-order-service/src/routes/workOrders.ts | PUT方法修正 |
| Nginx容器网络连接问题 | ⚠️ 临时修复 | 重启nginx容器 | 需要重启解决 |
| Nginx代理不传递查询参数 | ✅ 已修复 | Local/configs/nginx.conf | 添加$is_args$args |
| 数据库表名格式问题 | ✅ 已修复 | Server/database/manual-init.sh | PascalCase→snake_case |
| 工单状态更新API方法不匹配 | ✅ 已修复 | apps/web/lib/services/work-order-service.ts | PUT→POST方法修正 |
| 工单状态历史路由不匹配 | ✅ 已修复 | apps/web/lib/services/work-order-service.ts | status-history→history路径修正 |
| Android设备报修照片上传权限问题 | ✅ 已修复 | 服务器端目录权限配置 | Docker卷挂载权限修复 |

## 预防措施

1. **标准化Dockerfile模板**: 所有服务使用相同的基础配置
2. **环境变量检查**: 部署脚本中验证必要的环境变量
3. **依赖预检查**: 启动前验证数据库、Redis等服务状态
4. **构建缓存优化**: 合理组织Docker层以提高构建效率
5. **健康检查**: 所有服务都有完整的健康检查端点

## 下次部署注意事项

1. 在新环境中首先检查端口占用情况
2. 确保Docker用户权限正确配置
3. 验证网络访问（NPM、Docker Hub镜像源）
4. 运行完整的依赖检查清单
5. 按服务依赖顺序部署：infrastructure → database → services → web → nginx
6. **Docker卷挂载权限检查**: 确保所有卷挂载目录具有正确的用户权限(1001:1001)和目录结构