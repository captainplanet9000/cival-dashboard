/**
 * Trading Farm Dashboard Server Entry Point
 * 
 * This file serves as the main entry point for the Trading Farm Dashboard server.
 * It starts the Socket.IO server and provides connection handling.
 */

import { startSocketServer, TradingFarmSocketServer } from './socket-server';

// Load environment variables if needed
require('dotenv').config();

// Default port configuration with fallback
const PORT = parseInt(process.env.SOCKET_SERVER_PORT || '3001', 10);

// Store server instance for proper shutdown handling
let serverInstance: TradingFarmSocketServer | null = null;

/**
 * Start the server
 */
export function startServer(): TradingFarmSocketServer {
  if (serverInstance) {
    console.log('Server already running, returning existing instance');
    return serverInstance;
  }
  
  console.log(`Starting Trading Farm Dashboard server on port ${PORT}...`);
  serverInstance = startSocketServer(PORT);
  
  // Setup graceful shutdown
  setupShutdownHandlers(serverInstance);
  
  return serverInstance;
}

/**
 * Setup handlers for graceful shutdown
 */
function setupShutdownHandlers(server: TradingFarmSocketServer): void {
  // Handle process termination signals
  const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      
      try {
        if (serverInstance) {
          await serverInstance.stop();
          serverInstance = null;
        }
        console.log('Server shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  });
  
  // Handle uncaught exceptions and unhandled promise rejections
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

// Start the server if this file is executed directly
if (require.main === module) {
  startServer();
}
