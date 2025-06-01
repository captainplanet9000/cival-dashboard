const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const Redis = require('ioredis');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({
  path: fs.existsSync('.env.local') ? '.env.local' : '.env'
});

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const socketPort = parseInt(process.env.SOCKET_PORT || '3002', 10);

// Redis configuration
const redisEnabled = process.env.REDIS_ENABLED === 'true';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisPassword = process.env.REDIS_PASSWORD || '';

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Function to check if socket server script exists
const socketServerPath = path.join(__dirname, 'src', 'server', 'start-socket-server.js');
const socketServerExists = fs.existsSync(socketServerPath);

// Start the server
app.prepare().then(() => {
  // Start socket server if it exists
  let socketServer;
  if (socketServerExists) {
    console.log('Starting socket server...');
    
    // Check if Redis is available before starting socket server
    if (redisEnabled) {
      console.log('Redis is enabled, checking connection...');
      const redisClient = new Redis(redisUrl, {
        password: redisPassword,
        lazyConnect: true
      });
      
      redisClient.connect().then(() => {
        console.log('✅ Redis connection successful');
        redisClient.quit();
        
        // Start socket server with Redis enabled
        socketServer = spawn('node', [socketServerPath], {
          env: { 
            ...process.env, 
            PORT: socketPort,
            REDIS_ENABLED: 'true',
            REDIS_URL: redisUrl,
            REDIS_PASSWORD: redisPassword
          },
          stdio: 'inherit'
        });
      }).catch(err => {
        console.error('❌ Redis connection failed:', err.message);
        console.warn('⚠️ Starting socket server without Redis (fallback mode)');
        
        // Start socket server without Redis
        socketServer = spawn('node', [socketServerPath], {
          env: { 
            ...process.env, 
            PORT: socketPort,
            REDIS_ENABLED: 'false'
          },
          stdio: 'inherit'
        });
      });
    } else {
      console.log('Redis is disabled, starting socket server in fallback mode');
      socketServer = spawn('node', [socketServerPath], {
        env: { ...process.env, PORT: socketPort },
        stdio: 'inherit'
      });
    }

    socketServer.on('error', (err) => {
      console.error('Socket server error:', err);
    });

    console.log(`Socket server started on port ${socketPort}`);
  } else {
    console.warn('Socket server script not found. Skipping socket server startup.');
  }

  // Create HTTP server for Next.js
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Start the server
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('Shutting down servers...');
    
    // First close Next.js server
    server.close(() => {
      console.log('Next.js server closed');
      
      // Then terminate socket server if it exists
      if (socketServer) {
        // Send SIGTERM to allow socket server to clean up Redis connections
        socketServer.kill('SIGTERM');
        console.log('Socket server terminated');
        
        // Give socket server time to clean up Redis connections
        setTimeout(() => {
          console.log('Clean shutdown complete');
          process.exit(0);
        }, 1000);
      } else {
        process.exit(0);
      }
    });
  };

  // Listen for termination signals
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
});
