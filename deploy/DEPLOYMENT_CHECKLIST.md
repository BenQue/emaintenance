# E-Maintenance 部署检查清单

## 服务器环境准备

### 系统要求检查
- [ ] Ubuntu 18.04+ LTS 系统
- [ ] x86_64 (AMD64) 架构
- [ ] 4GB+ RAM (推荐 8GB)
- [ ] 20GB+ 可用磁盘空间 (推荐 50GB)
- [ ] sudo 权限

### 软件环境安装
- [ ] Docker 20.10+ 已安装并运行
- [ ] Docker Compose 2.0+ 已安装
- [ ] Git 已安装
- [ ] curl/wget 已安装
- [ ] 当前用户已加入 docker 组

### 网络和安全配置
- [ ] 防火墙已配置 (80, 443, SSH 端口开放)
- [ ] fail2ban 已安装并启用
- [ ] 必要目录已创建 `/opt/emaintenance/{data,logs,ssl,backup}`

## 代码和配置准备

### 代码仓库
- [ ] 项目代码已克隆到服务器
- [ ] 进入 `deploy/` 目录

### 环境配置
- [ ] 复制 `.env.production` 模板到 `.env`
- [ ] 修改数据库密码 `POSTGRES_PASSWORD`
- [ ] 设置安全的 JWT 密钥 `JWT_SECRET` (>=32字符)
- [ ] 配置服务器 IP/域名 `NEXT_PUBLIC_*_URL`
- [ ] 检查 CORS 设置 `CORS_ORIGIN`

## 部署执行检查

### 构建前检查
- [ ] Docker 服务运行正常
- [ ] 有足够的磁盘空间 (至少 10GB 用于镜像构建)
- [ ] 网络连接稳定

### 部署过程
- [ ] 运行 `./scripts/deploy-server.sh`
- [ ] 所有 Docker 镜像构建成功
- [ ] 所有容器启动成功
- [ ] 数据库连接测试通过
- [ ] 健康检查全部通过

### 部署后验证
- [ ] 所有服务状态为 "Up (healthy)"
- [ ] Web 应用可正常访问 `http://server-ip`
- [ ] 健康检查端点响应正常 `http://server-ip/health`
- [ ] 登录功能正常
- [ ] 基本功能测试通过

## 生产环境优化

### 性能和安全
- [ ] 配置 SSL 证书 (可选但推荐)
- [ ] 设置域名解析 (如有域名)
- [ ] 配置日志轮转
- [ ] 设置监控告警 (可选)

### 备份策略
- [ ] 数据库定期备份计划
- [ ] 上传文件备份策略
- [ ] 配置文件备份

### 维护计划
- [ ] 系统更新策略
- [ ] 应用更新流程
- [ ] 故障恢复计划

## 常见检查命令

### 服务状态检查
```bash
# 检查所有容器状态
docker-compose -f docker-compose.prod.yml ps

# 运行健康检查
./scripts/health-check.sh

# 查看系统资源使用
docker stats --no-stream
free -h
df -h
```

### 日志查看
```bash
# 查看所有服务日志
docker-compose -f docker-compose.prod.yml logs --tail=50

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml logs --tail=100 web
docker-compose -f docker-compose.prod.yml logs --tail=100 user-service
docker-compose -f docker-compose.prod.yml logs --tail=100 postgres
```

### 故障排查
```bash
# 重启有问题的服务
docker-compose -f docker-compose.prod.yml restart [service-name]

# 查看容器详细信息
docker inspect [container-name]

# 进入容器调试
docker-compose -f docker-compose.prod.yml exec [service-name] /bin/sh
```

## 部署成功指标

### 技术指标
- [ ] CPU 使用率 < 80%
- [ ] 内存使用率 < 90%
- [ ] 磁盘使用率 < 90%
- [ ] 所有健康检查通过
- [ ] 响应时间 < 3秒

### 功能指标
- [ ] 用户可以正常登录
- [ ] 可以创建和查看工单
- [ ] 可以管理资产信息
- [ ] 可以查看 KPI 仪表板
- [ ] 文件上传下载正常

## 维护和监控

### 日常监控
- [ ] 服务状态监控
- [ ] 资源使用监控
- [ ] 错误日志监控
- [ ] 性能指标监控

### 定期维护
- [ ] 每周检查服务状态
- [ ] 每月清理日志文件
- [ ] 每月更新系统补丁
- [ ] 每月数据库备份验证

## 应急响应

### 故障处理流程
1. 识别问题服务
2. 查看相关日志
3. 重启问题服务
4. 如果无效，回滚到上个版本
5. 记录问题和解决方案

### 联系方式
- 技术支持：[填写联系方式]
- 文档链接：[填写文档地址]
- 代码仓库：[填写仓库地址]

---

**部署日期**: _______________
**部署人员**: _______________
**服务器信息**: _______________
**部署版本**: _______________