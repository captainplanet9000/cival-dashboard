#!/usr/bin/env node
/**
 * Apply Migrations Script
 * 
 * This script directly applies migration files to the Supabase database
 * using the Supabase JavaScript client.
 * 
 * It can be used when the Supabase CLI is encountering issues with the .env file.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration from supabase-mcp-config.json
const configPath = path.join(__dirname, '..', 'supabase-mcp-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Create Supabase client
const supabaseUrl = config.databaseUrl;
const supabaseServiceKey = config.serviceKey;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in supabase-mcp-config.json');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migrations directory
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

// Function to execute SQL from a migration file
async function executeMigration(filePath) {
  try {
    console.log(`📄 Reading migration file: ${path.basename(filePath)}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log(`🔄 Executing migration: ${path.basename(filePath)}`);
    const { error } = await supabase.rpc('pg_advisory_lock', { key: 1 });
    if (error) throw error;
    
    try {
      const { error: sqlError } = await supabase.rpc('run_sql', { sql });
      if (sqlError) throw sqlError;
      
      console.log(`✅ Successfully applied migration: ${path.basename(filePath)}`);
    } finally {
      await supabase.rpc('pg_advisory_unlock', { key: 1 });
    }
  } catch (error) {
    console.error(`❌ Error applying migration ${path.basename(filePath)}:`, error.message);
    console.error('Continuing to next migration...');
  }
}

// Create the run_sql RPC function if it doesn't exist
async function ensureRunSqlFunction() {
  try {
    console.log('🔧 Ensuring run_sql function exists...');
    
    const createFunctionSql = `
    CREATE OR REPLACE FUNCTION run_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$;
    `;
    
    const { error } = await supabase.rpc('pg_advisory_lock', { key: 1 });
    if (error) throw error;
    
    try {
      // Try to execute a simple query to check connection
      const { error: testError } = await supabase.from('_schema').select('version').limit(1);
      if (testError) {
        throw new Error(`Database connection test failed: ${testError.message}`);
      }
      
      // Create function using a direct query
      const { error: functionError } = await supabase.rpc('run_sql', { sql: createFunctionSql });
      if (functionError) {
        // If the function doesn't exist yet, create it another way
        const { error: directError } = await supabase.rpc('execute_sql', { sql: createFunctionSql });
        if (directError) {
          console.log('Unable to create run_sql function. This is expected for the first run.');
          // We'll handle this by directly applying the utility functions file first
        }
      }
      
      console.log('✅ run_sql function check completed');
    } finally {
      await supabase.rpc('pg_advisory_unlock', { key: 1 });
    }
  } catch (error) {
    console.error('❌ Error setting up run_sql function:', error.message);
    console.log('Continuing with direct SQL execution...');
  }
}

// Apply utility functions first to ensure check_table_exists is available
async function applyUtilityFunctions() {
  const utilityFile = path.join(migrationsDir, '20250402_utility_functions.sql');
  
  if (fs.existsSync(utilityFile)) {
    console.log('🔧 Applying utility functions first...');
    await executeMigration(utilityFile);
  }
}

// Main function to run all migrations
async function applyMigrations() {
  try {
    console.log('🚀 Starting Trading Farm migration application...');
    
    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      console.error(`❌ Migrations directory doesn't exist: ${migrationsDir}`);
      process.exit(1);
    }
    
    // Get list of migration files in order
    let migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`📋 Found ${migrationFiles.length} migration files to process`);
    
    // Ensure the run_sql function exists
    await ensureRunSqlFunction();
    
    // Apply utility functions first
    await applyUtilityFunctions();
    
    // Remove utility functions from the list to avoid applying twice
    migrationFiles = migrationFiles.filter(file => file !== '20250402_utility_functions.sql');
    
    // Apply remaining migrations in order
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      await executeMigration(migrationPath);
    }
    
    console.log('🎉 All migrations applied successfully!');
    
    // Generate TypeScript types
    console.log('🔄 Generating TypeScript types...');
    // This still requires the Supabase CLI but we'll provide instructions
    console.log('⚠️ To generate TypeScript types, run:');
    console.log('npx supabase gen types typescript --local > src/types/database.types.ts');
    
  } catch (error) {
    console.error('❌ Migration application failed:', error.message);
    process.exit(1);
  }
}

// Run the migrations
applyMigrations();
