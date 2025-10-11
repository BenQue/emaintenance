# ============================================================================
# Next.js Web Application - Optimized Dockerfile
# ============================================================================
# 优化重点：
# 1. 三阶段构建：deps → builder → runner
# 2. 使用 Next.js standalone 输出减少镜像大小
# 3. 仅复制必要的运行时文件
# 4. 优化层缓存提升构建速度
# ============================================================================

FROM node:18-alpine AS base
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
RUN apk add --no-cache libc6-compat

# ============================================================================
# Dependencies stage - 安装依赖
# ============================================================================
FROM base AS deps

WORKDIR /repo

# 复制 package files
COPY package*.json ./
COPY apps/web/package*.json apps/web/
COPY packages/database/package*.json packages/database/
COPY packages/eslint-config/package*.json packages/eslint-config/
COPY packages/typescript-config/package*.json packages/typescript-config/

# 安装依赖
RUN npm ci

# ============================================================================
# Builder stage - 构建应用
# ============================================================================
FROM base AS builder

WORKDIR /repo

# 复制依赖
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/package*.json ./

# 复制源代码
COPY . .

# 生成 Prisma Client 并构建 database 包
RUN cd packages/database && npx prisma generate && npm run build

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_USER_SERVICE_URL=""
ENV NEXT_PUBLIC_WORK_ORDER_SERVICE_URL=""
ENV NEXT_PUBLIC_ASSET_SERVICE_URL=""
ENV RUNNING_IN_DOCKER="true"
ENV NODE_ENV=production

# 构建 Next.js (standalone 模式)
RUN cd apps/web && npm run build

# ============================================================================
# Runner stage - 运行环境
# ============================================================================
FROM base AS runner

WORKDIR /app

RUN apk add --no-cache curl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 复制 standalone 输出
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

# 复制 Prisma Client
COPY --from=builder --chown=nextjs:nodejs /repo/packages/database ./packages/database

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "apps/web/server.js"]
