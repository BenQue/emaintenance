# Flutter 热重载/热重启指南

## 🔥 什么是热重载 (Hot Reload)?

热重载允许您在不重启应用的情况下看到代码更改,保留应用状态。

## ⚡ 什么是热重启 (Hot Restart)?

热重启会完全重新运行应用,清除所有状态。

---

## 📱 如何触发热重载/热重启

### 方法 1: 直接在运行 Flutter 的终端输入 (推荐)

如果您在终端运行了 `flutter run -d emulator-5554`:

```bash
r   # 热重载 (保留状态)
R   # 热重启 (清除状态)
q   # 退出应用
h   # 显示所有可用命令
```

### 方法 2: VS Code (最简单,自动化)

**配置自动热重载:**

1. 打开 VS Code 设置 (⌘,)
2. 搜索 "flutter hot reload"
3. 勾选 "Flutter: Hot Reload On Save"

或者手动编辑 `settings.json`:

```json
{
  "flutter.hotReloadOnSave": true
}
```

**手动触发:**
- 热重载: `⌘R` (macOS) / `Ctrl+R` (Windows/Linux)
- 热重启: `⇧⌘R` (macOS) / `Ctrl+Shift+R` (Windows/Linux)

### 方法 3: Android Studio

1. 点击工具栏的闪电图标 ⚡ (热重载)
2. 点击刷新图标 🔄 (热重启)
3. 快捷键:
   - 热重载: `⌘\` (macOS) / `Ctrl+\` (Windows/Linux)
   - 热重启: `⇧⌘\` (macOS) / `Ctrl+Shift+\` (Windows/Linux)

### 方法 4: 使用脚本 (适用于后台运行)

创建热重载脚本:

```bash
#!/bin/bash
# 保存为 apps/mobile/hot-reload.sh

FLUTTER_PID=$(pgrep -f "flutter run" | head -1)

if [ -z "$FLUTTER_PID" ]; then
  echo "❌ Flutter 未运行"
  exit 1
fi

case "$1" in
  r|reload)
    echo "🔥 热重载中..."
    kill -USR1 $FLUTTER_PID
    ;;
  R|restart)
    echo "⚡ 热重启中..."
    kill -USR2 $FLUTTER_PID
    ;;
  *)
    echo "用法: $0 {r|R}"
    ;;
esac
```

使用:
```bash
chmod +x apps/mobile/hot-reload.sh
./apps/mobile/hot-reload.sh r   # 热重载
./apps/mobile/hot-reload.sh R   # 热重启
```

---

## 🐛 热重载不生效?

### 常见原因:

1. **修改了 main() 函数** → 需要热重启
2. **修改了枚举定义** → 需要热重启
3. **添加了新的依赖** → 需要完全重启 `flutter run`
4. **修改了 native 代码** → 需要完全重启
5. **状态管理问题** → 尝试热重启

### 解决方法:

```bash
# 如果热重载不工作,尝试热重启
R

# 如果热重启也不工作,完全重启应用
q  # 退出
flutter run -d emulator-5554  # 重新运行
```

---

## 📝 最佳实践

1. **UI 更改** → 使用热重载 (r)
2. **逻辑更改** → 使用热重载 (r)
3. **状态初始化** → 使用热重启 (R)
4. **添加依赖** → 完全重启应用
5. **修改 pubspec.yaml** → 完全重启应用

---

## 🚀 当前项目快速启动

```bash
# 1. 启动模拟器
flutter emulators --launch Pixel_8_API_35

# 2. 运行应用
cd apps/mobile
flutter run -d emulator-5554

# 3. 在终端输入 'r' 热重载
```
