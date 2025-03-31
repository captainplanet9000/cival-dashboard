const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
const socketPort = 3002;

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
    socketServer = spawn('node', [socketServerPath], {
      env: { ...process.env, PORT: socketPort },
      stdio: 'inherit'
    });

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
        socketServer.kill();
        console.log('Socket server terminated');
      }
      
      process.exit(0);
    });
  };

  // Listen for termination signals
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
});
