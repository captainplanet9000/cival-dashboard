/**
 * Apply Orders Table Migration through REST API
 * 
 * This script uses the Supabase REST API to apply a migration for the orders table,
 * aligning with the Trading Farm architecture and database workflow preferences.
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment
const SUPABASE_URL = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';

// Service role key (if available - typically used in admin contexts)
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client with appropriate key
const supabase = createClient(
  SUPABASE_URL, 
  SERVICE_ROLE_KEY || SUPABASE_KEY, 
  { auth: { persistSession: false } }
);

// Define the orders table SQL
const ordersTableSQL = `
-- First drop the table if it exists to ensure a clean slate
DROP TABLE IF EXISTS public.orders;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the orders table with the correct schema
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id INTEGER NOT NULL,
  agent_id INTEGER,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL,
  side TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC,
  time_in_force TEXT,
  status TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set up triggers for created_at and updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
set search_path = '';

-- Create trigger on orders table for updated_at
DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;
CREATE POLICY "Enable read access for all users" ON public.orders
  FOR SELECT USING (true);
  
DROP POLICY IF EXISTS "Enable insert for all users" ON public.orders;
CREATE POLICY "Enable insert for all users" ON public.orders
  FOR INSERT WITH CHECK (true);
  
DROP POLICY IF EXISTS "Enable update for all users" ON public.orders;
CREATE POLICY "Enable update for all users" ON public.orders
  FOR UPDATE USING (true);
`;

// Create a test order function
async function createTestOrder() {
  console.log('\n🧪 Creating test order...');
  
  const testOrder = {
    farm_id: 1,
    exchange: 'binance',
    symbol: 'BTC/USDT',
    type: 'market',
    side: 'buy',
    quantity: 0.01,
    status: 'pending',
    metadata: {
      created_by: 'order-migration-script',
      test: true
    }
  };
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert(testOrder)
      .select();
    
    if (error) {
      console.error('❌ Error creating test order:', error.message);
      return null;
    }
    
    console.log('✅ Test order created successfully!');
    console.log(data);
    return data[0];
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return null;
  }
}

// List existing tables to verify
async function listTables() {
  console.log('\n📋 Listing database tables...');
  
  try {
    // Using REST API to list tables
    const { data, error } = await supabase.rpc('list_tables');
    
    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('RPC function list_tables does not exist. This is expected.');
        console.log('Using information_schema instead...');
        
        // Alternative approach using information_schema
        const { data: schemaData, error: schemaError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public');
          
        if (schemaError) {
          console.error('❌ Error listing tables from information_schema:', schemaError.message);
          return [];
        }
        
        const tableNames = schemaData.map(row => row.table_name);
        console.log('Tables found:', tableNames);
        return tableNames;
      }
      
      console.error('❌ Error listing tables:', error.message);
      return [];
    }
    
    console.log('Tables found:', data);
    return data;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return [];
  }
}

// Execute SQL through Supabase REST API
async function executeSQLWithREST() {
  console.log('\n🚀 Applying migration using Supabase REST API...');
  
  try {
    // First, try using the REST API's /rest/v1/sql endpoint
    const apiUrl = `${SUPABASE_URL}/rest/v1/sql`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY || SUPABASE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY || SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ query: ordersTableSQL })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SQL execution failed: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Migration applied successfully via REST API!');
    return true;
  } catch (error) {
    console.error('❌ Error applying migration via REST:', error.message);
    console.log('\n⚠️ Please apply the migration manually using the Supabase SQL Editor.');
    console.log('1. Go to https://app.supabase.com/project/bgvlzvswzpfoywfxehis/sql');
    console.log('2. Copy and paste the SQL from supabase/migrations/20250401_create_orders_table.sql');
    console.log('3. Execute the SQL to recreate the orders table');
    return false;
  }
}

// Main function to orchestrate the migration
async function main() {
  console.log('==== Trading Farm Orders Migration ====');
  
  // Check existing tables
  const tables = await listTables();
  const hasOrdersTable = tables.includes('orders');
  
  if (hasOrdersTable) {
    console.log('Orders table already exists. Migrating schema...');
  } else {
    console.log('Orders table does not exist. Creating...');
  }
  
  // Apply the migration
  const success = await executeSQLWithREST();
  
  if (success) {
    // Create a test order to verify
    await createTestOrder();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('You can now use the order creation test page in your dashboard.');
    
    // Generate TypeScript types
    console.log('\nTo update TypeScript types, run:');
    console.log('npx supabase gen types typescript --project-id bgvlzvswzpfoywfxehis > src/types/database.types.ts');
  } else {
    console.log('\n❌ Migration could not be completed automatically.');
    console.log('Please follow the manual instructions above.');
  }
}

// Run the migration
main().catch(error => {
  console.error('❌ Fatal error:', error);
});
