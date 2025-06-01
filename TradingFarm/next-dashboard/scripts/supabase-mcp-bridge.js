/**
 * Supabase MCP Bridge
 * 
 * This script creates a bridge between the Supabase MCP and your Trading Farm dashboard.
 * It uses your existing Supabase configuration and provides a local server that
 * implements the MCP protocol for Supabase interactions.
 */

const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Load configuration
const configPath = path.join(__dirname, '..', 'supabase-mcp-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Initialize Supabase client
const supabase = createClient(
  config.supabaseUrl,
  config.serviceKey
);

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Verify Supabase connection
app.get('/test-connection', async (req, res) => {
  try {
    const { data, error } = await supabase.from('farms').select('id').limit(1);
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
    
    return res.json({
      success: true,
      message: 'Successfully connected to Supabase',
      projectId: config.projectId
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// MCP execution endpoint
app.post('/execute', async (req, res) => {
  const { tool, params } = req.body;
  
  try {
    let result;
    
    switch (tool) {
      case 'run_query':
        result = await handleRunQuery(params);
        break;
      case 'insert_record':
        result = await handleInsertRecord(params);
        break;
      case 'update_record':
        result = await handleUpdateRecord(params);
        break;
      case 'delete_record':
        result = await handleDeleteRecord(params);
        break;
      case 'run_sql':
        result = await handleRunSql(params);
        break;
      case 'create_farm':
        result = await handleCreateFarm(params);
        break;
      case 'create_agent':
        result = await handleCreateAgent(params);
        break;
      case 'create_wallet':
        result = await handleCreateWallet(params);
        break;
      case 'get_farm_details':
        result = await handleGetFarmDetails(params);
        break;
      case 'run_migration':
        result = await handleRunMigration(params);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown tool: ${tool}`
        });
    }
    
    return res.json(result);
  } catch (err) {
    console.error(`Error executing tool ${tool}:`, err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Handle run_query tool
async function handleRunQuery(params) {
  const { table, select, where, order, limit } = params;
  
  let query = supabase.from(table).select(select || '*');
  
  if (where) {
    Object.entries(where).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  
  if (order) {
    query = query.order(order);
  }
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return {
      success: false,
      error: error.message
    };
  }
  
  return {
    success: true,
    data
  };
}

// Handle insert_record tool
async function handleInsertRecord(params) {
  const { table, data, returning } = params;
  
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select(returning || '*');
  
  if (error) {
    return {
      success: false,
      error: error.message
    };
  }
  
  return {
    success: true,
    data: result[0]
  };
}

// Handle update_record tool
async function handleUpdateRecord(params) {
  const { table, data, where, returning } = params;
  
  let query = supabase.from(table).update(data);
  
  Object.entries(where).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  const { data: result, error } = await query.select(returning || '*');
  
  if (error) {
    return {
      success: false,
      error: error.message
    };
  }
  
  return {
    success: true,
    data: result[0]
  };
}

// Handle delete_record tool
async function handleDeleteRecord(params) {
  const { table, where, returning } = params;
  
  let query = supabase.from(table).delete();
  
  Object.entries(where).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  if (returning) {
    query = query.select(returning);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return {
      success: false,
      error: error.message
    };
  }
  
  return {
    success: true,
    data
  };
}

// Handle run_sql tool
async function handleRunSql(params) {
  const { sql } = params;
  
  // Note: This requires postgres connection directly,
  // which might not be available with standard Supabase access
  // This is a placeholder implementation
  return {
    success: false,
    error: 'Direct SQL execution is not supported in this bridge. Use the specific tools instead.'
  };
}

// Handle create_farm tool
async function handleCreateFarm(params) {
  const farmData = {
    name: params.name,
    description: params.description,
    user_id: params.user_id,
    status: params.status || 'active',
    exchange: params.exchange,
    api_keys: params.api_keys || {},
    config: params.config || {}
  };
  
  const { data, error } = await supabase
    .from('farms')
    .insert(farmData)
    .select('*');
  
  if (error) {
    return {
      success: false,
      error: error.message
    };
  }
  
  return {
    success: true,
    data: data[0]
  };
}

// Handle create_agent tool
async function handleCreateAgent(params) {
  const agentData = {
    name: params.name,
    farm_id: params.farm_id,
    status: params.status || 'active',
    type: params.type || 'standard',
    configuration: params.configuration || {}
  };
  
  const { data, error } = await supabase
    .from('agents')
    .insert(agentData)
    .select('*');
  
  if (error) {
    return {
      success: false,
      error: error.message
    };
  }
  
  return {
    success: true,
    data: data[0]
  };
}

// Handle create_wallet tool
async function handleCreateWallet(params) {
  const walletData = {
    name: params.name,
    address: params.address,
    balance: params.balance || 0,
    farm_id: params.farm_id,
    user_id: params.user_id
  };
  
  const { data, error } = await supabase
    .from('wallets')
    .insert(walletData)
    .select('*');
  
  if (error) {
    return {
      success: false,
      error: error.message
    };
  }
  
  return {
    success: true,
    data: data[0]
  };
}

// Handle get_farm_details tool
async function handleGetFarmDetails(params) {
  const { farm_id } = params;
  
  // Get farm data
  const { data: farm, error: farmError } = await supabase
    .from('farms')
    .select('*')
    .eq('id', farm_id)
    .single();
  
  if (farmError) {
    return {
      success: false,
      error: farmError.message
    };
  }
  
  // Get agents
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('*')
    .eq('farm_id', farm_id);
  
  if (agentsError) {
    return {
      success: false,
      error: agentsError.message
    };
  }
  
  // Get wallets
  const { data: wallets, error: walletsError } = await supabase
    .from('wallets')
    .select('*')
    .eq('farm_id', farm_id);
  
  if (walletsError) {
    return {
      success: false,
      error: walletsError.message
    };
  }
  
  return {
    success: true,
    data: {
      farm,
      agents: agents || [],
      wallets: wallets || []
    }
  };
}

// Handle run_migration tool
async function handleRunMigration(params) {
  const { sql } = params;
  
  try {
    // Using the Postgres connection method for direct SQL execution
    console.log('Executing migration SQL...');
    
    // Split the SQL into separate statements by semicolons
    // This is a basic approach - more complex SQL might need a proper SQL parser
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    const results = [];
    let errorEncountered = false;
    
    // Execute each statement separately
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}`);
      
      try {
        const { data, error } = await supabase.rpc('execute_sql', { 
          sql_statement: statement + ';' 
        });
        
        if (error) {
          console.error(`Error executing statement ${i + 1}:`, error);
          errorEncountered = true;
          results.push({ success: false, error: error.message, statement: statement });
        } else {
          results.push({ success: true, statement: statement });
        }
      } catch (stmtError) {
        console.error(`Exception executing statement ${i + 1}:`, stmtError);
        errorEncountered = true;
        results.push({ success: false, error: stmtError.message, statement: statement });
      }
    }
    
    if (errorEncountered) {
      return {
        success: false,
        error: 'Migration encountered errors. See details for more information.',
        details: results
      };
    }
    
    return {
      success: true,
      message: `Successfully executed ${statements.length} SQL statements`,
      details: results
    };
  } catch (error) {
    console.error('Error executing migration:', error);
    return {
      success: false,
      error: error.message || 'Unknown error executing migration'
    };
  }
}

// Start the server
const PORT = process.env.PORT || 9876;
app.listen(PORT, () => {
  console.log(`Supabase MCP Bridge running on port ${PORT}`);
  console.log(`Project ID: ${config.projectId}`);
  console.log(`Supabase URL: ${config.supabaseUrl}`);
});
