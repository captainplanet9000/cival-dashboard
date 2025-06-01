/**
 * Database Schema Inspection Script
 * 
 * This script connects to Supabase and inspects the schema of key tables
 * to help with the ElizaOS integration.
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const supabaseUrl = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Inspect a table schema
 */
async function inspectTable(tableName) {
  console.log(`\n=== Inspecting Table: ${tableName} ===`);
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.error(`❌ Error accessing table ${tableName}:`, error.message);
      return;
    }
    
    if (data && data.length > 0) {
      console.log(`✅ Table ${tableName} exists with columns:`, Object.keys(data[0]).join(', '));
      console.log('Sample record:', JSON.stringify(data[0], null, 2));
    } else {
      console.log(`✅ Table ${tableName} exists but is empty`);
      
      // Try to get column info from the database directly
      const { data: columns, error: columnError } = await supabase.rpc('get_table_columns', { table_name: tableName });
      
      if (columnError) {
        console.log('Unable to get columns via RPC.');
      } else {
        console.log(`Columns: ${columns.join(', ')}`);
      }
    }
  } catch (error) {
    console.error(`Error inspecting ${tableName}:`, error.message);
  }
}

/**
 * Create a helper function for getting table columns
 */
async function setupHelperFunction() {
  try {
    const { error } = await supabase.rpc('get_table_columns', { table_name: 'farms' });
    
    if (error && error.message.includes('function does not exist')) {
      console.log('Creating helper function for schema inspection...');
      
      const { error: sqlError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
          RETURNS text[] 
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE
            cols text[];
          BEGIN
            SELECT array_agg(column_name::text) INTO cols
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = $1;
            
            RETURN cols;
          END;
          $$;
        `
      });
      
      if (sqlError) {
        console.error('Error creating helper function:', sqlError.message);
        
        // If exec_sql fails, try a simpler approach
        console.log('Trying direct SQL query via REST API...');
        
        // Print direct schema information instead
        const { data: schemaData, error: schemaError } = await supabase
          .from(tableName)
          .select();
        
        if (schemaError) {
          console.error('Error getting schema:', schemaError.message);
        } else {
          console.log('Schema data:', schemaData);
        }
      } else {
        console.log('Helper function created successfully');
      }
    }
  } catch (error) {
    console.error('Error setting up helper function:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Inspecting Supabase Database Schema 🔍');
  
  // Setup helper function if needed
  await setupHelperFunction();
  
  // Inspect key tables
  await inspectTable('farms');
  await inspectTable('agents');
  await inspectTable('orders');
  await inspectTable('agent_commands');
  
  console.log('\n🏁 Schema inspection complete');
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
});
