# Gitea CI/CD Setup Guide for E-Maintenance System

## Table of Contents
- [1. Initial Repository Setup](#1-initial-repository-setup)
- [2. Branching Strategy](#2-branching-strategy)
- [3. Repository Structure](#3-repository-structure)
- [4. Secrets Management](#4-secrets-management)
- [5. Deployment Workflow](#5-deployment-workflow)

## 1. Initial Repository Setup

### 1.1 Prerequisites
- Gitea server (version 1.19+ recommended for Actions support)
- Git client configured with Gitea access
- SSH key added to Gitea account

### 1.2 Create Repository in Gitea

```bash
# Navigate to your project directory
cd /path/to/Emaintenance

# Initialize git if not already done
git init

# Add Gitea remote (replace with your Gitea URL)
git remote add origin git@gitea.yourdomain.com:your-org/emaintenance.git

# Create and configure .gitattributes for LFS (large files)
cat > .gitattributes << 'EOF'
*.jpg filter=lfs diff=lfs merge=lfs -text
*.jpeg filter=lfs diff=lfs merge=lfs -text
*.png filter=lfs diff=lfs merge=lfs -text
*.gif filter=lfs diff=lfs merge=lfs -text
*.pdf filter=lfs diff=lfs merge=lfs -text
*.zip filter=lfs diff=lfs merge=lfs -text
*.tar.gz filter=lfs diff=lfs merge=lfs -text
EOF

# Add all files (respecting .gitignore)
git add .

# Initial commit
git commit -m "Initial commit: E-Maintenance System

- Turborepo monorepo structure
- Next.js web application
- Flutter mobile app
- Microservices architecture (user, work-order, asset services)
- PostgreSQL + Prisma ORM
- Docker deployment configuration
- Production-ready security setup"

# Push to main branch
git push -u origin main
```

### 1.3 Configure Repository Settings in Gitea

1. **Enable Actions**: Settings → Actions → Enable Actions for this repository
2. **Set Branch Protection**:
   - Settings → Branches → Add Rule
   - Branch name: `main`
   - Enable: Require pull request reviews
   - Enable: Dismiss stale reviews
   - Enable: Require status checks (CI/CD)
3. **Configure Webhooks** (for deployment triggers):
   - Settings → Webhooks → Add Webhook
   - URL: `http://your-deployment-server:9000/deploy`
   - Events: Push events (main branch only)
   - Secret: Generate secure webhook secret

## 2. Branching Strategy

### 2.1 GitFlow Model (Recommended)

```
main (production)
├── develop (integration)
│   ├── feature/user-management
│   ├── feature/work-order-improvements
│   └── feature/mobile-qr-scanner
├── release/v1.2.0
└── hotfix/critical-security-patch
```

### 2.2 Branch Naming Conventions

- **Feature branches**: `feature/descriptive-name`
- **Bug fixes**: `bugfix/issue-description`
- **Hotfixes**: `hotfix/critical-issue`
- **Release branches**: `release/v{major}.{minor}.{patch}`

### 2.3 Branch Policies

```bash
# Create development branch
git checkout -b develop
git push -u origin develop

# Create feature branch
git checkout -b feature/new-feature develop
# ... make changes ...
git push -u origin feature/new-feature

# Merge workflow (via PR in Gitea)
# 1. Create PR from feature → develop
# 2. After testing, create PR from develop → main
# 3. Tag release after merge to main
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## 3. Repository Structure

### 3.1 Essential Files for CI/CD

```
emaintenance/
├── .gitea/
│   └── workflows/
│       ├── ci.yml              # Continuous Integration
│       ├── deploy.yml           # Deployment workflow
│       └── release.yml          # Release automation
├── gitea-deploy/
│   ├── deploy-webhook.sh        # Webhook handler script
│   ├── rollback.sh             # Rollback script
│   ├── health-check.sh         # Health monitoring
│   └── secrets/                # Encrypted secrets (gitignored)
├── docker-deploy/
│   └── ... (existing Docker configs)
└── .giteaignore                # Gitea-specific ignores
```

### 3.2 Repository Secrets Configuration

In Gitea UI: Settings → Actions → Secrets

Required secrets:
- `DEPLOY_SSH_KEY`: SSH key for deployment server
- `DEPLOY_HOST`: Deployment server hostname/IP
- `DEPLOY_USER`: Deployment server username
- `DB_PASSWORD`: Production database password
- `JWT_SECRET`: JWT signing secret
- `REDIS_PASSWORD`: Redis password
- `ADMIN_PASSWORD`: Admin user password
- `DOCKER_REGISTRY_TOKEN`: For private registry (if used)
- `WEBHOOK_SECRET`: For deployment webhook validation

## 4. Secrets Management

### 4.1 Environment File Structure

```bash
# Create secure environment template
cat > .env.gitea.template << 'EOF'
# Database Configuration
DB_NAME=emaintenance
DB_USER=postgres
DB_PASSWORD=${GITEA_SECRET_DB_PASSWORD}
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}

# Security Keys
JWT_SECRET=${GITEA_SECRET_JWT_SECRET}
REDIS_PASSWORD=${GITEA_SECRET_REDIS_PASSWORD}

# Admin Configuration
ADMIN_EMAIL=admin@emaintenance.com
ADMIN_PASSWORD=${GITEA_SECRET_ADMIN_PASSWORD}

# Deployment Configuration
DEPLOY_HOST=${GITEA_SECRET_DEPLOY_HOST}
DEPLOY_USER=${GITEA_SECRET_DEPLOY_USER}
DEPLOY_PATH=/opt/emaintenance

# Docker Registry (if using private registry)
DOCKER_REGISTRY=${GITEA_SECRET_DOCKER_REGISTRY}
DOCKER_REGISTRY_USER=${GITEA_SECRET_DOCKER_REGISTRY_USER}
DOCKER_REGISTRY_TOKEN=${GITEA_SECRET_DOCKER_REGISTRY_TOKEN}
EOF
```

### 4.2 Secrets Injection During Deployment

Secrets are injected at deployment time from Gitea Actions secrets, never stored in repository.

## 5. Deployment Workflow

### 5.1 Continuous Deployment Pipeline

1. **Code Push** → Gitea repository (main/develop branch)
2. **Gitea Actions** → Triggers CI/CD workflow
3. **Build & Test** → Run tests, build Docker images
4. **Security Scan** → Vulnerability scanning
5. **Push to Registry** → Docker images to registry
6. **Deploy Webhook** → Trigger deployment on server
7. **Health Check** → Verify deployment success
8. **Notification** → Send status to team

### 5.2 Manual Deployment Commands

```bash
# Clone from Gitea to deployment server
git clone git@gitea.yourdomain.com:your-org/emaintenance.git
cd emaintenance

# Switch to release tag
git checkout tags/v1.0.0

# Deploy using existing scripts
cd docker-deploy
./deploy-secure.sh
```

### 5.3 Rollback Strategy

```bash
# List available tags
git tag -l

# Rollback to previous version
git checkout tags/v0.9.0
cd docker-deploy
./deploy-secure.sh

# Or use dedicated rollback script
./gitea-deploy/rollback.sh v0.9.0
```

## Next Steps

1. Configure Gitea Actions runners on your deployment server
2. Set up Docker registry (Harbor, GitLab Registry, or Docker Hub)
3. Configure monitoring and alerting (Prometheus + Grafana)
4. Set up automated backups before each deployment
5. Implement blue-green deployment for zero downtime

## Security Considerations

- Never commit `.env` files or secrets to repository
- Use Gitea's built-in secrets management
- Rotate secrets regularly
- Use SSH keys for deployment, not passwords
- Enable 2FA on Gitea accounts
- Audit repository access regularly
- Use signed commits for production releases