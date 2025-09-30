# macOS 通过 ADB 安装 Android APK 完整指南

## 🎯 概述
ADB (Android Debug Bridge) 是 Android 开发工具，可通过 USB 连接 Android 设备进行应用安装、调试等操作。在你的 MacBook 上完全可以通过 USB 连接 Android 设备来安装 APK。

## ✅ 当前系统状态
```bash
# 你的系统已安装 ADB
ADB 版本: 1.0.41 (36.0.0-13206524)
安装路径: /Users/benque/Library/Android/sdk/platform-tools/adb
系统: macOS (Darwin 24.6.0 arm64)
```

## 🛠️ 1. 前置条件和软件安装

### 1.1 ADB 安装状态 ✅
你的系统已经安装了 ADB，无需额外安装。

### 1.2 如果需要重新安装 ADB（备选方案）
```bash
# 方法 1: 使用 Homebrew (推荐)
brew install android-platform-tools

# 方法 2: 下载 Android SDK Platform Tools
# 从 https://developer.android.com/studio/releases/platform-tools 下载
# 解压后将 platform-tools 目录添加到 PATH
```

### 1.3 USB 数据线要求
- **数据传输线**：必须是支持数据传输的 USB 线（非仅充电线）
- **USB-C/Lightning 转换**：根据你的 Android 设备接口选择合适的线缆
- **线缆质量**：建议使用原装或高质量数据线

## 📱 2. Android 设备配置

### 2.1 启用开发者选项
1. **打开设置** → **关于手机**
2. **连续点击 "版本号" 7次**
3. 出现 "您现在已处于开发者模式" 提示

### 2.2 启用 USB 调试
1. **设置** → **系统** → **开发者选项**
2. 找到 **USB 调试**，开启开关
3. 弹出确认对话框，点击 **"确定"**

### 2.3 USB 配置选项
1. 连接 USB 线后，手机通知栏会显示 USB 选项
2. 点击通知，选择 **"传输文件"** 或 **"PTP"** 模式
3. 不要选择 "仅充电" 模式

## 🔌 3. 连接和验证

### 3.1 物理连接
```bash
# 1. USB 线连接 MacBook 和 Android 设备
# 2. Android 设备解锁屏幕
# 3. 等待驱动安装完成（首次连接）
```

### 3.2 验证连接
```bash
# 检查设备连接状态
adb devices

# 正常输出示例：
# List of devices attached
# ABC123DEF456    device
```

### 3.3 连接状态说明
- **device**: 已连接且已授权（可以安装应用）
- **unauthorized**: 已连接但未授权（需要在手机上确认）
- **offline**: 设备离线
- **no permissions**: 权限不足

### 3.4 首次连接授权
1. 首次连接时，Android 设备会弹出 **"允许 USB 调试吗？"**
2. **勾选** "始终允许来自这台计算机"
3. 点击 **"确定"**

## 📦 4. APK 安装操作

### 4.1 基本安装命令
```bash
# 安装 APK 文件
adb install /path/to/your/app.apk

# 针对我们的 E-Maintenance 应用
adb install /Users/benque/Project/Emaintenance/apps/mobile/releases/android/v1.0.1/emaintenance-v1.0.1-release.apk
```

### 4.2 常用安装选项
```bash
# 强制重新安装（覆盖现有版本）
adb install -r /path/to/app.apk

# 安装到外部存储
adb install -s /path/to/app.apk

# 保留数据重新安装
adb install -d /path/to/app.apk

# 安装时不验证 APK
adb install -t /path/to/app.apk
```

### 4.3 安装 E-Maintenance 的完整步骤
```bash
# 1. 确认设备连接
adb devices

# 2. 卸载旧版本（如果存在）
adb uninstall com.example.emaintenance_mobile

# 3. 安装新版本
cd /Users/benque/Project/Emaintenance
adb install apps/mobile/releases/android/v1.0.1/emaintenance-v1.0.1-release.apk

# 4. 验证安装成功
adb shell pm list packages | grep emaintenance
```

## 🔍 5. 故障排查

### 5.1 设备检测问题
```bash
# 问题：adb devices 显示为空
# 解决方案：
1. 检查 USB 线是否支持数据传输
2. 确认 USB 调试已开启
3. 重启 ADB 服务
   adb kill-server
   adb start-server

4. 检查 Android 设备 USB 连接模式
5. 更换 USB 端口或数据线
```

### 5.2 授权问题
```bash
# 问题：设备显示 unauthorized
# 解决方案：
1. 撤销所有 USB 调试授权：
   设置 → 开发者选项 → 撤销 USB 调试授权
2. 重新连接设备，在弹窗中授权
3. 如仍无效，重启设备后重试
```

### 5.3 安装失败问题
```bash
# 常见错误及解决方案：

# INSTALL_FAILED_INSUFFICIENT_STORAGE
# 解决：清理设备存储空间

# INSTALL_FAILED_UPDATE_INCOMPATIBLE  
# 解决：先卸载旧版本应用
adb uninstall com.example.emaintenance_mobile

# INSTALL_FAILED_VERSION_DOWNGRADE
# 解决：使用 -d 参数允许降级安装
adb install -d /path/to/app.apk

# INSTALL_PARSE_FAILED_NO_CERTIFICATES
# 解决：APK 签名问题，重新构建 APK
```

### 5.4 权限问题
```bash
# macOS Catalina+ 可能需要授权终端访问
# 系统偏好设置 → 安全性与隐私 → 隐私 → 完全磁盘访问权限
# 添加终端应用
```

## 🚀 6. 实际操作演示

### 6.1 完整安装流程
```bash
# Step 1: 连接设备
echo "连接 Android 设备到 MacBook"
adb devices

# Step 2: 检查当前安装的应用
adb shell pm list packages | grep emaintenance

# Step 3: 卸载旧版本（如存在）
adb uninstall com.example.emaintenance_mobile

# Step 4: 安装新版本
adb install apps/mobile/releases/android/v1.0.1/emaintenance-v1.0.1-release.apk

# Step 5: 验证安装
adb shell pm list packages | grep emaintenance

# Step 6: 启动应用（可选）
adb shell am start -n com.example.emaintenance_mobile/.MainActivity
```

### 6.2 安装成功后的验证
```bash
# 检查应用信息
adb shell dumpsys package com.example.emaintenance_mobile | grep version

# 查看应用文件
adb shell ls -la /data/app/ | grep emaintenance

# 检查应用权限
adb shell dumpsys package com.example.emaintenance_mobile | grep permission
```

## 📱 7. 其他实用 ADB 命令

### 7.1 设备管理
```bash
# 重启设备
adb reboot

# 重启到 Recovery 模式
adb reboot recovery

# 重启到 Bootloader
adb reboot bootloader

# 截屏
adb shell screencap /sdcard/screenshot.png
adb pull /sdcard/screenshot.png ./
```

### 7.2 应用管理
```bash
# 列出所有已安装应用
adb shell pm list packages

# 启动应用
adb shell am start -n package.name/.ActivityName

# 停止应用
adb shell am force-stop package.name

# 清除应用数据
adb shell pm clear package.name
```

### 7.3 日志查看
```bash
# 实时查看日志
adb logcat

# 过滤应用日志
adb logcat | grep emaintenance

# 清空日志
adb logcat -c
```

## ⚠️ 8. 注意事项和最佳实践

### 8.1 安全注意事项
- 仅在可信设备上启用 USB 调试
- 使用完毕后可关闭开发者选项
- 不要在公共场所连接未知计算机

### 8.2 最佳实践
- 使用原装或高质量 USB 数据线
- 保持设备电量充足（> 50%）
- 安装前备份重要数据
- 定期清理不需要的应用和数据

### 8.3 多设备管理
```bash
# 当连接多个设备时，指定设备ID
adb -s DEVICE_ID install app.apk

# 查看连接的设备列表
adb devices -l
```

## 📞 9. 技术支持

### 9.1 常用诊断命令
```bash
# 系统信息
adb shell getprop

# 设备存储空间
adb shell df

# CPU 架构
adb shell getprop ro.product.cpu.abi

# Android 版本
adb shell getprop ro.build.version.release
```

### 9.2 问题反馈信息
如遇到问题，请提供：
1. `adb devices` 输出
2. 错误信息截图
3. Android 设备型号和版本
4. macOS 版本
5. 执行的具体命令

---

**准备就绪！你的 MacBook 已具备通过 USB 安装 Android APK 的完整环境。** 🎉