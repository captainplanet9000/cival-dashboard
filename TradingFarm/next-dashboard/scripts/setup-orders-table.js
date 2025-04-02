// Script to set up the orders table and test order creation
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// ===== HARDCODED VALUES FOR TESTING =====
const SUPABASE_URL = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';

// Initialize Supabase client
console.log('==== Trading Farm Database Setup & Test ====');
console.log(`Using URL: ${SUPABASE_URL}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  global: { fetch: fetch }
});

// List existing tables
async function listTables() {
  console.log('\n📋 Listing existing tables...');
  
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.error('❌ Error listing tables:', error.message);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No tables found in public schema');
      return [];
    }
    
    console.log('Available tables:');
    const tableNames = data.map(t => t.table_name);
    tableNames.forEach(name => console.log(`- ${name}`));
    
    return tableNames;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return [];
  }
}

// Create the orders table if it doesn't exist
async function createOrdersTable() {
  console.log('\n🏗️ Creating orders table...');
  
  const createTableSQL = `
  -- Enable UUID extension if not already enabled
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  -- Create the orders table
  CREATE TABLE IF NOT EXISTS public.orders (
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
  
  -- Create trigger for updated_at
  CREATE OR REPLACE FUNCTION public.handle_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  
  -- Create trigger on orders table
  DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
  CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
  
  -- Enable RLS
  ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
  
  -- Create policies
  CREATE POLICY "Enable read access for all users" ON public.orders
    FOR SELECT USING (true);
    
  CREATE POLICY "Enable insert for all users" ON public.orders
    FOR INSERT WITH CHECK (true);
    
  CREATE POLICY "Enable update for all users" ON public.orders
    FOR UPDATE USING (true);
  `;
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (error) {
      // If the rpc doesn't exist, we'll need to create it first
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('Creating the exec_sql function first...');
        
        const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS void AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        `;
        
        const { error: fnError } = await supabase.rpc('exec_sql', { sql: createFunctionSQL });
        
        if (fnError) {
          console.error('❌ Cannot create exec_sql function:', fnError.message);
          console.log('\n⚠️ You need to manually create the orders table using SQL Editor in Supabase dashboard.');
          return false;
        }
        
        // Try again after creating the function
        const { error: retryError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
        
        if (retryError) {
          console.error('❌ Error creating orders table:', retryError.message);
          return false;
        }
      } else {
        console.error('❌ Error creating orders table:', error.message);
        return false;
      }
    }
    
    console.log('✅ Orders table created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Test creating a simple order
async function testOrderCreation() {
  console.log('\n🧪 Testing order creation...');
  
  // Create a simple test order
  const testOrder = {
    farm_id: 1,
    exchange: 'binance',
    symbol: 'BTC/USDT',
    type: 'market',
    side: 'buy',
    quantity: 0.01,
    status: 'pending'
  };
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert(testOrder)
      .select();
    
    if (error) {
      console.error('❌ Error creating test order:', error.message);
      return false;
    }
    
    console.log('✅ Test order created successfully!');
    console.log('Order data:', JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Create advanced orders (trailing stop, OCO, bracket)
async function testAdvancedOrders() {
  console.log('\n🧪 Testing advanced order types...');
  
  // Sample orders
  const orders = [
    {
      name: 'Trailing Stop',
      data: {
        farm_id: 1,
        exchange: 'binance',
        symbol: 'BTC/USDT',
        type: 'trailing_stop',
        side: 'buy',
        quantity: 0.01,
        price: 75000,
        time_in_force: 'gtc',
        status: 'pending',
        metadata: {
          trail_value: 5,
          trail_type: 'percent',
          activation_price: 76000
        }
      }
    },
    {
      name: 'OCO Order',
      data: {
        farm_id: 1,
        exchange: 'binance',
        symbol: 'ETH/USDT',
        type: 'oco',
        side: 'buy',
        quantity: 0.1,
        price: 3500,
        time_in_force: 'gtc',
        status: 'pending',
        metadata: {
          take_profit: 4000,
          stop_loss: 3000
        }
      }
    },
    {
      name: 'Bracket Order',
      data: {
        farm_id: 1,
        exchange: 'binance',
        symbol: 'SOL/USDT',
        type: 'bracket',
        side: 'buy',
        quantity: 1,
        price: 150,
        time_in_force: 'gtc',
        status: 'pending',
        metadata: {
          take_profit: 180,
          stop_loss: 130,
          trailing_stop: true,
          trail_value: 5,
          trail_type: 'percent'
        }
      }
    }
  ];
  
  let successCount = 0;
  
  // Test each order type
  for (const order of orders) {
    console.log(`\nTesting ${order.name}...`);
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert(order.data)
        .select();
      
      if (error) {
        console.error(`❌ Error creating ${order.name}:`, error.message);
        continue;
      }
      
      console.log(`✅ ${order.name} created successfully!`);
      console.log('Order data:', JSON.stringify(data, null, 2));
      successCount++;
    } catch (error) {
      console.error(`❌ Unexpected error creating ${order.name}:`, error);
    }
  }
  
  console.log(`\n${successCount} out of ${orders.length} advanced orders created successfully.`);
  return successCount === orders.length;
}

// Create farms table if it doesn't exist (dependency for orders)
async function createFarmsTable() {
  console.log('\n🏗️ Creating farms table (dependency for orders)...');
  
  const createTableSQL = `
  CREATE TABLE IF NOT EXISTS public.farms (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  -- Enable RLS
  ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
  
  -- Create policies
  CREATE POLICY "Enable read access for all users" ON public.farms
    FOR SELECT USING (true);
    
  CREATE POLICY "Enable insert for all users" ON public.farms
    FOR INSERT WITH CHECK (true);
  `;
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (error) {
      console.error('❌ Error creating farms table:', error.message);
      return false;
    }
    
    console.log('✅ Farms table created successfully!');
    
    // Insert a test farm 
    const { error: insertError } = await supabase
      .from('farms')
      .insert({ name: 'Test Farm', description: 'A test farm for orders' })
      .select();
    
    if (insertError) {
      console.error('❌ Error creating test farm:', insertError.message);
    } else {
      console.log('✅ Test farm created successfully!');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Main function
async function setup() {
  console.log('🚀 Setting up database tables for orders testing...');
  
  // List existing tables
  const tables = await listTables();
  
  // Check if orders table exists
  const hasOrdersTable = tables.includes('orders');
  const hasFarmsTable = tables.includes('farms');
  
  // Create dependencies first
  if (!hasFarmsTable) {
    await createFarmsTable();
  } else {
    console.log('✅ Farms table already exists');
  }
  
  // Create orders table if needed
  if (!hasOrdersTable) {
    const success = await createOrdersTable();
    if (!success) {
      console.error('❌ Cannot proceed with testing due to table creation failure');
      return;
    }
  } else {
    console.log('✅ Orders table already exists');
  }
  
  // Test order creation
  await testOrderCreation();
  
  // Test advanced order types
  await testAdvancedOrders();
  
  console.log('\n✅ Setup and testing completed!');
  console.log('You can now use the order creation test page in the UI.');
}

// Run the setup
setup()
  .catch(error => {
    console.error('❌ Fatal error:', error);
  });
