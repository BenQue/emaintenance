# E-Maintenance Mobile App

Flutter 移动应用，支持 iOS 和 Android 平台的设备维护管理。

## 环境要求

- Flutter 3.22+
- Dart 3.0+
- Xcode 16+ (iOS 开发)
- Android Studio (Android 开发)
- CocoaPods (iOS 依赖管理)

## 安装依赖

```bash
# 安装 Flutter 依赖
flutter pub get

# iOS 依赖安装
cd ios && pod install && cd ..
```

## iOS 调试指南

### 一、在 iOS 模拟器上调试

```bash
# 1. 打开模拟器
open -a Simulator

# 2. 运行应用
flutter run

# 或指定特定模拟器
flutter run -d "iPhone 16 Pro"

# 查看可用模拟器
flutter emulators
```

### 二、在物理 iPhone 上调试（USB连接）

#### 1. 设备准备
- 在 iPhone 上开启**开发者模式**：
  - 设置 → 隐私与安全性 → 开发者模式 → 打开
  - 重启设备后确认开启

#### 2. Xcode 配置
```bash
# 打开项目的 iOS 工程
open ios/Runner.xcworkspace
```

在 Xcode 中配置：
- 选择你的开发团队（Signing & Capabilities）
- Bundle Identifier 设置为唯一值（如：com.yourcompany.emaintenance）
- 确保 Deployment Target 与你的设备 iOS 版本兼容

#### 3. USB 连接调试
```bash
# 1. USB 连接 iPhone 到 Mac
# 2. 信任此电脑（iPhone 上会弹出提示）

# 3. 查看已连接设备
flutter devices

# 4. 运行应用到物理设备
flutter run -d [device-id]
# 或如果只连接了一个设备
flutter run
```

### 三、无线调试

如果设备已通过无线方式连接：

```bash
# 查看无线连接的设备
flutter devices

# 运行到指定设备
flutter run -d "设备ID"
```

### 四、调试快捷键

运行后可使用以下快捷键：
- `r` - 热重载（Hot Reload）
- `R` - 热重启（Hot Restart）
- `h` - 显示帮助
- `d` - detach（断开但保持应用运行）
- `c` - 清空控制台
- `q` - 退出

### 五、VS Code 调试（推荐）

1. 安装 Flutter 扩展
2. 打开调试面板（Cmd+Shift+D）
3. 创建 launch.json 配置文件
4. 点击"运行和调试"
5. 选择设备后开始调试

VS Code 调试优势：
- 设置断点
- 查看变量值
- 步进调试
- 查看调用栈

## Android 调试指南

### 一、在 Android 模拟器上调试

```bash
# 1. 打开 Android Studio
# 2. 启动 AVD Manager 创建/启动模拟器
# 3. 运行应用
flutter run
```

### 二、在物理 Android 设备上调试

1. **开启开发者选项**：
   - 设置 → 关于手机 → 连续点击版本号 7 次
   - 返回设置 → 开发者选项 → 开启 USB 调试

2. **连接并运行**：
```bash
# USB 连接设备
# 查看设备
flutter devices

# 运行应用
flutter run
```

## 常见问题

### 1. iOS 签名问题
如果遇到签名错误，在 Xcode 中：
- 确保选择了正确的开发团队
- 检查 Bundle ID 是否唯一
- 清理构建：Product → Clean Build Folder

### 2. 设备未识别
```bash
# 重启 adb (Android)
adb kill-server
adb start-server

# 检查 Flutter 环境
flutter doctor -v
```

### 3. 构建失败
```bash
# 清理缓存
flutter clean
flutter pub get
cd ios && pod install && cd ..
```

## 项目结构

```
lib/
├── features/          # 功能模块
│   ├── assets/       # 资产管理
│   ├── auth/         # 认证登录
│   ├── home/         # 主页
│   ├── scanner/      # 二维码扫描
│   ├── tasks/        # 任务列表
│   └── work_orders/  # 工单管理
├── shared/           # 共享模块
│   ├── config/       # 配置
│   ├── models/       # 数据模型
│   ├── providers/    # 状态管理
│   ├── services/     # 服务层
│   └── widgets/      # 共享组件
└── main.dart         # 应用入口
```

## 开发命令

```bash
# 运行测试
flutter test

# 生成构建
flutter build ios
flutter build apk

# 分析代码
flutter analyze

# 格式化代码
flutter format .
```

## 环境配置

应用支持灵活的服务器配置，可在设置页面修改 API 地址：
- 默认地址：http://localhost:3001
- 可通过设置页面动态修改
- 支持本地和远程服务器切换

## 功能特性

- ✅ 用户登录认证
- ✅ 工单创建与管理
- ✅ 二维码扫描
- ✅ 资产查询
- ✅ 照片上传
- ✅ 离线数据缓存
- ✅ 任务列表查看
- ✅ 工单完成流程