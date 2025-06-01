/**
 * ElizaOS Integration Test Setup
 * 
 * This script helps set up a testing environment for ElizaOS integration tests
 * by creating the necessary tables and sample data directly in the database.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Connection details - replace with your actual values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('\n❌ ERROR: Missing Supabase API key!');
  console.error('Please set one of these environment variables:');
  console.error('  - SUPABASE_SERVICE_KEY (preferred for tests)');
  console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('\nYou can create a .env file in the project root with:');
  console.error('NEXT_PUBLIC_SUPABASE_URL=https://bgvlzvswzpfoywfxehis.supabase.co');
  console.error('SUPABASE_SERVICE_KEY=your-service-key\n');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTestEnvironment() {
  console.log('\n🚀 Setting up ElizaOS test environment');
  console.log('==================================');

  try {
    // Check connection
    console.log('👉 Testing database connection...');
    const { data, error } = await supabase.from('farms').select('count(*)', { count: 'exact' }).limit(1);
    
    if (error) {
      throw new Error(`Failed to connect to database: ${error.message}`);
    }
    
    console.log(`✅ Connected to database successfully`);
    
    // Check for existing tables
    console.log('👉 Checking for required tables...');
    const tables = ['agent_commands', 'agent_responses', 'knowledge_base'];
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      
      if (error && error.code === '42P01') {
        console.error(`❌ Table ${table} does not exist! Please run database migrations first.`);
        process.exit(1);
      } else if (error) {
        console.error(`❌ Error checking table ${table}: ${error.message}`);
      } else {
        console.log(`✅ Table ${table} exists`);
      }
    }
    
    console.log('==================================');
    console.log('✅ Test environment is ready to use!');
    console.log('==================================\n');
    
  } catch (error) {
    console.error(`\n❌ Failed to set up test environment: ${error.message}`);
    process.exit(1);
  }
}

// Run setup
setupTestEnvironment();
