#!/bin/bash

# E-Maintenance Quick Update Script (Developer Version)
# =====================================================
# Fast update for development/testing environments
# Version: 1.0
# Date: 2025-01-21

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   E-Maintenance Quick Update${NC}"
echo -e "${BLUE}========================================${NC}"

# Configuration
SERVER_IP="${1:-}"
SERVER_USER="${2:-root}"
SERVER_PATH="/opt/emaintenance"

if [ -z "$SERVER_IP" ]; then
    echo "Usage: ./quick-update.sh <server-ip> [username]"
    echo "Example: ./quick-update.sh 192.168.1.100 admin"
    exit 1
fi

echo -e "${GREEN}[1/5] Building images locally...${NC}"
docker-compose -f docker-compose.production.yml build

echo -e "${GREEN}[2/5] Saving images...${NC}"
docker save \
    emaintenance-web:latest \
    emaintenance-user-service:latest \
    emaintenance-work-order-service:latest \
    emaintenance-asset-service:latest \
    | gzip > /tmp/emaintenance-update.tar.gz

echo -e "${GREEN}[3/5] Uploading to server...${NC}"
scp /tmp/emaintenance-update.tar.gz ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/

echo -e "${GREEN}[4/5] Deploying on server...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/emaintenance
echo "Loading new images..."
docker load < emaintenance-update.tar.gz

echo "Updating services..."
cd docker-deploy
docker-compose -f docker-compose.production.yml up -d --no-deps \
    web user-service work-order-service asset-service

echo "Cleaning up..."
rm ../emaintenance-update.tar.gz

echo "Checking service health..."
sleep 5
docker ps --format "table {{.Names}}\t{{.Status}}"
ENDSSH

echo -e "${GREEN}[5/5] Verifying deployment...${NC}"
curl -s http://${SERVER_IP}:3031/health > /dev/null && echo "✓ User Service: OK" || echo "✗ User Service: Failed"
curl -s http://${SERVER_IP}:3032/health > /dev/null && echo "✓ Work Order Service: OK" || echo "✗ Work Order Service: Failed"
curl -s http://${SERVER_IP}:3033/health > /dev/null && echo "✓ Asset Service: OK" || echo "✗ Asset Service: Failed"
curl -s http://${SERVER_IP}:3030 > /dev/null && echo "✓ Web Application: OK" || echo "✗ Web Application: Failed"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Update Completed Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Access your application at: ${BLUE}http://${SERVER_IP}:3030${NC}"