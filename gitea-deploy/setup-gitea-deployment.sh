#!/bin/bash

# E-Maintenance Gitea Deployment Setup Script
# ============================================
# Complete setup for Gitea-based CI/CD deployment
# Run this script on your production server after repository setup
# Version: 1.0.0
# Date: 2025-08-22

set -e
set -u

# Configuration
DEPLOY_DIR="/opt/emaintenance"
GITEA_REPO="${GITEA_REPO:-git@gitea.yourdomain.com:your-org/emaintenance.git}"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
LOG_DIR="/var/log/emaintenance"
SYSTEMD_DIR="/etc/systemd/system"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# Logging functions
log() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"; exit 1; }
warning() { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"; }
info() { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"; }
success() { echo -e "${MAGENTA}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}"; }

# Show banner
show_banner() {
    echo -e "${CYAN}${BOLD}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                 E-Maintenance Gitea Setup                   ║
║             Production Deployment Configuration             ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking system prerequisites"
    
    # Check if running as correct user
    if [ "$USER" != "$DEPLOY_USER" ] && [ "$USER" != "root" ]; then
        error "This script should be run as $DEPLOY_USER or root"
    fi
    
    # Check required commands
    local required_commands=("git" "docker" "curl" "openssl" "ssh-keygen")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &>/dev/null; then
            error "Required command not found: $cmd"
        fi
    done
    
    # Check Docker service
    if ! systemctl is-active --quiet docker; then
        warning "Docker service not running, attempting to start"
        sudo systemctl start docker || error "Failed to start Docker"
    fi
    
    # Check Docker Compose
    if ! docker compose version &>/dev/null; then
        error "Docker Compose not available"
    fi
    
    success "All prerequisites satisfied"
}

# Setup directories and permissions
setup_directories() {
    log "Setting up directories and permissions"
    
    # Create directories
    sudo mkdir -p "$DEPLOY_DIR"
    sudo mkdir -p "$LOG_DIR"
    sudo mkdir -p "/opt/emaintenance/backups"
    sudo mkdir -p "/var/run/emaintenance"
    
    # Set ownership
    sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_DIR"
    sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "$LOG_DIR"
    sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "/opt/emaintenance/backups"
    sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "/var/run/emaintenance"
    
    # Set permissions
    chmod 755 "$DEPLOY_DIR"
    chmod 755 "$LOG_DIR"
    chmod 755 "/opt/emaintenance/backups"
    chmod 755 "/var/run/emaintenance"
    
    success "Directories configured"
}

# Clone repository
clone_repository() {
    log "Cloning E-Maintenance repository from Gitea"
    
    if [ -d "$DEPLOY_DIR/.git" ]; then
        info "Repository already exists, updating..."
        cd "$DEPLOY_DIR"
        git fetch origin
        git reset --hard origin/main
    else
        info "Cloning repository..."
        git clone "$GITEA_REPO" "$DEPLOY_DIR"
        cd "$DEPLOY_DIR"
    fi
    
    # Verify repository structure
    if [ ! -f "docker-deploy/docker-compose.production.yml" ]; then
        error "Repository structure invalid - missing docker-compose.production.yml"
    fi
    
    if [ ! -d "gitea-deploy" ]; then
        error "Repository structure invalid - missing gitea-deploy directory"
    fi
    
    success "Repository cloned and verified"
}

# Setup SSH key for deployment
setup_ssh_key() {
    log "Setting up SSH key for deployment"
    
    local ssh_dir="$HOME/.ssh"
    local key_file="$ssh_dir/emaintenance_deploy"
    
    mkdir -p "$ssh_dir"
    chmod 700 "$ssh_dir"
    
    if [ ! -f "$key_file" ]; then
        info "Generating SSH key for deployment"
        ssh-keygen -t ed25519 -f "$key_file" -N "" -C "emaintenance-deploy@$(hostname)"
        
        echo -e "\n${CYAN}${BOLD}Add this public key to your Gitea repository deploy keys:${NC}"
        echo -e "${YELLOW}$(cat ${key_file}.pub)${NC}"
        echo -e "\n${CYAN}Repository → Settings → Deploy Keys → Add Key${NC}"
        
        read -p "Press Enter after adding the deploy key to Gitea..."
    fi
    
    # Test SSH connection
    if ssh -T -i "$key_file" -o StrictHostKeyChecking=no git@gitea.yourdomain.com 2>&1 | grep -q "successfully authenticated"; then
        success "SSH key authentication successful"
    else
        warning "SSH key test failed - please verify the key is added to Gitea"
    fi
}

# Install systemd services
install_systemd_services() {
    log "Installing systemd services"
    
    cd "$DEPLOY_DIR/gitea-deploy"
    
    # Make scripts executable
    chmod +x deploy-webhook.sh
    chmod +x zero-downtime-deploy.sh
    chmod +x rollback.sh
    chmod +x health-monitor.sh
    chmod +x generate-gitea-secrets.sh
    
    # Install webhook service
    sudo cp emaintenance-webhook.service "$SYSTEMD_DIR/"
    sudo cp emaintenance-health.service "$SYSTEMD_DIR/"
    sudo cp emaintenance-health.timer "$SYSTEMD_DIR/"
    
    # Reload systemd
    sudo systemctl daemon-reload
    
    # Enable services
    sudo systemctl enable emaintenance-webhook.service
    sudo systemctl enable emaintenance-health.timer
    
    success "Systemd services installed"
}

# Setup firewall rules
setup_firewall() {
    log "Configuring firewall rules"
    
    if command -v ufw &>/dev/null; then
        # UFW firewall
        sudo ufw allow 22/tcp      # SSH
        sudo ufw allow 80/tcp      # HTTP
        sudo ufw allow 443/tcp     # HTTPS
        sudo ufw allow 3000/tcp    # Web app
        sudo ufw allow 9000/tcp    # Webhook
        
        # Enable UFW if not already enabled
        sudo ufw --force enable || warning "UFW enable failed"
        
        success "UFW firewall configured"
    elif command -v firewall-cmd &>/dev/null; then
        # FirewallD
        sudo firewall-cmd --permanent --add-port=22/tcp
        sudo firewall-cmd --permanent --add-port=80/tcp
        sudo firewall-cmd --permanent --add-port=443/tcp
        sudo firewall-cmd --permanent --add-port=3000/tcp
        sudo firewall-cmd --permanent --add-port=9000/tcp
        sudo firewall-cmd --reload
        
        success "FirewallD configured"
    else
        warning "No supported firewall found - please configure manually"
    fi
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring and logging"
    
    # Create log rotation configuration
    cat > /tmp/emaintenance-logrotate << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    create 644 $DEPLOY_USER $DEPLOY_USER
}
EOF
    
    sudo mv /tmp/emaintenance-logrotate /etc/logrotate.d/emaintenance
    
    # Test log rotation
    sudo logrotate -d /etc/logrotate.d/emaintenance
    
    success "Monitoring and logging configured"
}

# Create environment file template
create_env_template() {
    log "Creating environment file template"
    
    if [ ! -f "$DEPLOY_DIR/docker-deploy/.env.production" ]; then
        cat > "$DEPLOY_DIR/docker-deploy/.env.production.template" << EOF
# E-Maintenance Production Environment
# Copy this file to .env.production and fill in the values

# Database Configuration
DB_NAME=emaintenance
DB_USER=postgres
DB_PASSWORD=YOUR_SECURE_DATABASE_PASSWORD
DATABASE_URL=postgresql://postgres:YOUR_SECURE_DATABASE_PASSWORD@postgres:5432/emaintenance

# Security Keys
JWT_SECRET=YOUR_64_CHAR_JWT_SECRET
JWT_EXPIRES_IN=7d
REDIS_PASSWORD=YOUR_SECURE_REDIS_PASSWORD
REDIS_URL=redis://default:YOUR_SECURE_REDIS_PASSWORD@redis:6379

# Admin Configuration
ADMIN_EMAIL=admin@emaintenance.com
ADMIN_PASSWORD=YOUR_SECURE_ADMIN_PASSWORD

# Application Configuration
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGIN=http://$(hostname -I | awk '{print $1}'):3000

# Service URLs
NEXT_PUBLIC_API_URL=http://$(hostname -I | awk '{print $1}'):3001
NEXT_PUBLIC_USER_SERVICE_URL=http://$(hostname -I | awk '{print $1}'):3001
NEXT_PUBLIC_WORK_ORDER_SERVICE_URL=http://$(hostname -I | awk '{print $1}'):3002
NEXT_PUBLIC_ASSET_SERVICE_URL=http://$(hostname -I | awk '{print $1}'):3003

# Webhook Configuration
WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
WEBHOOK_PORT=9000

# Notification
NOTIFICATION_WEBHOOK=YOUR_SLACK_WEBHOOK_URL
EOF
        
        warning "Environment template created. Please copy and configure .env.production"
        echo -e "${CYAN}Commands to configure:${NC}"
        echo -e "1. ${YELLOW}cd $DEPLOY_DIR/gitea-deploy${NC}"
        echo -e "2. ${YELLOW}./generate-gitea-secrets.sh${NC}"
        echo -e "3. ${YELLOW}cp .env.production $DEPLOY_DIR/docker-deploy/${NC}"
    fi
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment setup"
    
    # Check systemd services
    if systemctl is-enabled emaintenance-webhook &>/dev/null; then
        success "✓ Webhook service enabled"
    else
        warning "✗ Webhook service not enabled"
    fi
    
    if systemctl is-enabled emaintenance-health.timer &>/dev/null; then
        success "✓ Health monitoring timer enabled"
    else
        warning "✗ Health monitoring timer not enabled"
    fi
    
    # Check scripts
    local scripts=("deploy-webhook.sh" "health-monitor.sh" "rollback.sh" "zero-downtime-deploy.sh")
    for script in "${scripts[@]}"; do
        if [ -x "$DEPLOY_DIR/gitea-deploy/$script" ]; then
            success "✓ $script is executable"
        else
            warning "✗ $script is not executable"
        fi
    done
    
    # Check directories
    local dirs=("$LOG_DIR" "/opt/emaintenance/backups" "/var/run/emaintenance")
    for dir in "${dirs[@]}"; do
        if [ -d "$dir" ] && [ -w "$dir" ]; then
            success "✓ Directory $dir is writable"
        else
            warning "✗ Directory $dir is not accessible"
        fi
    done
}

# Show next steps
show_next_steps() {
    echo -e "\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}${BOLD}║                    Setup Complete!                          ║${NC}"
    echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
    
    echo -e "\n${GREEN}${BOLD}Next Steps:${NC}"
    echo -e "${YELLOW}1. Configure secrets in Gitea:${NC}"
    echo -e "   cd $DEPLOY_DIR/gitea-deploy"
    echo -e "   ./generate-gitea-secrets.sh"
    echo -e "   ./gitea-secrets-commands.sh"
    
    echo -e "\n${YELLOW}2. Configure production environment:${NC}"
    echo -e "   cp .env.production $DEPLOY_DIR/docker-deploy/"
    echo -e "   vim $DEPLOY_DIR/docker-deploy/.env.production"
    
    echo -e "\n${YELLOW}3. Start services:${NC}"
    echo -e "   sudo systemctl start emaintenance-webhook"
    echo -e "   sudo systemctl start emaintenance-health.timer"
    
    echo -e "\n${YELLOW}4. Run initial deployment:${NC}"
    echo -e "   cd $DEPLOY_DIR/docker-deploy"
    echo -e "   ./deploy-secure.sh"
    
    echo -e "\n${YELLOW}5. Configure Gitea webhook:${NC}"
    echo -e "   URL: http://$(hostname -I | awk '{print $1}'):9000/deploy"
    echo -e "   Secret: [Use WEBHOOK_SECRET from .env.production]"
    echo -e "   Events: Push events"
    
    echo -e "\n${GREEN}${BOLD}Useful Commands:${NC}"
    echo -e "${CYAN}Status:${NC}        ./health-monitor.sh status"
    echo -e "${CYAN}Logs:${NC}          sudo journalctl -u emaintenance-webhook -f"
    echo -e "${CYAN}Rollback:${NC}      ./rollback.sh interactive"
    echo -e "${CYAN}Zero-downtime:${NC} ./zero-downtime-deploy.sh"
    
    echo -e "\n${BLUE}Documentation: $DEPLOY_DIR/gitea-deploy/DEPLOYMENT_GUIDE.md${NC}"
}

# Main execution
main() {
    show_banner
    
    log "Starting E-Maintenance Gitea deployment setup"
    
    check_prerequisites
    setup_directories
    clone_repository
    setup_ssh_key
    install_systemd_services
    setup_firewall
    setup_monitoring
    create_env_template
    verify_deployment
    
    show_next_steps
    
    success "E-Maintenance Gitea deployment setup completed!"
}

# Handle script arguments
case "${1:-setup}" in
    setup)
        main
        ;;
    verify)
        verify_deployment
        ;;
    services)
        install_systemd_services
        ;;
    firewall)
        setup_firewall
        ;;
    *)
        echo "Usage: $0 {setup|verify|services|firewall}"
        echo "  setup    - Complete setup (default)"
        echo "  verify   - Verify current setup"
        echo "  services - Install systemd services only"
        echo "  firewall - Configure firewall only"
        exit 1
        ;;
esac