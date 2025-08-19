# Dockerfile for User Service API (monorepo-aware)
FROM node:20-alpine AS base

# Build stage
FROM base AS builder
WORKDIR /repo
RUN apk add --no-cache libc6-compat

# Copy workspace manifests to install all dependencies
COPY package*.json ./
COPY apps/api/user-service/package*.json apps/api/user-service/
COPY packages/database/package*.json packages/database/
COPY packages/eslint-config/package*.json packages/eslint-config/
COPY packages/typescript-config/package*.json packages/typescript-config/

# Install all dependencies (including workspace deps)
RUN npm ci

# Copy source code
COPY . .

# Build database package first, then user service (excluding test files)
RUN cd packages/database && npm run build
RUN cd apps/api/user-service && npm run build:prod

# Runtime stage
FROM base AS runtime
WORKDIR /repo/apps/api/user-service
RUN apk add --no-cache libc6-compat curl

# Create app user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser

# Copy artifacts
COPY --from=builder --chown=apiuser:nodejs /repo/node_modules ./node_modules
COPY --from=builder --chown=apiuser:nodejs /repo/packages/database ./packages/database
COPY --from=builder --chown=apiuser:nodejs /repo/apps/api/user-service/dist ./dist
COPY --from=builder --chown=apiuser:nodejs /repo/apps/api/user-service/package*.json ./

USER apiuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]