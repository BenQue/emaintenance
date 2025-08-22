# Local Build & Remote Deploy System

A comprehensive deployment solution for the E-Maintenance system that enables local Docker image building, thorough testing, and seamless remote deployment without rebuilding on production servers.

## Overview

This deployment system follows a **"build once, deploy anywhere"** philosophy with the following workflow:

1. **Local Build**: Build all Docker images on your development machine
2. **Local Testing**: Deploy and test images locally with isolated ports
3. **Image Transfer**: Transfer images to remote servers via SSH or registry
4. **Remote Deployment**: Deploy pre-built images without rebuilding

## Key Benefits

- ✅ **Faster Deployments**: No build time on production servers
- ✅ **Consistent Images**: Same images tested locally and deployed remotely
- ✅ **Local Debugging**: Full testing capabilities on development machine
- ✅ **Reduced Server Resources**: Production servers only run, don't build
- ✅ **Better Development Workflow**: Integrated with Git hooks and CI/CD
- ✅ **Rollback Support**: Easy rollback with backup and restore capabilities

## Quick Start

### 1. Setup the Environment

```bash
# Navigate to the local-deploy directory
cd local-deploy

# Set up Git hooks (optional but recommended)
./scripts/setup-hooks.sh

# Create local directories
mkdir -p local-data local-logs local-backups
```

### 2. Build Images Locally

```bash
# Build all images with auto-generated tag
./scripts/build-images.sh

# Build specific services with custom tag
./scripts/build-images.sh --tag v1.0.0 web user-service

# Build in parallel (faster but uses more resources)
./scripts/build-images.sh --parallel --clean

# Build and save as tar files for transfer
./scripts/build-images.sh --save-dir ./images
```

### 3. Test Locally

```bash
# Start local testing environment (ports 4000-4003)
./scripts/local-deploy.sh up --build

# Check status
./scripts/local-deploy.sh status

# View logs
./scripts/local-deploy.sh logs --service web-local

# Run health checks
./scripts/local-deploy.sh test

# Stop local environment
./scripts/local-deploy.sh down
```

### 4. Deploy to Remote Server

```bash
# Deploy with SSH transfer
./scripts/remote-deploy.sh deploy \
  --server production.example.com \
  --user deploy \
  --tag v1.0.0 \
  --backup

# Deploy with registry transfer
./scripts/remote-deploy.sh deploy \
  --server production.example.com \
  --registry registry.example.com \
  --tag v1.0.0

# Check remote deployment status
./scripts/remote-deploy.sh status --server production.example.com

# View remote logs
./scripts/remote-deploy.sh logs --server production.example.com
```

### 5. Full CI/CD Pipeline

```bash
# Run complete pipeline (build -> test -> deploy)
./scripts/ci-cd-pipeline.sh full \
  --env production \
  --server production.example.com \
  --tag v1.0.0

# Build and test only
./scripts/ci-cd-pipeline.sh build && \
./scripts/ci-cd-pipeline.sh test

# Deploy to staging
./scripts/ci-cd-pipeline.sh deploy \
  --env staging \
  --server staging.example.com
```

## Directory Structure

```
local-deploy/
├── configs/                    # Environment configurations
│   ├── .env.local             # Local testing environment
│   ├── .env.production        # Production environment
│   └── nginx/                 # Nginx configurations
│       └── nginx.local.conf   # Local testing Nginx config
├── docker-compose/            # Docker Compose files
│   └── docker-compose.local.yml  # Local testing compose
├── hooks/                      # Git hooks
│   └── pre-commit             # Pre-commit quality checks
├── scripts/                    # Main deployment scripts
│   ├── build-images.sh        # Build Docker images locally
│   ├── local-deploy.sh        # Local deployment management
│   ├── transfer-images.sh     # Image transfer utilities
│   ├── remote-deploy.sh       # Remote deployment management
│   ├── ci-cd-pipeline.sh      # Full CI/CD pipeline
│   └── setup-hooks.sh         # Git hooks setup
└── transfer/                   # Temporary transfer files
```

## Detailed Usage

### Building Images

The `build-images.sh` script provides comprehensive image building capabilities:

```bash
# Basic usage
./scripts/build-images.sh [OPTIONS] [SERVICES...]

# Options
-t, --tag TAG           Custom tag for images
-p, --push              Push to registry after building
-c, --clean             Clean build (no cache)
--registry PREFIX       Registry prefix
--parallel              Build images in parallel
--save-dir DIR          Directory to save images as tar files

# Examples
./scripts/build-images.sh --tag v1.2.3 --clean
./scripts/build-images.sh --parallel --save-dir ./export web user-service
./scripts/build-images.sh --push --registry my-registry.com
```

### Local Testing

The `local-deploy.sh` script manages local testing environments:

```bash
# Commands
up              Start all local services
down            Stop all local services
restart         Restart all local services
logs            Show logs for all or specific service
status          Show status of all services
clean           Clean up local environment
reset           Full reset (clean + rebuild)
shell           Open shell in running container
db              Database management commands
test            Run health checks and tests

# Database commands
./scripts/local-deploy.sh db migrate   # Run migrations
./scripts/local-deploy.sh db seed      # Seed with test data
./scripts/local-deploy.sh db reset     # Reset database
./scripts/local-deploy.sh db backup    # Create backup
```

### Image Transfer

The `transfer-images.sh` script handles multiple transfer methods:

```bash
# Commands
save        Save images to tar files
load        Load images from tar files
push        Push images to registry
pull        Pull images from registry
transfer    Transfer images to remote server via SSH
sync        Sync images to remote server (auto-detect method)

# Transfer methods
ssh         Transfer via SSH/SCP (save/load tar files)
registry    Transfer via Docker registry (push/pull)
auto        Auto-detect best method

# Examples
./scripts/transfer-images.sh save --tag v1.0.0 --compress
./scripts/transfer-images.sh transfer --server prod.com --user deploy
./scripts/transfer-images.sh sync --server prod.com --registry my-registry.com
```

### Remote Deployment

The `remote-deploy.sh` script manages remote deployments:

```bash
# Commands
deploy      Deploy images to remote server
rollback    Rollback to previous deployment
status      Check deployment status
logs        Show logs from remote deployment
stop        Stop remote deployment
restart     Restart remote deployment
health      Run health checks on remote deployment
backup      Create backup before deployment

# Examples
./scripts/remote-deploy.sh deploy --server prod.com --tag v1.0.0 --backup
./scripts/remote-deploy.sh rollback --server prod.com --force
./scripts/remote-deploy.sh health --server prod.com
```

### CI/CD Pipeline

The `ci-cd-pipeline.sh` script provides automated workflows:

```bash
# Commands
full        Run full pipeline (build -> test -> deploy)
build       Build and tag images
test        Run tests and quality checks
deploy      Deploy to specified environment
validate    Validate deployment configuration
rollback    Rollback deployment
status      Check pipeline status

# Environments
local       Local testing environment (ports 4000-4003)
staging     Staging environment
production  Production environment

# Full pipeline example
./scripts/ci-cd-pipeline.sh full \
  --env production \
  --server prod.example.com \
  --user deploy \
  --tag v1.0.0 \
  --registry registry.example.com
```

## Environment Configuration

### Local Testing (.env.local)

- **Ports**: 4000-4003 (web), 5434 (postgres), 6380 (redis)
- **Database**: `emaintenance_local` with test credentials
- **Debug**: Enabled logging and relaxed security
- **Storage**: `./local-data` and `./local-logs` directories

### Production (.env.production)

- **Ports**: Standard production ports
- **Database**: Production database with secure credentials
- **Security**: Production-grade JWT secrets and rate limiting
- **Storage**: `/opt/emaintenance` directory structure
- **Monitoring**: Health checks and performance metrics

## Transfer Methods

### SSH Transfer (Recommended for Small Teams)

1. **Save**: Images saved as compressed tar files
2. **Transfer**: Files transferred via SCP
3. **Load**: Images loaded on remote server
4. **Deploy**: Services started with pre-loaded images

```bash
# Example SSH transfer workflow
./scripts/build-images.sh --save-dir ./transfer --compress
./scripts/transfer-images.sh transfer --server prod.com --user deploy
```

### Registry Transfer (Recommended for Teams)

1. **Push**: Images pushed to Docker registry
2. **Pull**: Remote server pulls from registry
3. **Deploy**: Services started with pulled images

```bash
# Example registry transfer workflow
./scripts/build-images.sh --push --registry registry.example.com
./scripts/remote-deploy.sh deploy --registry registry.example.com
```

## Git Integration

### Automated Git Hooks

The system includes Git hooks for automation:

- **pre-commit**: Quality checks, linting, secret detection
- **post-commit**: Automatic builds on significant changes
- **prepare-commit-msg**: Commit message templates
- **commit-msg**: Commit message validation

```bash
# Setup Git hooks
./scripts/setup-hooks.sh

# Manage hooks
./manage-hooks.sh enable    # Enable all hooks
./manage-hooks.sh disable   # Disable all hooks
./manage-hooks.sh status    # Show hook status
```

### Commit Message Conventions

The system supports conventional commit format:

```
feat: add user authentication system
fix: resolve database connection issue
docs: update deployment documentation
build: optimize Docker image size
```

## Troubleshooting

### Common Issues

#### 1. Port Conflicts
```bash
# Check what's using the ports
lsof -i :4000 -i :4001 -i :4002 -i :4003

# Stop conflicting services
./scripts/local-deploy.sh down

# Use different ports by modifying .env.local
```

#### 2. Docker Build Failures
```bash
# Clean build without cache
./scripts/build-images.sh --clean

# Check Docker disk space
docker system df
docker system prune

# Verify Dockerfile syntax
docker build --dry-run -f Dockerfile .
```

#### 3. SSH Connection Issues
```bash
# Test SSH connectivity
ssh -o ConnectTimeout=10 user@server "echo 'Connection test'"

# Check SSH key permissions
chmod 600 ~/.ssh/your-key
ssh-add ~/.ssh/your-key

# Use verbose SSH for debugging
ssh -vvv user@server
```

#### 4. Image Transfer Failures
```bash
# Check available disk space
df -h

# Verify image existence
./scripts/transfer-images.sh list --tag your-tag

# Clean up old transfer files
./scripts/transfer-images.sh cleanup --force
```

#### 5. Remote Deployment Issues
```bash
# Check remote Docker status
./scripts/remote-deploy.sh status --server your-server

# View remote logs
./scripts/remote-deploy.sh logs --server your-server

# Run health checks
./scripts/remote-deploy.sh health --server your-server
```

### Performance Optimization

#### Local Development
```bash
# Use parallel builds
./scripts/build-images.sh --parallel

# Enable Docker BuildKit
export DOCKER_BUILDKIT=1

# Use local cache
./scripts/build-images.sh --cache-from
```

#### Remote Deployment
```bash
# Use compression for transfers
./scripts/transfer-images.sh --compress

# Parallel operations
./scripts/ci-cd-pipeline.sh --parallel

# Registry caching
docker pull --cache-from registry.com/base-image
```

## Security Considerations

### Local Environment
- ✅ Isolated network with custom subnet
- ✅ Non-production credentials
- ✅ Debug logging enabled
- ✅ Relaxed rate limiting for testing

### Production Environment
- ✅ Strong passwords and JWT secrets
- ✅ Production rate limiting
- ✅ SSL/TLS configuration support
- ✅ Security headers in Nginx
- ✅ Backup encryption
- ✅ Secret detection in Git hooks

### Best Practices
1. **Never commit production secrets** - Use environment variables
2. **Use SSH keys** - Avoid password authentication
3. **Regular backups** - Automated database backups
4. **Monitor deployments** - Health checks and alerting
5. **Audit trails** - All deployments logged with metadata

## Advanced Features

### Automated Rollback
```bash
# Automatic rollback on health check failure
./scripts/remote-deploy.sh deploy --server prod.com --auto-rollback

# Manual rollback to specific backup
./scripts/remote-deploy.sh rollback --server prod.com --backup 20240101_120000
```

### Blue-Green Deployment
```bash
# Deploy to staging slot
./scripts/remote-deploy.sh deploy --server prod.com --slot blue

# Switch traffic after validation
./scripts/remote-deploy.sh switch --server prod.com --from blue --to green
```

### Multi-Environment Pipeline
```bash
# Deploy to multiple environments
for env in staging production; do
  ./scripts/ci-cd-pipeline.sh deploy --env $env --server ${env}.example.com
done
```

## Support and Contributing

### Getting Help
1. Check this documentation
2. Review troubleshooting section
3. Check Git issues and discussions
4. Review script help messages: `./script-name.sh --help`

### Contributing
1. Follow conventional commit format
2. Add tests for new features
3. Update documentation
4. Run quality checks: `./scripts/ci-cd-pipeline.sh test`

### Monitoring and Alerting
The system includes health check endpoints for monitoring:

- Web Application: `http://server:3000/api/health`
- User Service: `http://server:3001/health`
- Work Order Service: `http://server:3002/health`
- Asset Service: `http://server:3003/health`
- Nginx: `http://server/health`

Integrate these with your monitoring system (Prometheus, Grafana, etc.) for production deployments.

---

For detailed examples and advanced configurations, see the `examples/` directory and individual script help messages.