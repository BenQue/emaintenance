# E-Maintenance System - Secure Production Deployment Guide

## Overview

This guide provides comprehensive instructions for securely deploying the E-Maintenance System in a production environment using Docker containers with proper security practices. This deployment has been completely redesigned to address TypeScript compilation issues, Tailwind CSS production problems, and Docker configuration issues that were preventing successful deployment.

### 🚀 Recent Major Updates (2025-01-21)

- **Fixed all TypeScript compilation errors**: Resolved Select component type errors and other compilation issues
- **Corrected Tailwind CSS production build**: Fixed CSS optimization and tree-shaking for production
- **Secured environment configuration**: Removed hardcoded passwords and implemented secure password generation
- **Added comprehensive database seeding**: 50+ master data entries, 15+ sample assets, 15+ work orders
- **Improved Docker multi-stage builds**: Optimized image sizes and security
- **Enhanced monitoring and health checks**: Better service monitoring and automated recovery

## 🚨 Critical Security Notice

**NEVER commit `.env.production` files or any files containing actual passwords to version control!**

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: Minimum 50GB free space (100GB+ recommended for production)
- **CPU**: 4+ cores recommended
- **Network**: Stable internet connection for initial setup

### Software Requirements

- Docker Engine 20.10+
- Docker Compose 2.0+ or docker-compose 1.29+
- curl (for health checks)
- openssl (for password generation)

### Port Requirements

The following ports must be available:

- **3030**: Web application (HTTP)
- **3031**: User Service API
- **3032**: Work Order Service API  
- **3033**: Asset Service API
- **5433**: PostgreSQL database (internal access)
- **6379**: Redis cache (internal access)

## 🔧 Deployment Process

### Step 1: Prepare the Server

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose (if not included)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create required directories
sudo mkdir -p /opt/emaintenance/{data,logs,backups}
sudo chown -R $USER:$USER /opt/emaintenance
```

### Step 2: Clone and Prepare the Project

```bash
# Clone the repository (or copy deployment files)
git clone <repository-url> /opt/emaintenance/source
cd /opt/emaintenance/source/docker-deploy

# OR copy deployment files to a clean directory
# Ensure you have: docker-compose.production.yml, scripts/, database/, nginx/, dockerfiles/
```

### Step 3: Configure Environment (CRITICAL SECURITY STEP)

```bash
# Generate secure environment configuration
./generate-passwords.sh

# Follow the prompts to:
# 1. Enter your server IP address
# 2. Review generated passwords
# 3. Securely store the credentials file
```

**⚠️ IMPORTANT**: The script will create:

- `.env.production` with secure passwords
- `credentials-YYYYMMDD-HHMMSS.txt` with login details

**You MUST:**

1. Store the credentials file in a secure location (password manager)
2. Delete the credentials file from the server after storing it securely
3. NEVER commit `.env.production` to version control

### Step 4: Deploy the System

```bash
# Run the secure deployment script
./deploy-secure.sh

# The script will automatically:
# - Validate system requirements
# - Build optimized Docker images with multi-stage builds
# - Initialize PostgreSQL database with proper schemas
# - Run comprehensive database seeding (master data + sample data)
# - Start all services with health checks
# - Perform post-deployment validation
# - Display access URLs and credentials

# Expected deployment time: 5-10 minutes
# The script provides real-time progress updates and will stop on any errors
# - Create backups of existing data
# - Deploy all services with health checks  
# - Run database migrations and seeding
# - Verify all services are running
```

### Step 5: Verify Deployment

After deployment, verify all services:

```bash
# Check service status
docker-compose -f docker-compose.production.yml ps

# Test API endpoints
curl http://localhost:3031/health  # User service
curl http://localhost:3032/health  # Work order service  
curl http://localhost:3033/health  # Asset service
curl http://localhost:3030/health  # Web application via Nginx

# Check logs if needed
docker-compose -f docker-compose.production.yml logs [service-name]
```

## 🔐 Initial System Access

### Default User Accounts

The system is initialized with the following accounts:

| Role | Email | Default Password | Purpose |
|------|-------|------------------|---------|
| Admin | <admin@emaintenance.com> | *[From credentials file]* | System administration |
| Supervisor | <supervisor@emaintenance.com> | password123 | Team management |
| Technician | <technician@emaintenance.com> | password123 | Maintenance work |
| Employee | <employee@emaintenance.com> | password123 | Work order creation |

**🚨 SECURITY REQUIREMENT**: Change all default passwords immediately after first login!

### Access URLs

- **Web Application**: <http://YOUR_SERVER_IP:3030>
- **API Documentation**: Available via web application
- **Admin Panel**: Accessible through web application with admin account

## 🔧 Technical Improvements in This Release

### Issues Fixed

1. **TypeScript Compilation Problems**
   - Fixed implicit 'any' type errors in Select components across all forms
   - Resolved chart.tsx component TypeScript interfaces  
   - Corrected form.tsx displayName assignments
   - Added proper type annotations for onValueChange handlers

2. **Tailwind CSS Production Issues**
   - Updated Next.js configuration for proper CSS optimization
   - Fixed PostCSS configuration for production builds
   - Enabled CSS tree-shaking to reduce bundle size
   - Resolved CSS not loading in Docker production environment

3. **Docker Configuration Problems**
   - Implemented secure multi-stage builds for smaller, optimized images
   - Fixed environment variable passing between containers
   - Added comprehensive health checks for all services
   - Corrected service networking and dependencies
   - Changed from port 80 to 3030 to avoid conflicts

4. **Database Initialization Issues**
   - Added proper Prisma client generation in Docker builds
   - Implemented comprehensive database seeding with error handling
   - Fixed PostgreSQL password configuration from environment variables
   - Added database initialization container for proper startup order

### New Features

- **Secure Password Generation**: Automated generation of strong passwords for all services
- **Comprehensive Monitoring**: Real-time health checks and service monitoring
- **Automated Backups**: Daily database backups with 30-day retention
- **Production Logging**: Structured logging with rotation and monitoring
- **Security Hardening**: Non-root containers, proper permissions, rate limiting

## 📊 Sample Data

The system is deployed with comprehensive sample data:

### Assets (15+ sample assets)

- Production equipment (CNC machines, presses, robots)
- Packaging equipment (packaging machines, labeling systems)
- Quality control equipment (measurement devices, testers)
- Auxiliary equipment (compressors, cooling towers, cranes)

### Work Orders (15+ sample work orders)

- Various status levels (Pending, In Progress, Completed)
- Different priority levels (Low, Medium, High, Urgent, Critical)
- Realistic maintenance scenarios and descriptions
- Complete workflow examples

### Master Data

- Equipment categories and fault codes
- Locations and organizational structure
- Priority levels and workflow definitions
- Spare parts inventory with relationships
- Performance metrics and maintenance history

## 🛡️ Security Best Practices

### Immediate Security Actions

1. **Change Default Passwords**

   ```bash
   # Log into the web application and change all default passwords
   # Enable 2FA if available
   ```

2. **Firewall Configuration**

   ```bash
   # Configure firewall (example for ufw)
   sudo ufw allow 22/tcp      # SSH
   sudo ufw allow 3030/tcp    # Web application
   sudo ufw deny 3031/tcp     # Block direct API access (optional)
   sudo ufw deny 3032/tcp
   sudo ufw deny 3033/tcp
   sudo ufw deny 5433/tcp     # Block direct database access
   sudo ufw deny 6379/tcp     # Block direct Redis access
   sudo ufw enable
   ```

3. **SSL/TLS Setup**

   ```bash
   # Install SSL certificate (using Let's Encrypt example)
   sudo apt install certbot
   sudo certbot certonly --standalone -d your-domain.com
   
   # Update nginx configuration for HTTPS
   # (Requires additional nginx configuration - not included in this guide)
   ```

4. **Regular Security Updates**

   ```bash
   # Set up automatic security updates
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure unattended-upgrades
   ```

### Environment Security

- **Never commit `.env.production`** to version control
- Store database credentials securely (password manager/vault)
- Use strong, unique passwords (minimum 16 characters)
- Regularly rotate JWT secrets and database passwords
- Monitor access logs and failed login attempts

## 📋 Maintenance & Operations

### Database Backups

```bash
# Manual backup
docker exec emaintenance_db-backup_1 /backup-database.sh

# Automated daily backups are configured by default at 2 AM
# Backup retention: 30 days (configurable)
# Backup location: /opt/emaintenance/backups/postgres/
```

### Log Management

```bash
# View service logs
docker-compose -f docker-compose.production.yml logs -f [service-name]

# Log locations:
# - Application logs: /opt/emaintenance/logs/
# - Nginx logs: /opt/emaintenance/logs/nginx/
# - Database logs: /opt/emaintenance/logs/postgres/
```

### System Updates

```bash
# Update application
cd /opt/emaintenance/source
git pull origin main
cd docker-deploy

# Rebuild and redeploy
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d
```

### Health Monitoring

```bash
# Check all services
./health-check.sh

# Monitor resource usage
docker stats

# Database performance
docker exec emaintenance_postgres_1 psql -U postgres -d emaintenance -c "SELECT * FROM pg_stat_activity;"
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Services Won't Start
```bash
# Check logs for errors
docker-compose -f docker-compose.production.yml logs

# Check disk space
df -h

# Check memory usage  
free -h

# Verify environment file
source .env.production && echo "DB_PASSWORD length: ${#DB_PASSWORD}"
```

#### 2. Database Connection Issues
```bash
# Test database connectivity
docker exec emaintenance_postgres_1 pg_isready -U postgres

# Check database logs
docker-compose -f docker-compose.production.yml logs postgres

# Verify database credentials
docker exec emaintenance_postgres_1 psql -U postgres -d emaintenance -c "SELECT 1;"
```

#### 3. Performance Issues
```bash
# Check resource usage
docker stats

# Optimize PostgreSQL (if needed)
docker exec emaintenance_postgres_1 psql -U postgres -d emaintenance -c "ANALYZE;"

# Check slow queries
docker exec emaintenance_postgres_1 psql -U postgres -d emaintenance -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

### Emergency Procedures

#### Complete System Restart
```bash
# Stop all services
docker-compose -f docker-compose.production.yml down

# Clear caches (if needed)
docker system prune -f

# Restart services
docker-compose -f docker-compose.production.yml up -d
```

#### Database Recovery
```bash
# Stop application services
docker-compose -f docker-compose.production.yml stop web user-service work-order-service asset-service

# Restore from backup
gunzip -c /opt/emaintenance/backups/postgres/emaintenance_latest.sql.gz | \
    docker exec -i emaintenance_postgres_1 psql -U postgres -d postgres

# Restart all services
docker-compose -f docker-compose.production.yml up -d
```

## 📞 Support and Additional Resources

### Log Files for Support
When seeking support, include these log files:
- `/opt/emaintenance/logs/deploy-[timestamp].log`
- Service-specific logs from `docker-compose logs [service]`
- System information: `docker version`, `docker-compose --version`

### Performance Monitoring
- Monitor disk usage in `/opt/emaintenance/`
- Check database connection counts and slow queries
- Monitor API response times and error rates
- Set up alerting for service health checks

### Backup Strategy
- **Daily automated backups** at 2 AM
- **30-day retention** by default
- **Off-site backup** recommended (copy to remote storage)
- **Recovery testing** monthly

---

## 📋 Quick Reference Commands

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Stop all services  
docker-compose -f docker-compose.production.yml down

# View logs
docker-compose -f docker-compose.production.yml logs -f [service]

# Manual backup
docker exec emaintenance_db-backup_1 /backup-database.sh

# Health check
curl http://localhost:3030/health

# Update passwords
./generate-passwords.sh
```

---

**Important**: This deployment is configured for production use but requires additional security hardening for high-security environments. Consider implementing additional measures such as WAF, intrusion detection, and comprehensive monitoring based on your organization's security requirements.