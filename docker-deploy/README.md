# E-Maintenance 生产环境部署指南

本目录包含完整的生产环境Docker部署配置和脚本，专为Ubuntu Linux服务器设计。

## 🎯 目标服务器
- **IP地址**: 10.163.144.13
- **操作系统**: Ubuntu Linux
- **部署方式**: Docker + Docker Compose
- **本地镜像仓库**: 10.163.144.13:5000 (加速镜像下载)

## 📂 目录结构

```
docker-deploy/
├── docker-compose.production.yml  # 生产环境Docker Compose配置
├── .env.production                 # 生产环境变量配置
├── deploy.sh                      # 自动化部署脚本
├── health-check.sh               # 系统健康检查脚本
├── backup.sh                     # 数据备份脚本
├── validate-deployment.sh        # 部署验证脚本
├── create-deployment-package.sh  # 部署包创建脚本
├── setup-local-registry.sh      # 本地镜像仓库设置脚本
├── nginx/
│   └── nginx.conf                # Nginx反向代理配置
├── database/
│   └── init/
│       └── 01-init.sql           # 数据库初始化脚本
├── README.md                     # 本文档
└── DEPLOYMENT_SUMMARY.md         # 部署摘要文档
```

## 🚀 快速部署

### 1. 服务器准备

确保服务器已安装必要软件：

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 重新登录以应用Docker组权限
```

### 2. 配置生产环境变量

```bash
# 创建生产环境配置（IMPORTANT: 必须步骤）
cp .env.production.template .env.production

# 编辑配置文件，设置安全的密码和密钥
nano .env.production

# 生成安全的JWT密钥
openssl rand -base64 32
```

**⚠️ 安全要求**: 
- 必须更改所有 `CHANGE_ME` 占位符
- 使用强密码（至少16位字符）
- JWT密钥使用随机生成的32字节值

### 3. 部署系统

```bash
# 1. 上传部署文件到服务器
scp -r docker-deploy/ user@10.163.144.13:/opt/emaintenance/

# 2. 登录服务器
ssh user@10.163.144.13

# 3. 进入部署目录
cd /opt/emaintenance/docker-deploy

# 4. 配置生产环境变量（在服务器上）
cp .env.production.template .env.production
nano .env.production  # 设置安全凭据

# 5. 运行自动化部署脚本
./deploy.sh
```

部署脚本会自动完成：
- ✅ 系统要求检查
- ✅ 创建必要目录
- ✅ 数据备份
- ✅ 配置本地镜像仓库 (10.163.144.13:5000)
- ✅ 预拉取本地镜像 (加速部署)
- ✅ 构建Docker镜像
- ✅ 启动所有服务
- ✅ 运行数据库迁移
- ✅ 初始化数据
- ✅ 健康检查

## 📋 服务配置

### 容器端口映射
- **Web应用**: http://10.163.144.13 (80→3000)
- **用户服务API**: http://10.163.144.13:3001
- **工单服务API**: http://10.163.144.13:3002  
- **资产服务API**: http://10.163.144.13:3003
- **数据库**: localhost:5432 (仅内部访问)
- **Redis**: localhost:6379 (仅内部访问)

### 默认登录凭据
```
管理员账户:
  邮箱: admin@bizlink.com.my
  密码: admin123
```

## 🔧 日常运维

### 系统监控
```bash
# 检查所有服务状态
./health-check.sh

# 查看容器状态
docker-compose -f docker-compose.production.yml ps

# 查看实时日志
docker-compose -f docker-compose.production.yml logs -f

# 查看特定服务日志
docker logs emaintenance-web -f
```

### 数据备份
```bash
# 手动备份
./backup.sh

# 设置定时备份 (每天凌晨2点)
echo "0 2 * * * /opt/emaintenance/docker-deploy/backup.sh" | crontab -
```

### 服务重启
```bash
# 重启所有服务
docker-compose -f docker-compose.production.yml restart

# 重启特定服务
docker-compose -f docker-compose.production.yml restart web
```

### 更新部署
```bash
# 拉取最新镜像
docker-compose -f docker-compose.production.yml pull

# 重新构建并重启
docker-compose -f docker-compose.production.yml up -d --build
```

## 🐳 本地Docker镜像仓库

### 仓库配置
- **仓库地址**: 10.163.144.13:5000
- **访问方式**: HTTP (内网访问)
- **作用**: 加速Docker镜像下载，提升部署速度

### 预配置镜像
系统已配置使用本地镜像仓库的以下镜像：
- `10.163.144.13:5000/postgres:16-alpine` - PostgreSQL数据库
- `10.163.144.13:5000/redis:7-alpine` - Redis缓存
- `10.163.144.13:5000/nginx:alpine` - Nginx反向代理

### 镜像仓库设置
```bash
# 初次设置本地镜像仓库 (可选，部署脚本会自动配置)
./setup-local-registry.sh

# 预拉取所有镜像 (加速后续部署)
./pull-local-images.sh
```

### 优势
- ⚡ **快速下载**: 本地网络下载速度，显著减少部署时间
- 🔒 **离线部署**: 不依赖外网连接，提高部署可靠性
- 📦 **版本控制**: 确保使用统一的镜像版本

## 📊 性能优化

### 资源配置
```yaml
# 每个服务的资源限制已在docker-compose.yml中配置
database:    1G内存, 1.0 CPU
web:         1G内存, 0.5 CPU  
api服务:     512M内存, 0.5 CPU
nginx:       128M内存, 0.25 CPU
redis:       512M内存, 0.5 CPU
```

### 数据库优化
PostgreSQL已配置生产环境参数：
- `max_connections=200`
- `shared_buffers=256MB`
- `effective_cache_size=1GB`
- `work_mem=16MB`

## 🔒 安全配置

### 防火墙设置
```bash
# 允许HTTP访问
sudo ufw allow 80/tcp

# 允许API端口
sudo ufw allow 3001:3003/tcp

# 允许SSH (如果需要)
sudo ufw allow 22/tcp

# 启用防火墙
sudo ufw enable
```

### SSL证书 (推荐)
```bash
# 安装Certbot
sudo apt install certbot

# 获取SSL证书
sudo certbot certonly --standalone -d your-domain.com

# 更新nginx配置以使用HTTPS
```

## 🚨 故障排除

### 常见问题

1. **容器启动失败**
   ```bash
   # 查看错误日志
   docker-compose -f docker-compose.production.yml logs container-name
   
   # 检查磁盘空间
   df -h
   
   # 检查内存使用
   free -h
   ```

2. **数据库连接失败**
   ```bash
   # 检查数据库容器状态
   docker exec emaintenance-db pg_isready -U postgres
   
   # 重启数据库服务
   docker-compose -f docker-compose.production.yml restart database
   ```

3. **API服务不响应**
   ```bash
   # 检查服务健康状态
   curl http://localhost:3001/health
   
   # 查看服务日志
   docker logs emaintenance-user-service
   ```

4. **Web应用无法访问**
   ```bash
   # 检查nginx状态
   docker exec emaintenance-nginx nginx -t
   
   # 重启nginx
   docker-compose -f docker-compose.production.yml restart nginx
   ```

### 日志位置
- **应用日志**: `/opt/emaintenance/logs/`
- **容器日志**: `docker logs <container-name>`
- **Nginx日志**: `docker-deploy/nginx/logs/`
- **备份日志**: `/opt/emaintenance/logs/backup-*.log`

## 📈 扩展指南

### 水平扩展
```bash
# 增加API服务实例
docker-compose -f docker-compose.production.yml up -d --scale user-service=2

# 负载均衡配置 (需要修改nginx.conf)
```

### 数据库扩展
```bash
# 配置主从复制
# 配置读写分离
# 实施分片策略
```

## 📞 支持联系

如遇部署问题，请检查：
1. `/opt/emaintenance/logs/` 中的部署日志
2. 运行 `./health-check.sh` 获取系统状态
3. 确认所有环境变量配置正确

---

**部署版本**: 1.0  
**最后更新**: 2025-08-19  
**目标服务器**: 10.163.144.13