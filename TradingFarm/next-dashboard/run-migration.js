// Run SQL migration script for agent health tables
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration from environment
const supabaseUrl = 'https://bglzbscmgkwyefeehis.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgzMTU1OSwiZXhwIjoyMDUyNDA3NTU5fQ.TZLKwHuMxv9xtSc0wJ7DG5ivjw0K-7NztPeLRsGqMAA';

// Create Supabase client with service role key (admin privileges)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Path to migration file
const migrationFilePath = path.join(__dirname, 'supabase', 'migrations', '20240628000000_create_agent_health_tables.sql');

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const migrationSql = fs.readFileSync(migrationFilePath, 'utf8');
    
    console.log('Running migration SQL...');
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSql });
    
    if (error) {
      console.error('Migration failed:', error);
      return;
    }
    
    console.log('Migration completed successfully!');
    
    // Generate TypeScript types
    console.log('Generating TypeScript types...');
    const { data, error: typeError } = await supabase.rpc('generate_types', { 
      typescript: true, 
      output_path: './src/types/database.types.ts' 
    });
    
    if (typeError) {
      console.error('Failed to generate types:', typeError);
      return;
    }
    
    console.log('TypeScript types generated successfully!');
  } catch (err) {
    console.error('Error running migration:', err);
  }
}

runMigration();
