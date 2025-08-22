#!/bin/bash

# Docker Image Transfer Script
# This script handles transferring Docker images from local to remote servers
# Supports multiple transfer methods: save/load, registry push/pull, and direct transfer

set -e

# Configuration
PROJECT_NAME="emaintenance"
REGISTRY_PREFIX="local"
DEFAULT_TRANSFER_DIR="/tmp/docker-transfer"

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

Transfer Docker images between local and remote environments

COMMANDS:
    save        Save images to tar files
    load        Load images from tar files
    push        Push images to registry
    pull        Pull images from registry
    transfer    Transfer images to remote server via SSH
    sync        Sync images to remote server (auto-detect method)
    list        List available images
    cleanup     Clean up transfer files

OPTIONS:
    -h, --help              Show this help message
    -t, --tag TAG           Image tag to use (default: latest)
    -d, --dir DIR           Transfer directory (default: $DEFAULT_TRANSFER_DIR)
    -s, --server HOST       Remote server hostname/IP
    -u, --user USER         SSH username for remote server
    -k, --key PATH          SSH private key path
    -p, --port PORT         SSH port (default: 22)
    -r, --registry URL      Docker registry URL
    --compress              Use compression for transfer
    --parallel              Enable parallel operations
    --services LIST         Comma-separated list of services (default: all)
    --force                 Force overwrite existing files/images
    --cleanup               Clean up after transfer

TRANSFER METHODS:
    save/load   Save images as tar files and transfer via SSH/SCP
    registry    Push to registry, then pull on remote server
    sync        Auto-detect best method based on available tools

EXAMPLES:
    # Save all images locally
    $0 save --tag v1.0.0 --compress

    # Transfer images to remote server via SSH
    $0 transfer --server production.example.com --user deploy --tag v1.0.0

    # Push images to registry
    $0 push --registry registry.example.com --tag v1.0.0

    # Sync images to remote (auto-detect method)
    $0 sync --server production.example.com --user deploy --tag v1.0.0

    # Load images from transfer directory
    $0 load --dir ./images --tag v1.0.0

    # List available images
    $0 list --tag v1.0.0

EOF
}

# Parse command line arguments
parse_args() {
    COMMAND=""
    IMAGE_TAG="latest"
    TRANSFER_DIR="$DEFAULT_TRANSFER_DIR"
    REMOTE_SERVER=""
    SSH_USER=""
    SSH_KEY=""
    SSH_PORT="22"
    REGISTRY_URL=""
    COMPRESS=false
    PARALLEL=false
    SERVICES="all"
    FORCE=false
    CLEANUP=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            save|load|push|pull|transfer|sync|list|cleanup)
                COMMAND="$1"
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            -t|--tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            -d|--dir)
                TRANSFER_DIR="$2"
                shift 2
                ;;
            -s|--server)
                REMOTE_SERVER="$2"
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
            -p|--port)
                SSH_PORT="$2"
                shift 2
                ;;
            -r|--registry)
                REGISTRY_URL="$2"
                shift 2
                ;;
            --compress)
                COMPRESS=true
                shift
                ;;
            --parallel)
                PARALLEL=true
                shift
                ;;
            --services)
                SERVICES="$2"
                shift 2
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --cleanup)
                CLEANUP=true
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
}

# Get list of services
get_services() {
    if [[ "$SERVICES" == "all" ]]; then
        echo "web user-service work-order-service asset-service migrations"
    else
        echo "$SERVICES" | tr ',' ' '
    fi
}

# Get image name for service
get_image_name() {
    local service="$1"
    echo "${REGISTRY_PREFIX}/${PROJECT_NAME}-${service}:${IMAGE_TAG}"
}

# Check if image exists
image_exists() {
    local image="$1"
    docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${image}$"
}

# Save images to tar files
save_images() {
    local services=($(get_services))
    
    log "Saving images to $TRANSFER_DIR"
    mkdir -p "$TRANSFER_DIR"
    
    local saved_count=0
    local failed_count=0
    
    for service in "${services[@]}"; do
        local image_name=$(get_image_name "$service")
        local tar_file="$TRANSFER_DIR/${PROJECT_NAME}-${service}-${IMAGE_TAG}.tar"
        
        if [[ "$COMPRESS" == "true" ]]; then
            tar_file="${tar_file}.gz"
        fi
        
        log "Saving $service: $image_name"
        
        if ! image_exists "$image_name"; then
            error "Image not found: $image_name"
            failed_count=$((failed_count + 1))
            continue
        fi
        
        if [[ -f "$tar_file" ]] && [[ "$FORCE" != "true" ]]; then
            warning "File exists, skipping: $tar_file (use --force to overwrite)"
            continue
        fi
        
        if [[ "$COMPRESS" == "true" ]]; then
            if docker save "$image_name" | gzip > "$tar_file"; then
                success "Saved $service to $tar_file (compressed)"
                saved_count=$((saved_count + 1))
            else
                error "Failed to save $service"
                failed_count=$((failed_count + 1))
            fi
        else
            if docker save -o "$tar_file" "$image_name"; then
                success "Saved $service to $tar_file"
                saved_count=$((saved_count + 1))
            else
                error "Failed to save $service"
                failed_count=$((failed_count + 1))
            fi
        fi
    done
    
    log "Save complete: $saved_count saved, $failed_count failed"
    
    if [[ $saved_count -gt 0 ]]; then
        log "Saved files:"
        ls -lh "$TRANSFER_DIR"/*.tar* 2>/dev/null || true
    fi
}

# Load images from tar files
load_images() {
    local services=($(get_services))
    
    log "Loading images from $TRANSFER_DIR"
    
    if [[ ! -d "$TRANSFER_DIR" ]]; then
        error "Transfer directory not found: $TRANSFER_DIR"
        exit 1
    fi
    
    local loaded_count=0
    local failed_count=0
    
    for service in "${services[@]}"; do
        local tar_file="$TRANSFER_DIR/${PROJECT_NAME}-${service}-${IMAGE_TAG}.tar"
        local tar_gz_file="${tar_file}.gz"
        
        # Check for compressed file first
        if [[ -f "$tar_gz_file" ]]; then
            tar_file="$tar_gz_file"
        elif [[ ! -f "$tar_file" ]]; then
            error "Transfer file not found for $service: $tar_file"
            failed_count=$((failed_count + 1))
            continue
        fi
        
        log "Loading $service from $tar_file"
        
        if [[ "$tar_file" == *.gz ]]; then
            if gunzip -c "$tar_file" | docker load; then
                success "Loaded $service from $tar_file"
                loaded_count=$((loaded_count + 1))
            else
                error "Failed to load $service"
                failed_count=$((failed_count + 1))
            fi
        else
            if docker load -i "$tar_file"; then
                success "Loaded $service from $tar_file"
                loaded_count=$((loaded_count + 1))
            else
                error "Failed to load $service"
                failed_count=$((failed_count + 1))
            fi
        fi
    done
    
    log "Load complete: $loaded_count loaded, $failed_count failed"
}

# Push images to registry
push_images() {
    local services=($(get_services))
    
    if [[ -z "$REGISTRY_URL" ]]; then
        error "Registry URL required for push operation"
        exit 1
    fi
    
    log "Pushing images to registry: $REGISTRY_URL"
    
    local pushed_count=0
    local failed_count=0
    
    for service in "${services[@]}"; do
        local local_image=$(get_image_name "$service")
        local remote_image="${REGISTRY_URL}/${PROJECT_NAME}-${service}:${IMAGE_TAG}"
        
        if ! image_exists "$local_image"; then
            error "Local image not found: $local_image"
            failed_count=$((failed_count + 1))
            continue
        fi
        
        log "Tagging $service: $local_image -> $remote_image"
        if ! docker tag "$local_image" "$remote_image"; then
            error "Failed to tag $service"
            failed_count=$((failed_count + 1))
            continue
        fi
        
        log "Pushing $service: $remote_image"
        if docker push "$remote_image"; then
            success "Pushed $service to registry"
            pushed_count=$((pushed_count + 1))
        else
            error "Failed to push $service"
            failed_count=$((failed_count + 1))
        fi
    done
    
    log "Push complete: $pushed_count pushed, $failed_count failed"
}

# Pull images from registry
pull_images() {
    local services=($(get_services))
    
    if [[ -z "$REGISTRY_URL" ]]; then
        error "Registry URL required for pull operation"
        exit 1
    fi
    
    log "Pulling images from registry: $REGISTRY_URL"
    
    local pulled_count=0
    local failed_count=0
    
    for service in "${services[@]}"; do
        local remote_image="${REGISTRY_URL}/${PROJECT_NAME}-${service}:${IMAGE_TAG}"
        local local_image=$(get_image_name "$service")
        
        log "Pulling $service: $remote_image"
        if docker pull "$remote_image"; then
            log "Tagging $service: $remote_image -> $local_image"
            if docker tag "$remote_image" "$local_image"; then
                success "Pulled and tagged $service"
                pulled_count=$((pulled_count + 1))
            else
                error "Failed to tag $service after pull"
                failed_count=$((failed_count + 1))
            fi
        else
            error "Failed to pull $service"
            failed_count=$((failed_count + 1))
        fi
    done
    
    log "Pull complete: $pulled_count pulled, $failed_count failed"
}

# Transfer images to remote server via SSH
transfer_images() {
    if [[ -z "$REMOTE_SERVER" ]] || [[ -z "$SSH_USER" ]]; then
        error "Remote server and SSH user required for transfer"
        exit 1
    fi
    
    log "Transferring images to $SSH_USER@$REMOTE_SERVER"
    
    # Build SSH options
    local ssh_opts="-p $SSH_PORT"
    if [[ -n "$SSH_KEY" ]]; then
        ssh_opts="$ssh_opts -i $SSH_KEY"
    fi
    
    # First, save images locally
    log "Saving images locally for transfer..."
    save_images
    
    # Create remote directory
    log "Creating remote transfer directory..."
    ssh $ssh_opts "$SSH_USER@$REMOTE_SERVER" "mkdir -p $TRANSFER_DIR"
    
    # Transfer files
    log "Transferring image files..."
    local transfer_files=("$TRANSFER_DIR"/*.tar*)
    
    if [[ ${#transfer_files[@]} -eq 1 ]] && [[ ! -f "${transfer_files[0]}" ]]; then
        error "No transfer files found in $TRANSFER_DIR"
        exit 1
    fi
    
    if [[ "$PARALLEL" == "true" ]]; then
        # Parallel transfer using background processes
        local pids=()
        for file in "${transfer_files[@]}"; do
            if [[ -f "$file" ]]; then
                log "Transferring $(basename "$file")..."
                scp $ssh_opts "$file" "$SSH_USER@$REMOTE_SERVER:$TRANSFER_DIR/" &
                pids+=($!)
            fi
        done
        
        # Wait for all transfers
        for pid in "${pids[@]}"; do
            wait "$pid"
        done
    else
        # Sequential transfer
        for file in "${transfer_files[@]}"; do
            if [[ -f "$file" ]]; then
                log "Transferring $(basename "$file")..."
                scp $ssh_opts "$file" "$SSH_USER@$REMOTE_SERVER:$TRANSFER_DIR/"
            fi
        done
    fi
    
    success "Transfer complete"
    
    # Load images on remote server
    log "Loading images on remote server..."
    local services_list=$(get_services | tr ' ' ',')
    
    ssh $ssh_opts "$SSH_USER@$REMOTE_SERVER" "
        cd $TRANSFER_DIR && 
        for service in \$(echo '$services_list' | tr ',' ' '); do
            tar_file=\"${PROJECT_NAME}-\${service}-${IMAGE_TAG}.tar\"
            tar_gz_file=\"\${tar_file}.gz\"
            
            if [[ -f \"\$tar_gz_file\" ]]; then
                echo \"Loading \$service from \$tar_gz_file\"
                gunzip -c \"\$tar_gz_file\" | docker load
            elif [[ -f \"\$tar_file\" ]]; then
                echo \"Loading \$service from \$tar_file\"
                docker load -i \"\$tar_file\"
            else
                echo \"Transfer file not found for \$service\"
            fi
        done
    "
    
    if [[ "$CLEANUP" == "true" ]]; then
        log "Cleaning up transfer files..."
        rm -f "${transfer_files[@]}"
        ssh $ssh_opts "$SSH_USER@$REMOTE_SERVER" "rm -rf $TRANSFER_DIR"
    fi
    
    success "Image transfer and loading complete"
}

# Intelligent sync - auto-detect best transfer method
sync_images() {
    if [[ -z "$REMOTE_SERVER" ]] || [[ -z "$SSH_USER" ]]; then
        error "Remote server and SSH user required for sync"
        exit 1
    fi
    
    log "Auto-detecting best transfer method for $SSH_USER@$REMOTE_SERVER"
    
    # Build SSH options
    local ssh_opts="-p $SSH_PORT"
    if [[ -n "$SSH_KEY" ]]; then
        ssh_opts="$ssh_opts -i $SSH_KEY"
    fi
    
    # Check if Docker registry is available
    if [[ -n "$REGISTRY_URL" ]]; then
        log "Registry URL provided, attempting registry-based transfer..."
        if push_images && ssh $ssh_opts "$SSH_USER@$REMOTE_SERVER" "
            export REGISTRY_URL='$REGISTRY_URL'
            export IMAGE_TAG='$IMAGE_TAG'
            export SERVICES='$SERVICES'
            $(declare -f pull_images get_services get_image_name)
            pull_images
        "; then
            success "Registry-based sync completed successfully"
            return 0
        else
            warning "Registry-based transfer failed, falling back to SSH transfer"
        fi
    fi
    
    # Fallback to SSH transfer
    log "Using SSH-based transfer..."
    transfer_images
}

# List available images
list_images() {
    local services=($(get_services))
    
    log "Available images for tag: $IMAGE_TAG"
    echo
    printf "%-20s %-40s %-15s %-20s\n" "SERVICE" "IMAGE" "SIZE" "CREATED"
    printf "%-20s %-40s %-15s %-20s\n" "-------" "-----" "----" "-------"
    
    for service in "${services[@]}"; do
        local image_name=$(get_image_name "$service")
        if image_exists "$image_name"; then
            local info=$(docker images --format "{{.Size}}\t{{.CreatedAt}}" "$image_name" | head -1)
            local size=$(echo "$info" | cut -f1)
            local created=$(echo "$info" | cut -f2)
            printf "%-20s %-40s %-15s %-20s\n" "$service" "$image_name" "$size" "$created"
        else
            printf "%-20s %-40s %-15s %-20s\n" "$service" "$image_name" "NOT FOUND" "-"
        fi
    done
    
    echo
    
    # Show transfer files if they exist
    if [[ -d "$TRANSFER_DIR" ]]; then
        local transfer_files=("$TRANSFER_DIR"/*.tar*)
        if [[ ${#transfer_files[@]} -gt 1 ]] || [[ -f "${transfer_files[0]}" ]]; then
            log "Available transfer files in $TRANSFER_DIR:"
            ls -lh "$TRANSFER_DIR"/*.tar* 2>/dev/null || true
        fi
    fi
}

# Clean up transfer files
cleanup_files() {
    log "Cleaning up transfer files..."
    
    if [[ -d "$TRANSFER_DIR" ]]; then
        local files_to_remove=("$TRANSFER_DIR"/*.tar*)
        if [[ ${#files_to_remove[@]} -gt 1 ]] || [[ -f "${files_to_remove[0]}" ]]; then
            if [[ "$FORCE" == "true" ]]; then
                rm -f "${files_to_remove[@]}"
                success "Transfer files cleaned up"
            else
                log "Files to be removed:"
                ls -la "${files_to_remove[@]}" 2>/dev/null || true
                echo -n "Remove these files? (y/N): "
                read -r response
                if [[ "$response" =~ ^[Yy]$ ]]; then
                    rm -f "${files_to_remove[@]}"
                    success "Transfer files cleaned up"
                else
                    log "Cleanup cancelled"
                fi
            fi
        else
            log "No transfer files found to clean up"
        fi
    else
        log "Transfer directory does not exist: $TRANSFER_DIR"
    fi
}

# Main function
main() {
    if [[ $# -eq 0 ]]; then
        show_help
        exit 0
    fi
    
    parse_args "$@"
    
    # Check Docker availability
    if ! command -v docker >/dev/null 2>&1; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running"
        exit 1
    fi
    
    case $COMMAND in
        "save")
            save_images
            ;;
        "load")
            load_images
            ;;
        "push")
            push_images
            ;;
        "pull")
            pull_images
            ;;
        "transfer")
            transfer_images
            ;;
        "sync")
            sync_images
            ;;
        "list")
            list_images
            ;;
        "cleanup")
            cleanup_files
            ;;
        *)
            error "Unknown command: $COMMAND"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"