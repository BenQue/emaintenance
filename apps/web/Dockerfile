# Dockerfile for Next.js Web Application (monorepo-aware)
FROM node:18-alpine AS base

# Build stage
FROM node:18-alpine AS builder

# 配置国内镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

WORKDIR /repo
RUN apk add --no-cache libc6-compat

# Copy workspace manifests to install all dependencies
COPY package*.json ./
COPY apps/web/package*.json apps/web/
COPY packages/database/package*.json packages/database/
COPY packages/eslint-config/package*.json packages/eslint-config/
COPY packages/typescript-config/package*.json packages/typescript-config/
# Copy shared package if exists (commented out as it doesn't exist)
# COPY packages/shared/package*.json packages/shared/

# Install all dependencies (including workspace deps)
RUN npm ci

# Copy source code
COPY . .

# Build database package first (needed for web app)
RUN cd packages/database && npm run build

# Generate Prisma client for web app
RUN cd packages/database && npx prisma generate

# Build Next.js application with correct environment variables
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_USER_SERVICE_URL=""
ENV NEXT_PUBLIC_WORK_ORDER_SERVICE_URL=""
ENV NEXT_PUBLIC_ASSET_SERVICE_URL=""
ENV RUNNING_IN_DOCKER="true"
RUN cd apps/web && npm run build

# Runtime stage
FROM node:18-alpine AS runtime

# 配置国内镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

WORKDIR /app
RUN apk add --no-cache libc6-compat curl

# Create app user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the built application
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

# Copy database artifacts for runtime
COPY --from=builder --chown=nextjs:nodejs /repo/packages/database ./packages/database

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "apps/web/server.js"]