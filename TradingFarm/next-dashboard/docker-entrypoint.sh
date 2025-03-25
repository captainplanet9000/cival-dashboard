#!/bin/sh
set -e

# Print environment information
echo "Starting Trading Farm Dashboard in production mode"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Start both the Next.js app and Socket.IO server using concurrently
# Set up trap to properly shutdown both services on container termination
if [ -f "./dist/server/index.js" ]; then
  echo "Starting Next.js and Socket.IO server using concurrently..."
  exec node server.js & node dist/server/index.js
else
  echo "WARNING: Socket server build not found. Starting only Next.js."
  echo "Please run 'npm run build:full' to build both Next.js and the Socket server."
  exec node server.js
fi
