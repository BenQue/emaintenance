# E-Maintenance 部署架构与流程

## 部署架构概述

E-Maintenance 系统采用分层容器化部署架构，支持本地开发、远程生产两种部署模式，具备高可用性、可扩展性和易维护性。

## 1. 部署架构图

### 1.1 整体部署拓扑
```
                        【外部访问层】
                    Internet/Internal Network
                              │
                              ▼
                        ┌─────────────┐
                        │   Nginx     │ Port: 3030
                        │ (反向代理)   │ (统一入口)
                        └─────────────┘
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
              【应用服务层】
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ Web应用     │ │ 用户服务    │ │ 工单服务    │ 
    │ Next.js     │ │ Node.js     │ │ Node.js     │
    │ Port: 3000  │ │ Port: 3001  │ │ Port: 3002  │
    └─────────────┘ └─────────────┘ └─────────────┘
                              │         
                              ▼
                    ┌─────────────┐
                    │ 资产服务    │
                    │ Node.js     │
                    │ Port: 3003  │
                    └─────────────┘
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         
              【数据存储层】
         ┌─────────────┐ ┌─────────────┐
         │ PostgreSQL  │ │   Redis     │
         │ Port: 5432  │ │ Port: 6379  │
         │ (主数据库)   │ │ (缓存/会话) │
         └─────────────┘ └─────────────┘

              【文件存储层】
         ┌─────────────────────────────┐
         │      Host File System       │
         │ /opt/emaintenance/          │
         │ ├── data/                   │
         │ ├── logs/                   │
         │ └── backups/                │
         └─────────────────────────────┘
```

### 1.2 Docker容器网络架构
```
                    Docker Network: emaintenance-network
    ┌─────────────────────────────────────────────────────────────┐
    │                                                             │
    │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
    │  │ emaintenance│    │ emaintenance│    │ emaintenance│    │
    │  │   -nginx    │    │    -web     │    │-user-service│    │
    │  │ (Gateway)   │    │ (Frontend)  │    │ (Auth/User) │    │
    │  └─────────────┘    └─────────────┘    └─────────────┘    │
    │          │                   │                   │         │
    │          └───────────────────┼───────────────────┘         │
    │                              │                             │
    │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
    │  │ emaintenance│    │ emaintenance│    │ emaintenance│    │
    │  │-work-order  │    │-asset-service│   │  -postgres  │    │
    │  │-service     │    │ (Assets)    │    │ (Database)  │    │
    │  └─────────────┘    └─────────────┘    └─────────────┘    │
    │          │                   │                   │         │
    │          └───────────────────┼───────────────────┘         │
    │                              │                             │
    │                    ┌─────────────┐                        │
    │                    │ emaintenance│                        │
    │                    │   -redis    │                        │
    │                    │  (Cache)    │                        │
    │                    └─────────────┘                        │
    └─────────────────────────────────────────────────────────────┘
                             Host Network
            ┌───────────────────────────────────────────────────┐
            │ Host Ports: 3030, 3000, 3001, 3002, 3003,       │
            │            5432, 6379                             │
            └───────────────────────────────────────────────────┘
```

## 2. 部署流程设计

### 2.1 部署流程图
```mermaid
graph TD
    A[开始部署] --> B{选择部署模式}
    B --> C[本地开发部署]
    B --> D[远程生产部署]
    
    C --> C1[启动基础设施]
    C1 --> C2[启动API服务]
    C2 --> C3[启动Web前端]
    C3 --> C4[配置Nginx代理]
    C4 --> E[部署完成]
    
    D --> D1[环境检查]
    D1 --> D2[上传代码包]
    D2 --> D3[构建Docker镜像]
    D3 --> D4[按序启动服务]
    D4 --> D5[健康检查]
    D5 --> D6{所有服务正常?}
    D6 -->|是| E
    D6 -->|否| D7[回滚操作]
    D7 --> D8[故障排查]
    D8 --> D4
    
    E --> F[部署验证]
    F --> G[监控启动]
    G --> H[部署结束]
```

### 2.2 服务启动依赖关系
```mermaid
graph TD
    A[PostgreSQL] --> D[User Service]
    B[Redis] --> D
    D --> E[Work Order Service]
    D --> F[Asset Service]
    E --> G[Web Application]
    F --> G
    G --> H[Nginx Gateway]
    
    style A fill:#f9f,stroke:#333,stroke-width:4px
    style B fill:#f9f,stroke:#333,stroke-width:4px
    style D fill:#bbf,stroke:#333,stroke-width:2px
    style E fill:#bbf,stroke:#333,stroke-width:2px
    style F fill:#bbf,stroke:#333,stroke-width:2px
    style G fill:#bfb,stroke:#333,stroke-width:2px
    style H fill:#fbf,stroke:#333,stroke-width:4px
```

## 3. 部署模式详解

### 3.1 本地开发部署 (Local Development)
```bash
# 项目根目录结构
/Users/benque/Project/Emaintenance/
├── apps/                    # 应用程序代码
├── packages/               # 共享包
├── deploy/Local/           # 本地部署配置
│   ├── docker-compose.yml # 本地容器编排
│   └── configs/           # Nginx等配置
└── scripts/               # 部署脚本
```

**特点**:
- 使用相对路径和本地端口映射
- 支持热重载和调试模式
- 数据库端口5433（避免与本地PostgreSQL冲突）
- 开发友好的日志级别

### 3.2 远程生产部署 (Remote Production)
```bash
# 远程服务器目录结构
/opt/emaintenance/
├── deploy/Server/          # 生产部署脚本
│   ├── infrastructure/     # 基础设施服务
│   ├── user-service/      # 用户服务部署
│   ├── work-order-service/# 工单服务部署
│   ├── asset-service/     # 资产服务部署
│   ├── web-service/       # Web应用部署
│   └── nginx/             # Nginx配置
├── data/                  # 持久化数据
│   ├── postgres-backup/   # 数据库备份
│   ├── redis-backup/     # Redis备份
│   └── work-order-uploads/# 文件上传
└── logs/                  # 日志文件
    ├── user-service/
    ├── work-order-service/
    ├── asset-service/
    └── nginx/
```

**特点**:
- 生产级配置和安全设置
- 完整的健康检查和监控
- 数据持久化和备份策略
- 性能优化和资源限制

## 4. 部署脚本架构

### 4.1 分层部署脚本
```
deploy/Server/
├── scripts/
│   ├── deploy-all.sh         # 一键部署脚本
│   ├── system-status.sh      # 系统状态检查
│   └── docker-safety-check.sh # Docker环境检查
├── infrastructure/
│   ├── deploy.sh            # 基础设施部署
│   ├── docker-compose.yml   # PostgreSQL + Redis
│   └── health-check.sh      # 基础服务健康检查
├── user-service/
│   ├── deploy.sh            # 用户服务部署
│   ├── Dockerfile           # 用户服务镜像
│   ├── docker-compose.yml   # 服务编排
│   └── health-check.sh      # 服务健康检查
├── work-order-service/
├── asset-service/
├── web-service/
└── nginx/
    ├── deploy.sh            # 网关部署
    └── health-check.sh      # 网关健康检查
```

### 4.2 部署脚本执行流程
```mermaid
sequenceDiagram
    participant U as User
    participant S as Deploy Script
    participant D as Docker
    participant H as Health Check
    
    U->>S: ./deploy-all.sh
    S->>D: Deploy Infrastructure
    D-->>S: PostgreSQL + Redis Ready
    S->>H: Check Infrastructure Health
    H-->>S: Services Healthy
    
    S->>D: Deploy User Service
    D-->>S: User Service Ready
    S->>H: Check User Service
    H-->>S: Service Healthy
    
    S->>D: Deploy Work Order Service  
    D-->>S: Work Order Service Ready
    S->>H: Check Work Order Service
    H-->>S: Service Healthy
    
    S->>D: Deploy Asset Service
    D-->>S: Asset Service Ready
    S->>H: Check Asset Service  
    H-->>S: Service Healthy
    
    S->>D: Deploy Web Application
    D-->>S: Web App Ready
    S->>H: Check Web App
    H-->>S: Web App Healthy
    
    S->>D: Deploy Nginx Gateway
    D-->>S: Gateway Ready
    S->>H: Final System Check
    H-->>S: All Services Healthy
    S-->>U: Deployment Complete
```

## 5. 环境配置管理

### 5.1 环境变量层次
```
1. 系统环境变量 (.env)
   ├── DATABASE_URL
   ├── JWT_SECRET  
   ├── REDIS_URL
   └── NODE_ENV

2. 服务特定配置 (docker-compose.yml)
   ├── PORT (服务端口)
   ├── CORS_ORIGIN (跨域配置)
   └── LOG_LEVEL (日志级别)

3. 部署时动态配置 (deploy.sh)
   ├── SERVER_IP (远程部署)
   ├── NEXT_PUBLIC_API_URL (前端API地址)
   └── POSTGRES_PASSWORD (数据库密码)
```

### 5.2 配置文件模板
```bash
# infrastructure/.env
NODE_ENV=production
POSTGRES_DB=emaintenance
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_PORT=5432
REDIS_PORT=6379
JWT_SECRET=your_jwt_secret_key
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@emaintenance-postgres:5432/emaintenance
REDIS_URL=redis://emaintenance-redis:6379
```

## 6. 网络架构与路由

### 6.1 Nginx反向代理配置
```nginx
# /api/* 路由规则
location /api/auth/        → user-service:3001
location /api/users/       → user-service:3001  
location /api/work-orders/ → work-order-service:3002
location /api/assignment-rules/ → work-order-service:3002
location /api/notifications/    → work-order-service:3002
location /api/assets/      → asset-service:3003

# 前端应用路由
location /             → web:3000

# 健康检查端点
location /health       → nginx internal check
```

### 6.2 端口映射策略
```
Host → Container 端口映射:
3030 → nginx:80        (统一入口)
3000 → web:3000        (Web应用)
3001 → user-service:3001    (用户服务)
3002 → work-order-service:3002 (工单服务)
3003 → asset-service:3003   (资产服务)
5432 → postgres:5432    (数据库)
6379 → redis:6379      (缓存)
```

## 7. 数据持久化策略

### 7.1 Docker卷挂载
```yaml
volumes:
  # 数据库数据持久化
  postgres-data:/var/lib/postgresql/data
  
  # 应用日志挂载
  /opt/emaintenance/logs/user-service:/app/logs
  
  # 文件上传存储
  /opt/emaintenance/data/work-order-uploads:/app/uploads
  
  # 配置文件挂载  
  ./nginx.conf:/etc/nginx/nginx.conf:ro
```

### 7.2 备份策略
```bash
# 数据库备份 (每日凌晨2点)
0 2 * * * docker exec emaintenance-postgres \
  pg_dump -U postgres emaintenance > \
  /opt/emaintenance/backups/db_$(date +%Y%m%d).sql

# 文件备份 (每周日)
0 3 * * 0 tar -czf \
  /opt/emaintenance/backups/uploads_$(date +%Y%m%d).tar.gz \
  /opt/emaintenance/data/work-order-uploads/
```

## 8. 健康检查与监控

### 8.1 多层健康检查
```
1. Docker容器健康检查
   ├── 每30秒检查一次
   ├── 超时10秒判定失败
   └── 连续3次失败重启容器

2. 应用服务健康检查  
   ├── HTTP GET /health
   ├── 检查数据库连接
   ├── 检查Redis连接
   └── 检查依赖服务状态

3. 业务逻辑健康检查
   ├── API响应时间监控
   ├── 错误率统计
   └── 用户访问量监控
```

### 8.2 日志聚合架构
```
各服务容器 → Docker日志驱动 → 宿主机文件 → 日志轮转 → 长期存储
    ↓              ↓              ↓           ↓
 Winston/Console  JSON格式    /opt/emaintenance/logs  压缩归档
                             10MB/文件，保留3个版本
```

## 9. 安全部署配置

### 9.1 网络安全
```bash
# 防火墙配置
ufw allow 22    # SSH
ufw allow 3030  # Nginx入口
ufw deny 3000   # 直接访问Web应用
ufw deny 3001   # 直接访问API服务
ufw deny 3002
ufw deny 3003
ufw deny 5432   # 直接访问数据库
ufw deny 6379   # 直接访问Redis
```

### 9.2 容器安全
```dockerfile
# 非root用户运行
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser
USER apiuser

# 只读文件系统 (配置文件)
volumes:
  - ./nginx.conf:/etc/nginx/nginx.conf:ro
  
# 资源限制
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 512M
```

## 10. 部署最佳实践

### 10.1 部署检查清单
```
部署前检查:
□ 环境变量配置正确
□ Docker和Docker Compose版本兼容  
□ 服务器资源充足 (CPU/内存/磁盘)
□ 网络端口可用
□ 防火墙规则配置

部署中监控:
□ 各服务容器启动顺序正确
□ 健康检查通过
□ 日志输出正常
□ 数据库连接成功
□ API端点响应正常

部署后验证:
□ Web界面可访问
□ 用户登录功能正常
□ 工单创建和分配流程完整
□ 文件上传功能正常
□ 系统性能指标正常
```

### 10.2 故障排查步骤
```mermaid
flowchart TD
    A[部署失败] --> B{容器启动失败?}
    B -->|是| C[检查Docker日志]
    B -->|否| D{服务健康检查失败?}
    
    C --> E[检查环境变量]
    C --> F[检查端口冲突]
    C --> G[检查资源限制]
    
    D -->|是| H[检查服务依赖]
    D -->|否| I{API请求失败?}
    
    H --> J[确认数据库连接]
    H --> K[确认Redis连接]
    
    I -->|是| L[检查Nginx配置]
    I -->|否| M[检查业务逻辑]
    
    E --> N[修复配置重启]
    F --> N
    G --> N
    J --> N  
    K --> N
    L --> N
    M --> O[业务逻辑调试]
```

### 10.3 性能优化建议

**Docker镜像优化**:
- 使用多阶段构建减少镜像大小
- 选用Alpine Linux基础镜像
- .dockerignore排除非必要文件
- 层缓存优化构建速度

**容器资源优化**:
- 合理设置内存和CPU限制
- 使用健康检查确保服务可用性
- 配置日志轮转避免磁盘占满
- 定期清理无用镜像和容器

**网络性能优化**:
- Nginx启用gzip压缩
- 配置适当的缓存策略  
- 使用连接池减少数据库连接开销
- CDN加速静态资源访问

## 11. 灾难恢复计划

### 11.1 备份策略
```bash
# 自动备份脚本
#!/bin/bash
BACKUP_DIR="/opt/emaintenance/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 数据库备份
docker exec emaintenance-postgres pg_dumpall -U postgres > \
  $BACKUP_DIR/postgres_full_$DATE.sql

# 应用数据备份  
tar -czf $BACKUP_DIR/app_data_$DATE.tar.gz \
  /opt/emaintenance/data/

# 配置文件备份
tar -czf $BACKUP_DIR/configs_$DATE.tar.gz \
  /opt/emaintenance/deploy/Server/

# 保留最近30天的备份
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

### 11.2 故障恢复流程
```mermaid
graph TD
    A[系统故障] --> B{故障类型判断}
    B --> C[单服务故障]
    B --> D[数据库故障] 
    B --> E[全系统故障]
    
    C --> C1[重启故障服务]
    C1 --> C2[检查服务日志]
    C2 --> C3[修复配置问题]
    C3 --> F[服务恢复]
    
    D --> D1[检查数据库状态]
    D1 --> D2[从备份恢复]
    D2 --> D3[重启相关服务]
    D3 --> F
    
    E --> E1[停止所有服务]
    E1 --> E2[恢复最近备份]
    E2 --> E3[按序重启服务]
    E3 --> E4[验证系统功能]
    E4 --> F
    
    F --> G[监控系统状态]
    G --> H[故障根因分析]
    H --> I[完善预防措施]
```

## 总结

E-Maintenance系统的部署架构采用现代化的容器编排技术，实现了高可用、易扩展、易维护的部署方案。通过分层部署、健康检查、监控告警等机制，确保系统稳定运行。

部署架构的核心优势：
- **模块化部署**: 每个服务独立部署和扩展
- **环境一致性**: Docker容器确保开发生产环境一致
- **自动化运维**: 脚本化部署和健康检查
- **故障隔离**: 单个服务故障不影响整体系统
- **快速恢复**: 完善的备份和恢复机制

该架构为企业级应用提供了可靠的部署基础，支持持续集成和持续部署的现代化开发流程。