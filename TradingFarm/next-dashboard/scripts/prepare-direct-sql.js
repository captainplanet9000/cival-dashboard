/**
 * Prepare SQL Migrations for Direct Execution
 * 
 * This script combines migration files into a single SQL script
 * that can be run directly in the Supabase SQL Editor
 */

const fs = require('fs');
const path = require('path');

// Paths
const MIGRATIONS_PATH = path.join(__dirname, '..', 'supabase', 'migrations');
const OUTPUT_PATH = path.join(__dirname, '..', 'combined_migrations.sql');

function prepareMigrations() {
  console.log('🔍 Preparing SQL migrations for direct execution...');
  
  // Get migration files
  let migrationFiles = fs.readdirSync(MIGRATIONS_PATH)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  console.log(`Found ${migrationFiles.length} migration files`);
  
  // Filter to only show the latest ElizaOS and orders integration files
  const focusedMigrations = migrationFiles.filter(file => 
    file.includes('_fix_orders_table') || 
    file.includes('_integrate_order_agent_commands'));
  
  console.log(`\n📋 Focusing on the latest integration migrations:`);
  focusedMigrations.forEach(file => console.log(`  - ${file}`));
  
  // Combine SQL content
  let combinedSQL = `-- Combined Migrations for Trading Farm
-- Generated: ${new Date().toISOString()}
-- Execute in Supabase SQL Editor

-- First create the migrations tracking table if not exists
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

`;

  // Add each migration
  for (const file of focusedMigrations) {
    const filePath = path.join(MIGRATIONS_PATH, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    combinedSQL += `
-- =========================================
-- Migration: ${file}
-- =========================================

BEGIN;

${content}

-- Record this migration
INSERT INTO _migrations (name)
VALUES ('${file}')
ON CONFLICT (name) DO NOTHING;

COMMIT;

`;
  }
  
  // Add instructions
  combinedSQL += `
-- =========================================
-- After running the migrations, generate TypeScript types:
-- =========================================
-- Run this command locally:
-- npx supabase gen types typescript --project-id bgvlzvswzpfoywfxehis > src/types/database.types.ts
`;

  // Write the combined SQL to file
  fs.writeFileSync(OUTPUT_PATH, combinedSQL);
  console.log(`\n✅ Combined SQL written to: ${OUTPUT_PATH}`);
  console.log('\nInstructions:');
  console.log('1. Copy the contents of this file');
  console.log('2. Go to Supabase Dashboard: https://supabase.com/dashboard/project/bgvlzvswzpfoywfxehis');
  console.log('3. Open SQL Editor');
  console.log('4. Paste and run the SQL');
  console.log('5. After successful execution, run: npx supabase gen types typescript --project-id bgvlzvswzpfoywfxehis > src/types/database.types.ts');
}

// Run the preparation
prepareMigrations();
