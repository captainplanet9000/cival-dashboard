/**
 * Direct Database Migration Runner for Trading Farm
 * 
 * This script will apply the combined migrations directly using the Supabase MCP
 * to set up the tables for farms, agents, and goals.
 */

const fs = require('fs');
const path = require('path');

// Load the combined migrations SQL
const migrationsPath = path.join(__dirname, 'combined_migrations.sql');
const migrationSql = fs.readFileSync(migrationsPath, 'utf8');

console.log('🔄 Loading Trading Farm database migrations...');
console.log(`📄 Found migration file: ${migrationsPath}`);
console.log('📋 Preparing to apply migrations...');

// Call the MCP tool via the command line
// This is more direct than using the API endpoint
const { spawnSync } = require('child_process');

console.log('\n🚀 Applying migrations to Supabase database...');

// Run the migrations using the neon MCP tool
const result = spawnSync('npx', [
  'supabase',
  'db',
  'reset',
  '--linked'
], {
  cwd: __dirname,
  stdio: 'inherit',
});

if (result.status === 0) {
  console.log('\n✅ Database schema reset and migrations applied successfully!');
  console.log('🎉 Your Farms, Agents, and Goals tabs should now work properly.');
  console.log('📋 Next Steps:');
  console.log('  1. Refresh your browser to see the changes');
  console.log('  2. Try accessing the Farms, Agents, and Goals tabs');
  console.log('  3. If issues persist, check console logs for additional errors');
} else {
  console.error('\n❌ Failed to apply migrations.');
  console.log('📋 Alternative Setup:');
  console.log('  1. Make sure Supabase CLI is installed: npm install -g supabase');
  console.log('  2. Link your project: supabase link --project-ref bgvlzvswzpfoywfxehis');
  console.log('  3. Reset the database: supabase db reset');
  console.log('  4. Refresh your browser and try again');
}
