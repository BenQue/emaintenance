# Dockerfile for Work Order Service API (monorepo-aware)
FROM node:20-alpine AS base

# Workspace deps
FROM base AS builder
WORKDIR /repo/apps/api/work-order-service
RUN apk add --no-cache libc6-compat

# Install deps with local database package vendored
COPY apps/api/work-order-service/package*.json ./
COPY packages/database /repo/packages/database
RUN npm pkg set dependencies.@emaintenance/database="file:../../packages/database" \
  && npm install --omit=dev

# Copy source and build
COPY apps/api/work-order-service .
RUN npm run build

# Runtime stage
FROM base AS runtime
WORKDIR /repo/apps/api/work-order-service
RUN apk add --no-cache libc6-compat curl

# Create app user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser

# Copy artifacts
COPY --from=builder --chown=apiuser:nodejs /repo/apps/api/work-order-service/node_modules ./node_modules
COPY --from=builder --chown=apiuser:nodejs /repo/apps/api/work-order-service/dist ./dist
COPY --from=builder --chown=apiuser:nodejs /repo/apps/api/work-order-service/package*.json ./

# Create uploads directory with proper permissions
RUN mkdir -p /repo/apps/api/work-order-service/uploads/work-orders && \
    chown -R apiuser:nodejs /repo/apps/api/work-order-service/uploads

USER apiuser

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

CMD ["node", "dist/index.js"]