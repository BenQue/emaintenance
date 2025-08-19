# Dockerfile for Work Order Service API (monorepo-aware)
FROM node:20-alpine AS base

# Workspace deps
FROM base AS deps
WORKDIR /repo
RUN apk add --no-cache libc6-compat
COPY package*.json ./
COPY apps/api/work-order-service/package*.json apps/api/work-order-service/
COPY packages/database/package*.json packages/database/
RUN npm ci

# Build stage
FROM deps AS builder
WORKDIR /repo
COPY . .
RUN npm run -w packages/database build
RUN npm run -w apps/api/work-order-service build

# Runtime stage
FROM base AS runtime
WORKDIR /repo/apps/api/work-order-service
RUN apk add --no-cache libc6-compat curl

# Create app user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser

# Copy artifacts
COPY --from=builder --chown=apiuser:nodejs /repo/node_modules /repo/node_modules
COPY --from=builder --chown=apiuser:nodejs /repo/packages/database /repo/packages/database
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