# Known Issues and Technical Debt

## Critical Issues Requiring Attention

### 1. Asset Service Incomplete
- **Issue**: Asset service lacks complete route definitions, middleware integration, and comprehensive tests
- **Impact**: Core functionality missing, affects work order-asset relationships
- **Priority**: HIGH
- **Location**: `apps/api/asset-service/`

### 2. Build Artifacts in Version Control
- **Issue**: Build outputs (`dist/`, `coverage/`) are committed to git
- **Impact**: Repository bloat, merge conflicts, CI/CD issues
- **Fix**: Add to `.gitignore` and remove from git history
- **Priority**: MEDIUM

### 3. Console Logging in Production
- **Issue**: 22+ instances of `console.log/console.error` statements
- **Impact**: Poor production logging, debugging difficulties
- **Fix**: Replace with structured logging (Winston/Pino)
- **Priority**: HIGH

### 4. Client-Side JWT Decoding
- **Issue**: JWT payload extraction on client-side for security
- **Impact**: Security vulnerability, token exposure
- **Fix**: Move JWT decoding to server-side middleware
- **Priority**: HIGH

## Recurring TypeScript Build Issues

### Select Component Type Errors
- **Pattern**: `Parameter 'value' implicitly has an 'any' type`
- **Locations**: 
  - `apps/web/components/assets/AssetForm.tsx`
  - `apps/web/components/work-orders/WorkOrderCreateForm.tsx`
  - `apps/web/components/work-orders/WorkOrderFilters.tsx`
  - `apps/web/components/users/UserFilters.tsx`
  - `apps/web/components/assignment/AssignmentRuleForm.tsx`
  - `apps/web/components/kpi/KPIDashboard.tsx`
- **Quick Fix**: 
  ```bash
  find apps/web/components -name "*.tsx" -exec sed -i '' 's/onValueChange={(value) =>/onValueChange={(value: string) =>/g' {} \;
  ```
- **Prevention**: Always include type annotations for shadcn/ui Select components
- **Context**: Errors surface during Docker builds with `NODE_ENV=production` and strict TypeScript checking

## Development Best Practices Gaps

### 1. Logging System
- **Current**: Using `console.log/console.error` throughout codebase
- **Recommended**: Implement Winston/Pino structured logging
- **Benefits**: Better production debugging, log aggregation, performance monitoring

### 2. Error Handling
- **Issue**: Inconsistent error handling patterns across services
- **Fix**: Implement standardized error middleware and response formats
- **Priority**: MEDIUM

### 3. Test Coverage
- **Current**: ~63% overall coverage
- **Asset Service**: Only 45% coverage
- **Goal**: >80% coverage on business logic
- **Priority**: MEDIUM

## Build and Deploy Issues

### 1. Docker Build Context
- **Issue**: TypeScript strict mode errors during production builds
- **Root Cause**: Development mode doesn't catch all strict mode violations
- **Fix**: Enable strict mode in development TypeScript configuration
- **Prevention**: Run `NODE_ENV=production npm run build` locally before commits

### 2. Turbo Build System
- **Status**: Working correctly with optimized caching
- **Recommendation**: All builds should use `npm run build` (Turborepo managed)
- **Benefits**: Parallelized builds, dependency caching, incremental builds

## Security Considerations

### 1. Rate Limiting (✅ IMPLEMENTED)
- **Status**: Comprehensive API rate limiting implemented (2025-08-08)
- **Details**: 
  - Read operations: 10,000/15min (dev), 1,000/15min (prod)
  - Write operations: 200/15min (dev), 50/15min (prod)
- **Impact**: Resolved 429 errors, improved security

### 2. Missing Security Features
- **CSRF Protection**: Not implemented for web application
- **Input Sanitization**: Basic validation present, needs enhancement
- **Security Headers**: Helmet configured but may need tuning
- **Refresh Token Mechanism**: JWT tokens lack refresh strategy

## Mobile Development Issues

### 1. Flutter App Limitations
- **Issue**: Some features not implemented in mobile app
- **Impact**: Feature parity between web and mobile
- **Priority**: LOW (mobile is secondary platform)

### 2. QR Code Integration
- **Status**: Partially implemented
- **Missing**: Complete workflow from QR scan to work order creation
- **Priority**: MEDIUM

## Infrastructure and DevOps

### 1. Hybrid Docker Mode (✅ RECOMMENDED)
- **Status**: Working well for development
- **Benefits**: Fast API development, consistent infrastructure
- **Usage**: `docker-compose -f docker-compose.hybrid.yml up -d`

### 2. Environment Configuration
- **Issue**: `.env` files in version control
- **Security Risk**: Potential credential exposure
- **Fix**: Move to `.env.example` pattern, gitignore actual `.env` files

## Data and Schema Issues

### 1. Database Migration Strategy
- **Current**: Using `db:push` for development
- **Recommendation**: Implement proper migration workflow for production
- **Tools**: Prisma migrate for production deployments

### 2. Master Data Population
- **Status**: Seed scripts available but may be outdated
- **Files**: `packages/database/prisma/seed.ts`, `populate-master-data.ts`
- **Priority**: MEDIUM

## Monitoring and Observability Gaps

### 1. Application Monitoring
- **Missing**: Application performance monitoring (APM)
- **Recommendation**: Implement metrics collection and alerting
- **Tools**: Consider Prometheus/Grafana or cloud-based solutions

### 2. Health Checks
- **Current**: Basic health endpoints exist
- **Enhancement**: Add comprehensive health checks including database connectivity
- **Endpoints**: `/health` on all services (ports 3001, 3002, 3003)

## Internationalization

### 1. Multi-language Support
- **Status**: Not implemented
- **Impact**: Currently Chinese/English mixed codebase
- **Priority**: LOW (single market focus)
- **Future**: Consider i18next for React, Flutter internationalization

## Performance Optimization Opportunities

### 1. Database Query Optimization
- **Issue**: Potential N+1 query problems
- **Solution**: Review Prisma queries, add proper includes/selects
- **Tools**: Prisma query analysis, database query profiling

### 2. Frontend Performance
- **Current**: Basic Next.js optimization
- **Enhancements**: 
  - Code splitting optimization
  - Image optimization review
  - Bundle size analysis
  - CDN integration for static assets

## Code Quality Improvements

### 1. ESLint Configuration
- **Status**: Custom config exists but may need updates
- **Recommendation**: Review and update ESLint rules for consistency
- **Priority**: LOW

### 2. TypeScript Configuration
- **Status**: Strict mode enabled but not consistently enforced
- **Fix**: Ensure all packages use strict mode consistently
- **Benefit**: Better type safety and fewer runtime errors