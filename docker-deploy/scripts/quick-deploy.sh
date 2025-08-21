#!/bin/bash

# Quick deployment script for E-Maintenance System
# Simplified version for rapid deployment

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting E-Maintenance Quick Deployment...${NC}"

# Check if .env exists
if [ ! -f "../.env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please copy .env.template to .env and configure it first"
    exit 1
fi

# Pull latest changes (optional)
# git pull origin main

# Build and start services
echo "Building Docker images..."
docker-compose -f ../docker-compose.yml build

echo "Starting services..."
docker-compose -f ../docker-compose.yml up -d

# Wait for services
echo "Waiting for services to start..."
sleep 30

# Check health
echo "Checking service health..."
docker-compose -f ../docker-compose.yml ps

echo -e "${GREEN}Deployment complete!${NC}"
echo "Access the application at http://localhost"
echo "View logs: docker-compose -f ../docker-compose.yml logs -f"