// @ts-nocheck
import { Server } from 'socket.io';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { randomUUID } from 'crypto';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { logger } from '@/utils/logger';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = parseInt(process.env.SOCKET_PORT || '3002', 10);

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

// Define message types
export interface SocketMessage {
  id: string;
  timestamp: string;
  type: string;
  data: any;
}

export interface OrderUpdate {
  orderId: string;
  status: 'pending' | 'executed' | 'canceled' | 'failed';
  timestamp: string;
  price?: number;
  quantity?: number;
  message?: string;
}

export interface PriceAlert {
  symbol: string;
  price: number;
  threshold: number;
  direction: 'above' | 'below';
  timestamp: string;
}

export interface ExecutionNotification {
  executionId: string;
  orderId: string;
  status: 'success' | 'partial' | 'failed';
  executed: number;
  remaining: number;
  price: number;
  fee: number;
  timestamp: string;
}

export interface ElizaOSResponse {
  command: string;
  response: string;
  timestamp: string;
  source: string;
}

const mockData = {
  orders: [
    { orderId: 'ord-001', status: 'executed', timestamp: new Date().toISOString(), price: 65000, quantity: 0.5, message: 'Order executed successfully' },
    { orderId: 'ord-002', status: 'pending', timestamp: new Date().toISOString(), price: 64800, quantity: 0.25, message: 'Order placed' },
    { orderId: 'ord-003', status: 'canceled', timestamp: new Date().toISOString(), price: 64700, quantity: 1.0, message: 'Order canceled by user' }
  ],
  alerts: [
    { symbol: 'BTC/USD', price: 64500, threshold: 64000, direction: 'above', timestamp: new Date().toISOString() },
    { symbol: 'ETH/USD', price: 3200, threshold: 3300, direction: 'below', timestamp: new Date().toISOString() }
  ],
  executions: [
    { executionId: 'exec-001', orderId: 'ord-001', status: 'success', executed: 0.5, remaining: 0, price: 65000, fee: 0.15, timestamp: new Date().toISOString() },
    { executionId: 'exec-002', orderId: 'ord-004', status: 'partial', executed: 0.1, remaining: 0.4, price: 64900, fee: 0.03, timestamp: new Date().toISOString() }
  ],
  elizaResponses: [
    { command: '/status', response: 'All trading systems operational. Current profit: +2.3% today.', timestamp: new Date().toISOString(), source: 'system' },
    { command: '/market BTC/USD', response: 'BTC/USD is currently trading at $64,723 with 24h volume of $1.2B. 1h change: +0.5%, 24h change: +1.8%', timestamp: new Date().toISOString(), source: 'market-data' }
  ]
};

async function startServer() {
  try {
    await app.prepare();
    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url || '', true);
      handle(req, res, parsedUrl);
    });

    const io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Set up Redis adapter for Socket.IO if enabled
    if (REDIS_ENABLED) {
      try {
        const pubClient = new Redis(REDIS_URL, {
          password: REDIS_PASSWORD
        });
        const subClient = pubClient.duplicate();

        // Handle Redis connection events
        pubClient.on('error', (err) => logger.error('Redis Pub Client Error:', err));
        subClient.on('error', (err) => logger.error('Redis Sub Client Error:', err));
        
        // When connected, set up the adapter
        pubClient.on('connect', () => {
          logger.info('Redis Pub/Sub connected, setting up Socket.IO adapter');
          io.adapter(createAdapter(pubClient, subClient));
        });
        
        logger.info('Socket.IO Redis adapter initialized');
      } catch (error) {
        logger.error('Failed to initialize Redis adapter:', error);
        logger.warn('Falling back to in-memory adapter');
      }
    } else {
      logger.info('Redis adapter disabled, using in-memory adapter');
    }

    // Socket.io connection handler
    io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Join a farm room to receive farm-specific events
      socket.on('JOIN_FARM', (farmId) => {
        socket.join(`farm:${farmId}`);
        console.log(`Socket ${socket.id} joined farm:${farmId}`);
        
        // Send initial data
        sendMockData(socket, farmId);
      });

      // Join room for ElizaOS interactions
      socket.on('JOIN_ELIZAOS', ({ farmId }) => {
        const roomName = `farm:${farmId}:elizaos`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined ${roomName}`);
      });

      // Handle ElizaOS commands
      socket.on('ELIZAOS_COMMAND', (data) => {
        const { command, farm_id } = data;
        logger.info(`ElizaOS command received: ${command} for farm ${farm_id}`);
        
        // Import the agent command queue dynamically to avoid circular dependencies
        import('../services/redis/agent-command-queue').then(({ AgentCommandQueue }) => {
          // Push command to the agent's queue
          AgentCommandQueue.pushCommand(`farm:${farm_id}`, {
            type: 'USER_COMMAND',
            command,
            timestamp: new Date().toISOString(),
            source: socket.id
          }).then(commandId => {
            logger.debug(`Command queued with ID: ${commandId}`);
          }).catch(err => {
            logger.error('Error queuing command:', err);
          });
        }).catch(err => {
          logger.error('Error importing agent command queue:', err);
          // Fall back to mock responses if command queue is unavailable
          setTimeout(() => {
          const roomName = `farm:${farm_id}:elizaos`;
          const mockResponse = {
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            type: 'COMMAND_RESPONSE',
            data: {
              result: {
                message: `Command processed: ${command}`,
                status: 'success',
                data: { timestamp: new Date().toISOString() }
              }
            }
          };
          
          io.to(roomName).emit('COMMAND_RESPONSE', mockResponse);
        }, 1000);
      });

      // Handle knowledge queries
      socket.on('KNOWLEDGE_QUERY', (data) => {
        const { query, farm_id } = data;
        console.log(`Knowledge query received: ${query} for farm ${farm_id}`);
        
        // Mock response for knowledge queries
        setTimeout(() => {
          const roomName = `farm:${farm_id}:elizaos`;
          const mockResponse = {
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            type: 'KNOWLEDGE_RESPONSE',
            data: {
              result: {
                answer: `Here's information about: ${query}`,
                confidence: 0.92,
                sources: [
                  { title: 'Trading Documentation', url: '#' },
                  { title: 'Market Analysis', url: '#' }
                ]
              }
            }
          };
          
          io.to(roomName).emit('KNOWLEDGE_RESPONSE', mockResponse);
        }, 1500);
      });

      // Handle disconnections
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
      
      // Subscribe to ElizaOS agent events if Redis is enabled
      if (REDIS_ENABLED) {
        import('../services/redis/agent-coordination').then(({ AgentCoordination }) => {
          // Register for coordination events
          AgentCoordination.registerAgent(socket.id, (data) => {
            // Forward coordination messages to the client
            if (data.type === 'coordination_request' || data.type === 'coordination_response') {
              socket.emit(data.type.toUpperCase(), {
                id: randomUUID(),
                timestamp: new Date().toISOString(),
                type: data.type.toUpperCase(),
                data: data
              });
            }
          }).catch(err => {
            logger.error('Error registering for agent coordination:', err);
          });
        }).catch(err => {
          logger.error('Error importing agent coordination:', err);
        });
      }
    });

    // Simulate real-time events
    startRealTimeSimulation(io);

    server.listen(port, () => {
      console.log(`Socket.io server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

function sendMockData(socket: any, farmId: string) {
  // Send mock order updates
  mockData.orders.forEach((order, index) => {
    setTimeout(() => {
      const message: SocketMessage = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'ORDER_UPDATE',
        data: order
      };
      socket.emit('ORDER_UPDATE', message);
    }, index * 1000);
  });
  
  // Send mock price alerts
  mockData.alerts.forEach((alert, index) => {
    setTimeout(() => {
      const message: SocketMessage = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'PRICE_ALERT',
        data: alert
      };
      socket.emit('PRICE_ALERT', message);
    }, index * 1500);
  });
  
  // Send mock execution notifications
  mockData.executions.forEach((execution, index) => {
    setTimeout(() => {
      const message: SocketMessage = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'EXECUTION_NOTIFICATION',
        data: execution
      };
      socket.emit('EXECUTION_NOTIFICATION', message);
    }, index * 2000);
  });
}

function startRealTimeSimulation(io: Server) {
  // Initialize Redis-based services if enabled
  if (REDIS_ENABLED) {
    // Initialize agent coordination system
    import('../services/redis/agent-coordination').then(({ AgentCoordination }) => {
      AgentCoordination.initialize().then(() => {
        logger.info('Agent coordination system initialized');
      }).catch(err => {
        logger.error('Error initializing agent coordination:', err);
      });
    }).catch(err => {
      logger.error('Error importing agent coordination:', err);
    });
    
    // Schedule periodic persistence of knowledge to database
    import('../services/redis/knowledge-store').then(({ KnowledgeStore }) => {
      setInterval(() => {
        KnowledgeStore.persistToDatabase().catch(err => {
          logger.error('Error persisting knowledge to database:', err);
        });
      }, 3600000); // Once per hour
    }).catch(err => {
      logger.error('Error importing knowledge store:', err);
    });
  }
  
  // Simulate periodic order updates
  setInterval(() => {
    const statuses = ['pending', 'executed', 'canceled', 'failed'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    const orderUpdate: OrderUpdate = {
      orderId: `ord-${Math.floor(Math.random() * 1000)}`,
      status: randomStatus as any,
      timestamp: new Date().toISOString(),
      price: 60000 + Math.random() * 10000,
      quantity: Math.random() * 2,
      message: `Order ${randomStatus}`
    };
    
    const message: SocketMessage = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      type: 'ORDER_UPDATE',
      data: orderUpdate
    };
    
    io.emit('ORDER_UPDATE', message);
  }, 30000);
  
  // Simulate periodic price alerts
  setInterval(() => {
    const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'DOT/USD', 'AVAX/USD'];
    const directions = ['above', 'below'];
    
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    const randomDirection = directions[Math.floor(Math.random() * directions.length)];
    const basePrice = randomSymbol === 'BTC/USD' ? 65000 : 
                     randomSymbol === 'ETH/USD' ? 3500 : 
                     randomSymbol === 'SOL/USD' ? 150 : 
                     randomSymbol === 'DOT/USD' ? 20 : 60;
    
    const priceAlert: PriceAlert = {
      symbol: randomSymbol,
      price: basePrice + (Math.random() * 500 - 250),
      threshold: basePrice + (randomDirection === 'above' ? -100 : 100),
      direction: randomDirection as any,
      timestamp: new Date().toISOString()
    };
    
    const message: SocketMessage = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      type: 'PRICE_ALERT',
      data: priceAlert
    };
    
    io.emit('PRICE_ALERT', message);
  }, 45000);
}

// Graceful shutdown function to clean up Redis connections
async function gracefulShutdown() {
  logger.info('Shutting down socket server...');
  
  if (REDIS_ENABLED) {
    try {
      // Clean up Redis services
      const { redisService } = await import('../services/redis/redis-service');
      await redisService.disconnect();
      logger.info('Redis connections closed');
    } catch (error) {
      logger.error('Error during Redis cleanup:', error);
    }
  }
  
  process.exit(0);
}

// Setup signal handlers for graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Don't call startServer() directly here
// Export it to be called by the main process
export { startServer };
