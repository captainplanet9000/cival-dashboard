/**
 * Database Schema Inspector
 * 
 * This script inspects the actual database schema to help us understand
 * the structure before performing integration tests.
 */

// Set environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://bgvlzvswzpfoywfxehis.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspectSchema() {
  console.log('\n============================');
  console.log('📊 DATABASE SCHEMA INSPECTOR');
  console.log('============================\n');

  try {
    console.log('Checking existing tables...\n');
    
    // Check for ElizaOS tables first
    const elizaTables = ['agent_commands', 'agent_responses', 'knowledge_base'];
    
    for (const table of elizaTables) {
      console.log(`Checking table: ${table}`);
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        console.log(`❌ Table '${table}' is not accessible: ${error.message}`);
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    }
    
    // Check core tables
    const coreTables = ['farms', 'agents', 'orders'];
    
    for (const table of coreTables) {
      console.log(`\nInspecting table structure: ${table}`);
      
      try {
        // This query uses system tables to get column information
        const { data, error } = await supabase.rpc('get_table_definition', { table_name: table });
        
        if (error) {
          console.log(`❌ Could not get schema for '${table}': ${error.message}`);
          
          // Alternative: try a basic select to see what columns we get back
          console.log(`Trying sample query on ${table}...`);
          const { data: sampleData, error: sampleError } = await supabase.from(table).select('*').limit(1);
          
          if (sampleError) {
            console.log(`❌ Error querying '${table}': ${sampleError.message}`);
          } else if (sampleData && sampleData.length > 0) {
            console.log(`✅ Sample record from '${table}':`);
            console.log(JSON.stringify(sampleData[0], null, 2));
          } else {
            console.log(`ℹ️ No records found in '${table}', checking structure only`);
            
            // Try a direct SQL query to get columns
            // Note: This only works with enough permissions
            const { data: structData, error: structError } = await supabase.rpc('get_column_names', { table_name: table });
            
            if (structError) {
              console.log(`❌ Could not get columns for '${table}': ${structError.message}`);
            } else {
              console.log(`✅ Columns in '${table}':`);
              console.log(structData);
            }
          }
        } else {
          console.log(`✅ Table definition for '${table}':`);
          console.log(data);
        }
      } catch (e) {
        console.log(`❌ Error inspecting '${table}': ${e.message}`);
        
        // Fallback to basic query
        try {
          console.log(`Trying basic query on ${table}...`);
          const { data, error } = await supabase.from(table).select('*').limit(1);
          
          if (error) {
            console.log(`❌ Error with basic query: ${error.message}`);
          } else if (data && data.length > 0) {
            console.log(`✅ Sample data structure from '${table}':`);
            console.log(Object.keys(data[0]));
          } else {
            console.log(`ℹ️ Table '${table}' exists but is empty`);
          }
        } catch (e2) {
          console.log(`❌ Fallback query failed: ${e2.message}`);
        }
      }
    }

    console.log('\n============================');
    console.log('📊 SCHEMA INSPECTION COMPLETE');
    console.log('============================\n');
    
  } catch (error) {
    console.error('Unexpected error during schema inspection:', error);
  }
}

// Run the inspector
inspectSchema();
