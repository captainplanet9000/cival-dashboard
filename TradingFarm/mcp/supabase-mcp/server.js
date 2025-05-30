/**
 * Supabase MCP Server
 * 
 * Main entry point for the Supabase MCP (Model-Controller-Provider) integration server.
 * Provides API endpoints for trading farm agents to store and retrieve data from Supabase.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { SERVER_CONFIG, validateConfig } = require('./config');
const logger = require('./logger');
const { initializeClient, testConnection } = require('./supabase-client');
const { initializeDatabase } = require('./utils/db-setup');

// Import route modules
const agentsRoutes = require('./routes/agents-routes');
const strategiesRoutes = require('./routes/strategies-routes');
const signalsRoutes = require('./routes/signals-routes');
const positionsRoutes = require('./routes/positions-routes');
const ordersRoutes = require('./routes/orders-routes');
const cooperationRoutes = require('./routes/cooperation-routes');
const coordinatorRoutes = require('./routes/coordinator-routes');
const messagesRoutes = require('./routes/messages-routes');

// Validate configuration
const configErrors = validateConfig();
if (configErrors.length > 0) {
  configErrors.forEach(error => logger.error(`Configuration error: ${error}`));
  process.exit(1);
}

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

// Rate limiting middleware
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: SERVER_CONFIG.rateLimitWindowMs,
  max: SERVER_CONFIG.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Setup routes
app.use('/api/agents', agentsRoutes);
app.use('/api/strategies', strategiesRoutes);
app.use('/api/signals', signalsRoutes);
app.use('/api/positions', positionsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/cooperation', cooperationRoutes);
app.use('/api/coordinator', coordinatorRoutes);
app.use('/api/messages', messagesRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const connectionStatus = await testConnection();
    if (connectionStatus.connected) {
      res.json({
        status: 'healthy',
        supabase: 'connected',
        environment: SERVER_CONFIG.environment,
        version: '1.0.0'
      });
    } else {
      res.status(500).json({
        status: 'unhealthy',
        supabase: 'disconnected',
        error: connectionStatus.error
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

// Error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({
    error: 'Internal server error',
    message: SERVER_CONFIG.environment === 'development' ? err.message : 'Something went wrong'
  });
});

// Start message queue and scheduled tasks
require('./services/scheduler-service').startScheduledTasks();

// Start the server
const startServer = async () => {
  try {
    // Connect to Supabase
    initializeClient();
    
    // Initialize database structure
    await initializeDatabase();
    
    // Start the server
    app.listen(SERVER_CONFIG.port, () => {
      logger.info(`Supabase MCP server running on port ${SERVER_CONFIG.port} in ${SERVER_CONFIG.environment} mode`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app; // Export for testing 