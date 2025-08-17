# Multi-stage Dockerfile for EMaintenance System
# This Dockerfile builds all Node.js services in the monorepo

# Base stage with Node.js
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies needed for building
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    && npm install -g turbo

# Copy package files and install dependencies
COPY package*.json turbo.json ./
COPY packages packages
COPY apps/web/package*.json apps/web/
COPY apps/api/user-service/package*.json apps/api/user-service/
COPY apps/api/work-order-service/package*.json apps/api/work-order-service/
COPY apps/api/asset-service/package*.json apps/api/asset-service/

# Install all dependencies
RUN npm ci --only=production --ignore-scripts

# Development dependencies stage
FROM base AS deps
RUN npm ci --ignore-scripts

# Build stage
FROM deps AS builder
COPY . .

# Generate Prisma client
RUN npm run db:generate

# Build all applications
RUN turbo build

# Production stage for web application
FROM node:20-alpine AS web
WORKDIR /app

# Copy built web application
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/package*.json ./apps/web/
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=base /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

USER nextjs

EXPOSE 3000
CMD ["npm", "start", "--prefix", "apps/web"]

# Production stage for API services
FROM node:20-alpine AS api-base
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache libc6-compat

# Copy built packages
COPY --from=builder /app/packages ./packages
COPY --from=base /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S apiuser -u 1001

USER apiuser

# User service stage
FROM api-base AS user-service
COPY --from=builder /app/apps/api/user-service/dist ./apps/api/user-service/dist
COPY --from=builder /app/apps/api/user-service/package*.json ./apps/api/user-service/

EXPOSE 3001
CMD ["node", "apps/api/user-service/dist/index.js"]

# Work order service stage
FROM api-base AS work-order-service
COPY --from=builder /app/apps/api/work-order-service/dist ./apps/api/work-order-service/dist
COPY --from=builder /app/apps/api/work-order-service/package*.json ./apps/api/work-order-service/

# Create uploads directory
RUN mkdir -p apps/api/work-order-service/uploads/work-orders && \
    chown -R apiuser:nodejs apps/api/work-order-service/uploads

EXPOSE 3002
CMD ["node", "apps/api/work-order-service/dist/index.js"]

# Asset service stage
FROM api-base AS asset-service
COPY --from=builder /app/apps/api/asset-service/dist ./apps/api/asset-service/dist
COPY --from=builder /app/apps/api/asset-service/package*.json ./apps/api/asset-service/

EXPOSE 3003
CMD ["node", "apps/api/asset-service/dist/index.js"]