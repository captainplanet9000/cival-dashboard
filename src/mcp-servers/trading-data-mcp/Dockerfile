FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV DEFAULT_EXCHANGE=binance

# Expose port if needed (for HTTP servers)
# EXPOSE 3000

# Start the MCP server
CMD ["node", "dist/mcp-servers/trading-data-mcp/index.js"] 