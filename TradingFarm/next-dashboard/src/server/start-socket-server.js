// Socket.io server starter script
const { Server } = require('socket.io');
const { createServer } = require('http');
const { randomUUID } = require('crypto');

// Create HTTP server
const httpServer = createServer();

// Initialize Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow any origin during development
    methods: ['GET', 'POST']
  }
});

// Mock data for testing
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
  ]
};

// Send mock data to a client
function sendMockData(socket, farmId) {
  // Send mock order updates
  mockData.orders.forEach((order, index) => {
    setTimeout(() => {
      const message = {
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
      const message = {
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
      const message = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'EXECUTION_NOTIFICATION',
        data: execution
      };
      socket.emit('EXECUTION_NOTIFICATION', message);
    }, index * 2000);
  });
}

// Start real-time simulation
function startRealTimeSimulation(io) {
  // Simulate periodic order updates
  setInterval(() => {
    const statuses = ['pending', 'executed', 'canceled', 'failed'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    const orderUpdate = {
      orderId: `ord-${Math.floor(Math.random() * 1000)}`,
      status: randomStatus,
      timestamp: new Date().toISOString(),
      price: 60000 + Math.random() * 10000,
      quantity: Math.random() * 2,
      message: `Order ${randomStatus}`
    };
    
    const message = {
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
    
    const priceAlert = {
      symbol: randomSymbol,
      price: basePrice + (Math.random() * 500 - 250),
      threshold: basePrice + (randomDirection === 'above' ? -100 : 100),
      direction: randomDirection,
      timestamp: new Date().toISOString()
    };
    
    const message = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      type: 'PRICE_ALERT',
      data: priceAlert
    };
    
    io.emit('PRICE_ALERT', message);
  }, 45000);
}

// Socket connection handler
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
  socket.on('JOIN_ELIZAOS', (data) => {
    const farmId = data.farmId;
    const roomName = `farm:${farmId}:elizaos`;
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined ${roomName}`);
  });

  // Handle ElizaOS commands
  socket.on('ELIZAOS_COMMAND', (data) => {
    const { command, farm_id } = data;
    console.log(`ElizaOS command received: ${command} for farm ${farm_id}`);
    
    // Mock response based on command
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
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Start real-time simulation
startRealTimeSimulation(io);

// Start the server
const PORT = process.env.SOCKET_PORT || 3002;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on http://localhost:${PORT}`);
});
