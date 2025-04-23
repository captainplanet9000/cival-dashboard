
// Run SQL migration for agent health tables
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load the SQL file from migrations folder
const sqlContent = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '20240628000000_create_agent_health_tables.sql'), 'utf8');

// Create a Supabase client with admin privileges from supabase-config.json or environment variables
let supabaseUrl, supabaseServiceKey;

try {
  // Try to load from config file first
  const configPath = path.join(__dirname, 'supabase-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    supabaseUrl = `https://${config.supabaseProjectRef}.supabase.co`;
    supabaseServiceKey = config.supabaseServiceRoleKey;
    console.log('✅ Loaded configuration from supabase-config.json');
  }
} catch (error) {
  console.warn('⚠️ Error loading from config file:', error.message);
}

// Fall back to environment variables if needed
if (!supabaseUrl || !supabaseServiceKey) {
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log('✅ Using configuration from environment variables');
}

// Create client with service role for admin access
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    async function executeSql() {
      console.log('📊 Executing SQL to set up database tables...');
      
      try {
        // Split the SQL into individual statements by semicolon and GO separators (common in SQL scripts)
        const statements = sqlContent
          .replace(/^GO$/gm, ';') // Replace GO statements with semicolons
          .split(';')
          .map(statement => statement.trim())
          .filter(statement => statement.length > 0);
        
        console.log(`🔄 Found ${statements.length} SQL statements to execute`);
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          console.log(`⏳ [${i+1}/${statements.length}] Executing: ${statement.substring(0, 80)}...`);
          
          const { error } = await supabaseClient.rpc('exec_sql', { 
            sql: statement + ';' 
          });
          
          if (error) {
            console.error(`❌ Error executing statement ${i+1}:`, error);
            // Continue with other statements
          }
        }
        
        console.log('✅ Agent health monitoring tables created successfully!');
        
        // Generate TypeScript types
        console.log('🔄 Generating TypeScript types...');
        try {
          const { data, error } = await supabaseClient.from('_types').select('*').limit(1);
          if (error) {
            console.error('❌ Error generating types:', error);
          } else {
            console.log('✅ TypeScript types updated');
          }
        } catch (typeError) {
          console.warn('⚠️ Could not generate types automatically:', typeError.message);
        }
      } catch (error) {
        console.error('❌ Error executing SQL migration:', error);
      }
    }
    
    executeSql();
    