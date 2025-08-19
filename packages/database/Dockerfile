# Dockerfile for Prisma migrations and seeding (packages/database)
FROM node:20-alpine AS base

WORKDIR /app/packages/database

RUN apk add --no-cache openssl

# Install dependencies first (no lockfile in this workspace; use install)
COPY packages/database/package.json ./
RUN npm install

# Copy the rest of the package including prisma schema and source
COPY packages/database ./

# Default command (overridden by compose)
CMD ["npm", "run", "db:generate"]


