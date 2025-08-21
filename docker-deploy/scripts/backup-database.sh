#!/bin/bash

# E-Maintenance Database Backup Script
# ====================================
# This script creates automated backups of the PostgreSQL database
# with compression and retention management

set -e  # Exit on any error

# Configuration
DB_NAME="${POSTGRES_DB:-emaintenance}"
DB_USER="${POSTGRES_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="emaintenance_backup_${TIMESTAMP}.sql"
COMPRESSED_FILE="emaintenance_backup_${TIMESTAMP}.sql.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if PostgreSQL is accessible
log "Checking database connectivity..."
if ! pg_isready -h postgres -U "$DB_USER" -d "$DB_NAME" &>/dev/null; then
    error "Cannot connect to PostgreSQL database"
fi

# Create database backup
log "Creating database backup: $BACKUP_FILE"
info "Database: $DB_NAME"
info "User: $DB_USER"
info "Backup directory: $BACKUP_DIR"

# Full database dump with all data and schema
pg_dump -h postgres -U "$DB_USER" -d "$DB_NAME" \
    --verbose \
    --no-password \
    --format=plain \
    --inserts \
    --column-inserts \
    --disable-triggers \
    --create \
    --clean \
    --if-exists \
    > "$BACKUP_DIR/$BACKUP_FILE" || error "Database backup failed"

# Compress the backup
log "Compressing backup file..."
gzip "$BACKUP_DIR/$BACKUP_FILE" || error "Compression failed"

# Get file size
BACKUP_SIZE=$(du -h "$BACKUP_DIR/$COMPRESSED_FILE" | cut -f1)
log "Backup completed: $COMPRESSED_FILE ($BACKUP_SIZE)"

# Create backup metadata file
cat > "$BACKUP_DIR/backup_${TIMESTAMP}.info" << EOF
Backup Information
==================
Date: $(date)
Database: $DB_NAME
User: $DB_USER
Backup File: $COMPRESSED_FILE
File Size: $BACKUP_SIZE
Server: $(hostname)
Docker Container: $(hostname)
PostgreSQL Version: $(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();" 2>/dev/null | head -n1 || echo "Unknown")

Schema Summary:
$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>/dev/null | tail -n +3 | head -n -2 || echo "Unable to retrieve schema info")

Database Size:
$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | tail -n +3 | head -n -2 || echo "Unknown")

Restore Instructions:
1. Stop the application services
2. Drop existing database (if needed): dropdb -h postgres -U $DB_USER $DB_NAME
3. Restore: gunzip -c $COMPRESSED_FILE | psql -h postgres -U $DB_USER -d postgres
4. Restart application services
EOF

# Clean up old backups based on retention policy
log "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "emaintenance_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -exec rm -f {} \; 2>/dev/null || true
find "$BACKUP_DIR" -name "backup_*.info" -type f -mtime +$RETENTION_DAYS -exec rm -f {} \; 2>/dev/null || true

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "emaintenance_backup_*.sql.gz" -type f | wc -l)
log "Cleanup completed. Current backup count: $BACKUP_COUNT"

# Create latest backup symlink
cd "$BACKUP_DIR"
ln -sf "$COMPRESSED_FILE" "emaintenance_latest.sql.gz" 2>/dev/null || true
ln -sf "backup_${TIMESTAMP}.info" "latest_backup.info" 2>/dev/null || true

# Verify backup integrity
log "Verifying backup integrity..."
if gzip -t "$BACKUP_DIR/$COMPRESSED_FILE"; then
    log "✓ Backup file integrity verified"
else
    error "Backup file is corrupted"
fi

# Log backup completion
log "Database backup completed successfully!"
info "Backup file: $BACKUP_DIR/$COMPRESSED_FILE"
info "Info file: $BACKUP_DIR/backup_${TIMESTAMP}.info"
info "Latest symlink: $BACKUP_DIR/emaintenance_latest.sql.gz"

# Optional: Send notification (if configured)
if command -v curl &> /dev/null && [ -n "${BACKUP_WEBHOOK_URL:-}" ]; then
    info "Sending backup notification..."
    curl -X POST "$BACKUP_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"Database backup completed successfully\",
            \"database\": \"$DB_NAME\",
            \"timestamp\": \"$(date)\",
            \"file_size\": \"$BACKUP_SIZE\",
            \"backup_count\": $BACKUP_COUNT
        }" &>/dev/null || warning "Failed to send notification"
fi

log "Backup process finished at $(date)"