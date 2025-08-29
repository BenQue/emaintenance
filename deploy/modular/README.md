# E-Maintenance 分模块Docker部署方案

## 架构概述

分模块部署将整个系统拆分为独立可管理的模块，每个模块可以独立部署、扩展和维护：

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Infrastructure│  │   Microservices │  │   Frontend      │
│   基础设施模块    │  │   微服务模块     │  │   前端模块       │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • PostgreSQL    │  │ • User Service  │  │ • Web App       │
│ • Redis Cache   │  │ • WorkOrder Svc │  │ • Static Assets │
│ • Nginx Gateway │  │ • Asset Service │  │ • CDN Support   │
│ • File Storage  │  │ • API Gateway   │  │ • Load Balancer │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## 模块划分

### 1. 基础设施模块 (Infrastructure)
- **PostgreSQL 数据库**：主数据存储
- **Redis 缓存**：会话和缓存存储  
- **Nginx 网关**：API网关和静态文件服务
- **文件存储**：工单附件和图片存储

### 2. 微服务模块 (Microservices)  
- **用户服务 (User Service)**：认证、用户管理
- **工单服务 (WorkOrder Service)**：工单CRUD、状态管理、通知
- **资产服务 (Asset Service)**：资产管理、QR码
- **网关服务 (API Gateway)**：统一API入口、路由、认证

### 3. 前端模块 (Frontend)
- **Web应用**：Next.js用户界面
- **静态资源**：CSS、JS、图片资源
- **CDN支持**：静态资源加速

## 部署模式

### 模式1：完整部署
```bash
./deploy-all.sh
```
部署所有模块，适用于单服务器全量部署

### 模式2：基础设施优先
```bash
./deploy-infrastructure.sh
./deploy-microservices.sh  
./deploy-frontend.sh
```
分步部署，适用于分布式环境

### 模式3：服务更新
```bash
./deploy-service.sh user-service
./deploy-service.sh work-order-service
```
单独更新特定服务，适用于持续部署

### 模式4：扩展部署
```bash
./scale-service.sh work-order-service 3
./scale-service.sh user-service 2
```
水平扩展特定服务

## 配置管理

### 环境配置
- **开发环境**：`envs/dev.env`
- **测试环境**：`envs/test.env`  
- **生产环境**：`envs/prod.env`

### 服务发现
- 使用Docker网络进行服务间通信
- Nginx作为服务发现和负载均衡
- 支持健康检查和故障转移

### 数据持久化
- PostgreSQL数据卷：`data/postgres/`
- Redis数据卷：`data/redis/`
- 文件上传卷：`data/uploads/`
- 日志卷：`logs/`

## 优势

1. **独立部署**：每个模块可独立部署和更新
2. **灵活扩展**：根据负载需求独立扩展服务
3. **故障隔离**：单个服务故障不影响其他服务
4. **资源优化**：根据服务特性分配不同的资源
5. **开发效率**：团队可并行开发和部署不同模块
6. **维护简化**：问题定位和修复更加精确

## 快速开始

1. **克隆配置**：
   ```bash
   cd deploy/modular
   cp envs/dev.env.example envs/dev.env
   ```

2. **配置环境变量**：
   ```bash
   vim envs/dev.env  # 修改数据库密码、JWT密钥等
   ```

3. **部署基础设施**：
   ```bash
   ./deploy-infrastructure.sh dev
   ```

4. **部署微服务**：
   ```bash
   ./deploy-microservices.sh dev
   ```

5. **部署前端**：
   ```bash  
   ./deploy-frontend.sh dev
   ```

6. **验证部署**：
   ```bash
   ./health-check.sh
   ```

## 监控和日志

- **服务健康检查**：每个服务包含 `/health` 端点
- **集中日志收集**：所有日志统一存储到 `logs/` 目录
- **性能监控**：支持集成 Prometheus 和 Grafana
- **告警通知**：支持邮件和 Webhook 通知

## 故障排除

常见问题和解决方案请参考：
- [基础设施故障排除](troubleshooting/infrastructure.md)
- [微服务故障排除](troubleshooting/microservices.md)
- [前端故障排除](troubleshooting/frontend.md)