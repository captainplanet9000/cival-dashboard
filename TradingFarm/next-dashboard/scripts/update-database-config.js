/**
 * Update Database Configuration
 * 
 * This script securely updates your database connection configuration
 * for direct database operations like migrations without exposing
 * credentials in your code.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration paths
const CONFIG_PATH = path.join(__dirname, '..', 'supabase-mcp-config.json');
const ENV_PATH = path.join(__dirname, '..', '.env.local');

// Function to encrypt sensitive connection string
function encryptConnectionString(connectionString, password) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', crypto.createHash('sha256').update(password).digest(), iv);
  
  let encrypted = cipher.update(connectionString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    iv: iv.toString('hex'),
    encrypted: encrypted,
    authTag: authTag
  };
}

// Update supabase-mcp-config.json
function updateSupabaseConfig() {
  console.log('Updating Supabase MCP configuration...');
  
  // Read existing config if it exists
  let config = {};
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
      config = JSON.parse(configContent);
    }
  } catch (error) {
    console.log('Creating new configuration file');
  }
  
  // Set Supabase project details
  config.projectId = 'bgvlzvswzpfoywfxehis';
  config.supabaseUrl = 'https://bgvlzvswzpfoywfxehis.supabase.co';
  
  // Add pooler connection string (preferred for most operations)
  config.connectionString = "postgresql://postgres.bgvlzvswzpfoywfxehis:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres";
  config.directDbConnectionString = "postgresql://postgres:[PASSWORD]@db.bgvlzvswzpfoywfxehis.supabase.co:5432/postgres";
  
  // Note about replacing [PASSWORD]
  console.log('\n⚠️ Note: The connection strings contain [PASSWORD] placeholder.');
  console.log('Please manually replace [PASSWORD] with your actual password in the config file.');
  console.log('This is done for security to avoid storing the password in this script.');
  
  // Write updated config
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`✅ Configuration updated at ${CONFIG_PATH}`);
}

// Update environment variables
function updateEnvironmentVariables() {
  console.log('\nUpdating environment variables...');
  
  // Read existing .env.local if it exists
  let envContent = '';
  try {
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, 'utf8');
    }
  } catch (error) {
    console.log('Creating new .env.local file');
  }
  
  // Parse existing variables
  const envLines = envContent.split('\n');
  const envVars = {};
  
  envLines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  // Update Supabase related variables
  envVars['NEXT_PUBLIC_SUPABASE_URL'] = 'https://bgvlzvswzpfoywfxehis.supabase.co';
  envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';
  
  // Optional: Set up a DATABASE_URL for direct connections (replace [PASSWORD])
  envVars['DATABASE_URL'] = "postgresql://postgres.bgvlzvswzpfoywfxehis:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres";
  
  // Rebuild env file content
  const newEnvContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  // Write updated env file
  fs.writeFileSync(ENV_PATH, newEnvContent);
  console.log(`✅ Environment variables updated at ${ENV_PATH}`);
  console.log('\n⚠️ Remember to replace [PASSWORD] in DATABASE_URL with your actual password');
}

// Create a script to run migrations with direct database access
function createMigrationScript() {
  console.log('\nCreating migration helper script...');
  
  const scriptPath = path.join(__dirname, 'run-database-migrations.js');
  const scriptContent = `/**
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
  
  console.log(\`Found \${migrationFiles.length} migration files to process\`);
  
  // Connect to database
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Create migrations table if not exists
    await client.query(\`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    \`);
    
    // Get already applied migrations
    const { rows: appliedMigrations } = await client.query(
      'SELECT name FROM _migrations'
    );
    const appliedNames = appliedMigrations.map(row => row.name);
    
    // Apply migrations
    let appliedCount = 0;
    
    for (const migrationFile of migrationFiles) {
      if (appliedNames.includes(migrationFile)) {
        console.log(\`⏭️ Migration \${migrationFile} already applied, skipping\`);
        continue;
      }
      
      console.log(\`📝 Applying migration: \${migrationFile}\`);
      
      // Read migration SQL
      const migrationPath = path.join(MIGRATIONS_PATH, migrationFile);
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      
      // Apply in transaction
      try {
        await client.query('BEGIN');
        await client.query(migrationSql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [migrationFile]);
        await client.query('COMMIT');
        console.log(\`✅ Successfully applied \${migrationFile}\`);
        appliedCount++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(\`❌ Error applying \${migrationFile}:\`, error.message);
        break;
      }
    }
    
    console.log(\`\n✅ Applied \${appliedCount} new migrations\`);
    
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
`;

  fs.writeFileSync(scriptPath, scriptContent);
  console.log(`✅ Migration helper script created at ${scriptPath}`);
}

// Main function
function main() {
  console.log('==== Trading Farm Database Configuration Update ====');
  
  updateSupabaseConfig();
  updateEnvironmentVariables();
  createMigrationScript();
  
  console.log('\n✅ Database configuration update completed!');
  console.log('\nNext steps:');
  console.log('1. Update the [PASSWORD] placeholder in the config files with your actual password');
  console.log('2. Run migrations with: node scripts/run-database-migrations.js');
  console.log('3. Update TypeScript types after migrations');
}

// Run the update
main();
