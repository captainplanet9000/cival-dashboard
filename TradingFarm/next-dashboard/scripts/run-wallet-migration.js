/**
 * Run Wallet Management Tables Migration
 * 
 * This script applies the wallet management tables migration using the Supabase MCP bridge.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const BRIDGE_URL = 'http://localhost:9876';
const MIGRATION_PATH = path.join(__dirname, '..', 'supabase', 'migrations', '20250404_add_wallet_management_tables.sql');

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    
    console.log('Testing Supabase MCP bridge connection...');
    const connectionTest = await axios.get(`${BRIDGE_URL}/test-connection`);
    
    if (!connectionTest.data.success) {
      console.error('Failed to connect to Supabase MCP bridge:', connectionTest.data.error);
      process.exit(1);
    }
    
    console.log(`Connected to Supabase project: ${connectionTest.data.projectId}`);
    
    console.log('Running migration...');
    const response = await axios.post(`${BRIDGE_URL}/execute`, {
      tool: 'run_migration',
      params: {
        sql: migrationSql
      }
    });
    
    if (!response.data.success) {
      console.error('Migration failed:', response.data.error);
      process.exit(1);
    }
    
    console.log('Migration completed successfully!');
    console.log('Wallet management tables have been created.');
    
    // Generate types after migration
    console.log('\nTo update your TypeScript types, run:');
    console.log('npx supabase gen types typescript --local > src/types/database.types.ts');
    
  } catch (error) {
    console.error('Error running migration:', error.message);
    
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    
    process.exit(1);
  }
}

// Check if axios is installed
try {
  require.resolve('axios');
} catch (e) {
  console.log('Installing axios dependency...');
  const { execSync } = require('child_process');
  execSync('npm install axios', { 
    stdio: 'inherit', 
    cwd: path.join(__dirname, '..')
  });
}

runMigration();
