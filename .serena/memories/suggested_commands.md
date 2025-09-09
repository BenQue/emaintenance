# Suggested Development Commands

## Essential Daily Commands

### Development Workflow
```bash
# Install all dependencies (including Flutter)
npm run install:all

# Start all services in development mode
npm run dev

# Build all applications  
npm run build

# Run linting across all packages
npm run lint

# Run tests across all packages
npm run test

# Format code across all packages
npm run format
```

### Database Operations
```bash
# Generate Prisma client (run after schema changes)
npm run db:generate

# Push schema changes to database (development)
npm run db:push

# Run database migrations (production)
npm run db:migrate

# Reset database (destructive - development only)
npm run db:reset

# Seed database with initial data
npm run db:seed

# Open Prisma Studio for database inspection
npm run db:studio
```

### Individual Service Development
```bash
# Web application (Next.js) - Port 3000
cd apps/web && npm run dev

# Mobile application (Flutter)
cd apps/mobile && flutter run

# User service - Port 3001
cd apps/api/user-service && npm run dev

# Work order service - Port 3002  
cd apps/api/work-order-service && npm run dev

# Asset service - Port 3003
cd apps/api/asset-service && npm run dev
```

### Testing Commands
```bash
# Type checking specific packages
cd apps/web && npm run type-check
cd apps/api/user-service && npm run type-check

# Run specific service tests
cd apps/api/user-service && npm test
cd apps/api/work-order-service && npm test
cd apps/api/asset-service && npm test

# Run tests in watch mode
cd apps/web && npm run test:watch
cd apps/api/user-service && npm run test:watch
```

### Docker Development (Hybrid Mode - Recommended)
```bash
# Start infrastructure services (DB, Redis)
docker-compose -f docker-compose.hybrid.yml up -d

# Start API services locally for development
npm run api:start

# Check API service status
npm run api:status

# Stop API services
npm run api:stop

# Restart API services
npm run api:restart
```

### Utility Commands
```bash
# Clean all build artifacts
npm run clean

# Flutter pub get (after pubspec.yaml changes)
cd apps/mobile && flutter pub get

# Health check all services
curl http://localhost:3001/health  # User service
curl http://localhost:3002/health  # Work order service  
curl http://localhost:3003/health  # Asset service
```

## macOS-specific Commands (Darwin system)
```bash
# Use 'ls' instead of 'll' 
ls -la

# Use 'grep' with -r flag for recursive search
grep -r "pattern" .

# Use 'find' with -name flag
find . -name "*.ts"

# Use 'cd' for directory navigation
cd apps/web
```

## Quality Assurance Commands
```bash
# Always run before committing
npm run lint && npm run type-check

# Fix TypeScript Select component errors
find apps/web/components -name "*.tsx" -exec sed -i '' 's/onValueChange={(value) =>/onValueChange={(value: string) =>/g' {} \;
```