#!/usr/bin/env node

/**
 * Database Initialization Script
 * 
 * This script initializes the database schema, tables, and default data.
 * Run this once before starting the application.
 */

require('dotenv').config({ path: '../frontend/.env.local' });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Initialize database pool
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function initDatabase() {
  console.log('Initializing Sonic NFT database...');
  
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'init-db.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .split(';')
      .filter(statement => statement.trim() !== ''); // Remove empty statements
    
    // Execute each statement individually
    const client = await pool.connect();
    try {
      console.log(`Found ${statements.length} SQL statements to execute`);
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim() + ';';
        try {
          await client.query(statement);
          console.log(`[${i + 1}/${statements.length}] Statement executed successfully`);
        } catch (err) {
          console.error(`Error executing statement ${i + 1}:`, err.message);
          console.error('Statement:', statement);
          
          // Continue with the next statement (don't break on error)
          // This allows the script to create as much as possible
        }
      }
      
      console.log('\nDatabase initialization completed.');
      
      // Print a summary of what was created
      console.log('\nVerifying database objects...');
      
      // Check if schema exists
      const schemaResult = await client.query(
        "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'sonic_nft'"
      );
      console.log(`Schema sonic_nft: ${schemaResult.rows.length > 0 ? 'Created ✓' : 'Failed ✗'}`);
      
      // Check if tables exist
      const tables = ['metadata', 'collection_stats', 'ownership', 'ipfs_gateways', 'minting_activity'];
      for (const table of tables) {
        const tableResult = await client.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'sonic_nft' AND table_name = $1",
          [table]
        );
        console.log(`Table sonic_nft.${table}: ${tableResult.rows.length > 0 ? 'Created ✓' : 'Failed ✗'}`);
      }
      
      // Check if collection stats has the initial row
      const statsResult = await client.query(
        "SELECT id FROM sonic_nft.collection_stats WHERE id = 1"
      );
      console.log(`Initial collection stats: ${statsResult.rows.length > 0 ? 'Created ✓' : 'Failed ✗'}`);
      
      // Check if IPFS gateways were added
      const gatewaysResult = await client.query(
        "SELECT COUNT(*) FROM sonic_nft.ipfs_gateways"
      );
      console.log(`IPFS gateways: ${gatewaysResult.rows[0].count} gateways added`);
      
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the initialization
initDatabase()
  .then(() => console.log('Done!'))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  }); 