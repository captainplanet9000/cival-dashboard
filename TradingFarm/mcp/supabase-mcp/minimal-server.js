/**
 * Minimal Supabase MCP Server
 * 
 * A minimal version of the server that just tests Supabase connectivity
 * and provides a health check endpoint.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { SERVER_CONFIG } = require('./config');
const logger = require('./logger');
const { initializeClient, testConnection } = require('./supabase-client');

// Initialize express app
const app = express();

// Setup middleware
app.use(helmet());
app.use(cors({
  origin: SERVER_CONFIG.corsOrigins.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.http(message.trim()) } }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const connectionStatus = await testConnection();
    if (connectionStatus.connected) {
      res.json({
        status: 'healthy',
        supabase: 'connected',
        environment: SERVER_CONFIG.environment,
        version: '1.0.0',
        message: 'Running in minimal mode for testing'
      });
    } else {
      res.status(500).json({
        status: 'unhealthy',
        supabase: 'disconnected',
        error: connectionStatus.error,
        message: 'Running in minimal mode for testing'
      });
    }
  } catch (error) {
    logger.error(`Health check failed: ${error.message}`);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Main status page
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Supabase MCP Status</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #3ECF8E; }
          .status { padding: 15px; border-radius: 5px; margin: 10px 0; }
          .running { background-color: #e6f7e6; color: #2e7d32; }
          .info { background-color: #e6f3f7; }
          pre { background-color: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>Supabase MCP Status</h1>
        <div class="status running">
          <h2>✅ Server Running</h2>
          <p>The Supabase MCP server is running in minimal mode.</p>
        </div>
        <div class="status info">
          <h2>ℹ️ Connection Information</h2>
          <p>Supabase Project: ${SERVER_CONFIG.supabaseUrl}</p>
          <p>Environment: ${SERVER_CONFIG.environment}</p>
          <p>To test connectivity, visit the <a href="/health">health endpoint</a>.</p>
        </div>
      </body>
    </html>
  `);
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({
    error: 'Internal server error',
    message: SERVER_CONFIG.environment === 'development' ? err.message : 'Something went wrong'
  });
});

// Start the server
const startServer = async () => {
  try {
    // Connect to Supabase
    initializeClient();
    
    // Start the server
    app.listen(SERVER_CONFIG.port, () => {
      logger.info(`Minimal Supabase MCP server running on port ${SERVER_CONFIG.port} in ${SERVER_CONFIG.environment} mode`);
      logger.info(`Visit http://localhost:${SERVER_CONFIG.port}/ to see server status`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app; // Export for testing 