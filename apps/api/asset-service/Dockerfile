# Dockerfile for Asset Service API (monorepo-aware)
FROM node:20-alpine AS base

# Workspace deps
FROM base AS builder
WORKDIR /repo/apps/api/asset-service
RUN apk add --no-cache libc6-compat

# Install deps with local database package vendored
COPY apps/api/asset-service/package*.json ./
COPY packages/database /repo/packages/database
RUN npm pkg set dependencies.@emaintenance/database="file:../../packages/database" \
  && npm install --omit=dev

# Copy source and build
COPY apps/api/asset-service .
RUN npm run build

# Runtime stage
FROM base AS runtime
WORKDIR /repo/apps/api/asset-service
RUN apk add --no-cache libc6-compat curl

# Create app user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser

# Copy artifacts
COPY --from=builder --chown=apiuser:nodejs /repo/apps/api/asset-service/node_modules ./node_modules
COPY --from=builder --chown=apiuser:nodejs /repo/apps/api/asset-service/dist ./dist
COPY --from=builder --chown=apiuser:nodejs /repo/apps/api/asset-service/package*.json ./

USER apiuser

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3003/health || exit 1

CMD ["node", "dist/index.js"]