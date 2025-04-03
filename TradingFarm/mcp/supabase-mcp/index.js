const express = require('express');
const http = require('http');
const WebSocketServer = require('websocket').server;
const bodyParser = require('body-parser');
const cors = require('cors');
const { 
  supabase, 
  queryTable, 
  executeRawQuery, 
  checkConnection 
} = require('./supabaseClient');
const { 
  validateAgainstSchema, 
  getAllTables, 
  getTableSchema 
} = require('./databaseTypes');

require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3500;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Create HTTP server
const server = http.createServer(app);

// Define WebSocket server
const wsServer = new WebSocketServer({
  httpServer: server,
  autoAcceptConnections: false
});

// Store connected clients
const clients = new Map();

// Handle WebSocket requests
wsServer.on('request', (request) => {
  const connection = request.accept(null, request.origin);
  const clientId = Date.now().toString();
  clients.set(clientId, connection);
  
  console.log(`Client ${clientId} connected`);
  
  // Send welcome message
  connection.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to Supabase MCP Server',
    clientId
  }));
  
  // Handle incoming messages
  connection.on('message', async (message) => {
    if (message.type === 'utf8') {
      try {
        const data = JSON.parse(message.utf8Data);
        console.log('Received message:', data);
        
        // Process tool calls
        if (data.type === 'tool_call') {
          await handleToolCall(connection, data);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        connection.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    }
  });
  
  // Handle connection close
  connection.on('close', () => {
    clients.delete(clientId);
    console.log(`Client ${clientId} disconnected`);
  });
});

// Handle tool calls
async function handleToolCall(connection, data) {
  const { tool, params, requestId } = data;
  let response = { 
    tool, 
    success: false, 
    error: 'Unknown tool',
    requestId
  };
  
  console.log(`Processing tool call: ${tool}`);
  
  try {
    switch (tool) {
      case 'check_connection':
        response = { 
          tool, 
          ...(await checkConnection()),
          requestId 
        };
        break;
        
      case 'query_table':
        const { operation, tableName, data: queryData } = params;
        
        // Validate data against schema for insert and update operations
        if ((operation === 'insert' || operation === 'update') && queryData.values) {
          const validation = validateAgainstSchema(tableName, queryData.values);
          if (!validation.valid) {
            response = {
              tool,
              success: false,
              operation,
              tableName,
              error: 'Schema validation failed',
              details: validation.details || validation.error,
              requestId
            };
            break;
          }
        }
        
        response = { 
          tool, 
          operation,
          tableName,
          ...(await queryTable(operation, tableName, queryData)),
          requestId
        };
        break;
        
      case 'get_tables':
        // Fetch all tables from the actual database
        const tableQuery = await queryTable('select', 'information_schema.tables', {
          select: 'table_name',
          filters: [
            { type: 'eq', column: 'table_schema', value: 'public' }
          ]
        });
        
        if (tableQuery.success) {
          response = { 
            tool, 
            success: true,
            tables: tableQuery.data.map(t => t.table_name),
            // Also include the tables we know about from our schema
            knownTables: getAllTables(),
            requestId
          };
        } else {
          response = { 
            tool, 
            success: false,
            error: tableQuery.error,
            requestId
          };
        }
        break;
        
      case 'get_table_schema':
        const { table } = params;
        
        // First check our local schema definition
        const localSchema = getTableSchema(table);
        
        // Then query the actual database schema
        const schemaQuery = await queryTable('select', 'information_schema.columns', {
          select: 'column_name, data_type, is_nullable, column_default',
          filters: [
            { type: 'eq', column: 'table_schema', value: 'public' },
            { type: 'eq', column: 'table_name', value: table }
          ]
        });
        
        if (schemaQuery.success) {
          response = { 
            tool, 
            success: true,
            tableName: table,
            columns: schemaQuery.data,
            localSchema,
            requestId
          };
        } else {
          response = { 
            tool, 
            success: false,
            error: schemaQuery.error,
            requestId
          };
        }
        break;
        
      case 'execute_raw_query':
        // This is a powerful tool and should be used with caution
        const { query, params: queryParams } = params;
        response = {
          tool,
          ...(await executeRawQuery(query, queryParams)),
          requestId
        };
        break;
        
      // Trading Farm specific tools
      
      case 'get_farms':
        response = {
          tool,
          ...(await queryTable('select', 'farms', params)),
          requestId
        };
        break;
        
      case 'get_farm_by_id':
        const { farmId } = params;
        response = {
          tool,
          ...(await queryTable('select', 'farms', {
            filters: [{ type: 'eq', column: 'id', value: farmId }]
          })),
          requestId
        };
        break;
        
      case 'create_farm':
        // Validate farm data
        const farmValidation = validateAgainstSchema('farms', params.farm);
        if (!farmValidation.valid) {
          response = {
            tool,
            success: false,
            error: 'Farm validation failed',
            details: farmValidation.details || farmValidation.error,
            requestId
          };
          break;
        }
        
        response = {
          tool,
          ...(await queryTable('insert', 'farms', { values: params.farm })),
          requestId
        };
        break;
        
      case 'update_farm':
        const { farmId: updateFarmId, farmData } = params;
        response = {
          tool,
          ...(await queryTable('update', 'farms', {
            values: farmData,
            match: { id: updateFarmId }
          })),
          requestId
        };
        break;
        
      case 'get_agents':
        response = {
          tool,
          ...(await queryTable('select', 'agents', params)),
          requestId
        };
        break;
        
      case 'get_agents_by_farm':
        const { farmId: agentFarmId } = params;
        response = {
          tool,
          ...(await queryTable('select', 'agents', {
            filters: [{ type: 'eq', column: 'farm_id', value: agentFarmId }]
          })),
          requestId
        };
        break;
        
      case 'create_agent':
        // Validate agent data
        const agentValidation = validateAgainstSchema('agents', params.agent);
        if (!agentValidation.valid) {
          response = {
            tool,
            success: false,
            error: 'Agent validation failed',
            details: agentValidation.details || agentValidation.error,
            requestId
          };
          break;
        }
        
        response = {
          tool,
          ...(await queryTable('insert', 'agents', { values: params.agent })),
          requestId
        };
        break;
        
      case 'update_agent':
        const { agentId, agentData } = params;
        response = {
          tool,
          ...(await queryTable('update', 'agents', {
            values: agentData,
            match: { id: agentId }
          })),
          requestId
        };
        break;
        
      case 'get_strategies':
        response = {
          tool,
          ...(await queryTable('select', 'strategies', params)),
          requestId
        };
        break;
        
      case 'create_strategy':
        response = {
          tool,
          ...(await queryTable('insert', 'strategies', { values: params.strategy })),
          requestId
        };
        break;
        
      case 'get_goals':
        response = {
          tool,
          ...(await queryTable('select', 'goals', params)),
          requestId
        };
        break;
        
      case 'create_goal':
        response = {
          tool,
          ...(await queryTable('insert', 'goals', { values: params.goal })),
          requestId
        };
        break;
        
      case 'update_goal':
        const { goalId, goalData } = params;
        response = {
          tool,
          ...(await queryTable('update', 'goals', {
            values: goalData,
            match: { id: goalId }
          })),
          requestId
        };
        break;
        
      case 'get_transactions':
        response = {
          tool,
          ...(await queryTable('select', 'transactions', params)),
          requestId
        };
        break;
        
      case 'get_orders':
        response = {
          tool,
          ...(await queryTable('select', 'orders', params)),
          requestId
        };
        break;
        
      case 'create_order':
        response = {
          tool,
          ...(await queryTable('insert', 'orders', { values: params.order })),
          requestId
        };
        break;
        
      case 'update_order':
        const { orderId, orderData } = params;
        response = {
          tool,
          ...(await queryTable('update', 'orders', {
            values: orderData,
            match: { id: orderId }
          })),
          requestId
        };
        break;
        
      case 'get_positions':
        response = {
          tool,
          ...(await queryTable('select', 'positions', params)),
          requestId
        };
        break;
        
      case 'get_position_by_id':
        const { positionId } = params;
        
        // First get the position
        const positionResult = await queryTable('select', 'positions', {
          filters: [{ type: 'eq', column: 'id', value: positionId }]
        });
        
        if (!positionResult.success || !positionResult.data || positionResult.data.length === 0) {
          response = {
            tool,
            success: false,
            error: 'Position not found',
            requestId
          };
          break;
        }
        
        // Get position adjustments
        const adjustmentsResult = await queryTable('select', 'position_adjustments', {
          filters: [{ type: 'eq', column: 'position_id', value: positionId }]
        });
        
        // Get AI insights
        const insightsResult = await queryTable('select', 'ai_insights', {
          filters: [{ type: 'eq', column: 'position_id', value: positionId }]
        });
        
        // Get reconciliation logs
        const logsResult = await queryTable('select', 'position_reconciliation_logs', {
          filters: [{ type: 'eq', column: 'position_id', value: positionId }]
        });
        
        response = {
          tool,
          success: true,
          position: positionResult.data[0],
          adjustments: adjustmentsResult.success ? adjustmentsResult.data : [],
          insights: insightsResult.success ? insightsResult.data : [],
          reconciliationLogs: logsResult.success ? logsResult.data : [],
          requestId
        };
        break;
        
      // ElizaOS integration tools
      
      case 'create_ai_insight':
        const { insight } = params;
        response = {
          tool,
          ...(await queryTable('insert', 'ai_insights', { values: insight })),
          requestId
        };
        break;
        
      case 'get_ai_insights':
        response = {
          tool,
          ...(await queryTable('select', 'ai_insights', params)),
          requestId
        };
        break;
        
      default:
        response = { 
          tool, 
          success: false, 
          error: `Unsupported tool: ${tool}`,
          requestId 
        };
    }
  } catch (error) {
    console.error(`Error handling tool call ${tool}:`, error);
    response = {
      tool,
      success: false,
      error: error.message || 'An unexpected error occurred',
      requestId
    };
  }
  
  connection.send(JSON.stringify(response));
}

// REST API endpoints for health check
app.get('/health', async (req, res) => {
  const connection = await checkConnection();
  res.json({
    status: 'ok',
    server: 'Supabase MCP Server',
    supabase: connection
  });
});

// Get available tables
app.get('/tables', async (req, res) => {
  const tableQuery = await queryTable('select', 'information_schema.tables', {
    select: 'table_name',
    filters: [
      { type: 'eq', column: 'table_schema', value: 'public' }
    ]
  });
  
  if (tableQuery.success) {
    res.json({
      success: true,
      tables: tableQuery.data.map(t => t.table_name),
      knownTables: getAllTables()
    });
  } else {
    res.status(500).json({
      success: false,
      error: tableQuery.error
    });
  }
});

// Get specific table data
app.get('/table/:tableName', async (req, res) => {
  const { tableName } = req.params;
  const limit = parseInt(req.query.limit) || 100;
  
  const result = await queryTable('select', tableName, {
    pagination: { from: 0, to: limit - 1 }
  });
  
  if (result.success) {
    res.json({
      success: true,
      table: tableName,
      data: result.data,
      count: result.count
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error
    });
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`Supabase MCP Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Tables list: http://localhost:${PORT}/tables`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  clients.forEach((connection) => {
    connection.close();
  });
  server.close(() => {
    console.log('Server shutdown complete');
    process.exit(0);
  });
});
