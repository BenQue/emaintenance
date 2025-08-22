# Quick Start Guide

Get up and running with the Local Build & Remote Deploy system in 5 minutes.

## Prerequisites

- Docker and Docker Compose installed
- Git repository cloned
- SSH access to target server (for remote deployment)

## 1. Initial Setup (One-time)

```bash
# Navigate to local-deploy directory
cd local-deploy

# Setup Git hooks (optional but recommended)
./scripts/setup-hooks.sh

# Create required directories
mkdir -p local-data local-logs local-backups transfer
```

## 2. Build Images Locally

```bash
# Build all services with auto-generated tag
./scripts/build-images.sh

# Or build with specific tag
./scripts/build-images.sh --tag v1.0.0

# Check built images
./scripts/transfer-images.sh list
```

## 3. Test Locally

```bash
# Start local testing environment
./scripts/local-deploy.sh up --build

# Check status (wait for all services to be healthy)
./scripts/local-deploy.sh status

# Access your application
open http://localhost:4000  # Web app
open http://localhost:4030  # Nginx proxy

# Run health checks
./scripts/local-deploy.sh test

# View logs if needed
./scripts/local-deploy.sh logs

# Stop when done testing
./scripts/local-deploy.sh down
```

## 4. Deploy to Remote Server

### Option A: SSH Transfer (Recommended for Small Teams)

```bash
# Deploy with automatic image transfer
./scripts/remote-deploy.sh deploy \
  --server your-server.com \
  --user deploy \
  --tag v1.0.0 \
  --backup
```

### Option B: Registry Transfer (Recommended for Teams)

```bash
# Push images to registry
./scripts/transfer-images.sh push \
  --registry your-registry.com \
  --tag v1.0.0

# Deploy from registry
./scripts/remote-deploy.sh deploy \
  --server your-server.com \
  --registry your-registry.com \
  --tag v1.0.0
```

### Option C: Full Automated Pipeline

```bash
# Complete CI/CD pipeline: build -> test -> deploy
./scripts/ci-cd-pipeline.sh full \
  --env production \
  --server your-server.com \
  --user deploy \
  --tag v1.0.0
```

## 5. Verify Deployment

```bash
# Check remote deployment status
./scripts/remote-deploy.sh status --server your-server.com

# Run health checks
./scripts/remote-deploy.sh health --server your-server.com

# View logs if needed
./scripts/remote-deploy.sh logs --server your-server.com
```

## Common Commands Reference

### Building
```bash
# Build all services
./scripts/build-images.sh

# Build specific services
./scripts/build-images.sh web user-service

# Clean build (no cache)
./scripts/build-images.sh --clean

# Parallel build (faster)
./scripts/build-images.sh --parallel
```

### Local Testing
```bash
# Start local environment
./scripts/local-deploy.sh up

# Stop local environment  
./scripts/local-deploy.sh down

# Restart services
./scripts/local-deploy.sh restart

# View logs
./scripts/local-deploy.sh logs

# Open shell in container
./scripts/local-deploy.sh shell --service web-local

# Database operations
./scripts/local-deploy.sh db migrate
./scripts/local-deploy.sh db seed
```

### Remote Deployment
```bash
# Deploy
./scripts/remote-deploy.sh deploy --server SERVER --user USER --tag TAG

# Check status
./scripts/remote-deploy.sh status --server SERVER

# Rollback
./scripts/remote-deploy.sh rollback --server SERVER

# View logs
./scripts/remote-deploy.sh logs --server SERVER
```

### Image Management
```bash
# List images
./scripts/transfer-images.sh list

# Save images to files
./scripts/transfer-images.sh save --tag TAG --compress

# Transfer via SSH
./scripts/transfer-images.sh transfer --server SERVER --user USER

# Push to registry
./scripts/transfer-images.sh push --registry REGISTRY
```

## Environment Configuration

### Local Testing Ports
- Web Application: http://localhost:4000
- Nginx Proxy: http://localhost:4030
- User Service: http://localhost:4001
- Work Order Service: http://localhost:4002
- Asset Service: http://localhost:4003
- PostgreSQL: localhost:5434
- Redis: localhost:6380

### Configuration Files
- Local: `configs/.env.local`
- Production: `configs/.env.production`
- Docker Compose: `docker-compose/docker-compose.local.yml`

## Troubleshooting Quick Fixes

### Port Conflicts
```bash
# Stop all local services
./scripts/local-deploy.sh down

# Check what's using ports
lsof -i :4000 -i :4001 -i :4002 -i :4003
```

### Build Issues
```bash
# Clean Docker cache
docker system prune -a

# Clean build
./scripts/build-images.sh --clean
```

### SSH Issues
```bash
# Test SSH connection
ssh user@server "echo 'Connection test'"

# Check SSH key
ssh-add -l
```

### Reset Everything
```bash
# Reset local environment
./scripts/local-deploy.sh clean --force

# Rebuild everything
./scripts/build-images.sh --clean
./scripts/local-deploy.sh up --build
```

## Next Steps

1. **Set up monitoring**: Configure health check endpoints
2. **Automate with CI/CD**: Use the pipeline scripts in your CI system
3. **Configure production**: Update `.env.production` with your settings
4. **Setup Git hooks**: Run `./scripts/setup-hooks.sh` for automated quality checks
5. **Read full documentation**: See `README.md` for advanced features

## Need Help?

- Check `./script-name.sh --help` for any script
- Review the full `README.md` documentation
- Check the troubleshooting section
- Review Git commit history for examples

Happy deploying! 🚀