-- Database initialization script for EMaintenance System
-- This script runs when the PostgreSQL container starts for the first time

-- Create database if not exists (usually handled by POSTGRES_DB env var)
-- CREATE DATABASE IF NOT EXISTS emaintenance;

-- Connect to the emaintenance database
\c emaintenance;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'Asia/Shanghai';

-- Create custom types for status enums (these will be replaced by Prisma migrations)
-- But we define them here for initialization purposes

-- User role enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('EMPLOYEE', 'TECHNICIAN', 'SUPERVISOR', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Work order status enum
DO $$ BEGIN
    CREATE TYPE work_order_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Work order priority enum
DO $$ BEGIN
    CREATE TYPE work_order_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Grant privileges to the postgres user
GRANT ALL PRIVILEGES ON DATABASE emaintenance TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Set default search path
ALTER DATABASE emaintenance SET search_path TO public;

-- Log completion (commented out as pg_stat_statements_info may not exist)
-- INSERT INTO pg_stat_statements_info VALUES ('Database initialization completed at: ' || CURRENT_TIMESTAMP)
-- ON CONFLICT DO NOTHING;

-- Alternative logging
SELECT 'Database initialization completed at: ' || CURRENT_TIMESTAMP as init_status;