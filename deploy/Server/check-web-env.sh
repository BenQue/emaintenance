#!/bin/bash

# 检查Web服务容器内的实际API配置

echo "==========================================="
echo "  检查Web服务API配置"
echo "==========================================="

echo -e "\n[1] 检查Web容器的环境变量："
docker exec emaintenance-web-service printenv | grep NEXT_PUBLIC || echo "没有找到NEXT_PUBLIC环境变量"

echo -e "\n[2] 检查构建时嵌入的API URL（从静态文件）："
docker exec emaintenance-web-service find /app/.next/static -name "*.js" -exec grep -l "localhost:3001" {} \; 2>/dev/null | head -5 || echo "在静态文件中未找到localhost:3001"

echo -e "\n[3] 检查静态文件中的API URL模式："
docker exec emaintenance-web-service find /app/.next/static -name "*.js" -exec grep -o "localhost:[0-9]*" {} \; 2>/dev/null | sort | uniq -c || echo "未找到localhost URL"

echo -e "\n[4] 检查package.json中的构建脚本："
docker exec emaintenance-web-service cat /app/package.json 2>/dev/null | grep -A2 -B2 '"build"' || echo "无法读取package.json"

echo -e "\n[5] 检查Next.js配置文件："
docker exec emaintenance-web-service ls -la /app/next.config.* 2>/dev/null || echo "没有找到next.config文件"

echo "==========================================="