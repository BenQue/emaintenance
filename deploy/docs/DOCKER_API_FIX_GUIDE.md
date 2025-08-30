# Docker部署API访问404问题解决方案

## 问题描述
在Docker部署后，工单操作（分配、更改状态、完成工单、上传照片等）全部失败，返回404错误。
示例错误：`POST http://localhost:3002/api/work-orders/wo002/complete 404 (Not Found)`

## 问题根因分析

### 1. 环境配置差异
| 环境 | 前端API调用方式 | 结果 |
|------|----------------|------|
| 本地开发 | 直接调用 `http://localhost:3002` | ✅ 正常工作 |
| Docker部署 | 前端容器内调用 `http://localhost:3002` | ❌ 404错误 |

### 2. 具体原因
- **本地环境**：所有服务运行在同一台主机上，`localhost:3002` 能正确访问work-order-service
- **Docker环境**：
  - 前端运行在独立容器中
  - 前端调用 `localhost:3002` 会尝试访问**前端容器本身**的3002端口
  - 实际的work-order-service运行在另一个容器中
  - 虽然配置了Nginx反向代理，但前端请求直接发送到了 `localhost:3002`，绕过了Nginx

### 3. 当前配置问题
```yaml
# docker-compose.yml 中的环境变量配置
web:
  environment:
    NEXT_PUBLIC_API_URL: http://localhost              # 应该通过Nginx
    NEXT_PUBLIC_WORK_ORDER_SERVICE_URL: http://localhost  # 应该通过Nginx
    NEXT_PUBLIC_ASSET_SERVICE_URL: http://localhost       # 应该通过Nginx
```

前端代码中的fallback：
```typescript
// work-order-service.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_WORK_ORDER_SERVICE_URL || 'http://localhost:3002';
```

当环境变量是 `http://localhost` 时，前端会使用这个URL，但是在拼接完整路径时可能出现问题。

## 解决方案

### 方案1：修正Docker Compose环境变量（推荐）

修改 `deploy/docker-compose.yml`：

```yaml
web:
  environment:
    # 移除这些环境变量，让前端使用默认的fallback
    # 或者设置为空字符串，强制使用Nginx代理
    NEXT_PUBLIC_API_URL: ""
    NEXT_PUBLIC_USER_SERVICE_URL: ""
    NEXT_PUBLIC_WORK_ORDER_SERVICE_URL: ""
    NEXT_PUBLIC_ASSET_SERVICE_URL: ""
    NODE_ENV: production
```

### 方案2：配置正确的服务URL

如果要保留环境变量配置，应该设置为通过Nginx的路径：

```yaml
web:
  environment:
    NEXT_PUBLIC_API_URL: http://nginx
    NEXT_PUBLIC_USER_SERVICE_URL: http://nginx
    NEXT_PUBLIC_WORK_ORDER_SERVICE_URL: http://nginx
    NEXT_PUBLIC_ASSET_SERVICE_URL: http://nginx
    NODE_ENV: production
```

### 方案3：更新前端服务配置文件

创建一个统一的API配置：

```typescript
// apps/web/lib/config/api.ts
const isDocker = process.env.NEXT_PUBLIC_IS_DOCKER === 'true';
const baseUrl = isDocker ? '' : 'http://localhost';

export const API_ENDPOINTS = {
  AUTH: process.env.NEXT_PUBLIC_API_URL || `${baseUrl}:3001`,
  WORK_ORDER: process.env.NEXT_PUBLIC_WORK_ORDER_SERVICE_URL || `${baseUrl}:3002`,
  ASSET: process.env.NEXT_PUBLIC_ASSET_SERVICE_URL || `${baseUrl}:3003`,
};
```

## 快速修复步骤

### 步骤1：更新docker-compose.yml

```bash
cd /Users/benque/Project/Emaintenance
```

编辑 `deploy/docker-compose.yml`，将web服务的环境变量部分修改为：

```yaml
web:
  build:
    context: ..
    dockerfile: apps/web/Dockerfile
  container_name: emaintenance-web
  environment:
    # 注意：这里故意留空，让前端通过相对路径访问API
    NEXT_PUBLIC_API_URL: ""
    NEXT_PUBLIC_USER_SERVICE_URL: ""
    NEXT_PUBLIC_WORK_ORDER_SERVICE_URL: ""
    NEXT_PUBLIC_ASSET_SERVICE_URL: ""
    NODE_ENV: production
  ports:
    - "3000:3000"
```

### 步骤2：更新前端服务文件以支持相对路径

修改以下文件：

1. **apps/web/lib/services/work-order-service.ts**
```typescript
// 修改为支持相对路径
const API_BASE_URL = process.env.NEXT_PUBLIC_WORK_ORDER_SERVICE_URL || 
  (typeof window !== 'undefined' ? '' : 'http://localhost:3002');

class WorkOrderService {
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    // 如果API_BASE_URL为空，使用相对路径
    const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    // ...
  }
}
```

2. **类似地更新其他服务文件**：
   - apps/web/lib/services/auth-service.ts
   - apps/web/lib/services/asset-service.ts
   - apps/web/lib/services/api-client.ts

### 步骤3：重新构建和部署

```bash
# 停止当前容器
docker-compose -f deploy/docker-compose.yml down

# 重新构建镜像
docker-compose -f deploy/docker-compose.yml build --no-cache web

# 启动服务
docker-compose -f deploy/docker-compose.yml up -d
```

### 步骤4：验证修复

```bash
# 检查服务健康状态
docker-compose -f deploy/docker-compose.yml ps

# 查看Nginx日志，确认请求经过Nginx
docker-compose -f deploy/docker-compose.yml logs -f nginx

# 测试API调用
curl http://localhost/api/work-orders
curl http://localhost/api/users/profile
curl http://localhost/api/assets
```

## 验证检查清单

- [ ] 前端请求不再直接访问 `localhost:3002`
- [ ] 所有API请求都经过Nginx（端口80）
- [ ] 工单创建功能正常
- [ ] 工单分配功能正常  
- [ ] 工单状态更新正常
- [ ] 工单完成功能正常
- [ ] 照片上传功能正常
- [ ] 用户登录/登出正常
- [ ] 资产管理功能正常

## 长期解决方案

### 1. 使用服务发现
在生产环境中，考虑使用：
- Docker Swarm的服务发现
- Kubernetes的Service
- Consul或其他服务注册中心

### 2. 环境分离配置
创建不同的配置文件：
- `.env.local` - 本地开发
- `.env.docker` - Docker部署
- `.env.production` - 生产环境

### 3. API网关模式
使用专门的API网关（如Kong、Traefik）来处理：
- 服务路由
- 负载均衡
- 认证授权
- 限流熔断

## 问题预防

1. **开发时模拟生产环境**：使用docker-compose进行本地开发测试
2. **配置验证**：在CI/CD中添加配置验证步骤
3. **健康检查**：确保所有服务都有完善的健康检查端点
4. **日志监控**：集中收集和分析容器日志

## 相关文件
- `/deploy/docker-compose.yml` - Docker编排配置
- `/deploy/Local/configs/nginx.conf` - Nginx反向代理配置
- `/apps/web/lib/services/` - 前端API服务层
- `/apps/api/*/src/index.ts` - 各微服务入口文件