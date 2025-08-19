#!/bin/bash

# E-Maintenance System Backup Script
# Creates comprehensive backups of database, uploads, and configuration

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_BASE_DIR="/opt/emaintenance/backups"
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_BASE_DIR/backup_$BACKUP_TIMESTAMP"
LOG_FILE="/opt/emaintenance/logs/backup-$BACKUP_TIMESTAMP.log"
RETENTION_DAYS=30

# Functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# Create backup directory
create_backup_dir() {
    log "Creating backup directory: $BACKUP_DIR"
    
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    
    log "Backup directory created successfully"
}

# Backup database
backup_database() {
    log "Starting database backup..."
    
    if docker ps --format '{{.Names}}' | grep -q "emaintenance-db"; then
        info "Backing up PostgreSQL database..."
        
        # Create SQL dump
        docker exec emaintenance-db pg_dump -U postgres emaintenance > "$BACKUP_DIR/database_backup.sql"
        
        # Create compressed backup
        gzip "$BACKUP_DIR/database_backup.sql"
        
        # Verify backup file
        if [[ -f "$BACKUP_DIR/database_backup.sql.gz" ]]; then
            backup_size=$(du -h "$BACKUP_DIR/database_backup.sql.gz" | cut -f1)
            log "Database backup completed successfully (Size: $backup_size)"
        else
            error "Database backup file not found"
        fi
    else
        warning "Database container not running, skipping database backup"
    fi
}

# Backup uploaded files
backup_uploads() {
    log "Starting uploads backup..."
    
    # Check if uploads volume exists
    if docker volume ls | grep -q "emaintenance.*work_order_uploads"; then
        info "Backing up work order uploads..."
        
        # Create uploads backup directory
        mkdir -p "$BACKUP_DIR/uploads"
        
        # Copy files from Docker volume
        docker run --rm -v emaintenance-prod_work_order_uploads:/source -v "$BACKUP_DIR/uploads":/backup alpine sh -c "cp -r /source/* /backup/ 2>/dev/null || true"
        
        # Create compressed archive
        if [[ -d "$BACKUP_DIR/uploads" && "$(ls -A $BACKUP_DIR/uploads)" ]]; then
            tar -czf "$BACKUP_DIR/uploads_backup.tar.gz" -C "$BACKUP_DIR" uploads
            rm -rf "$BACKUP_DIR/uploads"
            
            backup_size=$(du -h "$BACKUP_DIR/uploads_backup.tar.gz" | cut -f1)
            log "Uploads backup completed successfully (Size: $backup_size)"
        else
            info "No uploads found to backup"
        fi
    else
        info "No uploads volume found, skipping uploads backup"
    fi
}

# Backup configuration files
backup_configuration() {
    log "Starting configuration backup..."
    
    mkdir -p "$BACKUP_DIR/config"
    
    # Copy Docker Compose files
    if [[ -f "docker-compose.production.yml" ]]; then
        cp "docker-compose.production.yml" "$BACKUP_DIR/config/"
    fi
    
    # Copy environment file (excluding sensitive data)
    if [[ -f ".env.production" ]]; then
        # Create sanitized env file
        grep -v -E "(PASSWORD|SECRET|TOKEN)" ".env.production" > "$BACKUP_DIR/config/env.production.template" || true
        echo "# Sensitive values removed for security" >> "$BACKUP_DIR/config/env.production.template"
    fi
    
    # Copy nginx configuration
    if [[ -f "nginx/nginx.conf" ]]; then
        cp "nginx/nginx.conf" "$BACKUP_DIR/config/"
    fi
    
    # Copy database init scripts
    if [[ -d "database/init" ]]; then
        cp -r "database/init" "$BACKUP_DIR/config/"
    fi
    
    log "Configuration backup completed successfully"
}

# Create system info snapshot
create_system_info() {
    log "Creating system information snapshot..."
    
    mkdir -p "$BACKUP_DIR/system"
    
    # Docker information
    docker --version > "$BACKUP_DIR/system/docker_version.txt"
    docker-compose --version >> "$BACKUP_DIR/system/docker_version.txt" 2>/dev/null || true
    docker compose version >> "$BACKUP_DIR/system/docker_version.txt" 2>/dev/null || true
    
    # Container status
    docker ps -a > "$BACKUP_DIR/system/container_status.txt"
    
    # Docker images
    docker images > "$BACKUP_DIR/system/docker_images.txt"
    
    # System information
    uname -a > "$BACKUP_DIR/system/system_info.txt"
    df -h >> "$BACKUP_DIR/system/system_info.txt"
    free -h >> "$BACKUP_DIR/system/system_info.txt"
    
    # Network configuration
    ip addr show > "$BACKUP_DIR/system/network_config.txt" 2>/dev/null || ifconfig > "$BACKUP_DIR/system/network_config.txt" 2>/dev/null || true
    
    log "System information snapshot created successfully"
}

# Create backup manifest
create_manifest() {
    log "Creating backup manifest..."
    
    cat > "$BACKUP_DIR/backup_manifest.txt" << EOF
E-Maintenance System Backup Manifest
=====================================

Backup Date: $(date)
Backup Directory: $BACKUP_DIR
Server: 10.163.144.13

Contents:
---------
EOF

    if [[ -f "$BACKUP_DIR/database_backup.sql.gz" ]]; then
        echo "✓ Database backup (PostgreSQL dump)" >> "$BACKUP_DIR/backup_manifest.txt"
        ls -lh "$BACKUP_DIR/database_backup.sql.gz" >> "$BACKUP_DIR/backup_manifest.txt"
    fi
    
    if [[ -f "$BACKUP_DIR/uploads_backup.tar.gz" ]]; then
        echo "✓ Uploads backup (Work order files)" >> "$BACKUP_DIR/backup_manifest.txt"
        ls -lh "$BACKUP_DIR/uploads_backup.tar.gz" >> "$BACKUP_DIR/backup_manifest.txt"
    fi
    
    if [[ -d "$BACKUP_DIR/config" ]]; then
        echo "✓ Configuration files" >> "$BACKUP_DIR/backup_manifest.txt"
        ls -la "$BACKUP_DIR/config/" >> "$BACKUP_DIR/backup_manifest.txt"
    fi
    
    if [[ -d "$BACKUP_DIR/system" ]]; then
        echo "✓ System information" >> "$BACKUP_DIR/backup_manifest.txt"
        ls -la "$BACKUP_DIR/system/" >> "$BACKUP_DIR/backup_manifest.txt"
    fi
    
    # Calculate total backup size
    total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    echo "" >> "$BACKUP_DIR/backup_manifest.txt"
    echo "Total Backup Size: $total_size" >> "$BACKUP_DIR/backup_manifest.txt"
    
    log "Backup manifest created successfully"
}

# Clean old backups
clean_old_backups() {
    log "Cleaning old backups (older than $RETENTION_DAYS days)..."
    
    if [[ -d "$BACKUP_BASE_DIR" ]]; then
        # Find and remove old backup directories
        find "$BACKUP_BASE_DIR" -type d -name "backup_*" -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
        
        # Count remaining backups
        backup_count=$(find "$BACKUP_BASE_DIR" -type d -name "backup_*" | wc -l)
        log "Cleanup completed. $backup_count backups retained."
    fi
}

# Verify backup integrity
verify_backup() {
    log "Verifying backup integrity..."
    
    errors=0
    
    # Check database backup
    if [[ -f "$BACKUP_DIR/database_backup.sql.gz" ]]; then
        if gzip -t "$BACKUP_DIR/database_backup.sql.gz"; then
            info "Database backup integrity: OK"
        else
            error "Database backup integrity: FAILED"
            ((errors++))
        fi
    fi
    
    # Check uploads backup
    if [[ -f "$BACKUP_DIR/uploads_backup.tar.gz" ]]; then
        if tar -tzf "$BACKUP_DIR/uploads_backup.tar.gz" >/dev/null; then
            info "Uploads backup integrity: OK"
        else
            error "Uploads backup integrity: FAILED"
            ((errors++))
        fi
    fi
    
    # Check manifest
    if [[ -f "$BACKUP_DIR/backup_manifest.txt" ]]; then
        info "Backup manifest: PRESENT"
    else
        warning "Backup manifest: MISSING"
        ((errors++))
    fi
    
    if [[ $errors -eq 0 ]]; then
        log "Backup verification completed successfully"
    else
        error "Backup verification failed with $errors errors"
    fi
}

# Generate backup report
generate_report() {
    log "Generating backup report..."
    
    total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    
    echo -e "${GREEN}"
    echo "=============================================="
    echo "  E-Maintenance Backup Report"
    echo "=============================================="
    echo -e "${NC}"
    echo "Backup Timestamp: $BACKUP_TIMESTAMP"
    echo "Backup Location:  $BACKUP_DIR"
    echo "Total Size:       $total_size"
    echo "Log File:         $LOG_FILE"
    echo ""
    echo "Backup Contents:"
    
    if [[ -f "$BACKUP_DIR/database_backup.sql.gz" ]]; then
        db_size=$(du -h "$BACKUP_DIR/database_backup.sql.gz" | cut -f1)
        echo "  ✓ Database backup ($db_size)"
    fi
    
    if [[ -f "$BACKUP_DIR/uploads_backup.tar.gz" ]]; then
        uploads_size=$(du -h "$BACKUP_DIR/uploads_backup.tar.gz" | cut -f1)
        echo "  ✓ Uploads backup ($uploads_size)"
    fi
    
    if [[ -d "$BACKUP_DIR/config" ]]; then
        config_size=$(du -sh "$BACKUP_DIR/config" | cut -f1)
        echo "  ✓ Configuration files ($config_size)"
    fi
    
    if [[ -d "$BACKUP_DIR/system" ]]; then
        system_size=$(du -sh "$BACKUP_DIR/system" | cut -f1)
        echo "  ✓ System information ($system_size)"
    fi
    
    echo ""
    echo -e "${GREEN}Backup completed successfully!${NC}"
}

# Main function
main() {
    log "Starting E-Maintenance system backup..."
    
    create_backup_dir
    backup_database
    backup_uploads
    backup_configuration
    create_system_info
    create_manifest
    verify_backup
    clean_old_backups
    generate_report
    
    log "Backup process completed successfully at $(date)"
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi