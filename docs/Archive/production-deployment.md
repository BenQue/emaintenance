# EMaintenance 生产环境部署指南

> 本文档提供 EMaintenance 系统在生产环境中使用 Docker 容器化部署的完整指南。

## 📋 目录

- [部署概述](#部署概述)
- [开发环境配置](#开发环境配置)
- [生产环境准备](#生产环境准备)
- [Docker 配置文件](#docker-配置文件)
- [部署流程](#部署流程)
- [监控与维护](#监控与维护)
- [故障排除](#故障排除)
- [性能优化](#性能优化)

## 🎯 部署概述

### 架构设计

EMaintenance 采用微服务架构，包含以下核心组件：

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js Web   │    │  Mobile Flutter │    │   API Gateway   │
│     (Port 3000) │    │      App        │    │  (可选负载均衡)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
    ┌────────────────────────────┼────────────────────────────┐
    │                            │                            │
    ▼                            ▼                            ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  User Service   │    │Work Order Svc   │    │ Asset Service   │
│   (Port 3001)   │    │   (Port 3002)   │    │   (Port 3003)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
              ┌─────────────────────────────────────┐
              │           数据层                    │
              │  ┌─────────────────┐ ┌────────────┐ │
              │  │   PostgreSQL    │ │   Redis    │ │
              │  │   (Port 5432)   │ │ (Port 6379)│ │
              │  └─────────────────┘ └────────────┘ │
              └─────────────────────────────────────┘
```

### 环境策略

- **开发环境**：混合模式（Docker数据库 + 本地API服务）
- **测试环境**：完全容器化部署
- **生产环境**：完全容器化 + 负载均衡 + 监控

## 🔧 开发环境配置

### 当前开发工作流

#### 1. 启动数据库服务

```bash
# 启动 PostgreSQL 和 Redis 容器
docker-compose -f docker-compose.simple.yml up -d database redis

# 验证数据库连接
PGPASSWORD="Qzy@7091!" psql -h localhost -U postgres -p 5433 -d emaintenance -c "SELECT version();"
```

#### 2. 启动 API 服务（本地热重载）

```bash
# 方式一：使用一键脚本
npm run api:start

# 方式二：直接使用脚本
./scripts/start-api-services.sh start

# 方式三：手动启动各服务
cd apps/api/user-service && DATABASE_URL="postgresql://postgres:Qzy@7091!@localhost:5433/emaintenance" npm run dev
cd apps/api/work-order-service && DATABASE_URL="postgresql://postgres:Qzy@7091!@localhost:5433/emaintenance" npm run dev
cd apps/api/asset-service && DATABASE_URL="postgresql://postgres:Qzy@7091!@localhost:5433/emaintenance" npm run dev
```

#### 3. 启动 Web 应用

```bash
# 本地开发模式
cd apps/web && npm run dev

# 或容器模式
docker-compose -f docker-compose.simple.yml up -d web
```

#### 4. 服务管理命令

```bash
# 查看服务状态
npm run api:status

# 停止所有API服务
npm run api:stop

# 重启所有API服务
npm run api:restart
```

## 🚀 生产环境准备

### 1. 环境要求

**服务器规格**：
- CPU: 4核以上
- 内存: 8GB 以上
- 存储: 100GB SSD
- 网络: 100Mbps 带宽

**软件依赖**：
- Docker Engine 24.0+
- Docker Compose 2.20+
- Nginx (反向代理)
- SSL证书 (Let's Encrypt 或商业证书)

### 2. 服务器配置

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo systemctl start docker
sudo systemctl enable docker

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 创建项目目录
sudo mkdir -p /opt/emaintenance
sudo chown $USER:$USER /opt/emaintenance
```

### 3. 生产环境变量

```bash
# 创建 .env.production 文件
cat > /opt/emaintenance/.env.production << EOF
# 数据库配置
DATABASE_URL=postgresql://postgres:CHANGE_ME_STRONG_PASSWORD@database:5432/emaintenance
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# JWT 密钥（生产环境必须更换）
JWT_SECRET=CHANGE_ME_PRODUCTION_JWT_SECRET_KEY_2025

# Redis 配置
REDIS_URL=redis://redis:6379

# 环境标识
NODE_ENV=production

# 服务URL（生产域名）
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_USER_SERVICE_URL=https://api.yourdomain.com
NEXT_PUBLIC_WORK_ORDER_SERVICE_URL=https://api.yourdomain.com
NEXT_PUBLIC_ASSET_SERVICE_URL=https://api.yourdomain.com

# CORS配置
CORS_ORIGIN=https://yourdomain.com

# 文件上传配置
UPLOAD_MAX_SIZE=50mb
UPLOAD_PATH=/app/uploads

# 监控配置
HEALTH_CHECK_INTERVAL=30
LOG_LEVEL=info
EOF
```

## 🐳 Docker 配置文件

### 1. 生产环境 Compose 配置

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # PostgreSQL 数据库
  database:
    image: postgres:16-alpine
    container_name: emaintenance-db-prod
    environment:
      POSTGRES_DB: emaintenance
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=C"
    ports:
      - "127.0.0.1:5432:5432"  # 仅本地访问
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
      - ./docker/database/init:/docker-entrypoint-initdb.d
      - ./backups:/backups
    networks:
      - emaintenance-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Redis 缓存
  redis:
    image: redis:7-alpine
    container_name: emaintenance-redis-prod
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-}
    ports:
      - "127.0.0.1:6379:6379"  # 仅本地访问
    volumes:
      - redis_data_prod:/data
      - ./docker/redis/redis.conf:/usr/local/etc/redis/redis.conf
    networks:
      - emaintenance-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # User Service API
  user-service:
    build:
      context: .
      dockerfile: docker/api/Dockerfile.user-service
      target: production
    container_name: emaintenance-user-service-prod
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      REDIS_URL: redis://redis:6379
      CORS_ORIGIN: ${CORS_ORIGIN}
    ports:
      - "127.0.0.1:3001:3001"  # 仅本地访问
    depends_on:
      database:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - emaintenance-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    volumes:
      - user_service_uploads:/app/uploads
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Work Order Service API
  work-order-service:
    build:
      context: .
      dockerfile: docker/api/Dockerfile.work-order-service
      target: production
    container_name: emaintenance-work-order-service-prod
    environment:
      NODE_ENV: production
      PORT: 3002
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      USER_SERVICE_URL: http://user-service:3001
      ASSET_SERVICE_URL: http://asset-service:3003
      CORS_ORIGIN: ${CORS_ORIGIN}
    ports:
      - "127.0.0.1:3002:3002"
    depends_on:
      database:
        condition: service_healthy
      user-service:
        condition: service_healthy
    networks:
      - emaintenance-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    volumes:
      - work_order_uploads:/app/uploads
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Asset Service API
  asset-service:
    build:
      context: .
      dockerfile: docker/api/Dockerfile.asset-service
      target: production
    container_name: emaintenance-asset-service-prod
    environment:
      NODE_ENV: production
      PORT: 3003
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      USER_SERVICE_URL: http://user-service:3001
      CORS_ORIGIN: ${CORS_ORIGIN}
    ports:
      - "127.0.0.1:3003:3003"
    depends_on:
      database:
        condition: service_healthy
      user-service:
        condition: service_healthy
    networks:
      - emaintenance-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3003/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    volumes:
      - asset_service_uploads:/app/uploads
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Next.js Web Application
  web:
    build:
      context: .
      dockerfile: docker/web/Dockerfile
      target: production
    container_name: emaintenance-web-prod
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
      NEXT_PUBLIC_USER_SERVICE_URL: ${NEXT_PUBLIC_USER_SERVICE_URL}
      NEXT_PUBLIC_WORK_ORDER_SERVICE_URL: ${NEXT_PUBLIC_WORK_ORDER_SERVICE_URL}
      NEXT_PUBLIC_ASSET_SERVICE_URL: ${NEXT_PUBLIC_ASSET_SERVICE_URL}
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      - user-service
      - work-order-service
      - asset-service
    networks:
      - emaintenance-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Nginx 反向代理
  nginx:
    image: nginx:alpine
    container_name: emaintenance-nginx-prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/ssl:/etc/nginx/ssl
      - ./docker/nginx/logs:/var/log/nginx
    depends_on:
      - web
      - user-service
      - work-order-service
      - asset-service
    networks:
      - emaintenance-network
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  postgres_data_prod:
    driver: local
  redis_data_prod:
    driver: local
  user_service_uploads:
    driver: local
  work_order_uploads:
    driver: local
  asset_service_uploads:
    driver: local

networks:
  emaintenance-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/16
```

### 2. 生产环境 Dockerfile

#### User Service Dockerfile

```dockerfile
# docker/api/Dockerfile.user-service
FROM node:20-bullseye as base

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/database/package*.json ./packages/database/
COPY apps/api/user-service/package*.json ./apps/api/user-service/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base as development
RUN npm ci
COPY . .
RUN npm run db:generate
WORKDIR /app/apps/api/user-service
CMD ["npm", "run", "dev"]

# Build stage
FROM base as build
COPY . .
RUN npm run db:generate
WORKDIR /app/apps/api/user-service
RUN npm run build

# Production stage
FROM node:20-bullseye-slim as production
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/user-service/dist ./apps/api/user-service/dist
COPY --from=build /app/apps/api/user-service/package*.json ./apps/api/user-service/

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Switch to non-root user
USER node

WORKDIR /app/apps/api/user-service

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
```

### 3. Nginx 配置

```nginx
# docker/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # 基础配置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # 速率限制
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=web:10m rate=30r/s;

    # 上游服务器
    upstream web_backend {
        server web:3000;
        keepalive 32;
    }

    upstream api_backend {
        server user-service:3001 weight=3;
        server work-order-service:3002 weight=2;
        server asset-service:3003 weight=1;
        keepalive 32;
    }

    # HTTP 重定向到 HTTPS
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS 主服务器
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL 配置
        ssl_certificate /etc/nginx/ssl/yourdomain.com.crt;
        ssl_certificate_key /etc/nginx/ssl/yourdomain.com.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # 安全头
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Web 应用
        location / {
            limit_req zone=web burst=20 nodelay;
            proxy_pass http://web_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # API 路由
        location /api/ {
            limit_req zone=api burst=50 nodelay;
            proxy_pass http://user-service:3001;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # 健康检查
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # 静态文件缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }
}
```

## 📦 部署流程

### 1. 代码准备

```bash
# 克隆项目到生产服务器
git clone https://github.com/yourusername/emaintenance.git /opt/emaintenance
cd /opt/emaintenance

# 切换到生产分支
git checkout main

# 复制环境配置
cp .env.production.example .env.production
# 编辑环境变量
nano .env.production
```

### 2. 构建生产镜像

```bash
# 构建所有服务镜像
docker-compose -f docker-compose.prod.yml build

# 或分别构建
docker-compose -f docker-compose.prod.yml build user-service
docker-compose -f docker-compose.prod.yml build work-order-service
docker-compose -f docker-compose.prod.yml build asset-service
docker-compose -f docker-compose.prod.yml build web
```

### 3. 数据库初始化

```bash
# 启动数据库服务
docker-compose -f docker-compose.prod.yml up -d database redis

# 等待数据库就绪
sleep 30

# 运行数据库迁移
docker-compose -f docker-compose.prod.yml exec database psql -U postgres -d emaintenance -c "SELECT version();"

# 初始化数据
docker-compose -f docker-compose.prod.yml run --rm user-service npm run db:push
docker-compose -f docker-compose.prod.yml run --rm user-service npm run db:seed
```

### 4. 启动所有服务

```bash
# 启动所有服务
docker-compose -f docker-compose.prod.yml up -d

# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

### 5. 验证部署

```bash
# 健康检查脚本
cat > check-health.sh << 'EOF'
#!/bin/bash

services=("user-service:3001" "work-order-service:3002" "asset-service:3003" "web:3000")

for service in "${services[@]}"; do
    name="${service%:*}"
    port="${service#*:}"
    
    if curl -sf "http://localhost:$port/health" > /dev/null; then
        echo "✅ $name is healthy"
    else
        echo "❌ $name is not responding"
    fi
done
EOF

chmod +x check-health.sh
./check-health.sh
```

## 📊 监控与维护

### 1. 日志管理

```bash
# 创建日志轮转配置
cat > /etc/logrotate.d/emaintenance << 'EOF'
/opt/emaintenance/docker/nginx/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        docker kill -s USR1 emaintenance-nginx-prod
    endscript
}
EOF

# 应用日志管理
docker-compose -f docker-compose.prod.yml logs --tail=100 -f user-service
```

### 2. 备份策略

```bash
# 数据库备份脚本
cat > backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/emaintenance/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="emaintenance_backup_$DATE.sql"

mkdir -p $BACKUP_DIR

docker-compose -f docker-compose.prod.yml exec -T database \
    pg_dump -U postgres emaintenance > "$BACKUP_DIR/$BACKUP_FILE"

# 压缩备份文件
gzip "$BACKUP_DIR/$BACKUP_FILE"

# 删除30天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Database backup completed: $BACKUP_FILE.gz"
EOF

chmod +x backup-database.sh

# 设置定时备份
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/emaintenance/backup-database.sh") | crontab -
```

### 3. 性能监控

```bash
# 系统资源监控脚本
cat > monitor-resources.sh << 'EOF'
#!/bin/bash

echo "=== Docker 容器状态 ==="
docker-compose -f docker-compose.prod.yml ps

echo -e "\n=== 容器资源使用 ==="
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

echo -e "\n=== 磁盘使用情况 ==="
df -h /opt/emaintenance

echo -e "\n=== 系统负载 ==="
uptime
EOF

chmod +x monitor-resources.sh
```

## 🔧 故障排除

### 常见问题与解决方案

#### 1. 容器启动失败

```bash
# 查看容器日志
docker-compose -f docker-compose.prod.yml logs service-name

# 查看容器详细信息
docker inspect container-name

# 重启特定服务
docker-compose -f docker-compose.prod.yml restart service-name
```

#### 2. 数据库连接问题

```bash
# 检查数据库状态
docker-compose -f docker-compose.prod.yml exec database pg_isready -U postgres

# 查看数据库日志
docker-compose -f docker-compose.prod.yml logs database

# 手动连接测试
docker-compose -f docker-compose.prod.yml exec database psql -U postgres -d emaintenance
```

#### 3. 网络连接问题

```bash
# 检查容器网络
docker network ls
docker network inspect emaintenance-network

# 测试服务间连接
docker-compose -f docker-compose.prod.yml exec user-service curl -f http://database:5432
```

### 紧急恢复流程

```bash
# 1. 停止所有服务
docker-compose -f docker-compose.prod.yml down

# 2. 恢复数据库备份
docker-compose -f docker-compose.prod.yml up -d database
sleep 30
zcat /opt/emaintenance/backups/latest_backup.sql.gz | \
docker-compose -f docker-compose.prod.yml exec -T database psql -U postgres -d emaintenance

# 3. 重新启动服务
docker-compose -f docker-compose.prod.yml up -d

# 4. 验证恢复
./check-health.sh
```

## ⚡ 性能优化

### 1. 数据库优化

```sql
-- PostgreSQL 性能调优
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '8MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET max_connections = '200';
SELECT pg_reload_conf();
```

### 2. 容器资源限制

```yaml
# 在 docker-compose.prod.yml 中添加资源限制
services:
  user-service:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### 3. 缓存优化

```bash
# Redis 配置优化
cat > docker/redis/redis.conf << 'EOF'
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
EOF
```

## 🔐 安全加固

### 1. 防火墙配置

```bash
# UFW 防火墙设置
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. SSL 证书配置

```bash
# 使用 Let's Encrypt 获取 SSL 证书
sudo apt-get install certbot
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# 复制证书到项目目录
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/yourdomain.com.crt
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/yourdomain.com.key
sudo chown $USER:$USER docker/nginx/ssl/*
```

### 3. 定期安全更新

```bash
# 创建更新脚本
cat > update-system.sh << 'EOF'
#!/bin/bash
# 系统安全更新
sudo apt-get update && sudo apt-get upgrade -y

# Docker 镜像更新
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 清理未使用的镜像
docker image prune -f
EOF

chmod +x update-system.sh

# 设置自动更新（每周日凌晨3点）
(crontab -l 2>/dev/null; echo "0 3 * * 0 /opt/emaintenance/update-system.sh") | crontab -
```

## 📝 部署检查清单

### 部署前检查

- [ ] 服务器环境配置完成
- [ ] Docker 和 Docker Compose 安装
- [ ] 环境变量文件配置
- [ ] SSL 证书准备
- [ ] 防火墙规则设置
- [ ] 备份恢复流程测试

### 部署过程检查

- [ ] 代码仓库同步
- [ ] 镜像构建成功
- [ ] 数据库初始化完成
- [ ] 所有服务启动正常
- [ ] 健康检查通过
- [ ] 网络连接测试

### 部署后验证

- [ ] Web 应用访问正常
- [ ] API 接口响应正常
- [ ] 用户登录功能正常
- [ ] 数据库读写正常
- [ ] 文件上传功能正常
- [ ] 监控告警配置

---

## 📚 相关文档

- [开发环境配置指南](./development-setup.md)
- [API 接口文档](./api-documentation.md)
- [数据库设计文档](./database-schema.md)
- [故障排除指南](./troubleshooting.md)

## 🤝 支持与反馈

如有部署问题或建议，请：

1. 查阅本文档的故障排除章节
2. 检查项目 Issue 列表
3. 创建新的 Issue 报告问题
4. 联系开发团队获取支持

---

*最后更新时间：2025-08-15*  
*文档版本：1.0.0*