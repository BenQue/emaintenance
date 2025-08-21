#!/bin/bash

# E-Maintenance Secure Password Generator
# ========================================
# Generates secure passwords for production deployment

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Generate secure password
generate_password() {
    local length=${1:-20}
    local password
    
    # Check if openssl is available
    if command -v openssl &> /dev/null; then
        password=$(openssl rand -base64 $((length * 3 / 4)) | tr -d '\n' | head -c $length)
    # Fallback to /dev/urandom
    elif [ -r /dev/urandom ]; then
        password=$(tr -dc 'A-Za-z0-9!@#$%^&*()_+-=' < /dev/urandom | head -c $length)
    else
        error "Cannot generate secure passwords. Install openssl or ensure /dev/urandom is available."
    fi
    
    echo "$password"
}

# Generate JWT secret (longer for security)
generate_jwt_secret() {
    local jwt_secret
    
    if command -v openssl &> /dev/null; then
        jwt_secret=$(openssl rand -base64 64 | tr -d '\n')
    else
        jwt_secret=$(tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 86)
    fi
    
    echo "$jwt_secret"
}

# Main script
main() {
    log "E-Maintenance Secure Password Generator"
    echo -e "${CYAN}========================================${NC}"
    echo
    
    # Check if .env.production already exists
    if [ -f ".env.production" ]; then
        warning ".env.production already exists!"
        read -p "Do you want to backup the existing file? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            backup_file=".env.production.backup.$(date +%Y%m%d-%H%M%S)"
            cp .env.production "$backup_file"
            info "Existing file backed up to: $backup_file"
        fi
        
        read -p "Generate new passwords and overwrite existing .env.production? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "Aborted. No changes made."
            exit 0
        fi
    fi
    
    # Get server IP
    read -p "Enter your server IP address (e.g., 10.163.144.13): " SERVER_IP
    if [ -z "$SERVER_IP" ]; then
        error "Server IP is required!"
    fi
    
    # Generate passwords
    log "Generating secure passwords..."
    
    DB_PASSWORD=$(generate_password 20)
    REDIS_PASSWORD=$(generate_password 16)
    JWT_SECRET=$(generate_jwt_secret)
    ADMIN_PASSWORD=$(generate_password 16)
    
    # Create .env.production from template
    if [ -f ".env.production.secure" ]; then
        cp .env.production.secure .env.production
    elif [ -f ".env.production.template" ]; then
        cp .env.production.template .env.production
    else
        error "No environment template found! Please ensure .env.production.secure exists."
    fi
    
    # Replace placeholders with generated values
    log "Configuring environment file..."
    
    # Use different sed syntax for macOS vs Linux
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|YOUR_DATABASE_PASSWORD_HERE|$DB_PASSWORD|g" .env.production
        sed -i '' "s|YOUR_REDIS_PASSWORD_HERE|$REDIS_PASSWORD|g" .env.production
        sed -i '' "s|YOUR_JWT_SECRET_HERE_MINIMUM_64_CHARACTERS|$JWT_SECRET|g" .env.production
        sed -i '' "s|YOUR_ADMIN_PASSWORD_HERE|$ADMIN_PASSWORD|g" .env.production
        sed -i '' "s|YOUR_SERVER_IP_HERE|$SERVER_IP|g" .env.production
        # Fix the DATABASE_URL after password replacement
        sed -i '' "s|\${DB_USER}|postgres|g" .env.production
        sed -i '' "s|\${DB_PASSWORD}|$DB_PASSWORD|g" .env.production
        sed -i '' "s|\${DB_NAME}|emaintenance|g" .env.production
        sed -i '' "s|\${REDIS_PASSWORD}|$REDIS_PASSWORD|g" .env.production
        sed -i '' "s|\${SERVER_IP}|$SERVER_IP|g" .env.production
    else
        # Linux
        sed -i "s|YOUR_DATABASE_PASSWORD_HERE|$DB_PASSWORD|g" .env.production
        sed -i "s|YOUR_REDIS_PASSWORD_HERE|$REDIS_PASSWORD|g" .env.production
        sed -i "s|YOUR_JWT_SECRET_HERE_MINIMUM_64_CHARACTERS|$JWT_SECRET|g" .env.production
        sed -i "s|YOUR_ADMIN_PASSWORD_HERE|$ADMIN_PASSWORD|g" .env.production
        sed -i "s|YOUR_SERVER_IP_HERE|$SERVER_IP|g" .env.production
        # Fix the DATABASE_URL after password replacement
        sed -i "s|\${DB_USER}|postgres|g" .env.production
        sed -i "s|\${DB_PASSWORD}|$DB_PASSWORD|g" .env.production
        sed -i "s|\${DB_NAME}|emaintenance|g" .env.production
        sed -i "s|\${REDIS_PASSWORD}|$REDIS_PASSWORD|g" .env.production
        sed -i "s|\${SERVER_IP}|$SERVER_IP|g" .env.production
    fi
    
    # Set secure permissions
    chmod 600 .env.production
    
    # Save credentials to a secure file
    CREDS_FILE="credentials-$(date +%Y%m%d-%H%M%S).txt"
    cat > "$CREDS_FILE" << EOF
E-Maintenance Production Credentials
=====================================
Generated: $(date)
Server IP: $SERVER_IP

Database:
---------
Username: postgres
Password: $DB_PASSWORD

Redis:
------
Password: $REDIS_PASSWORD

Admin User:
-----------
Email: admin@emaintenance.com
Password: $ADMIN_PASSWORD

JWT Secret:
-----------
$JWT_SECRET

IMPORTANT:
----------
1. Store this file in a secure location (password manager, encrypted storage)
2. Delete this file after saving the credentials securely
3. Never commit these credentials to version control
4. Change the admin password after first login
5. Consider enabling 2FA for admin accounts

Access URLs:
------------
Web Application: http://$SERVER_IP:3030
User Service API: http://$SERVER_IP:3031
Work Order Service API: http://$SERVER_IP:3032
Asset Service API: http://$SERVER_IP:3033
EOF
    
    chmod 600 "$CREDS_FILE"
    
    echo
    success "✅ Environment configuration completed successfully!"
    echo
    echo -e "${MAGENTA}Generated Credentials:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "Database Password:    ${YELLOW}$DB_PASSWORD${NC}"
    echo -e "Redis Password:       ${YELLOW}$REDIS_PASSWORD${NC}"
    echo -e "Admin Password:       ${YELLOW}$ADMIN_PASSWORD${NC}"
    echo -e "JWT Secret:           ${YELLOW}${JWT_SECRET:0:20}...${NC} (truncated)"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    warning "⚠️  IMPORTANT SECURITY NOTES:"
    echo "1. Credentials saved to: ${YELLOW}$CREDS_FILE${NC}"
    echo "2. ${RED}Store these credentials securely and delete the file${NC}"
    echo "3. ${RED}Never commit .env.production to Git${NC}"
    echo "4. Change the admin password after first login"
    echo
    info "Next steps:"
    echo "1. Review .env.production for any additional configuration"
    echo "2. Run ./deploy-secure.sh to deploy the application"
    echo "3. Securely store and then delete $CREDS_FILE"
}

# Add success function
success() {
    echo -e "${MAGENTA}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Run main function
main "$@"