/**
 * Setup LLM Integration Script
 * 
 * This script runs the necessary steps to set up LLM integration
 * for the Trading Farm system.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Setting up LLM Integration for Trading Farm...');

// Check if the .env.local file exists
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: .env.local file is missing!');
  console.log('Please create a .env.local file with the necessary API keys.');
  console.log('You can use .env.llm.template as a starting point.');
  process.exit(1);
}

console.log('✅ .env.local file found');

// Run the create-llm-tables.js script
try {
  console.log('\n📊 Creating database tables for LLM integration...');
  execSync('node src/scripts/create-llm-tables.js', { stdio: 'inherit' });
  console.log('✅ Database tables created successfully');
} catch (error) {
  console.error('❌ Error creating database tables:', error.message);
  process.exit(1);
}

// Generate TypeScript types
try {
  console.log('\n🔄 Generating TypeScript types...');
  execSync('npx supabase gen types typescript --local > src/types/database.types.ts', { stdio: 'inherit' });
  console.log('✅ TypeScript types generated successfully');
} catch (error) {
  console.error('❌ Error generating TypeScript types:', error.message);
  console.log('You may need to update TypeScript types manually.');
}

console.log('\n🎉 LLM Integration setup complete!');
console.log('You can now use LLM services in your Trading Farm agents.');
console.log('\nNext steps:');
console.log('1. Configure agents to use LLM services at /dashboard/agents/llm-configuration');
console.log('2. Send messages to agents using the API at /api/agents/[id]/llm');
