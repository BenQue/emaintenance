# Android 设备部署指南

## 📱 概述

本指南详细说明如何在Android设备上部署E-Maintenance移动应用，包括开发环境配置、APK构建、网络设置和真机安装。

## 🛠️ 开发环境要求

### 系统要求

- **Flutter**: 3.32.8+
- **Android SDK**: API Level 36 (Android 16)
- **最低支持**: Android 5.0 (API Level 21)
- **Java**: OpenJDK 11+

### 依赖检查

```bash
flutter doctor -v
```

确保所有组件显示 ✓ 状态。

## 🏗️ 项目配置

### Android应用信息

- **应用ID**: `com.bizlink.emaintenance.mobile`
- **应用名称**: E-Maintenance
- **目标SDK**: 36
- **最小SDK**: 21

### 网络环境配置

配置文件位置: `lib/shared/config/environment.dart`

```dart
class Environment {
  // 开发环境 - 本地开发服务器
  static const String _devBaseUrl = 'http://192.168.31.53';
  
  // 生产环境 - 实际服务器地址
  static const String _prodBaseUrl = 'https://api.bizlink.com';
  
  // 自动环境切换
  static bool get isDevelopment {
    bool isDebugMode = false;
    assert(isDebugMode = true);
    return isDebugMode;
  }
}
```

### 微服务地址映射

| 环境 | 用户服务 | 工单服务 | 资产服务 |
|------|----------|----------|----------|
| **开发** | `http://192.168.31.53:3001` | `http://192.168.31.53:3002` | `http://192.168.31.53:3003` |
| **生产** | `https://api.bizlink.com/user-service` | `https://api.bizlink.com/work-order-service` | `https://api.bizlink.com/asset-service` |

## 📦 APK构建

### 1. 清理项目

```bash
flutter clean
flutter pub get
```

### 2. 构建Debug版本 (开发测试)

```bash
flutter build apk --debug
```

- **输出文件**: `build/app/outputs/flutter-apk/app-debug.apk`
- **大小**: ~104MB
- **用途**: 开发调试，包含调试信息
- **服务器**: 使用开发环境地址

### 3. 构建Release版本 (生产部署)

```bash
flutter build apk --release
```

- **输出文件**: `build/app/outputs/flutter-apk/app-release.apk`
- **大小**: ~35MB
- **用途**: 生产部署，性能优化
- **服务器**: 自动使用生产环境地址

## 🔧 网络配置更新

### 修改生产服务器地址

1. **编辑配置文件**:

   ```bash
   # 编辑 lib/shared/config/environment.dart
   static const String _prodBaseUrl = 'https://你的域名.com';
   ```

2. **重新构建APK**:

   ```bash
   flutter build apk --release
   ```

### 常见生产地址示例

```dart
// 示例1: 子域名
static const String _prodBaseUrl = 'https://api.company.com';

// 示例2: 路径前缀
static const String _prodBaseUrl = 'https://company.com/api';

// 示例3: 云服务
static const String _prodBaseUrl = 'https://prod-server.aliyun.com';
```

## 📲 真机安装指南

### 方法1: 直接传输安装 (推荐)

#### 步骤1: 获取APK文件

APK文件位置: `build/app/outputs/flutter-apk/app-release.apk`

#### 步骤2: 传输到Android设备

- **云盘**: 上传到iCloud/Google Drive/百度云，设备端下载
- **邮件**: 发送给自己，设备端接收
- **USB**: 直接拷贝到设备存储
- **无线**: AirDrop/附近共享

#### 步骤3: 启用未知来源安装

```text
设置 → 安全与隐私 → 更多安全设置 → 
允许安装未知应用 → Chrome/文件管理器 → 允许
```

#### 步骤4: 安装APK

1. 在文件管理器中找到APK文件
2. 点击APK文件
3. 选择"安装"
4. 等待安装完成

### 方法2: ADB安装

```bash
# 连接设备，启用USB调试
adb devices

# 安装APK
adb install build/app/outputs/flutter-apk/app-release.apk
```

### 方法3: 直接运行到设备

```bash
# 检查连接的设备
flutter devices

# 运行到真机
flutter run -d <设备ID> --release
```

## 🔍 版本对比

| 特性 | Debug APK | Release APK |
|------|-----------|-------------|
| **文件大小** | 104MB | 35MB |
| **性能** | 较慢 | 优化后更快 |
| **调试信息** | 包含完整 | 移除调试信息 |
| **代码混淆** | 无 | 有 |
| **环境** | 开发环境 | 生产环境 |
| **推荐用途** | 开发调试 | **生产部署** |

## 🧪 功能测试清单

### 基础功能

- [ ] 应用启动正常
- [ ] 界面显示正确
- [ ] 网络连接测试

### 用户认证

- [ ] 登录功能
- [ ] JWT Token存储
- [ ] 路由保护

### 相机功能

- [ ] 相机权限请求
- [ ] QR码扫描
- [ ] 照片拍摄

### 业务功能

- [ ] 设备信息获取
- [ ] 维修请求表单
- [ ] 照片上传
- [ ] 数据提交

## 🚨 常见问题排查

### 安装问题

- **安装失败**: 检查是否启用"未知来源"安装
- **解析包错误**: 确认APK文件完整，重新下载
- **版本冲突**: 卸载旧版本后重新安装

### 运行问题

- **无法打开**: 检查Android版本兼容性 (最低5.0)
- **闪退**: 检查设备内存，重启设备后尝试
- **白屏**: 等待应用完全加载，检查网络连接

### 权限问题

```text
设置 → 应用管理 → E-Maintenance → 权限
启用: 相机、存储、网络
```

### 网络问题

- **连接失败**: 检查服务器地址配置
- **超时**: 确认服务器运行状态
- **证书错误**: 生产环境需要有效SSL证书

## 📋 部署检查清单

### 构建前检查

- [ ] 更新生产服务器地址
- [ ] 检查应用版本号
- [ ] 确认所有功能正常

### 构建过程

- [ ] 运行 `flutter clean`
- [ ] 运行 `flutter pub get`
- [ ] 构建Release APK
- [ ] 验证APK大小合理

### 部署后验证

- [ ] 真机安装成功
- [ ] 基础功能测试
- [ ] 网络连接测试
- [ ] 完整业务流程测试

## 📚 相关文档

- [Flutter官方部署指南](https://flutter.dev/docs/deployment/android)
- [Android应用签名](https://developer.android.com/studio/publish/app-signing)
- [项目架构文档](./architecture/)
- [API接口文档](./api/)

## 🔄 版本更新流程

1. **修改代码**
2. **更新版本号** (pubspec.yaml)
3. **更新配置** (environment.dart)
4. **构建新APK** (`flutter build apk --release`)
5. **测试验证**
6. **分发部署**

---

**最后更新**: 2025-08-17  
**文档版本**: v1.0.0  
**适用应用版本**: E-Maintenance v1.0.0