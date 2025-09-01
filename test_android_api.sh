#!/bin/bash

# 测试 Android 应用访问的 API 端点
SERVER="10.163.144.13:3030"

echo "测试 Android 应用 API 端点连接性"
echo "服务器地址: $SERVER"
echo "================================"

# 测试各种可能的 API 路径
echo -e "\n1. 测试 /user-service 路径（environment.dart 配置）:"
curl -s -o /dev/null -w "   GET http://$SERVER/user-service/health -> HTTP %{http_code}\n" http://$SERVER/user-service/health || echo "   连接失败"

echo -e "\n2. 测试 /api/users 路径（environment_flexible.dart 配置）:"
curl -s -o /dev/null -w "   GET http://$SERVER/api/users/health -> HTTP %{http_code}\n" http://$SERVER/api/users/health || echo "   连接失败"

echo -e "\n3. 测试 /api/auth/login 端点:"
curl -X POST http://$SERVER/user-service/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' \
  -w "\n   POST /user-service/api/auth/login -> HTTP %{http_code}\n" \
  -s || echo "   连接失败"

echo -e "\n4. 测试替代登录路径 /api/users/auth/login:"
curl -X POST http://$SERVER/api/users/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' \
  -w "\n   POST /api/users/auth/login -> HTTP %{http_code}\n" \
  -s || echo "   连接失败"

echo -e "\n5. 测试工单服务:"
echo "   /work-order-service 路径:"
curl -s -o /dev/null -w "   GET http://$SERVER/work-order-service/health -> HTTP %{http_code}\n" http://$SERVER/work-order-service/health || echo "   连接失败"

echo "   /api/work-orders 路径:"
curl -s -o /dev/null -w "   GET http://$SERVER/api/work-orders/health -> HTTP %{http_code}\n" http://$SERVER/api/work-orders/health || echo "   连接失败"

echo -e "\n6. 测试资产服务:"
echo "   /asset-service 路径:"
curl -s -o /dev/null -w "   GET http://$SERVER/asset-service/health -> HTTP %{http_code}\n" http://$SERVER/asset-service/health || echo "   连接失败"

echo "   /api/assets 路径:"
curl -s -o /dev/null -w "   GET http://$SERVER/api/assets/health -> HTTP %{http_code}\n" http://$SERVER/api/assets/health || echo "   连接失败"

echo -e "\n================================"
echo "测试完成！"
echo ""
echo "注意事项："
echo "1. HTTP 200/201 = 成功"
echo "2. HTTP 404 = 路径不存在"
echo "3. HTTP 502 = 后端服务未运行"
echo "4. 连接失败 = 网络不通或端口未开放"