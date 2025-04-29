# Trading Farm Dashboard Dockerfile
# Production-ready multi-stage build

# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Set production environment
ENV NODE_ENV=production

# Build the application
RUN npm run build:prod

# Runtime stage
FROM node:18-alpine AS runner
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Copy built application from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Start the application
EXPOSE 3000
CMD ["node", "server.js"]
