# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

E-Maintenance System (企业设备维修管理程序) - A comprehensive enterprise equipment maintenance management system built as a Turborepo monorepo with microservices architecture.

## Development Commands

### Common Development Tasks
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

# Type check all packages
cd apps/web && npm run type-check
cd apps/api/user-service && npm run type-check

# Run specific service tests
cd apps/api/user-service && npm test
cd apps/api/work-order-service && npm test
cd apps/api/asset-service && npm test

# Run tests in watch mode
cd apps/web && npm run test:watch
cd apps/api/user-service && npm run test:watch

# Clean all build artifacts
npm run clean
```

### Database Operations
```bash
# Generate Prisma client (run after schema changes)
npm run db:generate

# Push schema changes to database (development)
npm run db:push

# Run database migrations (production)
npm run db:migrate

# Reset database (destructive)
npm run db:reset

# Seed database with initial data
npm run db:seed

# Open Prisma Studio for database inspection
npm run db:studio
```

### Individual Service Development
```bash
# Web application (Next.js)
cd apps/web && npm run dev

# Mobile application (Flutter)
cd apps/mobile && flutter run

# Microservices
cd apps/api/user-service && npm run dev      # Port 3001
cd apps/api/work-order-service && npm run dev # Port 3002  
cd apps/api/asset-service && npm run dev      # Port 3003
```

## Architecture Overview

### High-Level Structure
- **Monorepo**: Turborepo-based with shared packages and multiple applications
- **Frontend**: Next.js 14+ web app with App Router and React 18+
- **Mobile**: Flutter 3.22+ mobile application
- **Backend**: Microservices architecture with Node.js/Express services
- **Database**: Centralized PostgreSQL 16+ with Prisma ORM
- **Authentication**: JWT-based stateless authentication with role-based authorization

### Microservices Architecture
Each backend service follows **Controller-Service-Repository** pattern:
- **Controllers**: Handle HTTP requests/responses with validation
- **Services**: Contain business logic and orchestration
- **Repositories**: Encapsulate Prisma database operations

### Frontend Architecture (Next.js Web App)
- **Component Structure**: Layered approach (ui, layout, features, forms)
- **State Management**: Zustand with domain-specific stores (work-order-store, user-management-store, supervisor-store, etc.)
- **Routing**: Next.js App Router with layout-based authentication protection
- **Service Layer**: Unified API clients separate from UI components

### Key Data Models
- **User**: Role-based system (EMPLOYEE, TECHNICIAN, SUPERVISOR, ADMIN)
- **WorkOrder**: Core maintenance request entity with status tracking
- **Asset**: Equipment/device management with QR code integration
- **Notification**: System alerts and work order updates

### Role-Based Access Control
- **EMPLOYEE**: Basic work order creation and viewing
- **TECHNICIAN**: Work order assignment and technical updates
- **SUPERVISOR**: Team management, KPI dashboard, user/asset management
- **ADMIN**: Full system administration

## Project Structure Patterns

### Monorepo Organization
```
apps/
├── web/                    # Next.js web application
├── mobile/                 # Flutter mobile app
└── api/
    ├── user-service/       # User management microservice
    ├── work-order-service/ # Work order management microservice
    └── asset-service/      # Asset management microservice

packages/
├── database/               # Shared Prisma schema and migrations
├── shared/                 # Shared utilities and types
├── typescript-config/      # Shared TypeScript configuration
└── eslint-config/         # Shared linting rules
```

### Backend Service Structure
Each microservice follows consistent patterns:
```
src/
├── controllers/           # HTTP request handlers
├── services/             # Business logic layer
├── repositories/         # Data access layer (Prisma)
├── routes/              # Express route definitions
├── utils/               # Shared utilities (validation, crypto, etc.)
├── types/               # TypeScript type definitions
└── __tests__/           # Integration tests
```

### Frontend Application Structure
```
apps/web/
├── app/                 # Next.js App Router pages and layouts
├── components/          # React components organized by feature
│   ├── ui/              # Base UI components (buttons, cards, etc.)
│   ├── layout/          # Layout components (navigation, headers)
│   ├── work-orders/     # Work order feature components
│   ├── assets/          # Asset management components
│   ├── kpi/             # KPI dashboard components
│   └── forms/           # Reusable form components
├── lib/
│   ├── services/        # API client services
│   ├── stores/          # Zustand state management stores
│   └── types/           # TypeScript type definitions
└── hooks/               # Custom React hooks
```

## Development Workflow

### Story-Driven Development
- Stories tracked in `docs/stories/` with comprehensive technical documentation
- Each story includes acceptance criteria, dev notes, file structure guidance, and testing requirements
- Stories move through statuses: Planning → Development → Review → Done

### Database Schema Changes
1. Modify `packages/database/prisma/schema.prisma`
2. Run `npm run db:generate` to update Prisma client
3. Run `npm run db:push` for development or `npm run db:migrate` for production
4. Update TypeScript types and services accordingly

### State Management Pattern
- Use domain-specific Zustand stores (e.g., `work-order-store.ts`, `user-management-store.ts`)
- Stores handle API communication, loading states, and optimistic updates
- Components consume stores via hooks and focus on UI rendering

### Testing Strategy
- Unit tests for services and repositories using Jest
- Component tests for React components using React Testing Library
- Integration tests for complete workflows
- Tests co-located with source files using `.test.ts` extension
- Test coverage tracking with detailed HTML reports in `coverage/` directories
- Run individual test suites: `npm test` in specific service directories

## Environment Setup

### Required Environment Variables
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/emaintenance"
JWT_SECRET="your-jwt-secret"
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### Required Dependencies
- Redis server for caching (configured but not fully implemented)
- Winston/Pino for structured logging (recommended for production)

### Service Ports
- Web Application: http://localhost:3000
- User Service: http://localhost:3001
- Work Order Service: http://localhost:3002
- Asset Service: http://localhost:3003

## Important Implementation Notes

### Authentication Flow
- JWT tokens issued by user-service
- Stateless authentication across all services
- Role-based route protection in Next.js layouts
- Middleware validation for API endpoints

### Data Relationships
- Users can create and be assigned work orders
- Assets are linked to work orders for maintenance tracking
- Work orders have status transitions with business rule validation
- Notifications are generated for work order lifecycle events

### QR Code Integration
- Assets have unique `assetCode` fields for QR code scanning
- Mobile app integrates QR scanning for quick asset identification
- Work orders can be created directly from QR code scans

## Known Issues and Technical Debt

### Critical Issues Requiring Attention
- **Asset Service Incomplete**: The asset service lacks complete route definitions, middleware integration, and comprehensive tests
- **Build Artifacts in Version Control**: Build outputs (`dist/`, `coverage/`) are committed and should be in `.gitignore`
- **Console Logging in Production**: Replace all `console.log/console.error` statements with structured logging
- **Client-Side JWT Decoding**: JWT payload extraction should be moved to server-side for security

### Development Best Practices
- Use structured logging (Winston/Pino) instead of console statements
- Implement proper error handling and monitoring
- Follow the established Controller-Service-Repository pattern
- Maintain proper test coverage (currently ~63% across the codebase)
- Use TypeScript strictly and avoid `any` types

### Build and Deploy Process
- **Turbo Build System**: All builds use Turborepo for optimized caching and parallelization
- **Development Mode**: Use `npm run dev` to start all services with hot reload
- **Production Builds**: Run `npm run build` to create optimized production bundles
- **Mobile Development**: Flutter app requires `flutter run` for iOS/Android development

## Security Considerations
- JWT tokens should include refresh token mechanism
- Implement CSRF protection for web application
- Add input sanitization and validation middleware
- ✅ **Rate Limiting Implemented**: Comprehensive API rate limiting with differentiated policies for read vs write operations
- Ensure all sensitive data is properly excluded from version control

### Recent Security Enhancements (2025-08-08)
- **分层速率限制策略**: 实施了区分查看操作和创建/修改操作的差异化速率限制
  - 查看操作：开发环境 10,000/15分钟，生产环境 1,000/15分钟
  - 写操作：开发环境 200/15分钟，生产环境 50/15分钟
  - 解决了 429 错误，提升了用户体验和系统安全性

## Key Development Guidelines

### Code Quality Requirements

- **ALWAYS run linting and type checking** before committing: `npm run lint && npm run type-check`
- **Follow naming conventions**: Use camelCase for variables/functions, PascalCase for components/classes
- **Component Organization**: Group related components by feature, not by technical layer
- **State Management**: Use Zustand stores for complex state, React state for simple UI state
- **API Integration**: Always use the service layer pattern, never call APIs directly from components

### Testing Requirements

- **Write tests for all new features**: Unit tests for services, component tests for UI
- **Maintain test coverage**: Aim for >80% coverage on business logic
- **Integration tests**: Write end-to-end tests for critical user workflows
- **Test file naming**: Use `.test.ts` or `.test.tsx` extensions

### Mobile Development Specifics

- **Flutter Development**: Use `cd apps/mobile && flutter run` for development
- **Pub Dependencies**: Run `flutter pub get` after changes to pubspec.yaml
- **Platform Testing**: Test on both iOS and Android simulators/devices

When working with this codebase, always consider the microservices architecture, maintain consistency with established patterns, and ensure proper role-based access control is implemented for any new features.