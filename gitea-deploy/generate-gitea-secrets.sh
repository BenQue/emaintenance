#!/bin/bash

# E-Maintenance Gitea Secrets Generator
# =====================================
# Generates secure secrets and provides commands to set them in Gitea
# Version: 1.0.0
# Date: 2025-08-22

set -e
set -u

# Configuration
GITEA_URL="${GITEA_URL:-https://gitea.yourdomain.com}"
GITEA_ORG="${GITEA_ORG:-your-org}"
GITEA_REPO="${GITEA_REPO:-emaintenance}"
SECRETS_FILE="gitea-secrets-$(date +%Y%m%d-%H%M%S).txt"
ENV_FILE=".env.production"

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

# Generate secure random string
generate_secret() {
    local length="${1:-64}"
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

# Generate secure password
generate_password() {
    local length="${1:-16}"
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length" | \
    sed 's/$/A1!/' | cut -c1-"$length"  # Ensure complexity
}

# Generate SSH key pair for deployment
generate_ssh_key() {
    local key_name="emaintenance-deploy-$(date +%Y%m%d)"
    
    ssh-keygen -t ed25519 -f "$key_name" -N "" -C "emaintenance-deploy@$(hostname)"
    
    # Base64 encode private key for Gitea secret
    local private_key_b64=$(base64 -w 0 < "$key_name")
    
    echo "$private_key_b64"
    
    # Show public key for server setup
    echo -e "\n${CYAN}Add this public key to your deployment server:${NC}"
    echo -e "${YELLOW}$(cat ${key_name}.pub)${NC}"
    echo -e "\n${CYAN}Command to add to authorized_keys:${NC}"
    echo -e "${YELLOW}echo '$(cat ${key_name}.pub)' >> ~/.ssh/authorized_keys${NC}"
}

# Collect deployment information
collect_deployment_info() {
    echo -e "${CYAN}${BOLD}=== Deployment Information Collection ===${NC}"
    
    read -p "Production server hostname/IP: " DEPLOY_HOST
    read -p "Deployment user (default: ubuntu): " DEPLOY_USER
    DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
    
    read -p "Docker registry URL (leave empty for Docker Hub): " DOCKER_REGISTRY
    if [ -n "$DOCKER_REGISTRY" ]; then
        read -p "Docker registry username: " DOCKER_REGISTRY_USER
        read -s -p "Docker registry password/token: " DOCKER_REGISTRY_TOKEN
        echo
    fi
    
    read -p "Webhook endpoint URL: " WEBHOOK_URL
    read -p "Notification webhook (Slack/Discord): " NOTIFICATION_WEBHOOK
    
    read -p "Admin email: " ADMIN_EMAIL
    read -s -p "Admin password (will generate if empty): " ADMIN_PASSWORD
    echo
    
    if [ -z "$ADMIN_PASSWORD" ]; then
        ADMIN_PASSWORD=$(generate_password 16)
        echo -e "${YELLOW}Generated admin password: $ADMIN_PASSWORD${NC}"
    fi
}

# Generate all secrets
generate_all_secrets() {
    log "Generating secure secrets for E-Maintenance deployment"
    
    # Database secrets
    DB_PASSWORD=$(generate_password 20)
    
    # JWT secrets
    JWT_SECRET=$(generate_secret 64)
    JWT_REFRESH_SECRET=$(generate_secret 64)
    
    # Redis password
    REDIS_PASSWORD=$(generate_password 16)
    
    # Webhook secret
    WEBHOOK_SECRET=$(generate_secret 32)
    
    # Backup encryption key
    BACKUP_ENCRYPTION_KEY=$(generate_secret 32)
    
    # SSH key for deployment
    log "Generating SSH key pair for deployment"
    DEPLOY_SSH_KEY=$(generate_ssh_key)
    
    success "All secrets generated successfully"
}

# Create secrets file
create_secrets_file() {
    log "Creating secrets file: $SECRETS_FILE"
    
    cat > "$SECRETS_FILE" << EOF
# E-Maintenance Gitea Secrets
# Generated: $(date)
# 
# IMPORTANT: Store this file securely and delete after setting up secrets in Gitea
# Never commit this file to version control!

# === Core Database Secrets ===
GITEA_SECRET_DB_PASSWORD=$DB_PASSWORD
GITEA_SECRET_JWT_SECRET=$JWT_SECRET
GITEA_SECRET_JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
GITEA_SECRET_REDIS_PASSWORD=$REDIS_PASSWORD

# === Admin Configuration ===
GITEA_SECRET_ADMIN_PASSWORD=$ADMIN_PASSWORD

# === Deployment Configuration ===
GITEA_SECRET_DEPLOY_HOST=$DEPLOY_HOST
GITEA_SECRET_DEPLOY_USER=$DEPLOY_USER
GITEA_SECRET_DEPLOY_SSH_KEY=$DEPLOY_SSH_KEY

# === Docker Registry (if applicable) ===
GITEA_SECRET_DOCKER_REGISTRY=$DOCKER_REGISTRY
GITEA_SECRET_DOCKER_REGISTRY_USER=$DOCKER_REGISTRY_USER
GITEA_SECRET_DOCKER_REGISTRY_TOKEN=$DOCKER_REGISTRY_TOKEN

# === Webhook Configuration ===
GITEA_SECRET_WEBHOOK_SECRET=$WEBHOOK_SECRET
GITEA_SECRET_DEPLOY_WEBHOOK_URL=$WEBHOOK_URL
GITEA_SECRET_NOTIFICATION_WEBHOOK=$NOTIFICATION_WEBHOOK

# === Backup & Security ===
GITEA_SECRET_BACKUP_ENCRYPTION_KEY=$BACKUP_ENCRYPTION_KEY

# === CORS Configuration ===
GITEA_SECRET_CORS_ORIGIN=http://$DEPLOY_HOST:3000,https://$DEPLOY_HOST

EOF
    
    # Secure the file
    chmod 600 "$SECRETS_FILE"
    
    success "Secrets file created: $SECRETS_FILE"
}

# Generate Gitea CLI commands
generate_gitea_commands() {
    local commands_file="gitea-secrets-commands.sh"
    
    log "Generating Gitea CLI commands: $commands_file"
    
    cat > "$commands_file" << EOF
#!/bin/bash
# Gitea Secrets Setup Commands
# Run these commands to set up secrets in Gitea
# Make sure you have the Gitea CLI (tea) installed and configured

# Set repository secrets using tea CLI
tea repos secrets create --repo $GITEA_ORG/$GITEA_REPO --name DB_PASSWORD --data "$DB_PASSWORD"
tea repos secrets create --repo $GITEA_ORG/$GITEA_REPO --name JWT_SECRET --data "$JWT_SECRET"
tea repos secrets create --repo $GITEA_ORG/$GITEA_REPO --name JWT_REFRESH_SECRET --data "$JWT_REFRESH_SECRET"
tea repos secrets create --repo $GITEA_ORG/$GITEA_REPO --name REDIS_PASSWORD --data "$REDIS_PASSWORD"
tea repos secrets create --repo $GITEA_ORG/$GITEA_REPO --name ADMIN_PASSWORD --data "$ADMIN_PASSWORD"
tea repos secrets create --repo $GITEA_ORG/$GITEA_REPO --name DEPLOY_HOST --data "$DEPLOY_HOST"
tea repos secrets create --repo $GITEA_ORG/$GITEA_REPO --name DEPLOY_USER --data "$DEPLOY_USER"
tea repos secrets create --repo $GITEA_ORG/$GITEA_REPO --name DEPLOY_SSH_KEY --data "$DEPLOY_SSH_KEY"
tea repos secrets create --repo $GITEA_ORG/$GITEA_REPO --name WEBHOOK_SECRET --data "$WEBHOOK_SECRET"
tea repos secrets create --repo $GITEA_ORG/$GITEA_REPO --name DEPLOY_WEBHOOK_URL --data "$WEBHOOK_URL"
tea repos secrets create --repo $GITEA_ORG/$GITEA_REPO --name NOTIFICATION_WEBHOOK --data "$NOTIFICATION_WEBHOOK"
tea repos secrets create --repo $GITEA_ORG/$GITEA_REPO --name BACKUP_ENCRYPTION_KEY --data "$BACKUP_ENCRYPTION_KEY"
EOF

    if [ -n "$DOCKER_REGISTRY" ]; then
        cat >> "$commands_file" << EOF
tea repos secrets create --repo $GITEA_ORG/$GITEA_REPO --name DOCKER_REGISTRY --data "$DOCKER_REGISTRY"
tea repos secrets create --repo $GITEA_ORG/$GITEA_REPO --name DOCKER_REGISTRY_USER --data "$DOCKER_REGISTRY_USER"
tea repos secrets create --repo $GITEA_ORG/$GITEA_REPO --name DOCKER_REGISTRY_TOKEN --data "$DOCKER_REGISTRY_TOKEN"
EOF
    fi
    
    chmod +x "$commands_file"
    
    success "Gitea commands generated: $commands_file"
}

# Generate production environment file
generate_production_env() {
    log "Generating production environment file: $ENV_FILE"
    
    cat > "$ENV_FILE" << EOF
# E-Maintenance Production Environment Configuration
# Generated: $(date)
# This file should be deployed to the production server

# === DATABASE CONFIGURATION ===
DB_NAME=emaintenance
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD
DB_HOST=postgres
DB_PORT=5432
DATABASE_URL=postgresql://postgres:$DB_PASSWORD@postgres:5432/emaintenance

# === SECURITY CONFIGURATION ===
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN=30d

# === REDIS CONFIGURATION ===
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_URL=redis://default:$REDIS_PASSWORD@redis:6379

# === ADMIN CONFIGURATION ===
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
ADMIN_FIRST_NAME=System
ADMIN_LAST_NAME=Administrator

# === APPLICATION CONFIGURATION ===
NODE_ENV=production
LOG_LEVEL=info
LOG_DIR=/var/log/emaintenance
CORS_ORIGIN=http://$DEPLOY_HOST:3000,https://$DEPLOY_HOST

# === SERVICE URLS ===
USER_SERVICE_URL=http://user-service:3001
WORK_ORDER_SERVICE_URL=http://work-order-service:3002
ASSET_SERVICE_URL=http://asset-service:3003

# === PUBLIC URLS ===
NEXT_PUBLIC_API_URL=http://$DEPLOY_HOST:3001
NEXT_PUBLIC_USER_SERVICE_URL=http://$DEPLOY_HOST:3001
NEXT_PUBLIC_WORK_ORDER_SERVICE_URL=http://$DEPLOY_HOST:3002
NEXT_PUBLIC_ASSET_SERVICE_URL=http://$DEPLOY_HOST:3003

# === RATE LIMITING ===
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=1000

# === SESSION CONFIGURATION ===
SESSION_TIMEOUT=3600000
SESSION_EXTEND_ON_ACTIVITY=true
MAX_SESSIONS_PER_USER=5

# === PASSWORD POLICY ===
PASSWORD_MIN_LENGTH=12
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL=true

# === BACKUP CONFIGURATION ===
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30
BACKUP_DIR=/opt/emaintenance/backups
BACKUP_ENCRYPTION_KEY=$BACKUP_ENCRYPTION_KEY

# === MONITORING ===
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000

# === WEBHOOK CONFIGURATION ===
WEBHOOK_SECRET=$WEBHOOK_SECRET
WEBHOOK_PORT=9000

# === PROJECT METADATA ===
PROJECT_NAME=emaintenance
EOF
    
    chmod 600 "$ENV_FILE"
    
    success "Production environment file created: $ENV_FILE"
}

# Create setup instructions
create_setup_instructions() {
    local instructions_file="GITEA_SETUP_INSTRUCTIONS.md"
    
    cat > "$instructions_file" << EOF
# Gitea Secrets Setup Instructions

## 1. Install Gitea CLI (tea)

\`\`\`bash
# Download tea CLI
curl -sSL https://gitea.com/gitea/tea/releases/latest/download/tea-linux-amd64 -o tea
chmod +x tea
sudo mv tea /usr/local/bin/

# Login to your Gitea instance
tea login add --name main --url $GITEA_URL --token YOUR_ACCESS_TOKEN
\`\`\`

## 2. Set Repository Secrets

Run the generated commands file:

\`\`\`bash
chmod +x gitea-secrets-commands.sh
./gitea-secrets-commands.sh
\`\`\`

Or set secrets manually in Gitea UI:
- Go to: $GITEA_URL/$GITEA_ORG/$GITEA_REPO/settings/actions/secrets
- Add each secret from the secrets file

## 3. Deploy Production Environment File

Copy the production environment file to your server:

\`\`\`bash
scp $ENV_FILE $DEPLOY_USER@$DEPLOY_HOST:/opt/emaintenance/docker-deploy/.env.production
\`\`\`

## 4. Setup SSH Key for Deployment

On your deployment server, add the public key to authorized_keys:

\`\`\`bash
mkdir -p ~/.ssh
echo '$(cat emaintenance-deploy-*.pub)' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
\`\`\`

## 5. Test Deployment

Trigger a test deployment by pushing to main branch or run manually:

\`\`\`bash
cd /opt/emaintenance
git pull origin main
cd docker-deploy
./deploy-secure.sh
\`\`\`

## 6. Verify Services

Check that all services are running:

\`\`\`bash
curl http://$DEPLOY_HOST:3001/health  # User service
curl http://$DEPLOY_HOST:3002/health  # Work order service
curl http://$DEPLOY_HOST:3003/health  # Asset service
curl http://$DEPLOY_HOST:3000         # Web application
\`\`\`

## Security Notes

- Delete the secrets file after setup: \`rm $SECRETS_FILE\`
- Rotate secrets regularly
- Monitor access logs
- Enable 2FA on Gitea accounts
- Use secure communication channels for secrets sharing

## Troubleshooting

- Check Gitea Actions logs in the repository
- Verify webhook endpoint is accessible
- Ensure SSH key has proper permissions
- Check Docker service status on deployment server
EOF

    success "Setup instructions created: $instructions_file"
}

# Show summary
show_summary() {
    echo -e "\n${CYAN}${BOLD}=== E-Maintenance Gitea Setup Summary ===${NC}"
    echo -e "${GREEN}✓ Secrets generated and saved to: $SECRETS_FILE${NC}"
    echo -e "${GREEN}✓ Gitea commands created: gitea-secrets-commands.sh${NC}"
    echo -e "${GREEN}✓ Production env file: $ENV_FILE${NC}"
    echo -e "${GREEN}✓ Setup instructions: GITEA_SETUP_INSTRUCTIONS.md${NC}"
    
    echo -e "\n${YELLOW}${BOLD}Next Steps:${NC}"
    echo -e "1. Install Gitea CLI (tea) and login to your instance"
    echo -e "2. Run: ${CYAN}./gitea-secrets-commands.sh${NC}"
    echo -e "3. Copy environment file to production server"
    echo -e "4. Add SSH public key to deployment server"
    echo -e "5. Test deployment"
    
    echo -e "\n${RED}${BOLD}Security Reminder:${NC}"
    echo -e "${RED}Delete the secrets file after setup: rm $SECRETS_FILE${NC}"
    
    echo -e "\n${BLUE}Files created:${NC}"
    ls -la gitea-secrets-* GITEA_SETUP_INSTRUCTIONS.md .env.production emaintenance-deploy-* 2>/dev/null || true
}

# Main execution
main() {
    echo -e "${CYAN}${BOLD}E-Maintenance Gitea Secrets Generator${NC}"
    echo -e "${CYAN}=====================================${NC}\n"
    
    # Check dependencies
    if ! command -v openssl &> /dev/null; then
        error "OpenSSL is required but not installed"
    fi
    
    if ! command -v ssh-keygen &> /dev/null; then
        error "ssh-keygen is required but not installed"
    fi
    
    # Collect information
    collect_deployment_info
    
    # Generate secrets
    generate_all_secrets
    
    # Create output files
    create_secrets_file
    generate_gitea_commands
    generate_production_env
    create_setup_instructions
    
    # Show summary
    show_summary
}

# Run main function
main "$@"