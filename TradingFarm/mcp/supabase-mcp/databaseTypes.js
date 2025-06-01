/**
 * Trading Farm Database Types
 * This file provides type definitions for the Trading Farm database tables
 */

// These types mirror the structure from database.types.ts in the main project
const DatabaseTypes = {
  // Core entities
  farms: {
    id: 'uuid',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    name: 'string',
    description: 'string',
    status: 'string', // active, paused, archived
    goal_id: 'uuid',
    user_id: 'uuid',
    settings: 'json',
    performance: 'json'
  },
  
  agents: {
    id: 'uuid',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    name: 'string',
    description: 'string',
    status: 'string', // active, paused, archived
    farm_id: 'uuid',
    settings: 'json',
    instructions: 'json',
    capabilities: 'json',
    performance: 'json'
  },
  
  strategies: {
    id: 'uuid',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    name: 'string',
    description: 'string',
    code: 'string',
    type: 'string',
    parameters: 'json',
    performance: 'json'
  },
  
  goals: {
    id: 'uuid',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    name: 'string',
    description: 'string',
    type: 'string',
    priority: 'string',
    status: 'string',
    target_value: 'number',
    current_value: 'number',
    deadline: 'timestamp',
    farm_id: 'uuid'
  },

  // Trading related
  orders: {
    id: 'uuid',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    exchange: 'string',
    symbol: 'string',
    order_type: 'string',
    side: 'string',
    quantity: 'number',
    price: 'number',
    status: 'string',
    farm_id: 'uuid',
    agent_id: 'uuid',
    strategy_id: 'uuid',
    exchange_order_id: 'string'
  },
  
  trades: {
    id: 'uuid',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    exchange: 'string',
    symbol: 'string',
    side: 'string',
    quantity: 'number',
    price: 'number',
    fee: 'number',
    fee_currency: 'string',
    order_id: 'uuid',
    farm_id: 'uuid',
    agent_id: 'uuid'
  },
  
  positions: {
    id: 'uuid',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    exchange: 'string',
    symbol: 'string',
    side: 'string',
    quantity: 'number',
    entry_price: 'number',
    current_price: 'number',
    unrealized_pnl: 'number',
    status: 'string',
    farm_id: 'uuid',
    strategy_id: 'uuid'
  },
  
  // Banking related
  wallets: {
    id: 'uuid',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    name: 'string',
    type: 'string',
    status: 'string',
    user_id: 'uuid',
    balances: 'json'
  },
  
  transactions: {
    id: 'uuid',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    type: 'string',
    amount: 'number',
    currency: 'string',
    status: 'string',
    wallet_id: 'uuid',
    farm_id: 'uuid',
    reference_id: 'string'
  },
  
  // Additional tables
  position_adjustments: {
    id: 'uuid',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    position_id: 'uuid',
    adjustment_type: 'string',
    quantity: 'number',
    price: 'number',
    timestamp: 'timestamp'
  },
  
  position_import_jobs: {
    id: 'uuid',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    status: 'string',
    source: 'string',
    details: 'json',
    user_id: 'uuid'
  },
  
  ai_insights: {
    id: 'uuid',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    type: 'string',
    content: 'string',
    metadata: 'json',
    position_id: 'uuid'
  },
  
  position_reconciliation_logs: {
    id: 'uuid',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    status: 'string',
    details: 'json',
    position_id: 'uuid'
  }
};

// Validate that a provided object matches the expected schema
function validateAgainstSchema(tableName, data) {
  if (!DatabaseTypes[tableName]) {
    return { 
      valid: false, 
      error: `Unknown table: ${tableName}` 
    };
  }
  
  const schema = DatabaseTypes[tableName];
  const missingFields = [];
  const invalidTypes = [];
  
  // Check for required fields and type compatibility
  Object.entries(schema).forEach(([field, expectedType]) => {
    // Skip created_at and updated_at as they're handled automatically
    if (field === 'created_at' || field === 'updated_at') {
      return;
    }
    
    // For inserts, id can be generated automatically so we skip it
    if (field === 'id') {
      return;
    }
    
    if (data[field] === undefined || data[field] === null) {
      // Some fields might be optional, so we don't mark them as missing
      return;
    }
    
    // Check type compatibility
    const actualType = typeof data[field];
    let typeError = false;
    
    switch (expectedType) {
      case 'string':
        typeError = actualType !== 'string';
        break;
        
      case 'number':
        typeError = actualType !== 'number';
        break;
        
      case 'boolean':
        typeError = actualType !== 'boolean';
        break;
        
      case 'json':
        typeError = actualType !== 'object';
        break;
        
      case 'timestamp':
        // Check if it's a valid date string or Date object
        const isValidDate = !isNaN(new Date(data[field]).getTime());
        typeError = !isValidDate;
        break;
        
      case 'uuid':
        // Check if it's a valid UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        typeError = actualType !== 'string' || !uuidRegex.test(data[field]);
        break;
    }
    
    if (typeError) {
      invalidTypes.push({
        field,
        expected: expectedType,
        actual: actualType,
        value: data[field]
      });
    }
  });
  
  if (invalidTypes.length > 0) {
    return {
      valid: false,
      error: 'Invalid types',
      details: invalidTypes
    };
  }
  
  return { valid: true };
}

// Get all database table names
function getAllTables() {
  return Object.keys(DatabaseTypes);
}

// Get schema for a specific table
function getTableSchema(tableName) {
  return DatabaseTypes[tableName] || null;
}

module.exports = {
  DatabaseTypes,
  validateAgainstSchema,
  getAllTables,
  getTableSchema
};
