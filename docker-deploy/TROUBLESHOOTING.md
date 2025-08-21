# E-Maintenance Docker Deployment Troubleshooting Guide

## Fixed Issues Summary

### 1. Database Authentication Issues ✅
**Problem**: Database password not being properly set from environment variables
**Solution**: 
- Created proper `.env.production` file with correct credentials
- Fixed environment variable passing in docker-compose.yml
- Added database initialization container for proper schema setup

### 2. Prisma Client Generation Issues ✅
**Problem**: Prisma client not being generated in Docker containers
**Solution**:
- Created new multi-stage Dockerfile with dedicated Prisma generation stage
- Added proper copying of Prisma schema and client
- Implemented database initialization container that runs migrations

### 3. Port Configuration Issues ✅
**Problem**: Port 80 conflicts with system services
**Solution**:
- Changed web application port from 80 to 3030
- Updated all service ports to 303x range
- Fixed Nginx configuration with proper port mappings

### 4. Nginx Configuration Issues ✅
**Problem**: Nginx failing to start and proxy requests
**Solution**:
- Fixed upstream server definitions
- Added proper health checks
- Implemented CORS headers for API services
- Added connection and rate limiting

## Quick Deployment Commands

```bash
# 1. Make deployment script executable
chmod +x deploy-fixed.sh

# 2. Load environment variables
source .env.production

# 3. Run the fixed deployment
./deploy-fixed.sh

# 4. Check service status
docker-compose -f docker-compose.fixed.yml ps

# 5. View logs
docker-compose -f docker-compose.fixed.yml logs -f
```

## Service Access URLs

After successful deployment, access services at:

- **Web Application**: http://10.163.144.13:3030
- **User Service API**: http://10.163.144.13:3031
- **Work Order Service API**: http://10.163.144.13:3032
- **Asset Service API**: http://10.163.144.13:3033

## Common Issues and Solutions

### Issue 1: Cannot Login After Deployment

**Symptoms**:
- Login page loads but authentication fails
- "Invalid credentials" error

**Solution**:
```bash
# Check if database is initialized
docker exec emaintenance-postgres psql -U postgres -d emaintenance -c "\dt"

# If no tables, run initialization
docker-compose -f docker-compose.fixed.yml up db-init

# Check for admin user
docker exec emaintenance-postgres psql -U postgres -d emaintenance -c "SELECT email FROM \"User\" WHERE role='ADMIN'"

# If no admin, seed the database
docker exec emaintenance-user-service npm run db:seed
```

### Issue 2: Services Not Starting

**Symptoms**:
- Containers exit immediately
- Health checks failing

**Solution**:
```bash
# Check individual service logs
docker-compose -f docker-compose.fixed.yml logs user-service
docker-compose -f docker-compose.fixed.yml logs work-order-service
docker-compose -f docker-compose.fixed.yml logs asset-service

# Rebuild with no cache
docker-compose -f docker-compose.fixed.yml build --no-cache

# Start services one by one
docker-compose -f docker-compose.fixed.yml up -d postgres redis
docker-compose -f docker-compose.fixed.yml up db-init
docker-compose -f docker-compose.fixed.yml up -d user-service
docker-compose -f docker-compose.fixed.yml up -d work-order-service asset-service
docker-compose -f docker-compose.fixed.yml up -d web nginx
```

### Issue 3: Port Already in Use

**Symptoms**:
- Error: bind: address already in use

**Solution**:
```bash
# Find process using the port
sudo lsof -i :3030
sudo lsof -i :5432

# Kill the process
sudo kill -9 <PID>

# Or change ports in .env.production
HTTP_PORT=3040  # Change to available port
```

### Issue 4: Database Connection Failed

**Symptoms**:
- Services can't connect to PostgreSQL
- Connection refused errors

**Solution**:
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
docker exec emaintenance-postgres pg_isready -U postgres

# Check PostgreSQL logs
docker logs emaintenance-postgres

# Verify environment variables
docker exec emaintenance-user-service env | grep DATABASE_URL

# Test connection from service
docker exec emaintenance-user-service sh -c 'apt-get update && apt-get install -y postgresql-client && pg_isready -h postgres -U postgres'
```

### Issue 5: Nginx 502 Bad Gateway

**Symptoms**:
- Web application returns 502 error
- API calls fail

**Solution**:
```bash
# Check Nginx configuration
docker exec emaintenance-nginx nginx -t

# Check upstream services
docker exec emaintenance-nginx curl http://web:3000
docker exec emaintenance-nginx curl http://user-service:3001/health

# Restart Nginx
docker-compose -f docker-compose.fixed.yml restart nginx

# Check Nginx logs
docker logs emaintenance-nginx
```

## Debugging Commands

### View All Logs
```bash
# All services
docker-compose -f docker-compose.fixed.yml logs

# Specific service
docker-compose -f docker-compose.fixed.yml logs user-service

# Follow logs
docker-compose -f docker-compose.fixed.yml logs -f

# Last 100 lines
docker-compose -f docker-compose.fixed.yml logs --tail=100
```

### Container Shell Access
```bash
# Access PostgreSQL
docker exec -it emaintenance-postgres psql -U postgres -d emaintenance

# Access service shell
docker exec -it emaintenance-user-service sh

# Access Nginx
docker exec -it emaintenance-nginx sh
```

### Database Operations
```bash
# List tables
docker exec emaintenance-postgres psql -U postgres -d emaintenance -c "\dt"

# Count users
docker exec emaintenance-postgres psql -U postgres -d emaintenance -c "SELECT COUNT(*) FROM \"User\""

# Reset database
docker-compose -f docker-compose.fixed.yml down -v
docker-compose -f docker-compose.fixed.yml up -d postgres
docker-compose -f docker-compose.fixed.yml up db-init
```

### Network Debugging
```bash
# List networks
docker network ls

# Inspect network
docker network inspect emaintenance_emaintenance-network

# Test connectivity between containers
docker exec emaintenance-user-service ping postgres
docker exec emaintenance-nginx ping web
```

## Clean Restart Procedure

If all else fails, perform a clean restart:

```bash
# 1. Stop all services
docker-compose -f docker-compose.fixed.yml down

# 2. Remove volumes (WARNING: This deletes all data!)
docker-compose -f docker-compose.fixed.yml down -v

# 3. Remove all emaintenance images
docker images | grep emaintenance | awk '{print $3}' | xargs docker rmi -f

# 4. Clean Docker system
docker system prune -f

# 5. Rebuild and start
./deploy-fixed.sh
```

## Environment Variables Reference

Key environment variables in `.env.production`:

```bash
# Database
DB_NAME=emaintenance
DB_USER=postgres
DB_PASSWORD=Emaint2024Prod!

# JWT
JWT_SECRET=<secure-random-string>

# Redis
REDIS_PASSWORD=Emaint2024Redis!

# Ports (Changed from defaults)
HTTP_PORT=3030  # Was 80

# API URLs (Updated for new ports)
NEXT_PUBLIC_API_URL=http://10.163.144.13:3030
NEXT_PUBLIC_USER_SERVICE_URL=http://10.163.144.13:3031
NEXT_PUBLIC_WORK_ORDER_SERVICE_URL=http://10.163.144.13:3032
NEXT_PUBLIC_ASSET_SERVICE_URL=http://10.163.144.13:3033
```

## Performance Optimization

### Resource Limits
Current limits in docker-compose.fixed.yml:
- PostgreSQL: 1GB RAM, 1 CPU
- Redis: 512MB RAM, 0.5 CPU
- API Services: 512MB RAM each, 0.5 CPU each
- Web: 1GB RAM, 0.5 CPU
- Nginx: 128MB RAM, 0.25 CPU

Adjust based on available resources.

### Monitoring
```bash
# Resource usage
docker stats

# Container health
docker ps --format "table {{.Names}}\t{{.Status}}"

# Disk usage
docker system df
```

## Support Information

- **Deployment Script**: deploy-fixed.sh
- **Docker Compose**: docker-compose.fixed.yml
- **Environment File**: .env.production
- **Nginx Config**: nginx/nginx.fixed.conf
- **API Dockerfile**: dockerfiles/Dockerfile.api.fixed
- **Web Dockerfile**: dockerfiles/Dockerfile.web.fixed

For additional support, check:
1. Service logs in `./logs/` directory
2. Deployment log in `/opt/emaintenance/logs/`
3. Docker daemon logs: `journalctl -u docker.service`