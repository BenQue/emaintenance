#!/bin/bash

# E-Maintenance 远程快速修复脚本
# 用于快速修复已知问题

SERVER_IP="10.163.144.13"
SSH_USER="root"  # 根据实际情况修改
REMOTE_PATH="/opt/emaintenance"  # 根据实际部署路径修改

echo "E-Maintenance Remote Quick Fix Script"
echo "======================================"
echo "Target Server: $SERVER_IP"
echo ""

# 选择修复项
echo "Select fix to apply:"
echo "1. Fix work order assignment API (PUT vs POST)"
echo "2. Rebuild all services with fixes"
echo "3. Restart all services"
echo "4. Check service health"
echo "5. View service logs"
echo "Q. Quit"
echo ""
read -p "Enter your choice: " choice

case $choice in
  1)
    echo "Fixing work order assignment API..."
    
    # 创建修复脚本
    cat > /tmp/fix-assignment-api.sh << 'EOF'
#!/bin/bash
cd /opt/emaintenance/deploy/Server/work-order-service

# 修改路由文件
sed -i "s/router.post('\/:id\/assign'/router.put('\/:id\/assign'/g" \
  apps/api/work-order-service/src/routes/workOrders.ts

# 重新构建镜像
docker build -t emaintenance-work-order-service:latest .

# 重启服务
cd ..
docker-compose restart emaintenance-work-order-service

# 等待服务启动
sleep 5

# 检查服务状态
docker-compose ps emaintenance-work-order-service
docker-compose logs --tail=20 emaintenance-work-order-service
EOF

    # 上传并执行修复脚本
    scp /tmp/fix-assignment-api.sh $SSH_USER@$SERVER_IP:/tmp/
    ssh $SSH_USER@$SERVER_IP "chmod +x /tmp/fix-assignment-api.sh && /tmp/fix-assignment-api.sh"
    
    echo "Fix applied successfully!"
    ;;
    
  2)
    echo "Rebuilding all services..."
    
    ssh $SSH_USER@$SERVER_IP << 'EOF'
    cd /opt/emaintenance/deploy/Server
    
    # 设置环境变量
    export SERVER_IP=10.163.144.13
    export NEXT_PUBLIC_API_URL="http://${SERVER_IP}:3030"
    export NODE_ENV=production
    
    # 重新构建所有服务
    echo "Building user-service..."
    cd user-service && docker build -t emaintenance-user-service:latest . && cd ..
    
    echo "Building work-order-service..."
    cd work-order-service && docker build -t emaintenance-work-order-service:latest . && cd ..
    
    echo "Building asset-service..."
    cd asset-service && docker build -t emaintenance-asset-service:latest . && cd ..
    
    echo "Building web service..."
    cd web-service && docker build \
      --build-arg NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
      -t emaintenance-web:latest . && cd ..
    
    # 重启所有服务
    docker-compose down
    docker-compose up -d
    
    echo "All services rebuilt and restarted!"
EOF
    ;;
    
  3)
    echo "Restarting all services..."
    
    ssh $SSH_USER@$SERVER_IP << 'EOF'
    cd /opt/emaintenance/deploy/Server
    docker-compose restart
    sleep 10
    docker-compose ps
EOF
    ;;
    
  4)
    echo "Checking service health..."
    
    ssh $SSH_USER@$SERVER_IP << 'EOF'
    echo "Container Status:"
    cd /opt/emaintenance/deploy/Server
    docker-compose ps
    
    echo -e "\nAPI Health Checks:"
    curl -f http://localhost:3001/health && echo " - User Service: OK" || echo " - User Service: FAILED"
    curl -f http://localhost:3002/health && echo " - Work Order Service: OK" || echo " - Work Order Service: FAILED"
    curl -f http://localhost:3003/health && echo " - Asset Service: OK" || echo " - Asset Service: FAILED"
    
    echo -e "\nWeb Service:"
    curl -f http://localhost:3000 > /dev/null 2>&1 && echo " - Web Service: OK" || echo " - Web Service: FAILED"
    
    echo -e "\nNginx Proxy:"
    curl -f http://localhost:3030/api/health > /dev/null 2>&1 && echo " - Nginx Proxy: OK" || echo " - Nginx Proxy: FAILED"
EOF
    ;;
    
  5)
    echo "Which service logs do you want to view?"
    echo "1. All services"
    echo "2. User service"
    echo "3. Work order service"
    echo "4. Asset service"
    echo "5. Web service"
    echo "6. Nginx"
    read -p "Enter your choice: " log_choice
    
    case $log_choice in
      1)
        ssh $SSH_USER@$SERVER_IP "cd /opt/emaintenance/deploy/Server && docker-compose logs --tail=50"
        ;;
      2)
        ssh $SSH_USER@$SERVER_IP "cd /opt/emaintenance/deploy/Server && docker-compose logs --tail=50 emaintenance-user-service"
        ;;
      3)
        ssh $SSH_USER@$SERVER_IP "cd /opt/emaintenance/deploy/Server && docker-compose logs --tail=50 emaintenance-work-order-service"
        ;;
      4)
        ssh $SSH_USER@$SERVER_IP "cd /opt/emaintenance/deploy/Server && docker-compose logs --tail=50 emaintenance-asset-service"
        ;;
      5)
        ssh $SSH_USER@$SERVER_IP "cd /opt/emaintenance/deploy/Server && docker-compose logs --tail=50 emaintenance-web"
        ;;
      6)
        ssh $SSH_USER@$SERVER_IP "cd /opt/emaintenance/deploy/Server && docker-compose logs --tail=50 emaintenance-nginx"
        ;;
    esac
    ;;
    
  Q|q)
    echo "Exiting..."
    exit 0
    ;;
    
  *)
    echo "Invalid choice!"
    exit 1
    ;;
esac

echo ""
echo "Operation completed!"