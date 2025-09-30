# Android APK 安装指南

## ✅ APK 构建成功

已成功构建以下 APK 文件：

### 通用版本（推荐）
- **文件**: `app-release.apk`
- **大小**: 34MB
- **路径**: `build/app/outputs/flutter-apk/app-release.apk`
- **适用**: 所有 Android 设备

### 分架构版本（体积更小）
- **ARM64 (64位设备)**: `app-arm64-v8a-release.apk` (12MB)
  - 适用于大多数现代 Android 手机
- **ARM32 (32位设备)**: `app-armeabi-v7a-release.apk` (12MB)
  - 适用于较老的 Android 设备
- **x86_64 (模拟器)**: `app-x86_64-release.apk` (13MB)
  - 适用于 Android 模拟器

## 📱 安装方法

### 方法 1：通过 ADB 安装（推荐）

```bash
# 连接设备后，安装通用版本
adb install build/app/outputs/flutter-apk/app-release.apk

# 或安装特定架构版本（64位设备）
adb install build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
```

### 方法 2：文件传输安装

1. 将 APK 文件传输到 Android 设备
   - 通过 USB 数据线
   - 通过邮件发送
   - 通过云存储分享

2. 在 Android 设备上：
   - 打开文件管理器
   - 找到 APK 文件
   - 点击安装
   - 如提示"安装未知应用"，允许该权限

### 方法 3：二维码分享

生成 APK 下载二维码供设备扫描下载。

## 🔧 配置确认

APK 已配置以下关键设置：

- ✅ **服务器地址**: `http://10.163.144.13:3030`
- ✅ **网络权限**: INTERNET 权限已启用
- ✅ **HTTP 支持**: 明文传输已允许
- ✅ **API 路径**: 
  - 用户服务: `/user-service`
  - 工单服务: `/work-order-service`
  - 资产服务: `/asset-service`

## ⚠️ 安装前检查

1. **网络连接**
   - 确保 Android 设备与服务器 `10.163.144.13` 在同一网络
   - 可以先 ping 测试：`ping 10.163.144.13`

2. **服务器状态**
   - 确认服务器 Nginx 在 3030 端口运行
   - 确认后端服务正常运行

3. **Android 版本**
   - 最低支持: Android 5.0 (API Level 21)
   - 推荐: Android 8.0+ 以获得最佳体验

## 🐛 故障排查

### 无法安装
- 检查是否允许"安装未知来源应用"
- 卸载旧版本后重新安装
- 确保设备有足够存储空间

### 无法连接服务器
1. 检查网络连接
2. 验证服务器地址可访问
3. 查看应用日志：
   ```bash
   adb logcat | grep -i emaintenance
   ```

### 登录失败
- 确认用户名密码正确
- 检查服务器 API 是否正常
- 查看服务器日志

## 📊 版本信息

- **构建时间**: 2025-09-01
- **Flutter 版本**: 3.22+
- **服务器配置**: 10.163.144.13:3030
- **支持架构**: ARM32, ARM64, x86_64

## 🚀 快速测试

安装后测试步骤：
1. 打开应用
2. 使用测试账号登录
3. 创建测试工单
4. 扫描二维码（如有设备）
5. 检查通知功能

---

APK 文件位置：
`/Users/benque/Project/Emaintenance/build/app/outputs/flutter-apk/`