/**
 * Script to apply SQL migration via the Supabase REST API
 * This avoids the need to use the CLI for migrations
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const supabaseUrl = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration(filePath) {
  try {
    console.log(`Reading migration file: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split the SQL into statements by semicolons, but preserve them in statements
    // This regex handles SQL comments and quoted strings correctly
    const statements = sql.split(/;(?=(?:[^']*'[^']*')*[^']*$)/)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
      .map(stmt => stmt + ';'); // Add back the semicolons
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const summary = stmt.length > 50 ? stmt.substring(0, 50) + '...' : stmt;
      console.log(`Executing statement ${i+1}/${statements.length}: ${summary}`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: stmt });
      
      if (error) {
        if (error.message.includes('function "exec_sql" does not exist')) {
          console.error('❌ Error: The exec_sql function does not exist in your database.');
          console.log('Creating the exec_sql function first...');
          
          const createFunctionSQL = `
            CREATE OR REPLACE FUNCTION exec_sql(sql text)
            RETURNS void
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
              EXECUTE sql;
            END;
            $$;
          `;
          
          const { error: fnError } = await supabase.rpc('exec_sql', { sql: createFunctionSQL });
          
          if (fnError) {
            console.error('❌ Could not create exec_sql function. You need to execute the migration manually in the Supabase SQL Editor.');
            console.log('Please go to the Supabase dashboard -> SQL Editor and paste the contents of the migration file.');
            return false;
          }
          
          // Try the statement again
          const { error: retryError } = await supabase.rpc('exec_sql', { sql: stmt });
          
          if (retryError) {
            console.error(`❌ Error executing statement ${i+1}: ${retryError.message}`);
            console.error('Statement:', stmt);
            return false;
          }
        } else {
          console.error(`❌ Error executing statement ${i+1}: ${error.message}`);
          console.error('Statement:', stmt);
          return false;
        }
      }
    }
    
    console.log('✅ Migration applied successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    return false;
  }
}

async function main() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('Please specify a migration file path.');
    console.log('Usage: node apply-migration-via-api.js <migration-file-path>');
    return;
  }
  
  const fullPath = path.resolve(migrationFile);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    return;
  }
  
  const success = await applyMigration(fullPath);
  
  if (success) {
    console.log('\nNow running ElizaOS integration test...');
    
    // Run the simplified test script
    const { spawn } = require('child_process');
    const test = spawn('node', ['scripts/simplified-eliza-test.js'], { stdio: 'inherit' });
    
    test.on('close', (code) => {
      console.log(`Test script exited with code ${code}`);
    });
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
});
