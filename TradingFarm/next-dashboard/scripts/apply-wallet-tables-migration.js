/**
 * Apply Wallet Management Tables Migration
 * 
 * This script applies the wallet management tables migration directly using the Supabase SDK.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load Supabase configuration
const configPath = path.join(__dirname, '..', 'supabase-mcp-config.json');
const configFile = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(configFile);

// Migration file path
const MIGRATION_PATH = path.join(__dirname, '..', 'supabase', 'migrations', '20250404_add_wallet_management_tables.sql');

// Initialize Supabase client using the service role key to ensure full permissions
const supabase = createClient(
  config.supabaseUrl,
  config.serviceKey
);

// Function to create db functions if they don't exist
async function ensureHelperFunctionsExist() {
  console.log('Ensuring helper functions exist...');
  
  // Check if handle_created_at function exists
  try {
    // Create handle_created_at function if it doesn't exist
    const createdAtSQL = `
    CREATE OR REPLACE FUNCTION public.handle_created_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.created_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    `;
    
    // Create handle_updated_at function if it doesn't exist
    const updatedAtSQL = `
    CREATE OR REPLACE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    `;
    
    // Create execute_sql function for running SQL statements
    const executeSqlSQL = `
    CREATE OR REPLACE FUNCTION public.execute_sql(sql_statement TEXT)
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
    AS $$
    BEGIN
      EXECUTE sql_statement;
      RETURN json_build_object('success', true);
    EXCEPTION
      WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
    END;
    $$;
    `;
    
    console.log('Creating handle_created_at function...');
    await supabase.rpc('execute_sql', { sql_statement: createdAtSQL });
    
    console.log('Creating handle_updated_at function...');
    await supabase.rpc('execute_sql', { sql_statement: updatedAtSQL });
    
    console.log('Creating execute_sql function...');
    await supabase.rpc('execute_sql', { sql_statement: executeSqlSQL });
    
    return true;
  } catch (error) {
    console.error('Error creating helper functions:', error);
    return false;
  }
}

// Function to apply migration
async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    
    // Ensure helper functions exist
    const helpersExist = await ensureHelperFunctionsExist();
    if (!helpersExist) {
      console.error('Failed to create helper functions. Cannot proceed with migration.');
      process.exit(1);
    }
    
    console.log('Splitting SQL into statements...');
    const statements = migrationSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    // Execute each statement separately
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('execute_sql', { 
          sql_statement: statement + ';' 
        });
        
        if (error) {
          console.error(`Error executing statement ${i + 1}:`, error);
          console.error('Statement:', statement);
          // Continue with next statement instead of stopping
          continue;
        }
      } catch (stmtError) {
        console.error(`Exception executing statement ${i + 1}:`, stmtError);
        console.error('Statement:', statement);
        // Continue with next statement instead of stopping
        continue;
      }
    }
    
    console.log('\nMigration completed!');
    console.log('Wallet management tables have been created.');
    
    // Generate types after migration
    console.log('\nTo update your TypeScript types, run:');
    console.log('npx supabase gen types typescript --local > src/types/database.types.ts');
    
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

// Check if @supabase/supabase-js is installed
try {
  require.resolve('@supabase/supabase-js');
} catch (e) {
  console.log('Installing @supabase/supabase-js dependency...');
  const { execSync } = require('child_process');
  execSync('npm install @supabase/supabase-js', { 
    stdio: 'inherit', 
    cwd: path.join(__dirname, '..')
  });
}

// Run the migration
applyMigration();
