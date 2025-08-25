# Linux 服务器部署指南

本指南详细说明如何在 Linux Ubuntu 服务器上部署 E-Maintenance 系统。

## 系统要求

### 硬件要求
- **CPU**: 2 核心以上 (推荐 4 核心)
- **内存**: 4GB RAM (推荐 8GB)
- **磁盘**: 20GB 可用空间 (推荐 50GB)
- **网络**: 稳定的互联网连接

### 软件要求
- **操作系统**: Ubuntu 18.04 LTS 或更高版本
- **架构**: x86_64 (AMD64)
- **权限**: sudo 权限

## 部署步骤

### 第一步: 服务器环境准备

1. **登录服务器**
   ```bash
   ssh username@your-server-ip
   ```

2. **运行环境设置脚本**
   ```bash
   curl -fsSL https://raw.githubusercontent.com/your-org/emaintenance/main/deploy/scripts/setup-server.sh | bash
   ```
   
   或者手动执行：
   ```bash
   wget https://raw.githubusercontent.com/your-org/emaintenance/main/deploy/scripts/setup-server.sh
   chmod +x setup-server.sh
   ./setup-server.sh
   ```

3. **重新登录激活 Docker 权限**
   ```bash
   exit
   ssh username@your-server-ip
   ```

### 第二步: 克隆代码仓库

```bash
# 克隆代码
git clone https://github.com/your-org/emaintenance.git
cd emaintenance

# 切换到部署目录
cd deploy
```

### 第三步: 配置环境变量

```bash
# 复制生产环境配置模板
cp env-templates/.env.production .env

# 编辑配置文件
nano .env
```

**必须修改的配置项**:
```bash
# 数据库密码 (必须修改)
POSTGRES_PASSWORD=your_secure_database_password

# JWT 密钥 (必须修改，至少32字符)
JWT_SECRET=your_super_secure_jwt_secret_key_here

# 服务器 IP 或域名 (替换 YOUR_SERVER_IP_OR_DOMAIN)
NEXT_PUBLIC_API_URL=http://your-server-ip
NEXT_PUBLIC_USER_SERVICE_URL=http://your-server-ip
NEXT_PUBLIC_WORK_ORDER_SERVICE_URL=http://your-server-ip
NEXT_PUBLIC_ASSET_SERVICE_URL=http://your-server-ip

# CORS 配置
CORS_ORIGIN="http://your-server-ip,https://your-server-ip"
```

### 第四步: 执行部署

```bash
# 运行部署脚本
./scripts/deploy-server.sh
```

部署过程大约需要 5-10 分钟，脚本会：
- 自动选择生产配置文件
- 构建 Docker 镜像
- 启动所有服务
- 初始化数据库
- 执行健康检查

### 第五步: 验证部署

1. **检查服务状态**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

2. **访问应用**
   - 打开浏览器访问: `http://your-server-ip`
   - 健康检查: `http://your-server-ip/health`

3. **查看日志**
   ```bash
   # 查看所有服务日志
   docker-compose -f docker-compose.prod.yml logs

   # 查看特定服务日志
   docker-compose -f docker-compose.prod.yml logs web
   docker-compose -f docker-compose.prod.yml logs user-service
   ```

## SSL 证书配置 (可选)

### 使用 Let's Encrypt

1. **安装 Certbot**
   ```bash
   sudo apt install snapd
   sudo snap install --classic certbot
   sudo ln -s /snap/bin/certbot /usr/bin/certbot
   ```

2. **获取证书**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **配置自动续期**
   ```bash
   sudo crontab -e
   # 添加以下行
   0 12 * * * /usr/bin/certbot renew --quiet
   ```

## 监控和维护

### 常用命令

```bash
# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 重启服务
docker-compose -f docker-compose.prod.yml restart [service-name]

# 查看资源使用
docker stats

# 查看系统资源
htop

# 查看磁盘使用
df -h
```

### 数据备份

1. **数据库备份**
   ```bash
   # 创建备份
   docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres emaintenance > backup_$(date +%Y%m%d).sql

   # 恢复备份
   docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres emaintenance < backup_file.sql
   ```

2. **文件备份**
   ```bash
   # 备份上传文件
   cp -r /opt/emaintenance/data/uploads /backup/uploads_$(date +%Y%m%d)
   ```

### 日志管理

```bash
# 清理旧日志
docker system prune -f

# 查看容器大小
docker system df

# 限制日志文件大小 (已在 docker-compose.prod.yml 中配置)
```

## 故障排查

### 常见问题

1. **端口占用**
   ```bash
   # 检查端口占用
   sudo netstat -tlnp | grep :80
   sudo netstat -tlnp | grep :443
   ```

2. **内存不足**
   ```bash
   # 检查内存使用
   free -h
   
   # 增加 swap (如果需要)
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

3. **磁盘空间不足**
   ```bash
   # 清理 Docker 资源
   docker system prune -a -f
   
   # 清理 APT 缓存
   sudo apt clean
   sudo apt autoremove
   ```

4. **服务启动失败**
   ```bash
   # 查看详细错误日志
   docker-compose -f docker-compose.prod.yml logs --tail=50 [service-name]
   
   # 重新构建有问题的服务
   docker-compose -f docker-compose.prod.yml build --no-cache [service-name]
   docker-compose -f docker-compose.prod.yml up -d [service-name]
   ```

### 性能优化

1. **数据库优化**
   ```bash
   # 进入数据库容器
   docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres emaintenance
   
   # 查看数据库状态
   SELECT * FROM pg_stat_activity;
   
   # 分析查询性能
   EXPLAIN ANALYZE SELECT * FROM work_orders;
   ```

2. **应用优化**
   - 监控内存使用情况
   - 调整 Node.js 内存限制
   - 配置负载均衡 (多实例部署)

## 升级和更新

```bash
# 停止服务
docker-compose -f docker-compose.prod.yml down

# 拉取最新代码
git pull origin main

# 重新构建和启动
./scripts/deploy-server.sh
```

## 安全建议

1. **防火墙配置**
   ```bash
   # 只开放必要端口
   sudo ufw status
   sudo ufw deny [port]  # 关闭不需要的端口
   ```

2. **定期更新**
   ```bash
   # 系统更新
   sudo apt update && sudo apt upgrade -y
   
   # Docker 镜像更新
   docker-compose -f docker-compose.prod.yml pull
   ```

3. **访问控制**
   - 修改默认密码
   - 使用强密码
   - 定期轮换密钥

4. **监控告警**
   - 配置日志告警
   - 监控资源使用
   - 设置健康检查告警

## 支持

如果遇到问题，请检查：
1. [部署计划文档](./DEPLOYMENT_PLAN.md) 的故障排查章节
2. Docker 容器日志
3. 系统日志: `sudo journalctl -f`
4. 防火墙状态: `sudo ufw status`

创建 Issue 时请附上：
- 操作系统版本
- 错误日志
- 服务状态截图
- 配置文件 (请移除敏感信息)