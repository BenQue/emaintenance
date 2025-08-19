# Dockerfile for User Service API (monorepo-aware)
FROM node:20-alpine AS base

# Workspace dependencies
FROM base AS builder
WORKDIR /repo/apps/api/user-service
RUN apk add --no-cache libc6-compat

# Install deps with local database package vendored
COPY apps/api/user-service/package*.json ./
COPY packages/database /repo/packages/database
RUN npm pkg set dependencies.@emaintenance/database="file:../../packages/database" \
  && npm install --omit=dev

# Copy source and build
COPY apps/api/user-service .
RUN npm run build

# Runtime stage
FROM base AS runtime
WORKDIR /repo/apps/api/user-service
RUN apk add --no-cache libc6-compat curl

# Create app user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser

# Copy artifacts
COPY --from=builder --chown=apiuser:nodejs /repo/apps/api/user-service/node_modules ./node_modules
COPY --from=builder --chown=apiuser:nodejs /repo/apps/api/user-service/dist ./dist
COPY --from=builder --chown=apiuser:nodejs /repo/apps/api/user-service/package*.json ./

USER apiuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]