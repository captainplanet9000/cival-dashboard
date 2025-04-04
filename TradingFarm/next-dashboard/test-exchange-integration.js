const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Environment variables missing. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test database connection and print tables
async function testConnection() {
  try {
    console.log('🔌 Testing connection to Supabase...');
    
    // Test simple query
    const { data, error } = await supabase
      .from('farms')
      .select('id, name')
      .limit(1);
    
    if (error) throw error;
    
    console.log('✅ Connection successful!');
    console.log('📊 Sample data:', data);
    
    // List tables
    console.log('\n📋 Listing existing tables...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_tables');
    
    if (tablesError) {
      console.error('❌ Error listing tables:', tablesError);
    } else {
      console.log('Tables:', tables.map(t => t.table_name).join(', '));
    }
    
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return false;
  }
}

// Create exchange tables if they don't exist
async function createExchangeTables() {
  try {
    console.log('\n🛠️ Creating exchange tables if needed...');
    
    // Read SQL file
    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'bybit-exchange-tables.sql'),
      'utf8'
    );
    
    // Execute SQL
    const { error } = await supabase.rpc('run_sql', {
      query: sqlContent
    });
    
    if (error) throw error;
    
    console.log('✅ Exchange tables created or already exist!');
    return true;
  } catch (error) {
    console.error('❌ Failed to create exchange tables:', error);
    return false;
  }
}

// Create a test exchange credential
async function createTestExchangeCredential() {
  try {
    console.log('\n🔑 Creating test Bybit exchange credentials...');
    
    // Create a test user if needed for testing
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: 'test@tradingfarm.com',
      password: 'test12345',
      email_confirm: true
    });
    
    if (userError && !userError.message.includes('already exists')) {
      throw userError;
    }
    
    const userId = user?.user?.id || '00000000-0000-0000-0000-000000000000';
    console.log(`👤 Using user ID: ${userId}`);
    
    // Check if credential already exists
    const { data: existingCred } = await supabase
      .from('exchange_credentials')
      .select('id')
      .eq('name', 'Bybit Test Account')
      .limit(1);
    
    if (existingCred && existingCred.length > 0) {
      console.log('✅ Test exchange credential already exists');
      return existingCred[0].id;
    }
    
    // Insert test credential
    const { data, error } = await supabase
      .from('exchange_credentials')
      .insert({
        user_id: userId,
        exchange: 'bybit',
        name: 'Bybit Test Account',
        api_key: '0G1hz011dPvYVa9xWu',
        api_secret: 'kg0u0QVvd9sf4bH0IQjvhjnGePNnCo5Vwa42',
        testnet: true,
      })
      .select('id')
      .single();
    
    if (error) throw error;
    
    console.log(`✅ Test exchange credential created with ID: ${data.id}`);
    
    // Create exchange config
    const { error: configError } = await supabase
      .from('exchange_configs')
      .insert({
        id: data.id,
        user_id: userId,
        name: 'Bybit Test Account',
        exchange: 'bybit',
        testnet: true,
        active: true
      });
    
    if (configError) throw configError;
    
    console.log('✅ Test exchange config created');
    
    return data.id;
  } catch (error) {
    console.error('❌ Failed to create test exchange credential:', error);
    return null;
  }
}

// Main function
async function main() {
  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Cannot continue with database setup - connection failed');
    process.exit(1);
  }
  
  // Create tables
  const tablesCreated = await createExchangeTables();
  if (!tablesCreated) {
    console.error('❌ Failed to create necessary tables');
    process.exit(1);
  }
  
  // Create test credential
  const credentialId = await createTestExchangeCredential();
  if (!credentialId) {
    console.error('❌ Failed to create test credentials');
    process.exit(1);
  }
  
  console.log('\n🎉 Exchange integration setup complete!');
  console.log('📝 Now you can start your Next.js server and navigate to /dashboard/exchange');
}

// Run the main function
main().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
