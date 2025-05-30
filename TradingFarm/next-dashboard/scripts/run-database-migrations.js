/**
 * Run Database Migrations
 * 
 * This script uses direct database connection to apply migrations.
 * IMPORTANT: Update supabase-mcp-config.json with the correct password first!
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Get database connection from config
const CONFIG_PATH = path.join(__dirname, '..', 'supabase-mcp-config.json');
const MIGRATIONS_PATH = path.join(__dirname, '..', 'supabase', 'migrations');

async function runMigrations() {
  console.log('🚀 Running database migrations...');
  
  // Load connection configuration
  let config;
  try {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    config = JSON.parse(configContent);
  } catch (error) {
    console.error('❌ Error reading configuration:', error.message);
    return;
  }
  
  // Check if password placeholder is still present
  const connectionString = config.connectionString || config.directDbConnectionString;
  if (!connectionString || connectionString.includes('[PASSWORD]')) {
    console.error('❌ Please update the password in supabase-mcp-config.json first');
    console.log('Replace [PASSWORD] with your actual database password');
    return;
  }
  
  // Get migration files
  const migrationFiles = fs.readdirSync(MIGRATIONS_PATH)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  console.log(`Found ${migrationFiles.length} migration files to process`);
  
  // Connect to database
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Create migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Get already applied migrations
    const { rows: appliedMigrations } = await client.query(
      'SELECT name FROM _migrations'
    );
    const appliedNames = appliedMigrations.map(row => row.name);
    
    // Apply migrations
    let appliedCount = 0;
    
    for (const migrationFile of migrationFiles) {
      if (appliedNames.includes(migrationFile)) {
        console.log(`⏭️ Migration ${migrationFile} already applied, skipping`);
        continue;
      }
      
      console.log(`📝 Applying migration: ${migrationFile}`);
      
      // Read migration SQL
      const migrationPath = path.join(MIGRATIONS_PATH, migrationFile);
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      
      // Apply in transaction
      try {
        await client.query('BEGIN');
        await client.query(migrationSql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [migrationFile]);
        await client.query('COMMIT');
        console.log(`✅ Successfully applied ${migrationFile}`);
        appliedCount++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Error applying ${migrationFile}:`, error.message);
        break;
      }
    }
    
    console.log(`\n✅ Applied ${appliedCount} new migrations`);
    
    // Generate TypeScript types
    console.log('\nTo update TypeScript types, run:');
    console.log('npx supabase gen types typescript --project-id bgvlzvswzpfoywfxehis > src/types/database.types.ts');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

// Run migrations
runMigrations().catch(error => {
  console.error('❌ Fatal error:', error);
});
