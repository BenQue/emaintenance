-- E-Maintenance Database Initialization Script
-- This script will be executed when the PostgreSQL container starts for the first time

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create initial database if it doesn't exist
SELECT 'CREATE DATABASE emaintenance'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'emaintenance')\gexec

-- Set timezone
SET timezone = 'Asia/Shanghai';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE emaintenance TO postgres;

-- Performance optimizations for production
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;

-- Create logs directory for PostgreSQL
\! mkdir -p /var/log/postgresql

-- Reload configuration
SELECT pg_reload_conf();