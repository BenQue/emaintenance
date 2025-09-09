# Task Completion Guidelines

## Pre-Development Checklist
- [ ] Read and understand the story requirements completely
- [ ] Review existing code patterns in the relevant modules
- [ ] Check current git status: `git status && git branch`
- [ ] Ensure working on feature branch, not main/master
- [ ] Verify database schema is up to date: `npm run db:generate`

## Development Process
1. **Follow Controller-Service-Repository pattern** for backend changes
2. **Use domain-specific Zustand stores** for frontend state management
3. **Follow established naming conventions** (camelCase, PascalCase, kebab-case)
4. **Write TypeScript with strict mode** - no `any` types allowed
5. **Use shadcn/ui components** with proper type annotations
6. **Follow existing component organization** by feature, not technical layer

## Code Quality Requirements

### Always Run Before Committing
```bash
# Essential quality checks
npm run lint
npm run type-check
npm run test
```

### TypeScript Strict Mode
- Add explicit type annotations for all function parameters
- Fix Select component handlers: `onValueChange={(value: string) => setValue(value)}`
- No `any` types in production code
- Enable strict null checks

### Testing Requirements
- **Unit tests** for all services and repositories
- **Component tests** for React components using React Testing Library
- **Integration tests** for complete workflows
- **Maintain >80% test coverage** on business logic
- Test files co-located with source using `.test.ts` extension

## Validation Commands

### Database Validation
```bash
# After schema changes
npm run db:generate
npm run db:push  # development
npm run db:migrate  # production
```

### Service Health Checks
```bash
# Verify all services are running
curl http://localhost:3001/health  # User service
curl http://localhost:3002/health  # Work order service
curl http://localhost:3003/health  # Asset service
```

### Frontend Validation
```bash
cd apps/web
npm run build      # Verify production build works
npm run type-check # TypeScript validation
npm run lint       # ESLint validation
npm test           # Component and integration tests
```

### Backend Validation
```bash
cd apps/api/user-service
npm run build      # TypeScript compilation
npm run lint       # Code linting
npm test           # Unit and integration tests

cd apps/api/work-order-service
npm run build && npm run lint && npm test

cd apps/api/asset-service  
npm run build && npm run lint && npm test
```

## Known Issue Fixes

### TypeScript Select Component Errors
```bash
# Quick fix for onValueChange type errors
find apps/web/components -name "*.tsx" -exec sed -i '' 's/onValueChange={(value) =>/onValueChange={(value: string) =>/g' {} \;
```

### Docker Build Issues
- Ensure `NODE_ENV=production` TypeScript strict mode compliance
- Fix all implicit `any` type errors before Docker builds

## Git Workflow
1. **Always check current branch**: `git status && git branch`
2. **Work on feature branches only**: `git checkout -b feature/story-name`
3. **Commit with meaningful messages**: Follow Conventional Commits format
4. **Verify changes before commit**: `git diff` to review all changes
5. **Never work directly on main/master branch**

## Documentation Updates
- Update **File List** in story with all modified/created/deleted files
- Update **Dev Agent Record** sections only (checkboxes, debug log, completion notes)
- **Do NOT modify** story requirements, acceptance criteria, or dev notes sections

## Completion Criteria
- [ ] All tasks and subtasks marked with [x] checkboxes
- [ ] All validation commands pass (lint, type-check, test)
- [ ] Service health checks pass
- [ ] Integration tests pass
- [ ] No console.log statements in production code
- [ ] File List section updated with all changes
- [ ] Git status clean with meaningful commit messages
- [ ] Story status updated to 'Ready for Review'

## Quality Standards
- **No shortcuts on testing** - write comprehensive tests
- **No partial implementations** - complete all started features
- **No TODO comments** for core functionality
- **Follow security best practices** - JWT validation, input sanitization
- **Use structured logging** instead of console statements
- **Follow established patterns** consistently across the codebase

## When to Ask for Help
- Ambiguous requirements after story analysis
- Missing configuration or environment setup
- 3 consecutive failures implementing the same feature
- Dependency conflicts or version issues
- Database migration conflicts
- Security concerns or access control questions