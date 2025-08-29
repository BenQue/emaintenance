#!/bin/bash
# 获取Mac的IP地址用于移动端调试

echo "==================================="
echo "Mac IP地址（用于移动端调试）"
echo "==================================="

# 获取主要网络接口的IP
IP=$(ifconfig en0 2>/dev/null | grep "inet " | awk '{print $2}')

# 如果en0没有IP，尝试en1
if [ -z "$IP" ]; then
    IP=$(ifconfig en1 2>/dev/null | grep "inet " | awk '{print $2}')
fi

# 如果还是没有，获取任何非localhost的IP
if [ -z "$IP" ]; then
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
fi

if [ -n "$IP" ]; then
    echo ""
    echo "📱 在手机应用的服务器设置中输入："
    echo ""
    echo "   http://$IP"
    echo ""
    echo "==================================="
else
    echo "❌ 无法获取IP地址，请检查网络连接"
fi