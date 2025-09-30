# Android 移动端部署指南

## 问题诊断

经过深入分析，发现以下问题：

### 1. ✅ 已修复的配置
- **端口配置**：已将生产环境 URL 从 `http://10.163.144.13` 修改为 `http://10.163.144.13:3030`
- **网络权限**：AndroidManifest.xml 已配置 INTERNET 权限
- **明文传输**：已启用 `usesCleartextTraffic="true"` 和配置 network_security_config.xml

### 2. 🔍 API 路径不一致问题

Android 应用中存在两套配置：

#### environment.dart（静态配置）
```dart
生产环境: http://10.163.144.13:3030
服务路径: /user-service, /work-order-service, /asset-service
```

#### environment_flexible.dart（动态配置）
```dart
生产环境: http://10.163.144.13:3030  
服务路径: /api/users, /api/work-orders, /api/assets
```

## 解决方案

### 方案 A：修改 Android 应用使用统一路径（推荐）

1. **统一使用 environment_flexible.dart**
   - 该文件支持动态切换环境，更灵活
   - 路径格式 `/api/xxx` 更符合 RESTful 规范

2. **修改所有服务调用代码**
   ```dart
   // 修改 auth_service.dart
   import 'package:emaintenance/shared/config/environment_flexible.dart';
   
   // 登录时使用
   final config = await FlexibleEnvironment.getCurrentConfig();
   final loginUrl = '${config['userService']}/auth/login';
   ```

### 方案 B：服务器端 Nginx 配置适配两种路径

确保服务器 Nginx 配置同时支持两种路径格式：

```nginx
# 支持 /user-service 路径
location /user-service/ {
    proxy_pass http://user-service:3001/;
}

# 同时支持 /api/users 路径
location /api/users/ {
    proxy_pass http://user-service:3001/api/;
}
```

## 重新构建 Android APK

### 1. 清理旧构建
```bash
cd apps/mobile
flutter clean
flutter pub get
```

### 2. 构建 Release APK
```bash
# 构建生产环境 APK
flutter build apk --release

# APK 文件位置
# apps/mobile/build/app/outputs/flutter-apk/app-release.apk
```

### 3. 构建分包 APK（推荐，体积更小）
```bash
flutter build apk --split-per-abi

# 生成文件：
# app-armeabi-v7a-release.apk (32位设备)
# app-arm64-v8a-release.apk (64位设备)
# app-x86_64-release.apk (模拟器)
```

## 部署前检查清单

### 服务器端验证
```bash
# SSH 登录服务器
ssh user@10.163.144.13

# 1. 检查 Nginx 是否运行
sudo systemctl status nginx

# 2. 检查 3030 端口是否监听
sudo netstat -tlnp | grep 3030

# 3. 检查防火墙规则
sudo firewall-cmd --list-ports
# 或
sudo iptables -L -n | grep 3030

# 4. 测试 API 端点
curl http://localhost:3030/user-service/health
curl http://localhost:3030/api/users/health
```

### Android 设备测试

1. **网络连接测试**
   ```bash
   # 在 Android 设备上通过 adb shell
   adb shell ping 10.163.144.13
   ```

2. **安装测试 APK**
   ```bash
   adb install app-release.apk
   ```

3. **查看应用日志**
   ```bash
   adb logcat | grep -i emaintenance
   ```

## 故障排查

### 如果仍然无法连接：

1. **检查服务器防火墙**
   ```bash
   # 开放 3030 端口
   sudo firewall-cmd --permanent --add-port=3030/tcp
   sudo firewall-cmd --reload
   ```

2. **验证 Docker 容器运行状态**
   ```bash
   docker ps
   docker logs emaintenance-nginx
   docker logs emaintenance-web
   ```

3. **检查 API 服务健康状态**
   ```bash
   # 在服务器上执行
   curl http://localhost:3001/health  # user-service
   curl http://localhost:3002/health  # work-order-service
   curl http://localhost:3003/health  # asset-service
   ```

4. **Android 应用调试模式**
   - 在应用设置中切换到自定义服务器
   - 输入完整地址：`http://10.163.144.13:3030`
   - 查看连接日志

## 临时解决方案

如果需要紧急使用，可以：

1. **使用 ngrok 或内网穿透**
   ```bash
   # 服务器上安装 ngrok
   ngrok http 3030
   # 获取公网地址供 Android 使用
   ```

2. **配置 VPN 访问**
   - 设置企业 VPN
   - Android 设备连接 VPN 后访问内网服务

## 联系支持

如果问题持续，请提供：
1. 服务器 Nginx 日志：`/var/log/nginx/error.log`
2. Docker 容器日志：`docker logs emaintenance-nginx`
3. Android 应用日志：通过 adb logcat 获取
4. 网络诊断信息：ping 和 traceroute 结果