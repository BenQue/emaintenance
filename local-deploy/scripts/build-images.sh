#!/bin/bash

# Local Docker Image Build Script
# This script builds all Docker images locally for testing and remote deployment

set -e

# Configuration
PROJECT_NAME="emaintenance"
BUILD_DATE=$(date '+%Y%m%d_%H%M%S')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
VERSION_TAG="${BUILD_DATE}_${GIT_COMMIT}"
REGISTRY_PREFIX="local"  # Change to your registry if using one

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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
Usage: $0 [OPTIONS] [SERVICES...]

Build Docker images locally for E-Maintenance system

OPTIONS:
    -h, --help          Show this help message
    -t, --tag TAG       Custom tag for images (default: ${VERSION_TAG})
    -p, --push          Push to registry after building
    -c, --clean         Clean build (no cache)
    --registry PREFIX   Registry prefix (default: ${REGISTRY_PREFIX})
    --parallel          Build images in parallel (faster but uses more resources)
    --save-dir DIR      Directory to save images as tar files

SERVICES:
    web                 Next.js web application
    user-service        User management API service
    work-order-service  Work order management API service  
    asset-service       Asset management API service
    migrations          Database migrations service
    all                 Build all services (default)

EXAMPLES:
    $0                              # Build all services with auto-generated tag
    $0 -t v1.0.0 web user-service   # Build specific services with custom tag
    $0 --clean --parallel           # Clean parallel build of all services
    $0 --save-dir ./images all      # Build and save all images as tar files

EOF
}

# Parse command line arguments
CUSTOM_TAG=""
PUSH_TO_REGISTRY=false
CLEAN_BUILD=false
PARALLEL_BUILD=false
SAVE_DIR=""
SERVICES=()

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -t|--tag)
            CUSTOM_TAG="$2"
            shift 2
            ;;
        -p|--push)
            PUSH_TO_REGISTRY=true
            shift
            ;;
        -c|--clean)
            CLEAN_BUILD=true
            shift
            ;;
        --registry)
            REGISTRY_PREFIX="$2"
            shift 2
            ;;
        --parallel)
            PARALLEL_BUILD=true
            shift
            ;;
        --save-dir)
            SAVE_DIR="$2"
            shift 2
            ;;
        web|user-service|work-order-service|asset-service|migrations|all)
            SERVICES+=("$1")
            shift
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Use custom tag if provided
if [[ -n "$CUSTOM_TAG" ]]; then
    VERSION_TAG="$CUSTOM_TAG"
fi

# Default to building all services if none specified
if [[ ${#SERVICES[@]} -eq 0 ]]; then
    SERVICES=("all")
fi

# If "all" is specified, expand to all services
if [[ " ${SERVICES[@]} " =~ " all " ]]; then
    SERVICES=("web" "user-service" "work-order-service" "asset-service" "migrations")
fi

# Create save directory if specified
if [[ -n "$SAVE_DIR" ]]; then
    mkdir -p "$SAVE_DIR"
    SAVE_DIR=$(realpath "$SAVE_DIR")
    log "Images will be saved to: $SAVE_DIR"
fi

# Build cache options
CACHE_OPTION=""
if [[ "$CLEAN_BUILD" == "true" ]]; then
    CACHE_OPTION="--no-cache"
    warning "Clean build enabled - this will take longer"
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Verify we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "apps" ]] || [[ ! -d "packages" ]]; then
    error "Please run this script from the project root directory"
    exit 1
fi

log "Starting local image build process..."
log "Project: $PROJECT_NAME"
log "Version Tag: $VERSION_TAG"
log "Registry Prefix: $REGISTRY_PREFIX"
log "Services to build: ${SERVICES[*]}"

# Function to build a single service
build_service() {
    local service=$1
    local dockerfile=""
    local context="."
    local build_args=""
    local image_name=""

    case $service in
        "web")
            dockerfile="docker-deploy/dockerfiles/Dockerfile.web.fixed"
            image_name="${REGISTRY_PREFIX}/${PROJECT_NAME}-web:${VERSION_TAG}"
            build_args="--build-arg NODE_ENV=production"
            ;;
        "user-service")
            dockerfile="docker-deploy/dockerfiles/Dockerfile.api.fixed"
            image_name="${REGISTRY_PREFIX}/${PROJECT_NAME}-user-service:${VERSION_TAG}"
            build_args="--build-arg SERVICE_PATH=apps/api --build-arg SERVICE_NAME=user-service --build-arg SERVICE_PORT=3001"
            ;;
        "work-order-service")
            dockerfile="docker-deploy/dockerfiles/Dockerfile.api.fixed"
            image_name="${REGISTRY_PREFIX}/${PROJECT_NAME}-work-order-service:${VERSION_TAG}"
            build_args="--build-arg SERVICE_PATH=apps/api --build-arg SERVICE_NAME=work-order-service --build-arg SERVICE_PORT=3002"
            ;;
        "asset-service")
            dockerfile="docker-deploy/dockerfiles/Dockerfile.api.fixed"
            image_name="${REGISTRY_PREFIX}/${PROJECT_NAME}-asset-service:${VERSION_TAG}"
            build_args="--build-arg SERVICE_PATH=apps/api --build-arg SERVICE_NAME=asset-service --build-arg SERVICE_PORT=3003"
            ;;
        "migrations")
            dockerfile="packages/database/Dockerfile"
            image_name="${REGISTRY_PREFIX}/${PROJECT_NAME}-migrations:${VERSION_TAG}"
            build_args="--build-arg NODE_ENV=production"
            ;;
        *)
            error "Unknown service: $service"
            return 1
            ;;
    esac

    log "Building $service..."
    
    # Check if Dockerfile exists
    if [[ ! -f "$dockerfile" ]]; then
        error "Dockerfile not found: $dockerfile"
        return 1
    fi

    # Build the image
    if docker build \
        $CACHE_OPTION \
        -f "$dockerfile" \
        -t "$image_name" \
        $build_args \
        --label "build.date=$BUILD_DATE" \
        --label "build.commit=$GIT_COMMIT" \
        --label "build.version=$VERSION_TAG" \
        "$context"; then
        
        success "Built $service: $image_name"
        
        # Save image to tar if requested
        if [[ -n "$SAVE_DIR" ]]; then
            local tar_file="$SAVE_DIR/${PROJECT_NAME}-${service}-${VERSION_TAG}.tar"
            log "Saving $service to $tar_file..."
            if docker save "$image_name" | gzip > "$tar_file.gz"; then
                success "Saved $service to $tar_file.gz"
            else
                error "Failed to save $service"
                return 1
            fi
        fi
        
        # Push to registry if requested
        if [[ "$PUSH_TO_REGISTRY" == "true" ]] && [[ "$REGISTRY_PREFIX" != "local" ]]; then
            log "Pushing $service to registry..."
            if docker push "$image_name"; then
                success "Pushed $service to registry"
            else
                error "Failed to push $service"
                return 1
            fi
        fi
        
        return 0
    else
        error "Failed to build $service"
        return 1
    fi
}

# Function to build all services in parallel
build_parallel() {
    local pids=()
    local failed_services=()
    
    for service in "${SERVICES[@]}"; do
        build_service "$service" &
        pids+=($!)
    done
    
    # Wait for all builds to complete
    for i in "${!pids[@]}"; do
        if ! wait "${pids[$i]}"; then
            failed_services+=("${SERVICES[$i]}")
        fi
    done
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        error "Failed to build: ${failed_services[*]}"
        return 1
    fi
    
    return 0
}

# Function to build all services sequentially
build_sequential() {
    local failed_services=()
    
    for service in "${SERVICES[@]}"; do
        if ! build_service "$service"; then
            failed_services+=("$service")
        fi
    done
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        error "Failed to build: ${failed_services[*]}"
        return 1
    fi
    
    return 0
}

# Start the build process
start_time=$(date +%s)

if [[ "$PARALLEL_BUILD" == "true" ]]; then
    warning "Building in parallel - monitor system resources"
    if build_parallel; then
        success "All images built successfully in parallel"
    else
        error "Some images failed to build"
        exit 1
    fi
else
    if build_sequential; then
        success "All images built successfully"
    else
        error "Some images failed to build"
        exit 1
    fi
fi

# Calculate build time
end_time=$(date +%s)
build_time=$((end_time - start_time))
minutes=$((build_time / 60))
seconds=$((build_time % 60))

success "Build completed in ${minutes}m ${seconds}s"

# Show built images
log "Built images:"
for service in "${SERVICES[@]}"; do
    image_name="${REGISTRY_PREFIX}/${PROJECT_NAME}-${service}:${VERSION_TAG}"
    if docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | grep "$image_name" >/dev/null 2>&1; then
        docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | grep "$image_name"
    fi
done

# Show summary
log "Build Summary:"
log "- Project: $PROJECT_NAME"
log "- Version: $VERSION_TAG"
log "- Services: ${SERVICES[*]}"
log "- Build Time: ${minutes}m ${seconds}s"

if [[ -n "$SAVE_DIR" ]]; then
    log "- Saved to: $SAVE_DIR"
    ls -lh "$SAVE_DIR"/*.tar.gz 2>/dev/null || true
fi

if [[ "$PUSH_TO_REGISTRY" == "true" ]] && [[ "$REGISTRY_PREFIX" != "local" ]]; then
    log "- Images pushed to registry"
fi

success "Local build process completed successfully!"