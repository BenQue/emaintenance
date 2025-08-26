# E-Maintenance 部署已知问题和解决方案

## 问题汇总 (2025年8月)

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
DATABASE_URL="postgresql://postgres:password@localhost:5433/emaintenance"
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
  - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@emaintenance-postgres:5432/emaintenance
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