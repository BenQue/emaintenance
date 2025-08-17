#!/bin/bash

# EMaintenance Docker Deployment Script
# This script helps deploy the EMaintenance system using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="emaintenance"
DEVELOPMENT_COMPOSE="docker-compose.yml"
PRODUCTION_COMPOSE="docker-compose.prod.yml"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed and running
check_docker() {
    log_info "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker service."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    log_success "Docker and Docker Compose are ready!"
}

# Setup environment variables
setup_env() {
    local env_file=$1
    
    if [ ! -f "$env_file" ]; then
        log_info "Creating environment file from template..."
        if [ -f ".env.docker" ]; then
            cp .env.docker "$env_file"
            log_warning "Please review and update the environment variables in $env_file"
        else
            log_error "Template .env.docker file not found!"
            exit 1
        fi
    else
        log_info "Using existing $env_file file"
    fi
}

# Build all services
build_services() {
    local compose_file=$1
    
    log_info "Building all services..."
    docker-compose -f "$compose_file" build --no-cache
    log_success "All services built successfully!"
}

# Setup database
setup_database() {
    local compose_file=$1
    
    log_info "Setting up database..."
    
    # Start database service first
    docker-compose -f "$compose_file" up -d database
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    sleep 30
    
    # Run database migrations
    log_info "Running database migrations..."
    docker-compose -f "$compose_file" --profile tools run --rm db-migrate
    
    log_success "Database setup completed!"
}

# Deploy development environment
deploy_development() {
    log_info "Deploying development environment..."
    
    setup_env ".env"
    check_docker
    build_services "$DEVELOPMENT_COMPOSE"
    setup_database "$DEVELOPMENT_COMPOSE"
    
    log_info "Starting all services..."
    docker-compose -f "$DEVELOPMENT_COMPOSE" up -d
    
    log_success "Development environment deployed successfully!"
    log_info "Services available at:"
    log_info "  - Web App: http://localhost:3000"
    log_info "  - User Service: http://localhost:3001"
    log_info "  - Work Order Service: http://localhost:3002"
    log_info "  - Asset Service: http://localhost:3003"
    log_info "  - Database: localhost:5432"
}

# Deploy production environment
deploy_production() {
    log_info "Deploying production environment..."
    
    setup_env ".env.prod"
    check_docker
    build_services "$PRODUCTION_COMPOSE"
    setup_database "$PRODUCTION_COMPOSE"
    
    log_info "Starting all services..."
    docker-compose -f "$PRODUCTION_COMPOSE" up -d
    
    log_success "Production environment deployed successfully!"
    log_info "Services available at:"
    log_info "  - Web App: http://localhost (via Nginx)"
    log_info "  - API Services: http://localhost/api/*"
}

# Stop services
stop_services() {
    local env=$1
    local compose_file
    
    if [ "$env" = "production" ]; then
        compose_file="$PRODUCTION_COMPOSE"
    else
        compose_file="$DEVELOPMENT_COMPOSE"
    fi
    
    log_info "Stopping $env services..."
    docker-compose -f "$compose_file" down
    log_success "$env services stopped!"
}

# Clean up
cleanup() {
    local env=$1
    local compose_file
    
    if [ "$env" = "production" ]; then
        compose_file="$PRODUCTION_COMPOSE"
    else
        compose_file="$DEVELOPMENT_COMPOSE"
    fi
    
    log_warning "This will remove all containers, networks, and volumes for $env environment!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleaning up $env environment..."
        docker-compose -f "$compose_file" down -v --remove-orphans
        docker system prune -f
        log_success "Cleanup completed!"
    else
        log_info "Cleanup cancelled."
    fi
}

# Show logs
show_logs() {
    local env=$1
    local service=$2
    local compose_file
    
    if [ "$env" = "production" ]; then
        compose_file="$PRODUCTION_COMPOSE"
    else
        compose_file="$DEVELOPMENT_COMPOSE"
    fi
    
    if [ -n "$service" ]; then
        docker-compose -f "$compose_file" logs -f "$service"
    else
        docker-compose -f "$compose_file" logs -f
    fi
}

# Show help
show_help() {
    echo "EMaintenance Docker Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  dev           Deploy development environment"
    echo "  prod          Deploy production environment"
    echo "  stop          Stop services (dev|prod)"
    echo "  restart       Restart services (dev|prod)"
    echo "  logs          Show logs (dev|prod) [service]"
    echo "  cleanup       Clean up environment (dev|prod)"
    echo "  build         Build services (dev|prod)"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev                    # Deploy development environment"
    echo "  $0 prod                   # Deploy production environment"
    echo "  $0 stop dev               # Stop development services"
    echo "  $0 logs prod web          # Show logs for web service in production"
    echo "  $0 cleanup dev            # Clean up development environment"
}

# Main script logic
case "$1" in
    "dev")
        deploy_development
        ;;
    "prod")
        deploy_production
        ;;
    "stop")
        if [ -z "$2" ]; then
            log_error "Please specify environment: dev or prod"
            exit 1
        fi
        stop_services "$2"
        ;;
    "restart")
        if [ -z "$2" ]; then
            log_error "Please specify environment: dev or prod"
            exit 1
        fi
        stop_services "$2"
        sleep 5
        if [ "$2" = "prod" ]; then
            deploy_production
        else
            deploy_development
        fi
        ;;
    "logs")
        if [ -z "$2" ]; then
            log_error "Please specify environment: dev or prod"
            exit 1
        fi
        show_logs "$2" "$3"
        ;;
    "cleanup")
        if [ -z "$2" ]; then
            log_error "Please specify environment: dev or prod"
            exit 1
        fi
        cleanup "$2"
        ;;
    "build")
        if [ -z "$2" ]; then
            log_error "Please specify environment: dev or prod"
            exit 1
        fi
        check_docker
        if [ "$2" = "prod" ]; then
            build_services "$PRODUCTION_COMPOSE"
        else
            build_services "$DEVELOPMENT_COMPOSE"
        fi
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac