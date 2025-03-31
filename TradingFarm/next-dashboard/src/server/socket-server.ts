import { Server } from 'socket.io';
import { createServer } from 'http';
import { parse } from 'url';
import { verify } from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// Types for socket events
type SocketEventType = 
  | 'ORDER_UPDATE' 
  | 'POSITION_UPDATE' 
  | 'BALANCE_UPDATE' 
  | 'PRICE_ALERT'
  | 'MARKET_DATA'
  | 'EXECUTION_NOTIFICATION'
  | 'RISK_ALERT'
  | 'ELIZAOS_NOTIFICATION'
  | 'SYNC_STATUS'
  | 'COMMAND_RESPONSE'
  | 'KNOWLEDGE_RESPONSE';

// Create Supabase client for database interactions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Initialize Supabase client with service role for admin access
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Initialize HTTP Server
const httpServer = createServer((req, res) => {
  const parsedUrl = parse(req.url || '', true);
  
  // Handle health check endpoint
  if (parsedUrl.pathname === '/health') {
    res.writeHead(200);
    res.end('Socket.io server is running');
    return;
  }
  
  res.writeHead(404);
  res.end('Not found');
});

// Initialize Socket.io with CORS and authentication
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Add transport options for better reliability
  transports: ['websocket', 'polling'],
  // Enable ping timeout for connection monitoring
  pingTimeout: 30000,
  // Add upgrade listeners for handling concurrent connections
  connectTimeout: 20000,
});

// Authentication middleware
io.use(async (socket, next) => {
  try {
    // Get token from handshake auth
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token missing'));
    }
    
    // Verify token validity
    try {
      // Use Supabase to verify the JWT token
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error || !data.user) {
        return next(new Error('Invalid token'));
      }
      
      // Attach user data to socket for later use
      socket.data.user = data.user;
      socket.data.userId = data.user.id;
      
      // Get user's farm permissions
      const { data: farmPermissions } = await supabase
        .from('farm_members')
        .select('farm_id, role')
        .eq('user_id', data.user.id);
      
      // Store accessible farms in socket data
      socket.data.accessibleFarms = farmPermissions?.map(p => p.farm_id) || [];
      socket.data.farmRoles = farmPermissions?.reduce((acc, p) => {
        acc[p.farm_id] = p.role;
        return acc;
      }, {} as Record<string, string>) || {};
      
      return next();
    } catch (e) {
      return next(new Error('Authentication failed'));
    }
  } catch (error) {
    return next(new Error('Server error during authentication'));
  }
});

// Handle connections
io.on('connection', async (socket) => {
  const userId = socket.data.userId;
  const user = socket.data.user;
  const accessibleFarms = socket.data.accessibleFarms;
  
  console.log(`User connected: ${userId}`);
  
  // Join user-specific room
  socket.join(`user:${userId}`);
  
  // Join rooms for all farms user has access to
  for (const farmId of accessibleFarms) {
    socket.join(`farm:${farmId}`);
  }
  
  // Send welcome message with connection status
  socket.emit('CONNECTION_STATUS', {
    connected: true,
    user: {
      id: user.id,
      email: user.email,
    },
    accessibleFarms,
    timestamp: new Date().toISOString(),
  });
  
  // Room management
  socket.on('join', (room) => {
    // Validate room access based on farm permissions
    if (room.startsWith('farm:')) {
      const farmId = room.split(':')[1];
      
      // Check if user has access to this farm
      if (!accessibleFarms.includes(farmId)) {
        socket.emit('ERROR', {
          message: `Access denied to room ${room}`,
          code: 'PERMISSION_DENIED'
        });
        return;
      }
    }
    
    socket.join(room);
    console.log(`User ${userId} joined room: ${room}`);
  });
  
  socket.on('leave', (room) => {
    socket.leave(room);
    console.log(`User ${userId} left room: ${room}`);
  });
  
  // Handle ElizaOS commands
  socket.on('ELIZAOS_COMMAND', async (data) => {
    try {
      // Validate the farm access
      if (!accessibleFarms.includes(data.farm_id)) {
        socket.emit('ERROR', {
          message: 'Access denied to this farm',
          code: 'PERMISSION_DENIED'
        });
        return;
      }
      
      // Log the command for audit
      await supabase
        .from('command_logs')
        .insert({
          user_id: userId,
          farm_id: data.farm_id,
          command: data.command,
          source: 'socket',
          params: data.params
        });
      
      // Forward command to ElizaOS service
      // This would typically be an API call to the ElizaOS service
      // For now, we'll just echo back a response for testing
      setTimeout(() => {
        socket.emit('COMMAND_RESPONSE', {
          command_id: Math.random().toString(36).substring(2, 15),
          result: {
            status: 'completed',
            message: `Processed command: ${data.command}`,
            data: { timestamp: new Date().toISOString() }
          },
          timestamp: new Date().toISOString()
        });
      }, 500);
      
      // In a real implementation, you would make an API call to ElizaOS
      // and then emit the response when it comes back
    } catch (error) {
      console.error('Error processing ElizaOS command:', error);
      socket.emit('ERROR', {
        message: 'Failed to process command',
        code: 'COMMAND_ERROR',
        details: error
      });
    }
  });
  
  // Handle knowledge base queries
  socket.on('KNOWLEDGE_QUERY', async (data) => {
    try {
      // Validate the farm access
      if (!accessibleFarms.includes(data.farm_id)) {
        socket.emit('ERROR', {
          message: 'Access denied to this farm',
          code: 'PERMISSION_DENIED'
        });
        return;
      }
      
      // Log the knowledge query for audit
      await supabase
        .from('knowledge_query_logs')
        .insert({
          user_id: userId,
          farm_id: data.farm_id,
          query: data.query,
          context: data.context || {}
        });
      
      // Forward query to ElizaOS knowledge service
      // This would typically be an API call to the ElizaOS service
      // For now, we'll just echo back a response for testing
      setTimeout(() => {
        socket.emit('KNOWLEDGE_RESPONSE', {
          query_id: Math.random().toString(36).substring(2, 15),
          result: {
            answer: `Response to query: ${data.query}`,
            sources: [
              { title: "Trading Documentation", url: "#" },
              { title: "Market Analysis", url: "#" }
            ],
            confidence: 0.95
          },
          timestamp: new Date().toISOString()
        });
      }, 800);
      
      // In a real implementation, you would make an API call to ElizaOS Knowledge Base
      // and then emit the response when it comes back
    } catch (error) {
      console.error('Error processing knowledge query:', error);
      socket.emit('ERROR', {
        message: 'Failed to process knowledge query',
        code: 'KNOWLEDGE_ERROR',
        details: error
      });
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${userId}`);
  });
});

// Start the server
const PORT = process.env.SOCKET_SERVER_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});

export { io };
