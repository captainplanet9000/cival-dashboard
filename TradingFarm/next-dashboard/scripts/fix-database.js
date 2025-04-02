// Script to fix database connectivity and properly apply migrations in the correct order
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Client } = require('pg');

console.log('🔧 Trading Farm Database Fix Tool');
console.log('--------------------------------');

// 1. Fix environment file
console.log('\n1️⃣ Fixing environment configuration...');
const envContent = `# Authentication (NextAuth/Auth.js)
AUTH_SECRET=KraAE0kU9dsQGOxXHMH8xWI2+5OeJkDBScohDlgo9lk=
NEXTAUTH_URL=http://localhost:3003

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://bgvlzvswzpfoywfxehis.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgzMTU1OSwiZXhwIjoyMDUyNDA3NTU5fQ.TZLKwHuMxv9xtSc0wJ7DG5ivjw0K-7NztPeLRsGqMAA

# Socket.io Configuration
NEXT_PUBLIC_SOCKET_URL=http://localhost:3002

# JWT Secret for Socket Authentication
JWT_SECRET=Il6dHM1bjTtJIVC0WBFbJHumyxi4e3dEVOgqsL9CAzq6K7ewrm/RQrQbtfU80+7cr+EmFsVRDaAb6Z7wIL9x4A==

# ElizaOS Configuration
NEXT_PUBLIC_ELIZAOS_API_URL=http://localhost:3002/elizaos
`;

console.log('Creating .env.local file with clean formatting...');
fs.writeFileSync(path.join(__dirname, '..', '.env.local'), envContent);
console.log('✅ .env.local file created successfully!');

// 2. Make sure PG module is installed
console.log('\n2️⃣ Checking for pg module...');
try {
  require('pg');
  console.log('✅ pg module is already installed');
} catch (error) {
  console.log('Installing pg module...');
  execSync('npm install pg', { stdio: 'inherit' });
  console.log('✅ pg module installed successfully');
}

// 3. Create ordered migration scripts to apply in the correct order
console.log('\n3️⃣ Creating ordered migration scripts...');

// Sorted migrations to apply in the correct order
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const MIGRATIONS_ORDER = [
  // Initialize schema and base tables first
  '20250330_create_trading_farm_schema.sql',
  '20250330_trading_farm_tables.sql',
  
  // Then add specific feature tables
  '20250330_advanced_orders.sql',
  '20250330_eliza_integration.sql',
  '20250330_trading_execution_system.sql',
  '20250330_update_schema_eliza_integration.sql',
  '20250331_add_config_table.sql',
  '20250331_exchange_credentials.sql',
  '20250331_market_data_cache.sql',
  '20250331_orders_tables.sql',
  
  // Apply agent fixes and updates
  '20250401073459_fix_agents_schema.sql',
  '20250401073626_add_agent_functions.sql',
  '20250401082501_fix_agents_schema_cache.sql',
  '20250401091523_create_trades_table.sql',
  '20250401202938_add_orders_table.sql',
  '20250401_add_agent_functions.sql',
  '20250401_add_goals_table.sql',
  '20250401_trading_strategies.sql',
  '20250401_update_agents_table.sql',
  
  // Latest schema modifications
  '20250402_add_agent_functions_direct.sql',
  '20250402_agent_eliza_integration.sql',
  '20250402_agent_sql_functions.sql',
  '20250402_fix_agents_schema.sql',
  '20250402_fix_agents_table.sql',
  '20250402_goals_table.sql',
  '20250402_utility_functions.sql',
  
  // Agent messages table should be applied last due to dependencies
  '20240626_agent_messages.sql'
];

// 4. Get connection details from config file
console.log('\n4️⃣ Reading Supabase connection configuration...');
const CONFIG_PATH = path.join(__dirname, '..', 'supabase-mcp-config.json');
let connectionString = '';

try {
  const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
  const config = JSON.parse(configContent);
  connectionString = config.connectionString;
  
  if (connectionString) {
    console.log('✅ Found connection string in supabase-mcp-config.json');
  } else {
    console.error('❌ No connection string found in config');
    process.exit(1);
  }
} catch (error) {
  console.error(`❌ Error reading supabase-mcp-config.json: ${error.message}`);
  process.exit(1);
}

// 5. Create SQL for direct execution without relying on Supabase CLI
console.log('\n5️⃣ Preparing combined migration SQL script...');

// Function to handle a SQL file and make it safe for direct execution
const prepareSqlScript = (filename) => {
  try {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Migration file not found: ${filename}`);
      return '';
    }
    
    let sql = fs.readFileSync(filePath, 'utf8');
    
    // Add transaction wrapping
    sql = `
-- Begin migration: ${filename}
BEGIN;

${sql}

-- End migration: ${filename}
COMMIT;
`;
    return sql;
  } catch (error) {
    console.error(`❌ Error processing migration file ${filename}: ${error.message}`);
    return '';
  }
};

// Combine all migrations into one script for direct execution
let combinedSql = '';
for (const migrationFile of MIGRATIONS_ORDER) {
  console.log(`Processing ${migrationFile}...`);
  const sqlScript = prepareSqlScript(migrationFile);
  if (sqlScript) {
    combinedSql += sqlScript + '\n\n';
  }
}

// Write the combined SQL to a file
const combinedSqlPath = path.join(__dirname, 'combined_migrations.sql');
fs.writeFileSync(combinedSqlPath, combinedSql);
console.log(`✅ Combined migration script created at: ${combinedSqlPath}`);

// 6. Handle direct database connection to apply migrations
console.log('\n6️⃣ Attempting to connect to the database and apply migrations...');

async function applyMigrations() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database successfully');
    
    console.log('Executing combined migrations...');
    await client.query(combinedSql);
    
    console.log('✅ Migrations applied successfully');
  } catch (error) {
    console.error(`❌ Error applying migrations: ${error.message}`);
    console.log('');
    console.log('💡 Suggestion: Check your network connection to the Supabase database.');
    console.log('💡 Alternatively, you may need to use the Supabase project dashboard to reset the database if migrations have been applied out of order.');
  } finally {
    await client.end();
  }
}

// Execute migrations
applyMigrations()
  .then(() => {
    console.log('\n7️⃣ Generating TypeScript types from database schema...');
    try {
      // Use npx to run the supabase command
      execSync('npx supabase gen types typescript --project-id bgvlzvswzpfoywfxehis > src/types/database.types.ts', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      console.log('✅ TypeScript types generated successfully');
    } catch (error) {
      console.error(`❌ Error generating TypeScript types: ${error.message}`);
      console.log('💡 You can manually generate types once the database connection is fixed');
    }
    
    console.log('\n✨ Database setup completed!');
    console.log('You can now restart your Next.js server to see the fixes take effect.');
  })
  .catch(err => {
    console.error('❌ Error during database setup:', err.message);
  });
