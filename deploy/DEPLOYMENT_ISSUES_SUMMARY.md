# E-Maintenance 远程服务器部署问题总结

**部署环境**: Ubuntu 24.04.3 LTS (中国区服务器)  
**部署时间**: 2025年8月27日  
**部署结果**: ✅ 成功  

---

## 📋 系统架构概览

### 服务端口分配
- **PostgreSQL**: 5433 (外部) → 5432 (容器内部)
- **Redis**: 6380 (外部) → 6379 (容器内部)  
- **用户服务**: 3001
- **工单服务**: 3002
- **资产服务**: 3003
- **Web应用**: 3000
- **Nginx代理**: 3030 (公开访问入口)

### 网络架构
```
用户浏览器 → Nginx(3030) → 各微服务(3001-3003)
                ↓
         Web应用(3000) → PostgreSQL(5432) + Redis(6379)
```

---

## 🚨 关键问题及解决方案

### 1. 数据库认证失败 - POSTGRES_PASSWORD环境变量未导出

**问题描述**:
```
Authentication failed against database server at `emaintenance-postgres`, 
the provided database credentials for `postgres` are not valid.
```

**根本原因**: 所有服务部署脚本中缺少 `export POSTGRES_PASSWORD`，导致docker-compose无法访问该环境变量

**解决方案**:
```bash
# 在所有服务的 deploy.sh 中添加
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
export DATABASE_URL
export JWT_SECRET  
export REDIS_URL
export NODE_ENV
```

**影响服务**: 用户服务、工单服务、资产服务、Web服务  
**修复提交**: commit 37999c1, 45f1d61

---

### 2. 容器间数据库连接地址错误

**问题描述**:
```
Can't reach database server at `localhost:5432`
Can't reach database server at `localhost:5433`
```

**根本原因**: 部署脚本中DATABASE_URL使用了`localhost`，但容器间通信必须使用容器网络名称

**错误配置**:
```bash
DATABASE_URL="postgresql://...@localhost:5432/..."  # 用户服务
DATABASE_URL="postgresql://...@localhost:5433/..."  # 工单和资产服务  
```

**正确配置**:
```bash
DATABASE_URL="postgresql://...@emaintenance-postgres:5432/..."  # 所有服务
```

**影响服务**: 用户服务、工单服务、资产服务  
**修复提交**: commit 45f1d61

---

### 3. Web前端API地址配置问题

**问题描述**:
```
POST http://localhost:3001/api/auth/login net::ERR_CONNECTION_REFUSED
POST http://localhost:3030/api/auth/login net::ERR_CONNECTION_REFUSED
```

**根本原因**: 多个层次的配置问题

#### 3.1 缺少NEXT_PUBLIC_API_URL环境变量
- Web前端代码使用`NEXT_PUBLIC_API_URL`，但docker-compose中缺少此变量
- **修复**: 在web-service docker-compose.yml中添加 `NEXT_PUBLIC_API_URL: http://localhost:3030`

#### 3.2 Next.js构建时环境变量问题
- Next.js在**构建时**将`NEXT_PUBLIC_*`变量嵌入静态文件，运行时无法修改
- **修复**: 在Dockerfile中添加ARG和ENV指令，部署脚本传递--build-arg参数

#### 3.3 localhost地址问题(最关键)
- 浏览器中的`localhost:3030`指向用户本地计算机，不是远程服务器
- **修复**: 使用服务器实际IP地址替换localhost

**最终解决方案**:
```bash
# 自动检测服务器IP并构建
SERVER_IP=10.163.144.13 ./deploy.sh
```

**修复提交**: commit 5b90147, 6ff1034, db20ed3

---

### 4. 资产服务健康检查路由缺失

**问题描述**:
```
HTTP/1.1" 404 142 "-" "wget/1.21.4"
```

**根本原因**: 资产服务缺少 `/health` 路由定义

**解决方案**: 在 `apps/api/asset-service/src/index.ts` 中添加健康检查路由
```typescript
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'asset-service',
    timestamp: new Date().toISOString()
  });
});
```

**修复提交**: commit bcf2794

---

### 5. TypeScript构建错误

**问题描述**:
```
Parameter 'value' implicitly has an 'any' type
```

**根本原因**: shadcn/ui Select组件的onValueChange处理器缺少类型注解

**解决方案**: 为所有Select组件添加明确的类型注解
```typescript
onValueChange={(value: string) => handleChange(value)}
```

**批量修复命令**:
```bash
find apps/web/components -name "*.tsx" -exec sed -i '' 's/onValueChange={(value) =>/onValueChange={(value: string) =>/g' {} \;
```

**修复提交**: commit 08af6a1

---

### 6. Prisma二进制目标配置问题

**问题描述**:
```
Error: Unable to require(`/app/node_modules/.prisma/client/index.js`).
```

**根本原因**: Prisma客户端生成时未指定正确的二进制目标平台

**解决方案**: 在所有服务的schema.prisma中添加
```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl", "linux-musl-openssl-3.0.x"]
}
```

**修复提交**: commit 313c856

---

### 7. Docker权限和目录问题

**问题描述**:
```
Got permission denied while trying to connect to the Docker daemon socket
mkdir: cannot create directory '/opt/emaintenance': Permission denied
```

**解决方案**:
```bash
# Docker权限
sudo usermod -aG docker $USER
newgrp docker

# 目录权限  
sudo mkdir -p /opt/emaintenance/{logs,data}
sudo chown -R $USER:$USER /opt/emaintenance
```

---

## 🛠️ 预防性修复措施

### 1. 环境变量导出标准化
所有服务部署脚本统一添加必要环境变量导出：
```bash
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"  
export DATABASE_URL
export JWT_SECRET
export REDIS_URL  
export NODE_ENV
```

### 2. 容器网络地址标准化
所有服务统一使用容器网络名称：
- PostgreSQL: `emaintenance-postgres:5432`
- Redis: `emaintenance-redis:6379`
- 各微服务: `emaintenance-{service-name}:{port}`

### 3. Next.js构建时配置
Web服务Dockerfile标准模板：
```dockerfile
# 接受构建时环境变量
ARG NEXT_PUBLIC_API_URL=http://localhost:3030
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
```

### 4. 健康检查路由标准化
所有微服务必须提供统一的健康检查端点：
```typescript
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'service-name',
    timestamp: new Date().toISOString()
  });
});
```

---

## 📝 部署最佳实践

### 1. 部署顺序
```
基础设施(PostgreSQL+Redis) → 数据库初始化 → 微服务(用户→工单→资产) → Web应用 → Nginx代理
```

### 2. 环境变量管理
- 集中在 `deploy/Server/infrastructure/.env` 文件中管理
- 部署脚本自动加载并导出必要变量
- 敏感信息不提交到版本控制

### 3. 容器网络配置
- 使用统一的Docker网络 `emaintenance-network`
- 服务间通信使用容器名称而非localhost
- 外部访问通过端口映射

### 4. 远程服务器部署注意事项
- Web服务必须使用服务器实际IP地址作为API_URL
- 防火墙开放必要端口(80, 443, 3030)
- 考虑中国区网络环境的特殊性(镜像源、网络限制)

---

## 🔧 调试工具

部署过程中创建了多个调试脚本：

### 1. debug-login.sh
- 全面诊断登录问题
- 检查环境变量、数据库连接、API端点

### 2. diagnose-nginx.sh  
- 诊断Nginx代理问题
- 检查容器状态、端口监听、网络连通性

### 3. check-web-env.sh
- 检查Web服务API配置
- 验证构建时环境变量嵌入

---

## ✅ 最终部署状态

### 服务状态
- ✅ PostgreSQL: 健康运行，数据库已初始化
- ✅ Redis: 健康运行  
- ✅ 用户服务: 健康运行，API认证正常
- ✅ 工单服务: 健康运行
- ✅ 资产服务: 健康运行，健康检查正常
- ✅ Web应用: 健康运行，API配置正确
- ✅ Nginx代理: 健康运行，路由配置正确

### 功能验证
- ✅ 数据库连接: 所有服务正常连接
- ✅ API端点: 通过Nginx代理正常访问
- ✅ 用户认证: 登录功能完全正常  
- ✅ Web界面: 远程访问正常

### 访问地址
- **主入口**: http://10.163.144.13:3030
- **管理员账户**: admin / admin123
- **API基础地址**: http://10.163.144.13:3030/api

---

## 🎯 经验教训

1. **容器化环境变量传递**是最容易出错的环节，需要格外注意
2. **容器间网络通信**不能使用localhost，必须使用容器名称
3. **Next.js构建时环境变量**的特殊性容易被忽视
4. **远程部署的网络地址配置**是关键难点
5. **系统性的预防性修复**比被动修复更有效
6. **详细的调试脚本**是排查问题的利器

这次部署经历了从基础设施到应用层的完整问题解决过程，为后续部署提供了宝贵经验和完整的解决方案模板。