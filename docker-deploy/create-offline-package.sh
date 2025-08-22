#!/bin/bash

# Create Offline Deployment Package
# Build all images locally and create transfer package

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Creating Offline Deployment Package${NC}"
echo -e "${BLUE}========================================${NC}"

# Build all images locally
echo -e "${GREEN}[1/4] Building Docker images locally...${NC}"
docker-compose -f docker-compose.production.yml build

# Pull base images
echo -e "${GREEN}[2/4] Pulling base images...${NC}"
docker pull postgres:16-alpine
docker pull redis:7-alpine  
docker pull nginx:alpine

# Export all images
echo -e "${GREEN}[3/4] Exporting images to archive...${NC}"
docker save \
  docker-deploy-user-service:latest \
  docker-deploy-work-order-service:latest \
  docker-deploy-asset-service:latest \
  docker-deploy-web:latest \
  docker-deploy-migrations:latest \
  postgres:16-alpine \
  redis:7-alpine \
  nginx:alpine \
  | gzip > emaintenance-offline-$(date +%Y%m%d).tar.gz

# Create deployment package
echo -e "${GREEN}[4/4] Creating deployment package...${NC}"
mkdir -p offline-package
cp emaintenance-offline-*.tar.gz offline-package/emaintenance-images.tar.gz
cp offline-deploy.sh offline-package/
cp docker-compose.production.yml offline-package/
cp -r database/ offline-package/ 2>/dev/null || true

# Create README
cat > offline-package/README.md << 'EOF'
# E-Maintenance Offline Deployment

## Quick Start

1. Transfer this entire folder to your server
2. Run: `./offline-deploy.sh`

## Files Included

- `emaintenance-images.tar.gz` - All Docker images
- `offline-deploy.sh` - Deployment script  
- `docker-compose.production.yml` - Service configuration
- `database/` - Database initialization scripts

## Requirements

- Docker and Docker Compose installed
- At least 4GB free disk space
- Ports 3030, 5433, 6379 available
EOF

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Package Created Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Package location: $(pwd)/offline-package/"
echo "Package size: $(du -sh offline-package/ | cut -f1)"
echo ""
echo "To deploy:"
echo "1. scp -r offline-package/ root@server:/opt/emaintenance/"
echo "2. ssh root@server 'cd /opt/emaintenance/offline-package && ./offline-deploy.sh'"