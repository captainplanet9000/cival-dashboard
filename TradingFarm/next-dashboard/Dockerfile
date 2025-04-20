# Multi-stage build for Trading Farm Next.js frontend
# Stage 1: Install dependencies and build
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Install Python and other build dependencies needed for node-gyp
RUN apt-get update && \
    apt-get install -y python3 python3-pip make g++ && \
    ln -sf /usr/bin/python3 /usr/bin/python && \
    rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies with increased memory limit
RUN NODE_OPTIONS="--max-old-space-size=4096" npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the application
RUN npm run build

# Stage 2: Set up the production environment
FROM node:20-slim AS runner

WORKDIR /app

# Create user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Copy build output from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

# Create a simple health check endpoint for Docker
RUN mkdir -p /app/.next/server/app/api/health && \
    echo 'export const GET = () => new Response(JSON.stringify({ status: "ok" }), { status: 200 });' > /app/.next/server/app/api/health/route.js

# Expose the port
EXPOSE 3000

# Run the application
CMD ["npm", "start"]
