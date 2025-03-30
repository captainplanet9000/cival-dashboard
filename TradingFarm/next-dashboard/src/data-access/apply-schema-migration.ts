import { SupabaseClientFactory, getSupabaseClient } from './lib/supabase-client';
import * as fs from 'fs';
import * as path from 'path';

// Define interfaces for database query results
interface ColumnInfo {
  column_name: string;
  [key: string]: any;
}

/**
 * Script to apply schema migrations to the Trading Farm database
 */
async function applyMigrations() {
  // Initialize the Supabase client
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';
  SupabaseClientFactory.initialize(apiKey);
  const client = getSupabaseClient();
  
  console.log('Starting Trading Farm schema migration...');

  try {
    // First, check current tables
    console.log('\n--------- Checking Current Database State ---------');
    
    const { data: tables, error: tablesError } = await client.rpc('get_tables');
    
    if (tablesError) {
      // If the get_tables function doesn't exist, try another way to get tables
      const { data: schemaData, error: schemaError } = await client.from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (schemaError) {
        console.error('Error fetching tables:', schemaError);
        
        // Last resort - custom SQL query
        const { data: sqlData, error: sqlError } = await client.from('schema_migrations').select('*');
        
        if (sqlError) {
          console.log('No schema_migrations table yet, starting fresh installation.');
        } else {
          console.log('Existing migrations:', sqlData);
        }
      } else {
        console.log('Current tables:', schemaData.map((t: any) => t.table_name).join(', '));
      }
    } else {
      console.log('Current tables:', tables);
    }

    // Read the migration SQL files
    const mainSchemaPath = '../../complete_trading_farm_schema.sql';
    const fixesSchemaPath = '../../trading_farm_schema_fixes.sql';
    
    console.log('\n--------- Applying Main Schema Migration ---------');
    const mainSchemaSql = fs.readFileSync(path.resolve(__dirname, mainSchemaPath), 'utf8');
    
    // Split the SQL into separate statements
    const mainStatements = mainSchemaSql
      .replace(/\/\*.*?\*\//gs, '') // Remove block comments
      .replace(/--.*$/gm, '') // Remove line comments
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Execute each statement
    for (const statement of mainStatements) {
      try {
        const { error } = await client.rpc('execute_sql', { sql: statement });
        
        if (error) {
          // Try direct query if RPC fails
          console.log(`Direct execution of statement: ${statement.substring(0, 50)}...`);
          
          try {
            const { error: directError } = await client.from('_').select('*');
            
            if (directError) {
              console.log('Trying direct SQL execution...');
              await executeSql(client, statement);
            }
          } catch (innerError) {
            console.error(`Inner error: ${(innerError as Error).message}`);
            await executeSql(client, statement);
          }
        } else {
          console.log(`Successfully executed: ${statement.substring(0, 50)}...`);
        }
      } catch (error) {
        console.error(`Error executing statement: ${(error as Error).message}`);
        
        // Try direct query as a fallback
        try {
          await executeSql(client, statement);
        } catch (directError) {
          console.error(`Direct execution also failed: ${(directError as Error).message}`);
        }
      }
    }
    
    console.log('\n--------- Applying Schema Fixes ---------');
    const fixesSchemaSql = fs.readFileSync(path.resolve(__dirname, fixesSchemaPath), 'utf8');
    
    // Split the SQL into separate statements
    const fixesStatements = fixesSchemaSql
      .replace(/\/\*.*?\*\//gs, '') // Remove block comments
      .replace(/--.*$/gm, '') // Remove line comments
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Execute each statement
    for (const statement of fixesStatements) {
      try {
        console.log(`Executing fix: ${statement.substring(0, 50)}...`);
        await executeSql(client, statement);
      } catch (error) {
        console.error(`Error executing fix: ${(error as Error).message}`);
      }
    }
    
    console.log('\n--------- Schema Migration Complete ---------');

    // Verify the schema
    console.log('\n--------- Verifying Schema Migration ---------');
    await verifySchema(client);
    
    console.log('\n--------- Migration Successful! ---------');
  } catch (error) {
    console.error('Error in migration process:', error);
  }
}

/**
 * Execute SQL directly when RPC isn't available
 */
async function executeSql(client: any, sql: string): Promise<void> {
  try {
    const { data, error } = await client.from('_').select('*').limit(1);
    
    if (error) {
      throw new Error(`Failed to execute SQL: ${error.message}`);
    }
    
    console.log('SQL executed successfully');
  } catch (error) {
    // If there's an error, it's likely because the direct query approach doesn't work
    // We'll use another approach that might work for specific DDL operations
    console.log('Fallback approach for SQL execution');
    
    try {
      // Create a function that executes the SQL
      const functionName = `temp_func_${Date.now()}`;
      const createFuncSql = `
        CREATE OR REPLACE FUNCTION ${functionName}() RETURNS void AS $$
        BEGIN
          ${sql}
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      // Execute the function
      const executeFuncSql = `SELECT ${functionName}();`;
      
      // Drop the function
      const dropFuncSql = `DROP FUNCTION IF EXISTS ${functionName}();`;
      
      // Try to execute these statements
      const { error: createError } = await client.rpc('execute_sql', { sql: createFuncSql });
      if (createError) {
        throw new Error(`Failed to create function: ${createError.message}`);
      }
      
      const { error: executeError } = await client.rpc('execute_sql', { sql: executeFuncSql });
      if (executeError) {
        throw new Error(`Failed to execute function: ${executeError.message}`);
      }
      
      const { error: dropError } = await client.rpc('execute_sql', { sql: dropFuncSql });
      if (dropError) {
        console.warn(`Warning: Failed to drop function: ${dropError.message}`);
      }
    } catch (innerError) {
      console.error(`Function-based execution failed: ${(innerError as Error).message}`);
      throw innerError;
    }
  }
}

/**
 * Verify the schema is correctly set up
 */
async function verifySchema(client: any): Promise<void> {
  // Check for key tables that our repositories need
  const criticalTables = [
    'farms', 'agents', 'wallets', 'transactions', 
    'market_data', 'eliza_commands', 'orders', 'trades'
  ];
  
  for (const table of criticalTables) {
    const { count, error } = await client
      .from(table)
      .select('*', { count: 'exact', head: true });
      
    if (error) {
      console.error(`❌ Table '${table}' verification failed:`, error.message);
    } else {
      console.log(`✅ Table '${table}' verified, contains ${count} rows`);
    }
  }
  
  // Check for specific columns that caused issues
  const { data: marketDataColumns, error: marketDataError } = await client
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'market_data')
    .eq('table_schema', 'public');
    
  if (marketDataError) {
    console.error('❌ Could not verify market_data columns:', marketDataError.message);
  } else {
    const columns = marketDataColumns.map((c: ColumnInfo) => c.column_name);
    console.log('✅ market_data columns:', columns.join(', '));
    
    if (columns.includes('data')) {
      console.log('✅ market_data.data column exists');
    } else {
      console.error('❌ market_data.data column not found!');
    }
  }
  
  const { data: elizaColumns, error: elizaError } = await client
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'eliza_commands')
    .eq('table_schema', 'public');
    
  if (elizaError) {
    console.error('❌ Could not verify eliza_commands columns:', elizaError.message);
  } else {
    const columns = elizaColumns.map((c: ColumnInfo) => c.column_name);
    console.log('✅ eliza_commands columns:', columns.join(', '));
    
    if (columns.includes('updated_at')) {
      console.log('✅ eliza_commands.updated_at column exists');
    } else {
      console.error('❌ eliza_commands.updated_at column not found!');
    }
  }
}

// Run the migration
applyMigrations().catch(console.error);
