/**
 * Test Supabase Connection
 * 
 * This script tests the Supabase connection using the client utilities.
 * Run with: npx ts-node src/tests/test-supabase-connection.ts
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import * as fs from 'fs';
import * as path from 'path';

// Read configuration file
const configPath = path.resolve(__dirname, '../../supabase-mcp-ready.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Create Supabase client directly
function createDirectClient() {
  return createClient<Database>(
    config.api_url,
    config.service_role_key,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: { 'x-application-name': 'trading-farm-test' }
      }
    }
  );
}

// Test basic connection and query
async function testBasicConnection() {
  console.log('🔄 Testing basic Supabase connection...');
  
  const supabase = createDirectClient();
  
  try {
    // Test connection with simple query
    const { data, error } = await supabase
      .from('farms')
      .select('id, name')
      .limit(5);
      
    if (error) throw error;
    
    console.log('✅ Connection successful!');
    console.log('Sample data:', data);
    
    return true;
  } catch (err) {
    console.error('❌ Connection failed:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

// Test creating a farm
async function testCreateFarm() {
  console.log('\n🔄 Testing farm creation...');
  
  const supabase = createDirectClient();
  const farmName = `Test Farm ${new Date().toISOString()}`;
  
  try {
    // Create a new farm
    const { data, error } = await supabase
      .from('farms')
      .insert([{ name: farmName }])
      .select();
      
    if (error) throw error;
    
    console.log('✅ Farm created successfully!');
    console.log('New farm:', data);
    
    return data?.[0]?.id;
  } catch (err) {
    console.error('❌ Farm creation failed:', err instanceof Error ? err.message : String(err));
    
    // If the error is about the table not existing, show SQL to create it
    if (err instanceof Error && err.message.includes('relation "farms" does not exist')) {
      console.log('\n⚠️ The farms table does not exist. Run this SQL to create it:');
      console.log(`
CREATE TABLE public.farms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON farms
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Enable RLS
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow users to read farms"
  ON farms FOR SELECT
  USING (true);

CREATE POLICY "Allow users to create farms"
  ON farms FOR INSERT
  WITH CHECK (true);
      `);
    }
    
    return null;
  }
}

// Test querying all tables in the database
async function testListTables() {
  console.log('\n🔄 Testing database schema...');
  
  const supabase = createDirectClient();
  
  try {
    // List all tables in the public schema
    const { data, error } = await supabase.rpc('list_tables');
    
    if (error) {
      if (error.message.includes('function "list_tables" does not exist')) {
        // Create the function if it doesn't exist
        console.log('⚠️ The list_tables function does not exist. Using alternate method...');
        
        const { data: tables, error: tableError } = await supabase
          .from('pg_tables')
          .select('tablename')
          .eq('schemaname', 'public');
          
        if (tableError) throw tableError;
        
        console.log('✅ Tables found in database:');
        tables.forEach(table => console.log(`- ${table.tablename}`));
        return tables.map(t => t.tablename);
      } else {
        throw error;
      }
    }
    
    console.log('✅ Tables found in database:');
    data.forEach(table => console.log(`- ${table}`));
    return data;
  } catch (err) {
    console.error('❌ Schema query failed:', err instanceof Error ? err.message : String(err));
    
    console.log('\n⚠️ To create a helper function for listing tables, run this SQL:');
    console.log(`
CREATE OR REPLACE FUNCTION list_tables()
RETURNS TABLE (tablename TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT t.tablename::text
  FROM pg_catalog.pg_tables t
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;
    `);
    
    return null;
  }
}

// Main test function
async function main() {
  console.log('🧪 TRADING FARM SUPABASE CONNECTION TEST');
  console.log('=======================================');
  console.log('Project ID:', config.project_id);
  console.log('API URL:', config.api_url);
  console.log('=======================================\n');
  
  // Test basic connection
  const connectionSuccess = await testBasicConnection();
  
  // If basic connection works, try more advanced operations
  if (connectionSuccess) {
    const farmId = await testCreateFarm();
    const tables = await testListTables();
    
    console.log('\n=======================================');
    console.log('FINAL RESULTS:');
    console.log('- Basic Connection:', connectionSuccess ? '✅ SUCCESS' : '❌ FAILED');
    console.log('- Farm Creation:', farmId ? '✅ SUCCESS' : '❌ FAILED');
    console.log('- Schema Query:', tables ? '✅ SUCCESS' : '❌ FAILED');
    
    if (connectionSuccess && farmId && tables) {
      console.log('\n🎉 ALL TESTS PASSED! Supabase connection is working properly.');
      
      // Recommend next steps
      console.log('\n📋 Next steps:');
      console.log('1. Create additional tables for your data model (agents, strategies, transactions, etc.)');
      console.log('2. Set up proper RLS policies for all tables');
      console.log('3. Generate TypeScript types with: npx supabase gen types typescript --local > src/types/database.types.ts');
    } else {
      console.log('\n⚠️ Some tests failed. Review the output above for details.');
    }
  } else {
    console.log('\n❌ Basic connection failed. Please check your Supabase configuration.');
  }
}

// Run the tests
main().catch(err => {
  console.error('💥 FATAL ERROR:', err instanceof Error ? err.message : String(err));
});
