#!/bin/bash

# E-Maintenance APK 构建脚本（带版本号）
# 自动从 pubspec.yaml 读取版本号并构建带项目名称的 APK

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}E-Maintenance APK 构建工具${NC}"
echo -e "${GREEN}================================${NC}"

# 获取版本号
VERSION=$(grep "^version:" pubspec.yaml | sed 's/version: //g' | sed 's/+.*//g')
BUILD_NUMBER=$(grep "^version:" pubspec.yaml | sed 's/.*+//g')
PROJECT_NAME="emaintenance"

echo -e "${YELLOW}项目名称: ${PROJECT_NAME}${NC}"
echo -e "${YELLOW}版本号: ${VERSION}${NC}"
echo -e "${YELLOW}构建号: ${BUILD_NUMBER}${NC}"

# 清理旧构建
echo -e "\n${YELLOW}清理旧构建...${NC}"
flutter clean

# 获取依赖
echo -e "\n${YELLOW}获取依赖包...${NC}"
flutter pub get

# 构建选项
echo -e "\n${GREEN}选择构建类型:${NC}"
echo "1) 通用版本 (单个 APK，体积较大)"
echo "2) 分架构版本 (多个 APK，体积较小)"
echo "3) 两种都构建"
read -p "请选择 (1-3): " BUILD_TYPE

# 创建输出目录
OUTPUT_DIR="releases/android/v${VERSION}"
mkdir -p $OUTPUT_DIR

# 构建函数
build_universal() {
    echo -e "\n${YELLOW}构建通用版本 APK...${NC}"
    flutter build apk --release
    
    if [ $? -eq 0 ]; then
        # 重命名并移动文件
        APK_NAME="${PROJECT_NAME}-v${VERSION}-release.apk"
        cp build/app/outputs/flutter-apk/app-release.apk "$OUTPUT_DIR/$APK_NAME"
        echo -e "${GREEN}✓ 构建成功: $OUTPUT_DIR/$APK_NAME${NC}"
    else
        echo -e "${RED}✗ 构建失败${NC}"
        exit 1
    fi
}

build_split() {
    echo -e "\n${YELLOW}构建分架构版本 APK...${NC}"
    flutter build apk --split-per-abi --release
    
    if [ $? -eq 0 ]; then
        # 重命名并移动文件
        cp build/app/outputs/flutter-apk/app-arm64-v8a-release.apk "$OUTPUT_DIR/${PROJECT_NAME}-v${VERSION}-arm64-release.apk"
        cp build/app/outputs/flutter-apk/app-armeabi-v7a-release.apk "$OUTPUT_DIR/${PROJECT_NAME}-v${VERSION}-arm32-release.apk"
        cp build/app/outputs/flutter-apk/app-x86_64-release.apk "$OUTPUT_DIR/${PROJECT_NAME}-v${VERSION}-x86_64-release.apk"
        echo -e "${GREEN}✓ 分架构版本构建成功${NC}"
    else
        echo -e "${RED}✗ 构建失败${NC}"
        exit 1
    fi
}

# 执行构建
case $BUILD_TYPE in
    1)
        build_universal
        ;;
    2)
        build_split
        ;;
    3)
        build_universal
        build_split
        ;;
    *)
        echo -e "${RED}无效选择${NC}"
        exit 1
        ;;
esac

# 生成版本信息文件
echo -e "\n${YELLOW}生成版本信息...${NC}"
cat > "$OUTPUT_DIR/version_info.txt" << EOF
E-Maintenance Android APK
========================
版本: v${VERSION}
构建号: ${BUILD_NUMBER}
构建时间: $(date '+%Y-%m-%d %H:%M:%S')
服务器配置: http://10.163.144.13:3030

文件列表:
EOF

ls -lh "$OUTPUT_DIR"/*.apk >> "$OUTPUT_DIR/version_info.txt"

# 显示构建结果
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}构建完成！${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "\n输出目录: ${YELLOW}$OUTPUT_DIR${NC}"
echo -e "\n文件列表:"
ls -lh "$OUTPUT_DIR"/*.apk

# 生成安装命令
echo -e "\n${GREEN}快速安装命令:${NC}"
echo -e "adb install $OUTPUT_DIR/${PROJECT_NAME}-v${VERSION}-release.apk"

# 询问是否需要立即安装
echo -e "\n${YELLOW}是否立即通过 ADB 安装到设备？(y/n)${NC}"
read -p "> " INSTALL_NOW

if [ "$INSTALL_NOW" = "y" ] || [ "$INSTALL_NOW" = "Y" ]; then
    echo -e "${YELLOW}检测连接的设备...${NC}"
    adb devices
    
    if [ -f "$OUTPUT_DIR/${PROJECT_NAME}-v${VERSION}-release.apk" ]; then
        echo -e "${YELLOW}安装 APK...${NC}"
        adb install "$OUTPUT_DIR/${PROJECT_NAME}-v${VERSION}-release.apk"
    else
        echo -e "${YELLOW}安装 ARM64 版本...${NC}"
        adb install "$OUTPUT_DIR/${PROJECT_NAME}-v${VERSION}-arm64-release.apk"
    fi
fi

echo -e "\n${GREEN}完成！${NC}"