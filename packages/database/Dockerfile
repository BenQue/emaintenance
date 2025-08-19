# Dockerfile for Prisma migrations and seeding (packages/database)
FROM node:20-alpine AS base

# Build stage
FROM base AS builder
WORKDIR /repo
RUN apk add --no-cache openssl

# Copy workspace manifests to install all dependencies
COPY package*.json ./
COPY packages/database/package*.json packages/database/
COPY packages/eslint-config/package*.json packages/eslint-config/
COPY packages/typescript-config/package*.json packages/typescript-config/

# Install all dependencies (including workspace deps)
RUN npm ci

# Copy source code
COPY . .

# Build database package
RUN npm run -w packages/database build

# Runtime stage
FROM base AS runtime
WORKDIR /repo/packages/database
RUN apk add --no-cache openssl

# Copy artifacts
COPY --from=builder --chown=root:root /repo/node_modules ./node_modules
COPY --from=builder --chown=root:root /repo/packages/database ./packages/database
COPY --from=builder --chown=root:root /repo/packages/database/package*.json ./

# Default command (overridden by compose)
CMD ["npm", "run", "db:generate"]


