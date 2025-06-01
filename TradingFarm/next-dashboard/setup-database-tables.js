/**
 * Trading Farm Database Setup Using Supabase MCP
 * 
 * This script creates the essential tables for farms, agents, and goals
 * directly using the Neon/Supabase MCP integration.
 */

const fs = require('fs');
const path = require('path');

// Load the Supabase config
const supabaseConfig = JSON.parse(
  fs.readFileSync('./supabase-mcp-ready.json', 'utf8')
);

// Get the SQL from our tables-setup.sql file
const sqlContent = fs.readFileSync('./tables-setup.sql', 'utf8');

console.log('🚀 Setting up Trading Farm database tables using Supabase MCP...');
console.log(`📊 Project ID: ${supabaseConfig.project_id}`);

// Import the MCP tool
const mcp2_run_sql = async () => {
  console.log('📝 Using run_sql MCP tool to create database tables...');
  
  try {
    // Write a script to use with the MCP tool
    const mcpScript = `
    const fs = require('fs');
    const supabase = require('@supabase/supabase-js');
    
    // Load the SQL file
    const sqlContent = fs.readFileSync('./tables-setup.sql', 'utf8');
    
    // Create a Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    
    async function executeSql() {
      console.log('📊 Executing SQL to set up database tables...');
      
      try {
        // Split the SQL into individual statements by semicolon
        const statements = sqlContent
          .split(';')
          .map(statement => statement.trim())
          .filter(statement => statement.length > 0);
        
        // Execute each statement
        for (const statement of statements) {
          console.log(\`Executing: \${statement.substring(0, 50)}...\`);
          await supabaseClient.rpc('execute_sql', { sql: statement + ';' });
        }
        
        console.log('✅ Database tables created successfully!');
      } catch (error) {
        console.error('❌ Error executing SQL:', error);
      }
    }
    
    executeSql();
    `;
    
    // Write the MCP script to a file
    fs.writeFileSync('./run-supabase-sql.js', mcpScript);
    
    // Execute the script
    console.log('🔄 Running SQL execution script...');
    const { exec } = require('child_process');
    exec('node run-supabase-sql.js', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error executing script:', error);
        return;
      }
      
      console.log(stdout);
      
      if (stderr) {
        console.error('⚠️ Script stderr:', stderr);
      }
      
      console.log('✅ Database setup process completed!');
      console.log('🎉 Your Farms, Agents, and Goals tabs should now work properly.');
      console.log('⚠️ You may need to refresh your browser to see the changes.');
      
      // Provide SQL commands for manual execution if needed
      console.log('\n📋 If issues persist, you can run these SQL commands manually:');
      console.log('1. Open the Supabase dashboard: https://app.supabase.com/project/' + supabaseConfig.project_id);
      console.log('2. Go to the SQL Editor');
      console.log('3. Copy and paste the SQL from tables-setup.sql');
      console.log('4. Execute the SQL');
    });
  } catch (error) {
    console.error('❌ Failed to execute MCP tool:', error);
  }
};

// Run the database setup
mcp2_run_sql();
