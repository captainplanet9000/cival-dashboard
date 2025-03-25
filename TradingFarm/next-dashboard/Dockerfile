# Use Node.js LTS (20.x) as the base image
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set production environment variables
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Build Next.js application and Socket.IO server
RUN npm run build:full

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Set runtime environment variables
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user and switch to it
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 tradingfarm
USER tradingfarm

# Copy built app
COPY --from=builder --chown=tradingfarm:nodejs /app/public ./public
COPY --from=builder --chown=tradingfarm:nodejs /app/.next/standalone ./
COPY --from=builder --chown=tradingfarm:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=tradingfarm:nodejs /app/dist ./dist
COPY --from=builder --chown=tradingfarm:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Expose port for Next.js and Socket.IO
EXPOSE 3000
EXPOSE 3001

# Start the application using our entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]
