# Dockerfile for Work Order Service API
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Install dev dependencies for building
FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build

# Production stage
FROM base AS runtime
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache libc6-compat curl

# Create app user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser

# Copy built application
COPY --from=builder --chown=apiuser:nodejs /app/dist ./dist
COPY --from=builder --chown=apiuser:nodejs /app/package*.json ./
COPY --from=deps --chown=apiuser:nodejs /app/node_modules ./node_modules

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads/work-orders && \
    chown -R apiuser:nodejs /app/uploads

USER apiuser

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

CMD ["node", "dist/index.js"]