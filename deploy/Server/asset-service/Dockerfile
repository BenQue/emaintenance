# E-Maintenance Asset Service Dockerfile
# 专用于资产服务的 Docker 镜像构建

# 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /build

# 复制项目文件
COPY package*.json ./
COPY packages/database ./packages/database/
COPY packages/shared ./packages/shared/
COPY packages/typescript-config ./packages/typescript-config/
COPY packages/eslint-config ./packages/eslint-config/
COPY apps/api/asset-service ./apps/api/asset-service/

# 安装依赖
RUN npm ci --only=production --ignore-scripts

# 生成Prisma客户端（不需要数据库连接）
WORKDIR /build/packages/database
RUN npx prisma generate

# 构建资产服务
WORKDIR /build/apps/api/asset-service
RUN npm run build

# 生产运行阶段
FROM node:18-alpine AS runtime

# 安装运行时依赖（包括Prisma所需的库）
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    ca-certificates \
    curl \
    wget

# 创建应用用户和必要目录
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser && \
    mkdir -p /app/logs /app/uploads && \
    chown -R apiuser:nodejs /app/logs /app/uploads

# 设置工作目录
WORKDIR /app

# 从构建阶段复制必要文件
COPY --from=builder --chown=apiuser:nodejs /build/apps/api/asset-service/dist ./dist/
COPY --from=builder --chown=apiuser:nodejs /build/apps/api/asset-service/package*.json ./
COPY --from=builder --chown=apiuser:nodejs /build/node_modules ./node_modules/
COPY --from=builder --chown=apiuser:nodejs /build/packages ./packages/

# 清理npm缓存
RUN npm cache clean --force

# 切换到非root用户
USER apiuser

# 暴露端口
EXPOSE 3003

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3003/health || exit 1

# 启动命令
CMD ["npm", "start"]