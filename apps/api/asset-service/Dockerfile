# Dockerfile for Asset Service API (monorepo-aware)
FROM node:20-alpine AS base

# Build stage
FROM node:18-alpine AS builder

# 配置国内镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

WORKDIR /repo
RUN apk add --no-cache libc6-compat

# Copy workspace manifests to install all dependencies
COPY package*.json ./
COPY apps/api/asset-service/package*.json apps/api/asset-service/
COPY packages/database/package*.json packages/database/
COPY packages/eslint-config/package*.json packages/eslint-config/
COPY packages/typescript-config/package*.json packages/typescript-config/

# Install all dependencies (including workspace deps)
RUN npm ci

# Copy source code
COPY . .

# Build database package first, then asset service (excluding test files)
RUN cd packages/database && npm run build
RUN ls -la packages/database/dist/
# Skip Prisma generate during build - will be done at runtime
# RUN cd packages/database && npm run db:generate
RUN ls -la packages/database/node_modules/.prisma/ || echo "Prisma client not generated, checking for errors..."
RUN ls -la packages/database/dist/
RUN ls -la packages/database/node_modules/ || echo "No node_modules found"
RUN cd packages/database && npm list @prisma/client || echo "Prisma client not installed"
# Ensure database types are available for API build
RUN mkdir -p apps/api/asset-service/packages/database
RUN cp -r packages/database/dist/* apps/api/asset-service/packages/database/
RUN cd apps/api/asset-service && npm run build:prod

# Runtime stage
FROM node:18-alpine AS runtime

# 配置国内镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

WORKDIR /app
RUN apk add --no-cache libc6-compat curl openssl

# Create app user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser

# Prepare log directory with proper permissions
RUN mkdir -p /app/logs && chown -R apiuser:nodejs /app/logs

# Copy artifacts
COPY --from=builder --chown=apiuser:nodejs /repo/node_modules ./node_modules
COPY --from=builder --chown=apiuser:nodejs /repo/packages/database ./packages/database
COPY --from=builder --chown=apiuser:nodejs /repo/apps/api/asset-service/dist ./dist
COPY --from=builder --chown=apiuser:nodejs /repo/apps/api/asset-service/package*.json ./

# Ensure Prisma client is generated for runtime (before switching user)
RUN npx prisma generate --schema=./packages/database/prisma/schema.prisma || (echo "Prisma generate failed" && ls -la ./packages/database/prisma && exit 1)

USER apiuser

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3003/api/health || exit 1

CMD ["node", "dist/index.js"]