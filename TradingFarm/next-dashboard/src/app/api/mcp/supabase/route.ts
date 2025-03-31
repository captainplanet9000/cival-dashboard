/**
 * Supabase MCP API Route
 * 
 * This API route provides an interface to the Supabase MCP server for the Trading Farm dashboard.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import type { Database } from '@/types/database.types';

// Define some TypeScript interfaces for our API
interface SupabaseMCPRequest {
  tool: string;
  params: Record<string, any>;
}

interface MigrationResult {
  success: boolean;
  statement: string;
  warning?: string;
  error?: string;
}

// Type definitions for handler function parameters
type RunQueryParams = {
  table: string;
  select?: string;
  where?: Record<string, any>;
  order?: string;
  limit?: number;
};

type InsertRecordParams = {
  table: string;
  data: Record<string, any>;
  returning?: string;
};

type UpdateRecordParams = {
  table: string;
  data: Record<string, any>;
  where: Record<string, any>;
  returning?: string;
};

type DeleteRecordParams = {
  table: string;
  where: Record<string, any>;
  returning?: string;
};

type RunSqlParams = {
  sql: string;
};

type SqlTransactionParams = {
  statements: string[];
};

type CreateFarmParams = {
  name: string;
  description?: string;
  user_id?: string;
};

type CreateAgentParams = {
  name: string;
  farm_id: number;
  status?: string;
  type?: string;
  configuration?: Record<string, any>;
};

type CreateWalletParams = {
  name: string;
  address: string;
  balance?: number;
  farm_id?: number;
  user_id?: string;
};

type RecordTransactionParams = {
  type: string;
  amount: number;
  wallet_id: number;
  farm_id?: number;
  status?: string;
};

type GetFarmDetailsParams = {
  farm_id: number;
};

type RunMigrationParams = {
  sql: string;
};

type ApplySchemaParams = {
  file_path: string;
};

type ConnectElizaAgentParams = {
  agent_id: number;
  eliza_id: string;
  connection_type?: string;
  capabilities?: string[];
};

type StoreKnowledgeParams = {
  title: string;
  content: string;
  tags?: string[];
  agent_ids?: number[];
};

type QueryKnowledgeParams = {
  query?: string;
  filter_tags?: string[];
  agent_id?: number;
};

// Load Supabase configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgzMTU1OSwiZXhwIjoyMDUyNDA3NTU5fQ.TZLKwHuMxv9xtSc0wJ7DG5ivjw0K-7NztPeLRsGqMAA';

// Create Supabase client
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  global: {
    headers: { 'x-application-name': 'trading-farm-dashboard-api' }
  }
});

// Common Supabase REST API headers
const supabaseHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${supabaseServiceKey}`,
  'apikey': supabaseServiceKey,
  'X-Client-Info': 'trading-farm-dashboard-api',
  'Prefer': 'return=representation'
};

/**
 * Handle POST requests to the Supabase MCP API
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json() as SupabaseMCPRequest;
    const { tool, params } = body;
    
    if (!tool || !params) {
      return NextResponse.json(
        { success: false, error: 'Missing tool or params in request' },
        { status: 400 }
      );
    }
    
    // Execute the appropriate tool with type assertions for params
    switch (tool) {
      case 'run_query':
        return await handleRunQuery(params as RunQueryParams);
      case 'insert_record':
        return await handleInsertRecord(params as InsertRecordParams);
      case 'update_record':
        return await handleUpdateRecord(params as UpdateRecordParams);
      case 'delete_record':
        return await handleDeleteRecord(params as DeleteRecordParams);
      case 'run_sql':
        return await handleRunSql(params as RunSqlParams);
      case 'sql_transaction':
        return await handleSqlTransaction(params as SqlTransactionParams);
      case 'create_farm':
        return await handleCreateFarm(params as CreateFarmParams);
      case 'create_agent':
        return await handleCreateAgent(params as CreateAgentParams);
      case 'create_wallet':
        return await handleCreateWallet(params as CreateWalletParams);
      case 'record_transaction':
        return await handleRecordTransaction(params as RecordTransactionParams);
      case 'get_farm_details':
        return await handleGetFarmDetails(params as GetFarmDetailsParams);
      case 'run_migration':
        return await handleRunMigration(params as RunMigrationParams);
      case 'apply_schema':
        return await handleApplySchema(params as ApplySchemaParams);
      case 'connect_eliza_agent':
        return await handleConnectElizaAgent(params as ConnectElizaAgentParams);
      case 'store_knowledge':
        return await handleStoreKnowledge(params as StoreKnowledgeParams);
      case 'query_knowledge':
        return await handleQueryKnowledge(params as QueryKnowledgeParams);
      case 'get_knowledge':
        return await handleGetKnowledge(params);
      default:
        return NextResponse.json(
          { success: false, error: `Unknown tool: ${tool}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in Supabase MCP API:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * Handle running a query on a table
 */
async function handleRunQuery(params: RunQueryParams) {
  const { table, select, where, order, limit } = params;
  
  let query = supabase.from(table).select(select || '*');
  
  // Apply where filters
  if (where) {
    Object.entries(where).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  
  // Apply order
  if (order) {
    const [column, direction] = order.split('.');
    query = query.order(column, { ascending: direction === 'asc' });
  }
  
  // Apply limit
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
  
  return NextResponse.json({ success: true, data });
}

/**
 * Handle inserting a record into a table
 */
async function handleInsertRecord(params: InsertRecordParams) {
  const { table, data, returning } = params;
  
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select(returning || '*')
    .single();
  
  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
  
  return NextResponse.json({ success: true, data: result });
}

/**
 * Handle updating records in a table
 */
async function handleUpdateRecord(params: UpdateRecordParams) {
  const { table, data, where, returning } = params;
  
  let query = supabase.from(table).update(data);
  
  // Apply where filters
  if (where) {
    Object.entries(where).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  
  const { data: result, error } = await query.select(returning || '*');
  
  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
  
  return NextResponse.json({ success: true, data: result });
}

/**
 * Handle deleting records from a table
 */
async function handleDeleteRecord(params: DeleteRecordParams) {
  const { table, where, returning } = params;
  
  let query = supabase.from(table).delete();
  
  // Apply where filters
  if (where) {
    Object.entries(where).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  
  const { data: result, error } = await query.select(returning || '*');
  
  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
  
  return NextResponse.json({ success: true, data: result });
}

/**
 * Handle running raw SQL
 */
async function handleRunSql(params: RunSqlParams) {
  const { sql } = params;
  
  try {
    // First attempt: Use Supabase client directly with type assertion to bypass TS error
    try {
      // Using type assertion because the RPC function may exist in the database but not in the TypeScript types
      const { data, error } = await (supabase.rpc as any)('execute_sql', {
        query: sql
      });
      
      if (error) {
        throw error;
      }
      
      return NextResponse.json({ success: true, data });
    } catch (clientError) {
      console.log('Supabase client RPC failed, trying alternative approach:', clientError);
      
      // For simple SELECT queries, we can try parsing and using the query builder
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+([^\s;]+)/i);
        
        if (selectMatch) {
          const columns = selectMatch[1].trim();
          const table = selectMatch[2].trim().replace(/["\[\]]/g, ''); // Remove quotes if present
          
          try {
            console.log(`Trying to query ${table} for ${columns}`);
            
            // Using any type to bypass TypeScript's strict table name checking
            const query = (supabase.from(table) as any);
            const { data, error } = await query.select(columns === '*' ? '*' : columns);
            
            if (error) {
              throw error;
            }
            
            return NextResponse.json({ success: true, data });
          } catch (selectError) {
            console.error('Direct query failed:', selectError);
          }
        }
      }
      
      // Special case for information_schema queries which are often used for migrations and schema checks
      if (sql.includes('information_schema.')) {
        try {
          // Create generic query using simple string queries instead of SQL
          // For table existence check, we'll substitute with simpler operations
          if (sql.includes('EXISTS') && sql.includes('information_schema.tables')) {
            const tableMatch = sql.match(/table_name\s*=\s*'([^']+)'/i);
            
            if (tableMatch) {
              const targetTable = tableMatch[1];
              console.log(`Checking if table exists: ${targetTable}`);
              
              // For public tables we can try to query them directly with a limit
              // This will work for existence check
              try {
                // Use any type to bypass TypeScript table name restrictions
                const { error } = await (supabase.from(targetTable) as any)
                  .select('*', { count: 'exact', head: true })
                  .limit(1);
                
                // If no error, table exists
                return NextResponse.json({ 
                  success: true, 
                  data: [{ exists: !error }] 
                });
              } catch (tableError) {
                console.error('Table check failed:', tableError);
                // If error, table likely doesn't exist
                return NextResponse.json({ 
                  success: true, 
                  data: [{ exists: false }] 
                });
              }
            }
          }
        } catch (schemaError) {
          console.error('Schema query failed:', schemaError);
        }
      }

      // Last resort: Try direct REST API call
      return await handleRunSqlFallback(sql);
    }
  } catch (error) {
    console.error('Error executing SQL:', error);
    
    // Final fallback for any other errors
    try {
      return await handleRunSqlFallback(sql);
    } catch (fallbackError) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      );
    }
  }
}

/**
 * Fallback method for running SQL without RPC function
 */
async function handleRunSqlFallback(sql: string) {
  try {
    // Direct API call to Supabase SQL REST endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        ...supabaseHeaders,
        'Prefer': 'params=single-object'
      },
      body: JSON.stringify({
        query: sql
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      
      // Check if it's "already exists" error (for idempotent operations)
      if (errorText.includes('already exists') || 
          errorText.includes('duplicate key') ||
          (errorText.includes('relation') && errorText.includes('already exists'))) {
        return NextResponse.json({
          success: true,
          warning: 'Object already exists (operation idempotent)',
          data: null
        });
      }
      
      return NextResponse.json(
        { success: false, error: `SQL Error: ${errorText}` },
        { status: 400 }
      );
    }
    
    const result = await response.json();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

/**
 * Handle running multiple SQL statements in a transaction
 */
async function handleSqlTransaction(params: SqlTransactionParams) {
  const { statements } = params;
  
  if (!Array.isArray(statements) || statements.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No SQL statements provided for transaction' },
      { status: 400 }
    );
  }
  
  // Create a transaction SQL string
  const transactionSql = `
    BEGIN;
    ${statements.join(';\n')}
    COMMIT;
  `;
  
  try {
    return await handleRunSql({ sql: transactionSql });
  } catch (error) {
    console.error('Error executing SQL transaction:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

/**
 * Handle creating a farm
 */
async function handleCreateFarm(params: CreateFarmParams) {
  const { name, description, user_id } = params;
  
  const { data, error } = await supabase
    .from('farms')
    .insert({
      name,
      description: description || null,
      user_id: user_id || null,
      status: 'active'
    })
    .select('*')
    .single();
  
  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
  
  return NextResponse.json({ success: true, data });
}

/**
 * Handle creating an agent
 */
async function handleCreateAgent(params: CreateAgentParams) {
  const { name, farm_id, status, type, configuration } = params;
  
  const { data, error } = await supabase
    .from('agents')
    .insert({
      name,
      farm_id,
      status: status || 'inactive',
      type: type || 'standard',
      configuration: configuration || {}
    })
    .select('*')
    .single();
  
  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
  
  return NextResponse.json({ success: true, data });
}

/**
 * Handle creating a wallet
 */
async function handleCreateWallet(params: CreateWalletParams) {
  const { name, address, balance, farm_id, user_id } = params;
  
  const { data, error } = await supabase
    .from('wallets')
    .insert({
      name,
      address,
      balance: balance || 0,
      farm_id: farm_id || null,
      user_id: user_id || null
    })
    .select('*')
    .single();
  
  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
  
  return NextResponse.json({ success: true, data });
}

/**
 * Handle recording a transaction
 */
async function handleRecordTransaction(params: RecordTransactionParams) {
  const { type, amount, wallet_id, farm_id, status } = params;
  
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      type,
      amount,
      wallet_id,
      farm_id: farm_id || null,
      status: status || 'pending'
    })
    .select('*')
    .single();
  
  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
  
  return NextResponse.json({ success: true, data });
}

/**
 * Handle getting farm details
 */
async function handleGetFarmDetails(params: GetFarmDetailsParams) {
  const { farm_id } = params;
  
  // Get farm details
  const { data: farm, error: farmError } = await supabase
    .from('farms')
    .select('*')
    .eq('id', farm_id)
    .single();
  
  if (farmError) {
    return NextResponse.json(
      { success: false, error: farmError.message },
      { status: 400 }
    );
  }
  
  // Get agents for this farm
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('*')
    .eq('farm_id', farm_id);
  
  if (agentsError) {
    return NextResponse.json(
      { success: false, error: agentsError.message },
      { status: 400 }
    );
  }
  
  // Get wallets for this farm
  const { data: wallets, error: walletsError } = await supabase
    .from('wallets')
    .select('*')
    .eq('farm_id', farm_id);
  
  if (walletsError) {
    return NextResponse.json(
      { success: false, error: walletsError.message },
      { status: 400 }
    );
  }
  
  // Get transactions for this farm
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('*')
    .eq('farm_id', farm_id);
  
  if (transactionsError) {
    return NextResponse.json(
      { success: false, error: transactionsError.message },
      { status: 400 }
    );
  }
  
  return NextResponse.json({
    success: true,
    data: {
      farm,
      agents,
      wallets,
      transactions
    }
  });
}

/**
 * Handle running a migration
 */
async function handleRunMigration(params: RunMigrationParams) {
  const { sql } = params;
  
  if (!sql) {
    return NextResponse.json(
      { success: false, error: 'No SQL provided for migration' },
      { status: 400 }
    );
  }
  
  // Split the SQL into individual statements
  // This is a simplistic approach - a proper SQL parser would be better
  const statements: string[] = [];
  let currentStatement = '';
  let inFunctionBody = false;
  
  sql.split('\n').forEach((line: string) => {
    // Skip comments and empty lines when detecting statement boundaries
    if (line.trim().startsWith('--') || line.trim() === '') {
      currentStatement += line + '\n';
      return;
    }
    
    // Check if we're entering a function definition
    if (line.includes('CREATE OR REPLACE FUNCTION') || line.includes('CREATE FUNCTION')) {
      inFunctionBody = true;
    }
    
    // Check if we're exiting a function definition
    if (inFunctionBody && line.includes('$$ LANGUAGE')) {
      inFunctionBody = false;
    }
    
    // Add the line to the current statement
    currentStatement += line + '\n';
    
    // If the line ends with a semicolon and we're not in a function body, it's the end of a statement
    if (line.trim().endsWith(';') && !inFunctionBody) {
      if (currentStatement.trim().length > 0) {
        statements.push(currentStatement.trim());
      }
      currentStatement = '';
    }
  });
  
  // Add any remaining statement
  if (currentStatement.trim().length > 0) {
    statements.push(currentStatement.trim());
  }
  
  console.log(`Found ${statements.length} SQL statements to execute in migration`);
  
  // Execute each statement and collect results
  const results: MigrationResult[] = [];
  let successCount = 0;
  
  for (const statement of statements) {
    try {
      const response = await handleRunSql({ sql: statement });
      const responseData = await response.json();
      
      if (responseData.success) {
        successCount++;
        results.push({ success: true, statement: statement.substring(0, 60) + '...' });
      } else {
        // Check if it's an "already exists" error (which is okay for idempotent migrations)
        const isAlreadyExistsError = 
          responseData.error?.includes('already exists') || 
          responseData.error?.includes('duplicate key') ||
          (responseData.error?.includes('relation') && responseData.error?.includes('already exists'));
        
        if (isAlreadyExistsError) {
          successCount++; // Count as success for idempotent migrations
          results.push({ 
            success: true, 
            warning: 'Object already exists',
            statement: statement.substring(0, 60) + '...' 
          });
        } else {
          results.push({ 
            success: false, 
            error: responseData.error,
            statement: statement.substring(0, 60) + '...' 
          });
        }
      }
    } catch (error) {
      results.push({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        statement: statement.substring(0, 60) + '...' 
      });
    }
  }
  
  return NextResponse.json({
    success: true,
    data: {
      total: statements.length,
      successful: successCount,
      results
    }
  });
}

/**
 * Handle applying a schema from a migration file
 */
async function handleApplySchema(params: ApplySchemaParams) {
  const { file_path } = params;
  
  if (!file_path) {
    return NextResponse.json(
      { success: false, error: 'No file path provided for schema application' },
      { status: 400 }
    );
  }
  
  try {
    // Load migration file
    const fullPath = path.resolve(process.cwd(), file_path);
    const migrationSql = fs.readFileSync(fullPath, 'utf8');
    
    // Run the migration
    return await handleRunMigration({ sql: migrationSql });
  } catch (error) {
    console.error('Error applying schema:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

/**
 * Handle connecting an ElizaOS agent to the Trading Farm system
 */
async function handleConnectElizaAgent(params: ConnectElizaAgentParams) {
  const { agent_id, eliza_id, connection_type, capabilities = [] } = params;
  
  try {
    // First check if the agent exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agent_id)
      .single();
    
    if (agentError) {
      return NextResponse.json(
        { success: false, error: `Agent not found: ${agentError.message}` },
        { status: 400 }
      );
    }
    
    // Create or update the ElizaOS agent connection
    const { data, error } = await supabase
      .from('eliza_connections')
      .upsert({
        agent_id,
        eliza_id,
        connection_type: connection_type || 'read-only',
        capabilities: capabilities || [],
        status: 'active',
        last_connected: new Date().toISOString()
      })
      .select('*')
      .single();
    
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    // Update the agent's configuration to include ElizaOS connection
    const updatedConfig = {
      ...agent.configuration,
      eliza: {
        connected: true,
        eliza_id,
        connection_type,
        capabilities
      }
    };
    
    const { error: updateError } = await supabase
      .from('agents')
      .update({ configuration: updatedConfig })
      .eq('id', agent_id);
    
    if (updateError) {
      console.error('Warning: Failed to update agent configuration:', updateError);
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error connecting ElizaOS agent:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

/**
 * Handle storing knowledge in the ElizaOS RAG system
 */
async function handleStoreKnowledge(params: StoreKnowledgeParams) {
  const { title, content, tags = [], agent_ids = [] } = params;
  
  try {
    // Store the knowledge item
    const { data, error } = await supabase
      .from('knowledge_items')
      .insert({
        title,
        content,
        tags,
        status: 'active'
      })
      .select('*')
      .single();
    
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    // If agent_ids are provided, create knowledge-agent connections
    if (agent_ids.length > 0) {
      const connections = agent_ids.map((agent_id: number) => ({
        knowledge_id: data.id,
        agent_id,
        access_level: 'read-write' 
      }));
      
      const { error: connectError } = await supabase
        .from('knowledge_access')
        .insert(connections);
      
      if (connectError) {
        console.error('Warning: Failed to create agent-knowledge connections:', connectError);
      }
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error storing knowledge:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

/**
 * Handle querying the ElizaOS knowledge base
 */
async function handleQueryKnowledge(params: QueryKnowledgeParams) {
  const { query, filter_tags = [], agent_id } = params;
  
  try {
    // Build knowledge query
    let dbQuery = supabase
      .from('knowledge_items')
      .select('*')
      .eq('status', 'active');
    
    // Apply tag filters if provided
    if (filter_tags.length > 0) {
      // Filter for items where at least one tag matches
      dbQuery = dbQuery.overlaps('tags', filter_tags);
    }
    
    // If agent_id is provided, filter for knowledge items accessible to that agent
    if (agent_id) {
      const { data: accessibleIds, error: accessError } = await supabase
        .from('knowledge_access')
        .select('knowledge_id')
        .eq('agent_id', agent_id);
      
      if (!accessError && accessibleIds && accessibleIds.length > 0) {
        const ids = accessibleIds.map((record: { knowledge_id: number }) => record.knowledge_id);
        dbQuery = dbQuery.in('id', ids);
      }
    }
    
    // Execute the query
    const { data, error } = await dbQuery;
    
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    // If a search query is provided, perform simple text matching
    // (In a real system, this would use vector embeddings and similarity search)
    let results = data;
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = data.filter((item: { title: string; content: string }) => 
        item.title.toLowerCase().includes(lowerQuery) || 
        item.content.toLowerCase().includes(lowerQuery)
      );
      
      // Sort by relevance (simple implementation)
      results.sort((a: { title: string; content: string }, b: { title: string; content: string }) => {
        const aScore = (a.title.toLowerCase().includes(lowerQuery) ? 2 : 0) + 
                      (a.content.toLowerCase().includes(lowerQuery) ? 1 : 0);
        const bScore = (b.title.toLowerCase().includes(lowerQuery) ? 2 : 0) + 
                      (b.content.toLowerCase().includes(lowerQuery) ? 1 : 0);
        return bScore - aScore;
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: results,
      metadata: {
        query,
        matches: results.length,
        filter_tags,
        agent_id
      }
    });
  } catch (error) {
    console.error('Error querying knowledge:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

// ElizaOS Integration Tool Handlers
const connectElizaAgent = async (params: {
  agent_id: number;
  eliza_id: string;
  connection_type?: string;
  capabilities?: string[];
}): Promise<ToolResponse> => {
  const { agent_id, eliza_id, connection_type = 'read-only', capabilities = [] } = params;
  
  try {
    // Verify the agent exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agent_id)
      .single();
    
    if (agentError) {
      return {
        success: false,
        error: `Agent not found: ${agentError.message}`
      };
    }
    
    // Create the ElizaOS connection
    const { data, error } = await supabase
      .from('eliza_connections')
      .insert({
        agent_id,
        eliza_id,
        connection_type,
        capabilities,
        status: 'active',
        last_connected: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      return {
        success: false,
        error: `Failed to create ElizaOS connection: ${error.message}`
      };
    }
    
    // Update the agent's configuration to include ElizaOS settings
    const configuration = agent.configuration || {};
    configuration.eliza = {
      connection_type,
      capabilities,
      eliza_id,
      connected: true,
      last_connected: new Date().toISOString()
    };
    
    const { error: updateError } = await supabase
      .from('agents')
      .update({ configuration })
      .eq('id', agent_id);
    
    if (updateError) {
      return {
        success: false,
        error: `Failed to update agent configuration: ${updateError.message}`
      };
    }
    
    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const storeKnowledge = async (params: {
  title: string;
  content: string;
  tags?: string[];
  agent_ids?: number[];
}): Promise<ToolResponse> => {
  const { title, content, tags = [], agent_ids = [] } = params;
  
  try {
    // Create the knowledge item
    const { data: knowledgeItem, error: knowledgeError } = await supabase
      .from('knowledge_items')
      .insert({
        title,
        content,
        tags,
        status: 'active'
      })
      .select()
      .single();
    
    if (knowledgeError) {
      return {
        success: false,
        error: `Failed to create knowledge item: ${knowledgeError.message}`
      };
    }
    
    // If agent_ids are provided, create knowledge access entries
    if (agent_ids.length > 0) {
      const accessEntries = agent_ids.map(agent_id => ({
        knowledge_id: knowledgeItem.id,
        agent_id,
        access_level: 'read-write' 
      }));
      
      const { error: accessError } = await supabase
        .from('knowledge_access')
        .insert(accessEntries);
      
      if (accessError) {
        // Log the error but don't fail the whole operation
        console.error('Failed to create knowledge access entries:', accessError);
      }
    }
    
    return {
      success: true,
      data: knowledgeItem
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const queryKnowledge = async (params: {
  query: string;
  agent_id?: number;
  filter_tags?: string[];
}): Promise<ToolResponse> => {
  const { query, agent_id, filter_tags = [] } = params;
  
  try {
    let knowledgeQuery = supabase
      .from('knowledge_items')
      .select('*')
      .eq('status', 'active');
    
    // Apply tag filters if provided
    if (filter_tags.length > 0) {
      // For each tag, add an overlap condition
      filter_tags.forEach(tag => {
        knowledgeQuery = knowledgeQuery.contains('tags', [tag]);
      });
    }
    
    // Basic text search
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
    
    if (searchTerms.length > 0) {
      // Use OR conditions for title and content
      const searchConditions = searchTerms.map(term => {
        return `title.ilike.%${term}% OR content.ilike.%${term}%`;
      }).join(',');
      
      knowledgeQuery = knowledgeQuery.or(searchConditions);
    }
    
    // If agent_id is provided, filter by knowledge accessible to this agent
    if (agent_id) {
      // Get knowledge IDs accessible to this agent
      const { data: accessData, error: accessError } = await supabase
        .from('knowledge_access')
        .select('knowledge_id')
        .eq('agent_id', agent_id);
      
      if (accessError) {
        console.error('Error fetching knowledge access:', accessError);
      } else if (accessData && accessData.length > 0) {
        const knowledgeIds = accessData.map(item => item.knowledge_id);
        knowledgeQuery = knowledgeQuery.in('id', knowledgeIds);
      }
    }
    
    const { data, error } = await knowledgeQuery;
    
    if (error) {
      return {
        success: false,
        error: `Failed to query knowledge: ${error.message}`
      };
    }
    
    return {
      success: true,
      data,
      metadata: {
        query,
        matches: data.length,
        search_terms: searchTerms
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const getKnowledge = async (params: {
  agent_id?: number;
  farm_id?: number;
}): Promise<ToolResponse> => {
  const { agent_id, farm_id } = params;
  
  try {
    if (agent_id) {
      // Get knowledge items accessible to this agent
      const { data: accessData, error: accessError } = await supabase
        .from('knowledge_access')
        .select('knowledge_id')
        .eq('agent_id', agent_id);
      
      if (accessError) {
        return {
          success: false,
          error: `Failed to get knowledge access: ${accessError.message}`
        };
      }
      
      if (!accessData || accessData.length === 0) {
        return {
          success: true,
          data: []
        };
      }
      
      const knowledgeIds = accessData.map(item => item.knowledge_id);
      
      const { data, error } = await supabase
        .from('knowledge_items')
        .select('*')
        .in('id', knowledgeIds);
      
      if (error) {
        return {
          success: false,
          error: `Failed to get knowledge items: ${error.message}`
        };
      }
      
      return {
        success: true,
        data
      };
    } else if (farm_id) {
      // Get all agents for this farm
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('id')
        .eq('farm_id', farm_id);
      
      if (agentsError) {
        return {
          success: false,
          error: `Failed to get farm agents: ${agentsError.message}`
        };
      }
      
      if (!agentsData || agentsData.length === 0) {
        return {
          success: true,
          data: []
        };
      }
      
      const agentIds = agentsData.map(agent => agent.id);
      
      // Get knowledge items accessible to any of these agents
      const { data: accessData, error: accessError } = await supabase
        .from('knowledge_access')
        .select('knowledge_id')
        .in('agent_id', agentIds);
      
      if (accessError) {
        return {
          success: false,
          error: `Failed to get knowledge access: ${accessError.message}`
        };
      }
      
      if (!accessData || accessData.length === 0) {
        return {
          success: true,
          data: []
        };
      }
      
      const knowledgeIds = [...new Set(accessData.map(item => item.knowledge_id))];
      
      const { data, error } = await supabase
        .from('knowledge_items')
        .select('*')
        .in('id', knowledgeIds);
      
      if (error) {
        return {
          success: false,
          error: `Failed to get knowledge items: ${error.message}`
        };
      }
      
      return {
        success: true,
        data
      };
    } else {
      // Get all knowledge items
      const { data, error } = await supabase
        .from('knowledge_items')
        .select('*')
        .eq('status', 'active');
      
      if (error) {
        return {
          success: false,
          error: `Failed to get knowledge items: ${error.message}`
        };
      }
      
      return {
        success: true,
        data
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// Add the ElizaOS tool handlers to the tools map
toolHandlers.set('connect_eliza_agent', connectElizaAgent);
toolHandlers.set('store_knowledge', storeKnowledge);
toolHandlers.set('query_knowledge', queryKnowledge);
toolHandlers.set('get_knowledge', getKnowledge);
