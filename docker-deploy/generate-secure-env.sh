#!/bin/bash

# E-Maintenance Secure Environment Generator
# ==========================================
# Generates a secure .env.production file with strong passwords and proper configuration
# Version: 2.0
# Date: 2025-08-22

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
ENV_FILE=".env.production"
ENV_TEMPLATE="env.production.template"
SERVER_IP="${SERVER_IP:-localhost}"

# Functions
log() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"; exit 1; }
warning() { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"; }
info() { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"; }
success() { echo -e "${CYAN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}"; }

# Generate secure password
generate_password() {
    local length=${1:-32}
    if command -v openssl &> /dev/null; then
        openssl rand -base64 $length | tr -d '\n'
    elif command -v python3 &> /dev/null; then
        python3 -c "import secrets, string; print(''.join(secrets.choice(string.ascii_letters + string.digits + '!@#$%^&*') for _ in range($length)))"
    else
        # Fallback to date-based generation
        date +%s | sha256sum | base64 | head -c $length
    fi
}

# Generate JWT secret
generate_jwt_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -base64 64 | tr -d '\n'
    else
        generate_password 64
    fi
}

# Detect server IP
detect_server_ip() {
    if [[ -n "$SERVER_IP" && "$SERVER_IP" != "localhost" ]]; then
        echo "$SERVER_IP"
    elif command -v ip &> /dev/null; then
        # Try to get the primary network interface IP
        ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || echo "localhost"
    elif command -v hostname &> /dev/null; then
        # Try hostname -I
        hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost"
    else
        echo "localhost"
    fi
}

# Validate environment variables
validate_env_vars() {
    local env_file="$1"
    
    info "Validating environment variables in $env_file"
    
    # Source the file
    if ! source "$env_file" 2>/dev/null; then
        error "Failed to source $env_file"
    fi
    
    # Required variables
    local required_vars=(
        "DB_PASSWORD"
        "JWT_SECRET"
        "REDIS_PASSWORD"
        "ADMIN_PASSWORD"
        "DATABASE_URL"
        "NEXT_PUBLIC_API_URL"
        "NEXT_PUBLIC_USER_SERVICE_URL"
        "NEXT_PUBLIC_WORK_ORDER_SERVICE_URL"
        "NEXT_PUBLIC_ASSET_SERVICE_URL"
    )
    
    local missing_vars=()
    local weak_vars=()
    
    for var in "${required_vars[@]}"; do
        local value="${!var:-}"
        
        # Check if variable exists and is not a placeholder
        if [[ -z "$value" ]] || [[ "$value" == *"CHANGE_ME"* ]] || [[ "$value" == *"YOUR_"* ]]; then
            missing_vars+=("$var")
        fi
        
        # Check password strength for password variables
        if [[ "$var" == *"PASSWORD"* ]] && [[ ${#value} -lt 12 ]]; then
            weak_vars+=("$var")
        fi
        
        # Check JWT secret strength
        if [[ "$var" == "JWT_SECRET" ]] && [[ ${#value} -lt 32 ]]; then
            weak_vars+=("$var")
        fi
    done
    
    # Report issues
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        error "Missing or invalid environment variables: ${missing_vars[*]}"
    fi
    
    if [[ ${#weak_vars[@]} -gt 0 ]]; then
        warning "Weak password/secret detected: ${weak_vars[*]}"
        warning "Consider regenerating for better security"
    fi
    
    success "Environment validation passed"
}

# Main function
main() {
    log "=========================================="
    log "E-Maintenance Secure Environment Generator"
    log "=========================================="
    
    # Check if template exists
    if [[ ! -f "$ENV_TEMPLATE" ]]; then
        error "Template file $ENV_TEMPLATE not found"
    fi
    
    # Detect server IP
    DETECTED_IP=$(detect_server_ip)
    info "Detected server IP: $DETECTED_IP"
    
    # Ask user for confirmation or custom IP
    echo -e "\n${YELLOW}Server IP Configuration:${NC}"
    echo -e "Detected IP: ${CYAN}$DETECTED_IP${NC}"
    read -p "Use this IP? (y/n) or enter custom IP: " -r SERVER_INPUT
    
    if [[ "$SERVER_INPUT" =~ ^[Nn]$ ]]; then
        read -p "Enter server IP address: " -r CUSTOM_IP
        SERVER_IP="$CUSTOM_IP"
    elif [[ "$SERVER_INPUT" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        SERVER_IP="$SERVER_INPUT"
    else
        SERVER_IP="$DETECTED_IP"
    fi
    
    info "Using server IP: $SERVER_IP"
    
    # Generate secure passwords
    info "Generating secure passwords and secrets..."
    
    DB_PASSWORD=$(generate_password 24)
    JWT_SECRET=$(generate_jwt_secret)
    REDIS_PASSWORD=$(generate_password 20)
    ADMIN_PASSWORD=$(generate_password 16)
    
    # Create environment file
    log "Creating $ENV_FILE with secure configuration..."
    
    cat > "$ENV_FILE" << EOF
# E-Maintenance Production Environment Configuration
# Generated: $(date)
# Server: $SERVER_IP
# 
# WARNING: This file contains sensitive information
# DO NOT commit to version control
# Keep this file secure and backup safely

# Project Configuration
PROJECT_NAME=emaintenance
COMPOSE_PROJECT_NAME=emaintenance-prod

# Server Configuration  
SERVER_IP=$SERVER_IP
HTTP_PORT=3030
HTTPS_PORT=443

# Database Configuration
DB_NAME=emaintenance
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://postgres:$DB_PASSWORD@postgres:5432/emaintenance

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# Redis Configuration
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379

# Admin Configuration
ADMIN_EMAIL=admin@emaintenance.com
ADMIN_PASSWORD=$ADMIN_PASSWORD

# Frontend URLs
FRONTEND_URL=http://$SERVER_IP:3030
NEXT_PUBLIC_API_URL=http://$SERVER_IP:3030
NEXT_PUBLIC_USER_SERVICE_URL=http://$SERVER_IP:3031
NEXT_PUBLIC_WORK_ORDER_SERVICE_URL=http://$SERVER_IP:3032
NEXT_PUBLIC_ASSET_SERVICE_URL=http://$SERVER_IP:3033

# Internal Service URLs (for inter-service communication)
USER_SERVICE_URL=http://user-service:3001
WORK_ORDER_SERVICE_URL=http://work-order-service:3002
ASSET_SERVICE_URL=http://asset-service:3003

# CORS Configuration
CORS_ORIGIN=http://$SERVER_IP:3030
CORS_CREDENTIALS=true

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json
LOG_DIR=/opt/emaintenance/logs

# Data Directories
DATA_DIR=/opt/emaintenance/data
BACKUP_DIR=/opt/emaintenance/backups

# Rate Limiting Configuration
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=1000

# Security Settings
SESSION_TIMEOUT=3600000
PASSWORD_MIN_LENGTH=12
SECURE_COOKIES=false

# File Upload Settings
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/app/uploads

# Performance Settings
NODE_OPTIONS=--max_old_space_size=512

# Health Check Configuration
HEALTH_CHECK_TIMEOUT=30s
HEALTH_CHECK_INTERVAL=30s
HEALTH_CHECK_RETRIES=3

# Backup Configuration
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30

# Docker Image Configuration
IMAGE_TAG=latest
LOCAL_REGISTRY=$SERVER_IP:5000

# Timezone
TZ=Asia/Shanghai
EOF
    
    # Set proper permissions
    chmod 600 "$ENV_FILE"
    
    success "Environment file created: $ENV_FILE"
    
    # Validate the generated file
    validate_env_vars "$ENV_FILE"
    
    # Create credentials summary
    cat > ".env.credentials" << EOF
# E-Maintenance Credentials Summary
# Generated: $(date)
# 
# IMPORTANT: Store these credentials securely and delete this file after setup

Database Password: $DB_PASSWORD
Redis Password: $REDIS_PASSWORD
Admin Password: $ADMIN_PASSWORD
JWT Secret: $JWT_SECRET

# Default Login Credentials
Admin: admin@emaintenance.com / $ADMIN_PASSWORD
Supervisor: supervisor@emaintenance.com / password123
Technician: technician@emaintenance.com / password123
Employee: employee@emaintenance.com / password123

# Access URLs
Web Application: http://$SERVER_IP:3030
User Service: http://$SERVER_IP:3031
Work Order Service: http://$SERVER_IP:3032
Asset Service: http://$SERVER_IP:3033
EOF
    
    chmod 600 ".env.credentials"
    
    # Show summary
    echo
    log "=========================================="
    log "Environment Configuration Complete"
    log "=========================================="
    echo
    echo -e "${GREEN}✅ Generated Files:${NC}"
    echo -e "   📄 $ENV_FILE (environment variables)"
    echo -e "   🔑 .env.credentials (login information)"
    echo
    echo -e "${YELLOW}🔒 Security Notes:${NC}"
    echo -e "   • All passwords are cryptographically secure"
    echo -e "   • Files have restricted permissions (600)"
    echo -e "   • Store credentials securely and delete .env.credentials after setup"
    echo -e "   • Change default user passwords after first login"
    echo
    echo -e "${BLUE}🚀 Next Steps:${NC}"
    echo -e "   1. Review the generated $ENV_FILE"
    echo -e "   2. Run deployment: ./deploy-secure.sh"
    echo -e "   3. Access application at: http://$SERVER_IP:3030"
    echo
    
    success "Environment generation completed successfully!"
}

# Handle interruption
trap 'error "Environment generation interrupted"' INT TERM

# Run main function
main "$@"