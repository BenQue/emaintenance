# 生产环境部署检查清单

## 📋 部署前准备

### 1. 基础设施要求
- [ ] **服务器配置**
  - [ ] CPU: 至少4核心 (推荐8核心)
  - [ ] 内存: 至少8GB (推荐16GB)
  - [ ] 存储: 至少100GB SSD
  - [ ] 网络: 100Mbps带宽
  - [ ] 操作系统: Ubuntu 22.04 LTS / CentOS 8+

### 2. 软件依赖安装
- [ ] **Docker环境**
  - [ ] Docker Engine 24.0+
  - [ ] Docker Compose 2.20+
  - [ ] 验证: `docker --version && docker-compose --version`

- [ ] **数据库准备**
  - [ ] PostgreSQL 16+ 容器准备
  - [ ] 数据库备份策略制定
  - [ ] 恢复测试验证

- [ ] **网络配置**
  - [ ] 域名DNS配置完成
  - [ ] SSL证书获取 (Let's Encrypt / 商业证书)
  - [ ] 防火墙规则配置
    - [ ] 开放80端口 (HTTP)
    - [ ] 开放443端口 (HTTPS)
    - [ ] 限制数据库端口访问

### 3. 环境变量配置
- [ ] **创建.env.production文件**
```env
# 数据库配置
DATABASE_URL=postgresql://postgres:CHANGE_ME_STRONG_PASSWORD@database:5432/emaintenance
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# JWT密钥 (使用强密钥)
JWT_SECRET=CHANGE_ME_PRODUCTION_JWT_SECRET_KEY_$(openssl rand -hex 32)

# Redis配置
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD

# 环境标识
NODE_ENV=production

# API URLs (替换为实际域名)
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_USER_SERVICE_URL=https://api.your-domain.com:3001
NEXT_PUBLIC_WORK_ORDER_SERVICE_URL=https://api.your-domain.com:3002
NEXT_PUBLIC_ASSET_SERVICE_URL=https://api.your-domain.com:3003

# CORS配置
CORS_ORIGIN=https://your-domain.com

# 文件上传配置
UPLOAD_MAX_SIZE=50mb
UPLOAD_PATH=/app/uploads

# 日志级别
LOG_LEVEL=info
```

### 4. 安全检查
- [ ] **密钥和密码**
  - [ ] 所有默认密码已更改
  - [ ] JWT密钥使用强随机值
  - [ ] 数据库密码复杂度符合要求
  - [ ] Redis密码已设置

- [ ] **代码安全**
  - [ ] 移除所有console.log语句
  - [ ] 环境文件未提交到版本控制
  - [ ] 敏感信息未硬编码

## 🚀 部署执行步骤

### 1. 代码部署
```bash
# 克隆代码到生产服务器
git clone https://github.com/yourusername/emaintenance.git /opt/emaintenance
cd /opt/emaintenance

# 切换到生产分支/标签
git checkout production # 或 git checkout v1.0.0

# 安装依赖
npm install --production
```

### 2. Docker镜像构建
```bash
# 构建所有服务镜像
docker-compose -f docker-compose.prod.yml build

# 验证镜像
docker images | grep emaintenance
```

### 3. 数据库初始化
```bash
# 启动数据库服务
docker-compose -f docker-compose.prod.yml up -d database

# 等待数据库就绪
sleep 30

# 运行数据库迁移
docker-compose -f docker-compose.prod.yml run --rm db-migrate

# 验证数据库
docker-compose -f docker-compose.prod.yml exec database \
  psql -U postgres -d emaintenance -c "SELECT COUNT(*) FROM \"User\";"
```

### 4. 启动服务
```bash
# 启动Redis缓存
docker-compose -f docker-compose.prod.yml up -d redis

# 启动微服务
docker-compose -f docker-compose.prod.yml up -d user-service
docker-compose -f docker-compose.prod.yml up -d work-order-service
docker-compose -f docker-compose.prod.yml up -d asset-service

# 启动Web应用
docker-compose -f docker-compose.prod.yml up -d web

# 启动Nginx反向代理
docker-compose -f docker-compose.prod.yml up -d nginx
```

### 5. 健康检查
```bash
# 运行健康检查脚本
./scripts/health-check.sh

# 手动验证各服务
curl -f http://localhost:3001/health  # User Service
curl -f http://localhost:3002/health  # Work Order Service
curl -f http://localhost:3003/health  # Asset Service
curl -f http://localhost:3000/api/health  # Web Application
```

## ✅ 部署后验证

### 1. 功能测试
- [ ] **用户认证**
  - [ ] 管理员登录成功
  - [ ] JWT令牌生成正确
  - [ ] 角色权限控制正常

- [ ] **核心功能**
  - [ ] 工单创建和查看
  - [ ] 用户管理操作
  - [ ] 资产管理功能
  - [ ] KPI数据展示

- [ ] **文件上传**
  - [ ] 工单照片上传
  - [ ] 文件大小限制生效
  - [ ] 存储路径正确

### 2. 性能测试
- [ ] **响应时间**
  - [ ] API响应时间 < 200ms
  - [ ] 页面加载时间 < 2s
  - [ ] 数据库查询 < 100ms

- [ ] **并发测试**
  - [ ] 100并发用户测试通过
  - [ ] 无内存泄漏
  - [ ] CPU使用率正常

### 3. 安全验证
- [ ] **访问控制**
  - [ ] HTTPS强制启用
  - [ ] HTTP自动重定向到HTTPS
  - [ ] CORS策略生效

- [ ] **速率限制**
  - [ ] API速率限制工作正常
  - [ ] 防暴力破解机制生效

## 📊 监控配置

### 1. 日志收集
```bash
# 配置日志轮转
cat > /etc/logrotate.d/emaintenance << EOF
/opt/emaintenance/logs/*.log {
    daily
    rotate 30
    compress
    missingok
    notifempty
}
EOF
```

### 2. 监控指标
- [ ] **系统监控**
  - [ ] CPU使用率监控
  - [ ] 内存使用率监控
  - [ ] 磁盘空间监控
  - [ ] 网络流量监控

- [ ] **应用监控**
  - [ ] 服务可用性监控
  - [ ] 错误率监控
  - [ ] 响应时间监控
  - [ ] 业务指标监控

### 3. 告警配置
- [ ] **告警规则**
  - [ ] 服务宕机告警
  - [ ] 高错误率告警
  - [ ] 资源使用率告警
  - [ ] 数据库连接池告警

## 🔄 备份与恢复

### 1. 备份策略
```bash
# 设置自动备份任务
crontab -e
# 添加以下内容
0 2 * * * /opt/emaintenance/scripts/backup-database.sh
0 3 * * * /opt/emaintenance/scripts/backup-uploads.sh
```

### 2. 恢复测试
- [ ] **数据库恢复**
  - [ ] 备份文件完整性验证
  - [ ] 恢复流程测试
  - [ ] 数据一致性检查

- [ ] **文件恢复**
  - [ ] 上传文件备份验证
  - [ ] 恢复流程测试

## 🔧 运维工具

### 1. 常用命令
```bash
# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看服务日志
docker-compose -f docker-compose.prod.yml logs -f [service-name]

# 重启服务
docker-compose -f docker-compose.prod.yml restart [service-name]

# 进入容器
docker-compose -f docker-compose.prod.yml exec [service-name] sh

# 数据库备份
docker-compose -f docker-compose.prod.yml exec database \
  pg_dump -U postgres emaintenance > backup_$(date +%Y%m%d).sql
```

### 2. 故障排查
```bash
# 检查容器资源使用
docker stats

# 检查网络连接
docker-compose -f docker-compose.prod.yml exec [service-name] \
  ping [target-service]

# 检查数据库连接
docker-compose -f docker-compose.prod.yml exec [service-name] \
  nc -zv database 5432
```

## 📝 文档更新

### 1. 部署文档
- [ ] 更新部署版本号
- [ ] 记录部署时间
- [ ] 记录部署人员
- [ ] 记录配置变更

### 2. 运维手册
- [ ] 更新服务器信息
- [ ] 更新联系人信息
- [ ] 更新故障处理流程
- [ ] 更新应急预案

## ⚠️ 回滚计划

### 1. 回滚准备
- [ ] 上一版本镜像保留
- [ ] 数据库备份可用
- [ ] 回滚脚本准备

### 2. 回滚步骤
```bash
# 1. 停止当前服务
docker-compose -f docker-compose.prod.yml down

# 2. 恢复上一版本
git checkout v0.9.0  # 上一个稳定版本

# 3. 重新构建和启动
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 4. 验证回滚
./scripts/health-check.sh
```

## 🎯 最终确认

### 部署签核
- [ ] 技术负责人确认: ________________
- [ ] 项目经理确认: ________________
- [ ] 运维负责人确认: ________________
- [ ] 部署完成时间: ________________

### 问题记录
```
问题1: 
解决方案:

问题2:
解决方案:

问题3:
解决方案:
```

---

**注意事项**:
1. 所有步骤必须按顺序执行
2. 每个步骤完成后进行验证
3. 遇到问题立即记录并解决
4. 保持与团队的及时沟通
5. 确保有回滚方案

**紧急联系**:
- 技术支持: tech-support@your-company.com
- 运维团队: ops-team@your-company.com
- 项目经理: pm@your-company.com

最后更新: 2025-08-18
版本: 1.0.0