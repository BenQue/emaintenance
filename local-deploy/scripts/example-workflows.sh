#!/bin/bash

# Example Workflows for Local Build & Remote Deploy System
# This script demonstrates common deployment workflows

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[EXAMPLE]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

show_help() {
    cat << EOF
Example Workflows for E-Maintenance Deployment

Usage: $0 [WORKFLOW] [OPTIONS]

WORKFLOWS:
    dev-to-local        Complete development to local testing workflow
    local-to-staging    Local testing to staging deployment workflow
    staging-to-prod     Staging to production deployment workflow
    hotfix              Emergency hotfix deployment workflow
    rollback            Production rollback workflow
    multi-env           Deploy to multiple environments
    ci-integration      CI/CD integration examples

OPTIONS:
    -h, --help          Show this help message
    --dry-run           Show commands without executing
    --interactive       Prompt for confirmations
    --server HOST       Target server (required for remote workflows)
    --user USER         SSH user (default: deploy)
    --tag TAG           Custom image tag

EXAMPLES:
    $0 dev-to-local                     # Full development workflow
    $0 local-to-staging --server staging.example.com
    $0 hotfix --server prod.example.com --tag hotfix-v1.0.1
    $0 rollback --server prod.example.com

EOF
}

# Parse arguments
WORKFLOW=""
DRY_RUN=false
INTERACTIVE=false
SERVER=""
USER="deploy"
TAG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        dev-to-local|local-to-staging|staging-to-prod|hotfix|rollback|multi-env|ci-integration)
            WORKFLOW="$1"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --interactive)
            INTERACTIVE=true
            shift
            ;;
        --server)
            SERVER="$2"
            shift 2
            ;;
        --user)
            USER="$2"
            shift 2
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

if [[ -z "$WORKFLOW" ]]; then
    show_help
    exit 0
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Execute command with dry-run support
execute() {
    local cmd="$1"
    local description="$2"
    
    if [[ -n "$description" ]]; then
        log "$description"
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "  [DRY RUN] $cmd"
    else
        if [[ "$INTERACTIVE" == "true" ]]; then
            echo -n "Execute: $cmd? (y/N): "
            read -r response
            if [[ ! "$response" =~ ^[Yy]$ ]]; then
                log "Skipped: $cmd"
                return 0
            fi
        fi
        eval "$cmd"
    fi
}

# Confirm action
confirm() {
    local message="$1"
    if [[ "$INTERACTIVE" == "true" ]] || [[ "$WORKFLOW" =~ (hotfix|rollback|staging-to-prod) ]]; then
        echo -n "$message (y/N): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log "Operation cancelled"
            exit 0
        fi
    fi
}

# Development to Local Testing Workflow
workflow_dev_to_local() {
    log "=== Development to Local Testing Workflow ==="
    
    # Auto-generate tag if not provided
    if [[ -z "$TAG" ]]; then
        TAG="dev_$(date +%Y%m%d_%H%M%S)_$(git rev-parse --short HEAD)"
    fi
    
    log "Using tag: $TAG"
    
    # Step 1: Quality checks
    execute "cd $SCRIPT_DIR/../.. && npm run lint" "Running code quality checks"
    execute "cd $SCRIPT_DIR/../.. && npm run test" "Running unit tests"
    
    # Step 2: Build images
    execute "$SCRIPT_DIR/build-images.sh --tag $TAG --parallel" "Building Docker images"
    
    # Step 3: Start local environment
    execute "$SCRIPT_DIR/local-deploy.sh down" "Stopping existing local environment"
    execute "sleep 5" "Waiting for cleanup"
    execute "$SCRIPT_DIR/local-deploy.sh up --build" "Starting local testing environment"
    
    # Step 4: Health checks
    execute "sleep 30" "Waiting for services to initialize"
    execute "$SCRIPT_DIR/local-deploy.sh test" "Running health checks"
    
    # Step 5: Show access information
    log "Local testing environment ready!"
    log "Access URLs:"
    log "  Web Application: http://localhost:4000"
    log "  Nginx Proxy: http://localhost:4030"
    log "  API Services: http://localhost:4001-4003"
    
    success "Development to local testing workflow completed"
}

# Local to Staging Deployment Workflow
workflow_local_to_staging() {
    if [[ -z "$SERVER" ]]; then
        error "Staging server required (--server)"
        exit 1
    fi
    
    log "=== Local to Staging Deployment Workflow ==="
    log "Target server: $SERVER"
    
    # Auto-generate tag if not provided
    if [[ -z "$TAG" ]]; then
        TAG="staging_$(date +%Y%m%d_%H%M%S)_$(git rev-parse --short HEAD)"
    fi
    
    confirm "Deploy to staging server $SERVER with tag $TAG?"
    
    # Step 1: Verify local tests pass
    execute "$SCRIPT_DIR/local-deploy.sh test" "Verifying local environment health"
    
    # Step 2: Build production-ready images
    execute "$SCRIPT_DIR/build-images.sh --tag $TAG" "Building staging images"
    
    # Step 3: Deploy to staging
    execute "$SCRIPT_DIR/remote-deploy.sh deploy --server $SERVER --user $USER --tag $TAG --env staging --backup" "Deploying to staging"
    
    # Step 4: Verify staging deployment
    execute "sleep 30" "Waiting for staging deployment"
    execute "$SCRIPT_DIR/remote-deploy.sh health --server $SERVER --user $USER" "Running staging health checks"
    
    # Step 5: Show staging information
    log "Staging deployment completed!"
    log "Staging URL: http://$SERVER"
    log "Tag deployed: $TAG"
    
    success "Local to staging deployment workflow completed"
}

# Staging to Production Deployment Workflow
workflow_staging_to_prod() {
    if [[ -z "$SERVER" ]]; then
        error "Production server required (--server)"
        exit 1
    fi
    
    log "=== Staging to Production Deployment Workflow ==="
    log "Target server: $SERVER"
    
    # Use existing tag or auto-generate
    if [[ -z "$TAG" ]]; then
        TAG="prod_$(date +%Y%m%d_%H%M%S)_$(git rev-parse --short HEAD)"
        warning "No tag specified, using: $TAG"
    fi
    
    confirm "Deploy to PRODUCTION server $SERVER with tag $TAG? This is a production deployment!"
    
    # Step 1: Create backup
    execute "$SCRIPT_DIR/remote-deploy.sh backup --server $SERVER --user $USER" "Creating production backup"
    
    # Step 2: Build production images
    execute "$SCRIPT_DIR/build-images.sh --tag $TAG --clean" "Building production images"
    
    # Step 3: Deploy to production
    execute "$SCRIPT_DIR/remote-deploy.sh deploy --server $SERVER --user $USER --tag $TAG --env production --backup" "Deploying to production"
    
    # Step 4: Verify production deployment
    execute "sleep 60" "Waiting for production deployment"
    execute "$SCRIPT_DIR/remote-deploy.sh health --server $SERVER --user $USER" "Running production health checks"
    
    # Step 5: Show production information
    log "Production deployment completed!"
    log "Production URL: http://$SERVER"
    log "Tag deployed: $TAG"
    log "Backup available for rollback if needed"
    
    success "Staging to production deployment workflow completed"
}

# Emergency Hotfix Workflow
workflow_hotfix() {
    if [[ -z "$SERVER" ]]; then
        error "Production server required (--server)"
        exit 1
    fi
    
    log "=== Emergency Hotfix Deployment Workflow ==="
    log "Target server: $SERVER"
    
    # Use provided tag or auto-generate hotfix tag
    if [[ -z "$TAG" ]]; then
        TAG="hotfix_$(date +%Y%m%d_%H%M%S)_$(git rev-parse --short HEAD)"
    fi
    
    confirm "Deploy EMERGENCY HOTFIX to production server $SERVER with tag $TAG?"
    
    # Step 1: Quick validation
    execute "cd $SCRIPT_DIR/../.. && npm run lint -- --quiet" "Running quick code validation"
    
    # Step 2: Fast build
    execute "$SCRIPT_DIR/build-images.sh --tag $TAG --parallel" "Building hotfix images"
    
    # Step 3: Quick local test
    execute "$SCRIPT_DIR/local-deploy.sh up --build" "Starting quick local test"
    execute "sleep 20" "Minimal wait for critical services"
    execute "curl -f http://localhost:4000/api/health || echo 'Local test warning'" "Quick health check"
    
    # Step 4: Emergency deployment
    execute "$SCRIPT_DIR/remote-deploy.sh deploy --server $SERVER --user $USER --tag $TAG --env production --backup --force" "Deploying emergency hotfix"
    
    # Step 5: Immediate verification
    execute "sleep 30" "Waiting for hotfix deployment"
    execute "$SCRIPT_DIR/remote-deploy.sh health --server $SERVER --user $USER" "Running critical health checks"
    
    log "Emergency hotfix deployment completed!"
    log "Monitor the application closely for the next 30 minutes"
    log "Rollback command: $SCRIPT_DIR/remote-deploy.sh rollback --server $SERVER --user $USER --force"
    
    success "Emergency hotfix workflow completed"
}

# Production Rollback Workflow
workflow_rollback() {
    if [[ -z "$SERVER" ]]; then
        error "Production server required (--server)"
        exit 1
    fi
    
    log "=== Production Rollback Workflow ==="
    log "Target server: $SERVER"
    
    confirm "Rollback production deployment on server $SERVER? This will restore the previous version!"
    
    # Step 1: Check current status
    execute "$SCRIPT_DIR/remote-deploy.sh status --server $SERVER --user $USER" "Checking current deployment status"
    
    # Step 2: Execute rollback
    execute "$SCRIPT_DIR/remote-deploy.sh rollback --server $SERVER --user $USER --force" "Executing production rollback"
    
    # Step 3: Verify rollback
    execute "sleep 30" "Waiting for rollback completion"
    execute "$SCRIPT_DIR/remote-deploy.sh health --server $SERVER --user $USER" "Verifying rollback health"
    
    log "Production rollback completed!"
    log "Previous version has been restored"
    log "Monitor the application to ensure stability"
    
    success "Production rollback workflow completed"
}

# Multi-Environment Deployment Workflow
workflow_multi_env() {
    log "=== Multi-Environment Deployment Workflow ==="
    
    # Define environments (modify as needed)
    local environments=("staging.example.com" "prod.example.com")
    
    if [[ -z "$TAG" ]]; then
        TAG="multi_$(date +%Y%m%d_%H%M%S)_$(git rev-parse --short HEAD)"
    fi
    
    confirm "Deploy to multiple environments with tag $TAG?"
    
    # Step 1: Build once
    execute "$SCRIPT_DIR/build-images.sh --tag $TAG --parallel" "Building images for multi-environment deployment"
    
    # Step 2: Deploy to each environment
    for env_server in "${environments[@]}"; do
        log "Deploying to environment: $env_server"
        
        # Determine environment name from server
        local env_name="production"
        if [[ "$env_server" =~ staging ]]; then
            env_name="staging"
        fi
        
        execute "$SCRIPT_DIR/remote-deploy.sh deploy --server $env_server --user $USER --tag $TAG --env $env_name --backup" "Deploying to $env_server"
        execute "sleep 15" "Brief wait between deployments"
    done
    
    # Step 3: Verify all environments
    for env_server in "${environments[@]}"; do
        execute "$SCRIPT_DIR/remote-deploy.sh health --server $env_server --user $USER" "Health check for $env_server"
    done
    
    log "Multi-environment deployment completed!"
    log "Deployed tag: $TAG"
    log "Environments: ${environments[*]}"
    
    success "Multi-environment deployment workflow completed"
}

# CI/CD Integration Examples
workflow_ci_integration() {
    log "=== CI/CD Integration Examples ==="
    
    log "Example 1: GitHub Actions Integration"
    cat << 'EOF'
# .github/workflows/deploy.yml
name: Deploy E-Maintenance
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and Deploy
        env:
          SSH_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          SERVER: ${{ secrets.PRODUCTION_SERVER }}
        run: |
          echo "$SSH_KEY" > /tmp/ssh_key
          chmod 600 /tmp/ssh_key
          
          ./local-deploy/scripts/ci-cd-pipeline.sh full \
            --env production \
            --server "$SERVER" \
            --key /tmp/ssh_key \
            --tag "v$(date +%Y%m%d_%H%M%S)"
EOF
    
    echo
    log "Example 2: GitLab CI Integration"
    cat << 'EOF'
# .gitlab-ci.yml
stages:
  - build
  - test
  - deploy

build:
  stage: build
  script:
    - ./local-deploy/scripts/build-images.sh --tag $CI_COMMIT_SHA
  artifacts:
    paths:
      - local-deploy/transfer/

test:
  stage: test
  script:
    - ./local-deploy/scripts/local-deploy.sh up --build
    - ./local-deploy/scripts/local-deploy.sh test

deploy:
  stage: deploy
  script:
    - ./local-deploy/scripts/remote-deploy.sh deploy \
        --server $PRODUCTION_SERVER \
        --user $DEPLOY_USER \
        --tag $CI_COMMIT_SHA
  only:
    - main
EOF
    
    echo
    log "Example 3: Jenkins Pipeline"
    cat << 'EOF'
// Jenkinsfile
pipeline {
    agent any
    
    stages {
        stage('Build') {
            steps {
                sh './local-deploy/scripts/build-images.sh --tag ${BUILD_NUMBER}'
            }
        }
        
        stage('Test') {
            steps {
                sh './local-deploy/scripts/ci-cd-pipeline.sh test'
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([sshUserPrivateKey(credentialsId: 'deploy-key', keyFileVariable: 'SSH_KEY')]) {
                    sh '''
                        ./local-deploy/scripts/remote-deploy.sh deploy \
                            --server $PRODUCTION_SERVER \
                            --key $SSH_KEY \
                            --tag ${BUILD_NUMBER}
                    '''
                }
            }
        }
    }
}
EOF
    
    echo
    log "Example 4: Full Pipeline Script"
    execute "cat > /tmp/ci-example.sh << 'EOF'
#!/bin/bash
# Complete CI/CD pipeline example

set -e

# Configuration
TAG=\"ci_\$(date +%Y%m%d_%H%M%S)_\$(git rev-parse --short HEAD)\"
STAGING_SERVER=\"staging.example.com\"
PROD_SERVER=\"prod.example.com\"

# Build and test
./local-deploy/scripts/ci-cd-pipeline.sh build --tag \$TAG
./local-deploy/scripts/ci-cd-pipeline.sh test

# Deploy to staging
./local-deploy/scripts/remote-deploy.sh deploy \\
    --server \$STAGING_SERVER \\
    --tag \$TAG \\
    --env staging

# Wait for manual approval
echo 'Staging deployment complete. Approve production deployment? (y/N):'
read -r response
if [[ \$response =~ ^[Yy]$ ]]; then
    # Deploy to production
    ./local-deploy/scripts/remote-deploy.sh deploy \\
        --server \$PROD_SERVER \\
        --tag \$TAG \\
        --env production \\
        --backup
fi
EOF" "Creating complete pipeline example"
    
    log "Example pipeline script created at /tmp/ci-example.sh"
    
    success "CI/CD integration examples completed"
}

# Main execution
case $WORKFLOW in
    "dev-to-local")
        workflow_dev_to_local
        ;;
    "local-to-staging")
        workflow_local_to_staging
        ;;
    "staging-to-prod")
        workflow_staging_to_prod
        ;;
    "hotfix")
        workflow_hotfix
        ;;
    "rollback")
        workflow_rollback
        ;;
    "multi-env")
        workflow_multi_env
        ;;
    "ci-integration")
        workflow_ci_integration
        ;;
    *)
        error "Unknown workflow: $WORKFLOW"
        show_help
        exit 1
        ;;
esac