# E-Maintenance 生产环境安全配置

## 🔒 安全配置摘要

本文档描述了E-Maintenance系统的安全配置和最佳实践。

### ✅ 已实施的安全措施

#### 1. 凭据和密钥管理
- **问题**: 移除了硬编码在版本控制中的敏感信息
- **解决方案**: 
  - 创建 `.env.production.template` 模板文件
  - 删除包含实际凭据的 `.env.production` 文件
  - 要求用户在部署时创建实际的环境变量文件

#### 2. CORS 安全配置
- **问题**: 修复了过于宽松的跨域资源共享配置
- **解决方案**: 
  - 从 `Access-Control-Allow-Origin: "*"` 改为 `"http://10.163.144.13"`
  - 添加 `Access-Control-Allow-Credentials: true`
  - 限制为特定的服务器地址

#### 3. 数据库访问安全
- **问题**: 数据库端口暴露给外部网络
- **解决方案**: 
  - 移除 `ports: "5432:5432"` 映射
  - 数据库仅在Docker内部网络可访问
  - 保持应用内部连接功能

#### 4. HTTP 安全头
- **新增**: 强化的HTTP安全头配置
- **包含**:
  - `X-Frame-Options: DENY` - 防止点击劫持
  - `X-Content-Type-Options: nosniff` - 防止MIME类型嗅探
  - `X-XSS-Protection: "1; mode=block"` - XSS保护
  - `Referrer-Policy: "strict-origin-when-cross-origin"` - 引用策略
  - `Content-Security-Policy` - 内容安全策略
  - `Strict-Transport-Security` - HTTPS传输安全

#### 5. 网络隔离
- **配置**: Docker网络隔离
- **实现**: 
  - 服务间通过内部网络通信
  - 仅必要端口对外暴露
  - API服务通过Nginx代理访问

#### 6. API 安全
- **速率限制**: 
  - API端点: 30请求/分钟
  - Web应用: 60请求/分钟
- **认证**: JWT令牌验证
- **CORS**: 限制为特定源地址

## ⚠️ 部署前必须完成的安全配置

### 1. 创建生产环境变量文件
```bash
# 复制模板文件
cp .env.production.template .env.production

# 编辑并设置安全的密码和密钥
nano .env.production

# 生成安全的JWT密钥
openssl rand -base64 32
```

### 2. 必须更改的配置项
- `DB_PASSWORD`: 使用强密码（至少16位，包含大小写、数字、特殊字符）
- `JWT_SECRET`: 使用随机生成的32字节base64编码密钥
- 确认所有 `CHANGE_ME` 占位符都已替换

### 3. 环境变量安全示例
```bash
# 强密码示例
DB_PASSWORD=Mk9#vB2$nP7@qR5&wX8*

# JWT密钥示例（使用 openssl rand -base64 32 生成）
JWT_SECRET=Mj3yXc9Kp6vL8wN2sQ5tR7uY1aB4dF6hJ9mP0zX3cV5n
```

## 🔐 生产环境安全检查清单

### 部署前检查
- [ ] `.env.production` 文件已创建并包含安全凭据
- [ ] 所有默认密码已更改
- [ ] JWT密钥已设置为随机生成的安全值
- [ ] 确认 `.env.production` 不在版本控制中
- [ ] 网络防火墙已配置（仅开放必要端口：80, 3001-3003）

### 运行时安全监控
- [ ] 定期检查访问日志异常
- [ ] 监控API调用速率
- [ ] 检查未授权访问尝试
- [ ] 定期更新Docker镜像

### 数据保护
- [ ] 定期数据库备份
- [ ] 备份数据加密存储
- [ ] 实施数据恢复测试
- [ ] 日志文件定期轮转

## 🚨 安全事件响应

### 如果发现安全问题
1. **立即隔离**: 停止受影响的服务
2. **评估影响**: 确定数据泄露范围
3. **修复漏洞**: 应用安全补丁
4. **恢复服务**: 在确认安全后重启
5. **事后分析**: 文档化事件和改进措施

### 紧急联系流程
1. 停止服务: `docker-compose -f docker-compose.production.yml down`
2. 检查日志: `./health-check.sh`
3. 备份数据: `./backup.sh`
4. 联系技术支持团队

## 📋 建议的后续安全改进

### 短期改进（1-2周）
- [ ] 实施HTTPS/TLS加密（SSL证书配置）
- [ ] 配置集中化日志管理
- [ ] 实施自动安全扫描
- [ ] 设置监控告警

### 中期改进（1-3个月）
- [ ] 实施密钥管理系统（HashiCorp Vault）
- [ ] 配置入侵检测系统
- [ ] 实施双因素认证
- [ ] 定期安全审计

### 长期改进（3-6个月）
- [ ] 实施零信任网络架构
- [ ] 配置自动威胁检测
- [ ] 实施合规性监控
- [ ] 建立安全运营中心(SOC)

## 📞 安全支持

如有安全相关问题或发现潜在威胁，请：
1. 立即停止相关操作
2. 记录详细信息
3. 联系系统管理员
4. 查看本文档的应急响应流程

---

**安全配置版本**: 1.0  
**最后更新**: 2025-08-19  
**下次审查**: 2025-11-19