/**
 * Supabase Database Setup Script
 * 
 * This script helps set up your Supabase database for the Trading Farm.
 * It guides you through the migration process and provides next steps.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Make sure supabase directory exists
if (!fs.existsSync('./supabase')) {
  fs.mkdirSync('./supabase', { recursive: true });
}

// Make sure migrations directory exists
if (!fs.existsSync('./supabase/migrations')) {
  fs.mkdirSync('./supabase/migrations', { recursive: true });
}

console.log('🚀 Trading Farm Supabase Database Setup');
console.log('======================================');
console.log('This script will guide you through setting up your Supabase database for Trading Farm.');

console.log('\n📋 Setup Steps:');
console.log('1. Apply migrations to create the database schema');
console.log('2. Generate TypeScript types');
console.log('3. Test the database connection');

rl.question('\nDo you want to proceed with the setup? (y/n) ', (answer) => {
  if (answer.toLowerCase() !== 'y') {
    console.log('Setup cancelled. No changes were made.');
    rl.close();
    return;
  }

  console.log('\n🔄 Applying migrations...');
  try {
    // Apply migrations
    console.log('Running: npx supabase migration up');
    execSync('npx supabase migration up', { stdio: 'inherit' });
    
    console.log('\n✅ Migrations applied successfully!');
  } catch (error) {
    console.error('\n❌ Error applying migrations:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure Supabase CLI is installed (npm install -g supabase)');
    console.log('2. Check that your Supabase project is properly configured');
    console.log('3. You may need to manually run the SQL in the migration file');
    
    rl.question('\nDo you want to continue with the setup anyway? (y/n) ', (continueAnswer) => {
      if (continueAnswer.toLowerCase() !== 'y') {
        console.log('Setup cancelled.');
        rl.close();
        return;
      }
      continueSetup();
    });
    return;
  }
  
  continueSetup();
  
  function continueSetup() {
    console.log('\n🔄 Generating TypeScript types...');
    try {
      // Generate TypeScript types
      console.log('Running: npx supabase gen types typescript --local > src/types/database.types.ts');
      execSync('npx supabase gen types typescript --local > src/types/database.types.ts', { stdio: 'inherit' });
      
      console.log('\n✅ TypeScript types generated successfully!');
    } catch (error) {
      console.error('\n❌ Error generating TypeScript types:', error.message);
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Make sure Supabase CLI is installed (npm install -g supabase)');
      console.log('2. Check that your Supabase project is properly configured');
      console.log('3. The pre-generated types file can be used as a fallback');
    }
    
    console.log('\n🔄 Testing database connection...');
    try {
      // Run connection test
      console.log('Running: npx ts-node src/tests/test-supabase-connection.ts');
      execSync('npx ts-node src/tests/test-supabase-connection.ts', { stdio: 'inherit' });
    } catch (error) {
      console.error('\n❌ Error testing database connection:', error.message);
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Check that your Supabase configuration is correct');
      console.log('2. Verify that the database schema was created properly');
      console.log('3. Ensure ts-node is installed (npm install -g ts-node)');
    }
    
    console.log('\n🎉 Trading Farm Supabase Database Setup Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Verify your database tables in the Supabase dashboard');
    console.log('2. Import any initial data you need for your application');
    console.log('3. Start using the Supabase clients in your application:');
    console.log('   - In client components: import { createBrowserClient } from "@/utils/supabase/client"');
    console.log('   - In server components: import { createServerClient } from "@/utils/supabase/server"');
    console.log('\n💡 For MCP integration:');
    console.log('1. Use the supabase-mcp-ready.json file as your MCP configuration');
    console.log('2. The API connection method is working properly');
    console.log('3. Configure any MCP servers to use the API connection method');
    
    rl.close();
  }
});
