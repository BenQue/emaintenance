# Nginx 移动端 API 路由修复

## 🚨 问题描述

Android PDA 应用无法连接到服务器，返回 404 错误。经过调试发现：

### 问题原因
- Android 应用请求路径：`/user-service/api/auth/login`
- Nginx 现有配置：只支持 `/api/auth/login` (Web 端)
- **缺少移动端 API 路由配置**

### 错误日志
```
🟢 RESPONSE: 404
🟢 URL: http://10.163.144.13:3030/user-service/api/auth/login
🟢 Data: <!DOCTYPE html>...  (返回 Next.js 的 404 页面)
```

## ✅ 解决方案

### 修改的配置文件

1. **`deploy/modular/configs/nginx.conf`** - 分模块部署配置
2. **`deploy/Local/configs/nginx.conf`** - 本地部署配置

### 新增的路由

```nginx
# 移动端 - 用户服务路由
location ~ ^/user-service/api(.*)$ {
    proxy_pass http://user_service/api$1$is_args$args;
    # ... 其他配置
}

# 移动端 - 工单服务路由  
location ~ ^/work-order-service/api(.*)$ {
    proxy_pass http://work_order_service/api$1$is_args$args;
    # ... 其他配置
}

# 移动端 - 资产服务路由
location ~ ^/asset-service/api(.*)$ {
    proxy_pass http://asset_service/api$1$is_args$args;
    # ... 其他配置
}
```

### 路由映射说明

| 移动端请求路径 | 代理到后端服务 | 说明 |
|---------------|---------------|------|
| `/user-service/api/auth/login` | `user_service:3001/api/auth/login` | 用户认证 |
| `/work-order-service/api/work-orders` | `work_order_service:3002/api/work-orders` | 工单管理 |
| `/asset-service/api/assets` | `asset_service:3003/api/assets` | 资产管理 |

## 🚀 部署步骤

### 1. 拉取最新代码
```bash
cd /path/to/emaintenance
git pull origin main
```

### 2. 更新 Nginx 配置

**方法 A: 如果使用分模块部署**
```bash
# 复制新的 Nginx 配置
sudo cp deploy/modular/configs/nginx.conf /etc/nginx/nginx.conf

# 或更新 Docker 容器配置
docker-compose -f deploy/modular/docker-compose.infrastructure.yml down
docker-compose -f deploy/modular/docker-compose.infrastructure.yml up -d
```

**方法 B: 如果使用本地部署**
```bash
# 复制配置文件
sudo cp deploy/Local/configs/nginx.conf /etc/nginx/sites-available/emaintenance

# 重载 Nginx
sudo nginx -t  # 测试配置
sudo systemctl reload nginx
```

### 3. 验证修复

```bash
# 测试移动端 API 路由
curl -X POST http://10.163.144.13:3030/user-service/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"admin123"}'

# 应该返回 JSON 而不是 HTML
```

### 4. 测试 Android 应用

- 在 SEUIC PDA 上打开 E-Maintenance 应用
- 尝试登录
- 应该能成功连接并认证

## 🔍 技术细节

### Web 端 vs 移动端 API 路径

| 客户端 | API 路径格式 | 说明 |
|--------|-------------|------|
| Web 端 | `/api/auth/login` | Next.js 应用使用 |
| 移动端 | `/user-service/api/auth/login` | Android/iOS 原生应用使用 |

### 兼容性保证

- ✅ **Web 端不受影响**：保留了原有的 `/api/*` 路由
- ✅ **移动端现在支持**：新增了 `/service-name/api/*` 路由
- ✅ **向后兼容**：所有现有功能继续工作

## 🐛 故障排查

### 如果仍然 404

1. **检查 Nginx 配置是否生效**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

2. **检查后端服务状态**
   ```bash
   docker ps | grep emaintenance
   curl http://localhost:3001/health
   ```

3. **查看 Nginx 日志**
   ```bash
   sudo tail -f /var/log/nginx/access.log
   sudo tail -f /var/log/nginx/error.log
   ```

### 如果仍然返回 HTML

- 确认请求路径完全匹配：`/user-service/api/auth/login`
- 检查上游服务是否正常运行
- 验证代理路径配置是否正确

## 📱 Android 应用版本

- **当前版本**: v1.0.2 (增强调试日志)
- **修复状态**: ✅ 应用端已修复，等待服务器端配置更新
- **APK 位置**: `apps/mobile/releases/android/v1.0.2/`

---

**修复后，Android PDA 应用应该能正常登录和使用所有功能！** 🎉