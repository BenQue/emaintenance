# E-Maintenance User Service Dockerfile
# 专用于用户服务的 Docker 镜像构建

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
COPY apps/api/user-service ./apps/api/user-service/

# 安装依赖
RUN npm ci --only=production --ignore-scripts

# 构建用户服务
WORKDIR /build/apps/api/user-service
RUN npm run build

# 生产运行阶段
FROM node:18-alpine AS runtime

# 创建应用用户和必要目录
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser && \
    mkdir -p /app/logs /app/uploads && \
    chown -R apiuser:nodejs /app/logs /app/uploads

# 设置工作目录
WORKDIR /app

# 从构建阶段复制必要文件
COPY --from=builder --chown=apiuser:nodejs /build/apps/api/user-service/dist ./dist/
COPY --from=builder --chown=apiuser:nodejs /build/apps/api/user-service/package*.json ./
COPY --from=builder --chown=apiuser:nodejs /build/node_modules ./node_modules/
COPY --from=builder --chown=apiuser:nodejs /build/packages ./packages/

# 安装生产依赖
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# 切换到非root用户
USER apiuser

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# 启动命令
CMD ["npm", "start"]