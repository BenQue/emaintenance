# E-Maintenance v1.0.0 Release

## 📦 APK 文件说明

| 文件名 | 大小 | 适用设备 | 说明 |
|--------|------|----------|------|
| emaintenance-v1.0.0-release.apk | 34MB | 所有 Android 设备 | 通用版本（推荐） |
| emaintenance-v1.0.0-arm64-release.apk | 12MB | 64位 ARM 设备 | 现代手机（2016年后） |
| emaintenance-v1.0.0-arm32-release.apk | 12MB | 32位 ARM 设备 | 老旧设备 |
| emaintenance-v1.0.0-x86_64-release.apk | 13MB | x86_64 设备 | 模拟器使用 |

## 🚀 安装方法

### ADB 安装（推荐）
```bash
# 通用版本
adb install emaintenance-v1.0.0-release.apk

# 或根据设备架构选择
adb install emaintenance-v1.0.0-arm64-release.apk
```

### 手动安装
1. 将 APK 文件传输到设备
2. 打开文件管理器
3. 点击 APK 文件安装
4. 允许"安装未知来源应用"

## ⚙️ 配置信息

- **服务器地址**: http://10.163.144.13:3030
- **构建时间**: 2025-09-01
- **Flutter 版本**: 3.22+
- **最低 Android 版本**: 5.0 (API 21)

## 📝 版本更新日志

### v1.0.0 (2025-09-01)
- ✅ 修复服务器端口配置（添加 3030 端口）
- ✅ 更新 API 基础 URL 配置
- ✅ 支持 HTTP 明文传输
- ✅ 网络权限配置完善
- ✅ 添加版本号命名规范

## ⚠️ 注意事项

1. **网络要求**: 设备必须与服务器 10.163.144.13 在同一局域网
2. **首次安装**: 需要卸载旧版本应用
3. **权限设置**: 需要允许相机权限（二维码扫描）

## 🐛 问题反馈

如遇到问题，请收集以下信息：
- 设备型号和 Android 版本
- 错误截图或描述
- 通过 `adb logcat` 获取的日志

## 📊 文件完整性

| 文件 | MD5 校验和 |
|------|-----------|
| emaintenance-v1.0.0-release.apk | [待生成] |
| emaintenance-v1.0.0-arm64-release.apk | [待生成] |
| emaintenance-v1.0.0-arm32-release.apk | [待生成] |
| emaintenance-v1.0.0-x86_64-release.apk | [待生成] |