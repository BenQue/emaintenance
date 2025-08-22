#!/bin/bash

# CI/CD Pipeline Script
# Automates the build, test, and deployment process for local-to-remote deployment

set -e

# Configuration
PROJECT_NAME="emaintenance"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

CI/CD Pipeline for E-Maintenance deployment

COMMANDS:
    full        Run full pipeline (build -> test -> deploy)
    build       Build and tag images
    test        Run tests and quality checks
    deploy      Deploy to specified environment
    validate    Validate deployment configuration
    rollback    Rollback deployment
    status      Check pipeline status

OPTIONS:
    -h, --help              Show this help message
    -e, --env ENV           Target environment (local, staging, production)
    -t, --tag TAG           Image tag (default: auto-generated)
    -s, --server HOST       Target server for deployment
    -u, --user USER         SSH user for deployment
    -k, --key PATH          SSH private key path
    --registry URL          Docker registry URL
    --skip-tests            Skip test execution
    --skip-lint             Skip linting
    --skip-build            Skip build (use existing images)
    --force                 Force deployment without confirmation
    --dry-run               Show what would be done without executing
    --parallel              Enable parallel operations

ENVIRONMENTS:
    local       Local testing environment (ports 4000-4003)
    staging     Staging environment
    production  Production environment

EXAMPLES:
    # Full pipeline to staging
    $0 full --env staging --server staging.example.com --user deploy

    # Build and test only
    $0 build && $0 test

    # Deploy specific tag to production
    $0 deploy --env production --tag v1.0.0 --server prod.example.com

    # Validate configuration
    $0 validate --env production

EOF
}

# Parse command line arguments
parse_args() {
    COMMAND=""
    ENVIRONMENT="local"
    IMAGE_TAG=""
    TARGET_SERVER=""
    SSH_USER="deploy"
    SSH_KEY=""
    REGISTRY_URL=""
    SKIP_TESTS=false
    SKIP_LINT=false
    SKIP_BUILD=false
    FORCE=false
    DRY_RUN=false
    PARALLEL=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            full|build|test|deploy|validate|rollback|status)
                COMMAND="$1"
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            -e|--env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -t|--tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            -s|--server)
                TARGET_SERVER="$2"
                shift 2
                ;;
            -u|--user)
                SSH_USER="$2"
                shift 2
                ;;
            -k|--key)
                SSH_KEY="$2"
                shift 2
                ;;
            --registry)
                REGISTRY_URL="$2"
                shift 2
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-lint)
                SKIP_LINT=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --parallel)
                PARALLEL=true
                shift
                ;;
            *)
                error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    if [[ -z "$COMMAND" ]]; then
        error "No command specified"
        show_help
        exit 1
    fi

    # Auto-generate image tag if not provided
    if [[ -z "$IMAGE_TAG" ]]; then
        local build_date=$(date '+%Y%m%d_%H%M%S')
        local git_commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
        IMAGE_TAG="${ENVIRONMENT}_${build_date}_${git_commit}"
    fi
}

# Load environment configuration
load_environment_config() {
    local env_file="$SCRIPT_DIR/../configs/.env.${ENVIRONMENT}"
    
    if [[ -f "$env_file" ]]; then
        log "Loading environment configuration: $env_file"
        # Export variables for subprocesses
        set -a
        source "$env_file"
        set +a
    else
        warning "Environment file not found: $env_file"
    fi
    
    # Set default values based on environment
    case $ENVIRONMENT in
        "local")
            if [[ -z "$TARGET_SERVER" ]]; then
                TARGET_SERVER="localhost"
            fi
            ;;
        "staging")
            if [[ -z "$TARGET_SERVER" ]]; then
                error "Target server required for staging environment"
                exit 1
            fi
            ;;
        "production")
            if [[ -z "$TARGET_SERVER" ]]; then
                error "Target server required for production environment"
                exit 1
            fi
            ;;
    esac
}

# Validate prerequisites
validate_prerequisites() {
    log "Validating prerequisites..."
    
    local missing=0
    
    # Check required tools
    local tools=("docker" "docker-compose" "git" "curl")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            error "$tool is not installed or not in PATH"
            missing=1
        fi
    done
    
    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running"
        missing=1
    fi
    
    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        error "Not in project root directory"
        missing=1
    fi
    
    # Check SSH key if provided
    if [[ -n "$SSH_KEY" ]] && [[ ! -f "$SSH_KEY" ]]; then
        error "SSH key file not found: $SSH_KEY"
        missing=1
    fi
    
    if [[ $missing -eq 1 ]]; then
        error "Prerequisites validation failed"
        exit 1
    fi
    
    success "Prerequisites validated"
}

# Run quality checks and linting
run_quality_checks() {
    if [[ "$SKIP_LINT" == "true" ]]; then
        log "Skipping quality checks"
        return 0
    fi
    
    log "Running quality checks and linting..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        log "Installing dependencies..."
        npm install
    fi
    
    # Run linting
    log "Running ESLint..."
    if ! npm run lint; then
        error "Linting failed"
        return 1
    fi
    
    # Run type checking
    log "Running TypeScript type checking..."
    if ! npm run type-check 2>/dev/null || true; then
        warning "TypeScript type checking not available or failed"
    fi
    
    # Format check (if available)
    if npm run format:check >/dev/null 2>&1; then
        log "Running format check..."
        if ! npm run format:check; then
            warning "Code formatting issues detected"
        fi
    fi
    
    success "Quality checks completed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log "Skipping tests"
        return 0
    fi
    
    log "Running test suite..."
    
    cd "$PROJECT_ROOT"
    
    # Run unit tests
    log "Running unit tests..."
    if ! npm run test; then
        error "Unit tests failed"
        return 1
    fi
    
    # Run integration tests if available
    if npm run test:integration >/dev/null 2>&1; then
        log "Running integration tests..."
        if ! npm run test:integration; then
            error "Integration tests failed"
            return 1
        fi
    fi
    
    # Generate test coverage if available
    if npm run test:coverage >/dev/null 2>&1; then
        log "Generating test coverage..."
        npm run test:coverage
    fi
    
    success "All tests passed"
}

# Build Docker images
build_images() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        log "Skipping build (using existing images)"
        return 0
    fi
    
    log "Building Docker images with tag: $IMAGE_TAG"
    
    local build_opts="--tag $IMAGE_TAG"
    
    if [[ "$PARALLEL" == "true" ]]; then
        build_opts="$build_opts --parallel"
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "[DRY RUN] Would build images with: $build_opts"
        return 0
    fi
    
    if ! "${SCRIPT_DIR}/build-images.sh" $build_opts all; then
        error "Image build failed"
        return 1
    fi
    
    success "Images built successfully"
}

# Deploy application
deploy_application() {
    log "Deploying application to $ENVIRONMENT environment"
    
    local deploy_opts="--server $TARGET_SERVER --user $SSH_USER --tag $IMAGE_TAG --env $ENVIRONMENT"
    
    if [[ -n "$SSH_KEY" ]]; then
        deploy_opts="$deploy_opts --key $SSH_KEY"
    fi
    
    if [[ -n "$REGISTRY_URL" ]]; then
        deploy_opts="$deploy_opts --registry $REGISTRY_URL"
    fi
    
    if [[ "$FORCE" == "true" ]]; then
        deploy_opts="$deploy_opts --force"
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        deploy_opts="$deploy_opts --dry-run"
    fi
    
    # Always create backup for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        deploy_opts="$deploy_opts --backup"
    fi
    
    if [[ "$ENVIRONMENT" == "local" ]]; then
        # For local deployment, use local-deploy script
        log "Starting local deployment..."
        if ! "${SCRIPT_DIR}/local-deploy.sh" up --build; then
            error "Local deployment failed"
            return 1
        fi
    else
        # For remote deployment
        if ! "${SCRIPT_DIR}/remote-deploy.sh" deploy $deploy_opts; then
            error "Remote deployment failed"
            return 1
        fi
    fi
    
    success "Deployment completed"
}

# Validate deployment configuration
validate_deployment() {
    log "Validating deployment configuration for $ENVIRONMENT"
    
    local issues=0
    
    # Check environment file
    local env_file="$SCRIPT_DIR/../configs/.env.${ENVIRONMENT}"
    if [[ ! -f "$env_file" ]]; then
        error "Environment file not found: $env_file"
        issues=$((issues + 1))
    else
        log "Environment file found: $env_file"
        
        # Check required environment variables
        local required_vars=("DB_PASSWORD" "JWT_SECRET" "REDIS_PASSWORD")
        
        for var in "${required_vars[@]}"; do
            if ! grep -q "^${var}=" "$env_file" && [[ -z "${!var}" ]]; then
                error "Required environment variable not set: $var"
                issues=$((issues + 1))
            fi
        done
    fi
    
    # Check Docker Compose file
    local compose_file=""
    case $ENVIRONMENT in
        "local")
            compose_file="$SCRIPT_DIR/../docker-compose/docker-compose.local.yml"
            ;;
        *)
            compose_file="$PROJECT_ROOT/docker-deploy/docker-compose.production.yml"
            ;;
    esac
    
    if [[ ! -f "$compose_file" ]]; then
        error "Docker Compose file not found: $compose_file"
        issues=$((issues + 1))
    else
        log "Docker Compose file found: $compose_file"
        
        # Validate Docker Compose syntax
        if ! docker-compose -f "$compose_file" config >/dev/null 2>&1; then
            error "Docker Compose file has syntax errors"
            issues=$((issues + 1))
        fi
    fi
    
    # Check target server connectivity (for remote deployments)
    if [[ "$ENVIRONMENT" != "local" ]] && [[ -n "$TARGET_SERVER" ]]; then
        log "Testing connectivity to $TARGET_SERVER..."
        
        local ssh_opts=""
        if [[ -n "$SSH_KEY" ]]; then
            ssh_opts="-i $SSH_KEY"
        fi
        
        if ! ssh $ssh_opts -o ConnectTimeout=10 "$SSH_USER@$TARGET_SERVER" "echo 'Connection test successful'" >/dev/null 2>&1; then
            error "Cannot connect to target server: $TARGET_SERVER"
            issues=$((issues + 1))
        else
            success "Target server connectivity verified"
        fi
    fi
    
    if [[ $issues -eq 0 ]]; then
        success "Deployment configuration is valid"
        return 0
    else
        error "Deployment configuration has $issues issues"
        return 1
    fi
}

# Check pipeline status
check_status() {
    log "Checking pipeline status for $ENVIRONMENT"
    
    # Check local images
    log "Local Docker images:"
    docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | grep "$PROJECT_NAME" || echo "No images found"
    
    echo
    
    # Check deployment status
    if [[ "$ENVIRONMENT" == "local" ]]; then
        log "Local deployment status:"
        if [[ -f "$SCRIPT_DIR/../docker-compose/docker-compose.local.yml" ]]; then
            docker-compose -f "$SCRIPT_DIR/../docker-compose/docker-compose.local.yml" ps 2>/dev/null || echo "Local deployment not running"
        fi
    else
        if [[ -n "$TARGET_SERVER" ]]; then
            log "Remote deployment status on $TARGET_SERVER:"
            "${SCRIPT_DIR}/remote-deploy.sh" status --server "$TARGET_SERVER" --user "$SSH_USER" $(if [[ -n "$SSH_KEY" ]]; then echo "--key $SSH_KEY"; fi)
        else
            warning "Target server not specified for status check"
        fi
    fi
}

# Rollback deployment
rollback_deployment() {
    log "Rolling back deployment in $ENVIRONMENT"
    
    if [[ "$ENVIRONMENT" == "local" ]]; then
        error "Rollback not supported for local environment"
        exit 1
    fi
    
    if [[ -z "$TARGET_SERVER" ]]; then
        error "Target server required for rollback"
        exit 1
    fi
    
    local rollback_opts="--server $TARGET_SERVER --user $SSH_USER"
    
    if [[ -n "$SSH_KEY" ]]; then
        rollback_opts="$rollback_opts --key $SSH_KEY"
    fi
    
    if [[ "$FORCE" == "true" ]]; then
        rollback_opts="$rollback_opts --force"
    fi
    
    "${SCRIPT_DIR}/remote-deploy.sh" rollback $rollback_opts
}

# Run full pipeline
run_full_pipeline() {
    local start_time=$(date +%s)
    
    log "Starting full CI/CD pipeline for $ENVIRONMENT"
    log "Image tag: $IMAGE_TAG"
    log "Target server: $TARGET_SERVER"
    
    # Validate prerequisites
    validate_prerequisites
    
    # Validate configuration
    if ! validate_deployment; then
        error "Configuration validation failed"
        exit 1
    fi
    
    # Quality checks
    if ! run_quality_checks; then
        error "Quality checks failed"
        exit 1
    fi
    
    # Run tests
    if ! run_tests; then
        error "Tests failed"
        exit 1
    fi
    
    # Build images
    if ! build_images; then
        error "Image build failed"
        exit 1
    fi
    
    # Deploy application
    if ! deploy_application; then
        error "Deployment failed"
        exit 1
    fi
    
    # Calculate execution time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    success "Full pipeline completed successfully in ${minutes}m ${seconds}s"
    
    # Show final status
    echo
    log "Pipeline Summary:"
    log "- Environment: $ENVIRONMENT"
    log "- Image Tag: $IMAGE_TAG"
    log "- Target Server: $TARGET_SERVER"
    log "- Duration: ${minutes}m ${seconds}s"
    
    if [[ "$ENVIRONMENT" != "local" ]]; then
        log "- Application URL: http://$TARGET_SERVER"
    else
        log "- Application URL: http://localhost:4000"
    fi
}

# Main function
main() {
    if [[ $# -eq 0 ]]; then
        show_help
        exit 0
    fi
    
    parse_args "$@"
    load_environment_config
    
    case $COMMAND in
        "full")
            run_full_pipeline
            ;;
        "build")
            validate_prerequisites
            build_images
            ;;
        "test")
            validate_prerequisites
            run_quality_checks
            run_tests
            ;;
        "deploy")
            validate_prerequisites
            validate_deployment
            deploy_application
            ;;
        "validate")
            validate_deployment
            ;;
        "rollback")
            rollback_deployment
            ;;
        "status")
            check_status
            ;;
        *)
            error "Unknown command: $COMMAND"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"