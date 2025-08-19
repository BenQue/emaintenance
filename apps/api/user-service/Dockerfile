# Dockerfile for User Service API (monorepo-aware)
FROM node:20-alpine AS base

# Workspace dependencies
FROM base AS deps
WORKDIR /repo
RUN apk add --no-cache libc6-compat

# Copy minimal manifests to leverage npm ci cache
COPY package*.json ./
COPY apps/api/user-service/package*.json apps/api/user-service/
COPY packages/database/package*.json packages/database/

# Install workspace deps (includes linked workspaces)
RUN npm ci

# Build stage
FROM deps AS builder
WORKDIR /repo
COPY . .
# Build shared database package first (for types/exports)
RUN npm run -w packages/database build
# Build service
RUN npm run -w apps/api/user-service build

# Runtime stage
FROM base AS runtime
WORKDIR /repo/apps/api/user-service
RUN apk add --no-cache libc6-compat curl

# Create app user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser

# Copy only necessary artifacts
COPY --from=builder --chown=apiuser:nodejs /repo/node_modules /repo/node_modules
COPY --from=builder --chown=apiuser:nodejs /repo/packages/database /repo/packages/database
COPY --from=builder --chown=apiuser:nodejs /repo/apps/api/user-service/dist ./dist
COPY --from=builder --chown=apiuser:nodejs /repo/apps/api/user-service/package*.json ./

USER apiuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]