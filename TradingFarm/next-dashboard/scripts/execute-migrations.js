/**
 * Execute Migrations via Supabase REST API
 * 
 * This script runs SQL migrations directly against your Supabase project
 * using the REST API with proper authentication.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const PROJECT_ID = 'bgvlzvswzpfoywfxehis';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgzMTU1OSwiZXhwIjoyMDUyNDA3NTU5fQ.TZLKwHuMxv9xtSc0wJ7DG5ivjw0K-7NztPeLRsGqMAA';

// SQL File paths
const COMBINED_MIGRATIONS_PATH = path.join(__dirname, '..', 'combined_migrations.sql');

/**
 * Execute SQL via Supabase REST API
 */
function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${PROJECT_ID}.supabase.co`,
      path: '/rest/v1/rpc/pgrest',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`Request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    // Send the request with the SQL payload
    req.write(JSON.stringify({
      cmd: sql,
      transaction: true
    }));
    
    req.end();
  });
}

/**
 * Apply migration script
 */
async function applyMigrations() {
  console.log('🚀 Applying SQL migrations to Supabase...');
  
  try {
    // Read the combined migrations SQL
    if (!fs.existsSync(COMBINED_MIGRATIONS_PATH)) {
      console.error(`❌ Migration file not found: ${COMBINED_MIGRATIONS_PATH}`);
      return;
    }
    
    const sql = fs.readFileSync(COMBINED_MIGRATIONS_PATH, 'utf8');
    
    // Split the SQL into separate statements for better error handling
    const migrationBlocks = sql.split('-- Migration:');
    
    if (migrationBlocks.length <= 1) {
      console.log('No migration blocks found in the SQL file.');
      return;
    }
    
    // Execute the first part (create migrations table)
    const setupSql = migrationBlocks[0];
    console.log('Creating migrations tracking table...');
    await executeSql(setupSql);
    
    // Execute each migration block
    for (let i = 1; i < migrationBlocks.length; i++) {
      const blockSql = '-- Migration:' + migrationBlocks[i];
      const migrationName = blockSql.split('\n')[0].trim();
      
      console.log(`Applying migration: ${migrationName}...`);
      
      try {
        await executeSql(blockSql);
        console.log(`✅ Successfully applied: ${migrationName}`);
      } catch (error) {
        console.error(`❌ Error applying migration ${migrationName}:`, error.message);
        
        // If you want to continue despite errors, remove the break
        // For safety, we'll stop on first error
        break;
      }
    }
    
    console.log('\n✅ Migrations process completed!');
    console.log('\nNext Steps:');
    console.log('1. Test order creation at http://localhost:3004/dashboard/orders/test');
    console.log('2. Create orders with agent_id = 1 to test ElizaOS integration');
    
  } catch (error) {
    console.error('❌ Migration application failed:', error.message);
  }
}

// Run the migrations
applyMigrations().catch(error => {
  console.error('❌ Fatal error:', error);
});
