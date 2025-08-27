# E-Maintenance Web Service Dockerfile
# 专用于Web应用的 Docker 镜像构建

ARG NODE_VERSION=18

# 构建阶段
FROM node:${NODE_VERSION}-alpine AS builder

# 安装构建依赖
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /build

# 复制包文件用于依赖安装
COPY package*.json ./
COPY apps/web/package*.json apps/web/
COPY packages/database/package*.json packages/database/
COPY packages/shared/package*.json packages/shared/
COPY packages/eslint-config/package*.json packages/eslint-config/
COPY packages/typescript-config/package*.json packages/typescript-config/

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建共享包
RUN cd packages/database && npm run build
RUN cd packages/shared && npm run build || true

# 生成 Prisma 客户端
RUN cd packages/database && npx prisma generate

# 接受构建时环境变量
ARG NEXT_PUBLIC_API_URL=http://localhost:3030
ARG NEXT_PUBLIC_APP_NAME=E-Maintenance
ARG NEXT_PUBLIC_APP_VERSION=v2.0
ARG NEXT_PUBLIC_APP_ENV=production

# 设置构建时环境变量
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV

# 构建 Next.js 应用 (使用独立输出模式)
RUN cd apps/web && npm run build

# 生产运行阶段
FROM node:${NODE_VERSION}-alpine AS runtime

# 安装运行时依赖
RUN apk add --no-cache \
    libc6-compat \
    curl \
    wget \
    ca-certificates \
    tzdata \
    tini

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制 Next.js 独立构建
COPY --from=builder --chown=nextjs:nodejs /build/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /build/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /build/apps/web/public ./apps/web/public

# 复制数据库构建产物 (用于运行时)
COPY --from=builder --chown=nextjs:nodejs /build/packages/database ./packages/database

# 创建必要目录
RUN mkdir -p /app/logs /app/.next/cache && \
    chown -R nextjs:nodejs /app/logs /app/.next/cache

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# 使用 tini 作为 PID 1 进程管理器
ENTRYPOINT ["/sbin/tini", "--"]

# 启动 Next.js 应用
CMD ["node", "apps/web/server.js"]