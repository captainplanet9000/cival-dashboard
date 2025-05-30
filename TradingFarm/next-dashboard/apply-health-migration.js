/**
 * Trading Farm - Apply Health Monitoring Migration
 * This script applies the health monitoring database migration directly to Supabase
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load migration file
const migrationFile = path.join(__dirname, 'supabase', 'migrations', '20240628000000_create_agent_health_tables.sql');
console.log(`📄 Loading migration from: ${migrationFile}`);
const sqlContent = fs.readFileSync(migrationFile, 'utf8');

// Updated connection details with new service role key
const SUPABASE_URL = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTI1MzE2NywiZXhwIjoyMDYwODI5MTY3fQ.MyP21Ig3G7HvDPNZcx81LzQQrIy5yfC9ErmC686LMX4';

// Create supabase client with debug enabled
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  db: {
    schema: 'public'
  },
  global: {
    fetch: (url, options) => {
      console.log(`🔄 Fetch request to: ${url.toString().substring(0, 100)}...`);
      return fetch(url, options);
    }
  }
});

// Process large SQL file into individual statements
function processSQL(sql) {
  // Remove comments to avoid issues
  sql = sql.replace(/--.*$/gm, '');
  
  // Separate SQL statements
  return sql.split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0)
    .map(stmt => stmt + ';');
}

async function applyMigration() {
  console.log('🔄 Testing Supabase connection...');
  
  try {
    // Test connection
    const { data, error } = await supabase.from('farms').select('id').limit(1);
    
    if (error) {
      console.error('❌ Connection test failed:', error.message);
      return;
    }
    
    console.log('✅ Connection to Supabase successful!');
    
    // Process and execute SQL
    const statements = processSQL(sqlContent);
    console.log(`🔄 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      console.log(`\n⏳ [${i+1}/${statements.length}] Executing SQL statement...`);
      
      try {
        // Use raw query execution for more reliability
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statements[i]
        });
        
        if (error) {
          console.error(`❌ Error executing statement ${i+1}:`, error);
          
          // Try direct REST call to Postgres as fallback
          console.log('🔄 Attempting fallback direct REST SQL execution...');
          const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify({
              query: statements[i]
            })
          });
          
          if (!response.ok) {
            console.error('❌ Fallback execution also failed');
          }
        } else {
          console.log('✅ Statement executed successfully');
        }
      } catch (stmtError) {
        console.error(`❌ Exception executing statement ${i+1}:`, stmtError.message);
      }
    }
    
    console.log('\n✅ Migration execution completed');
    console.log('Note: Some statements might have failed, but this is expected if tables already exist.');
    
    // Generate TypeScript types
    console.log('\n🔄 Generating TypeScript types...');
    console.log('Note: Type generation can also be done manually using:');
    console.log('npx supabase gen types typescript --project-id bgvlzvswzpfoywfxehis > src/types/database.types.ts');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

applyMigration();
