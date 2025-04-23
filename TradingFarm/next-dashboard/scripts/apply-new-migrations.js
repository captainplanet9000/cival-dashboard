#!/usr/bin/env node
/**
 * Apply New Migrations Script
 * 
 * This script applies the newly created migration files to the Trading Farm database.
 * It moves the migration files to the correct location and runs them using the Supabase CLI.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths for migration files
const newMigrationsDir = path.join(__dirname, '..', 'migrations');
const supabaseMigrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

// Create supabase/migrations directory if it doesn't exist
if (!fs.existsSync(supabaseMigrationsDir)) {
  console.log(`📂 Creating migrations directory: ${supabaseMigrationsDir}`);
  fs.mkdirSync(supabaseMigrationsDir, { recursive: true });
}

// Function to copy migration files to the Supabase migrations directory
function copyMigrationFiles() {
  console.log('📋 Copying new migration files...');
  
  try {
    // Check if new migrations directory exists
    if (!fs.existsSync(newMigrationsDir)) {
      console.error(`❌ New migrations directory doesn't exist: ${newMigrationsDir}`);
      process.exit(1);
    }
    
    // Get list of migration files
    const migrationFiles = fs.readdirSync(newMigrationsDir)
      .filter(file => file.endsWith('.sql'));
    
    if (migrationFiles.length === 0) {
      console.log('⚠️ No migration files found in the new migrations directory.');
      return false;
    }
    
    console.log(`🔍 Found ${migrationFiles.length} migration files to copy.`);
    
    // Copy each migration file
    for (const filename of migrationFiles) {
      const sourcePath = path.join(newMigrationsDir, filename);
      const targetPath = path.join(supabaseMigrationsDir, filename);
      
      // Check if file already exists in target directory
      if (fs.existsSync(targetPath)) {
        console.log(`⚠️ Migration file already exists in target directory: ${filename}`);
        continue;
      }
      
      // Copy the file
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✅ Copied migration file: ${filename}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error copying migration files:', error.message);
    return false;
  }
}

// Function to run migrations using Supabase CLI
function runMigrations() {
  console.log('🚀 Running migrations with Supabase CLI...');
  
  try {
    // Run the migrations
    execSync('npx supabase migration up', { stdio: 'inherit' });
    console.log('✅ Migrations applied successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error applying migrations:', error.message);
    console.log('');
    console.log('If you\'re having issues with the Supabase CLI, try running:');
    console.log('node scripts/apply-migrations.js');
    return false;
  }
}

// Function to generate TypeScript types
function generateTypes() {
  console.log('🔄 Generating TypeScript types...');
  
  try {
    // Generate types
    execSync('npx supabase gen types typescript --local > src/types/database.types.ts', { stdio: 'inherit' });
    console.log('✅ TypeScript types generated successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error generating types:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('🚀 Starting Trading Farm new migrations application...');
  
  // Step 1: Copy migration files
  const filesCopied = copyMigrationFiles();
  if (!filesCopied) {
    console.log('⚠️ No new migration files to apply.');
    process.exit(0);
  }
  
  // Step 2: Run migrations
  const migrationsRun = runMigrations();
  if (!migrationsRun) {
    process.exit(1);
  }
  
  // Step 3: Generate types
  const typesGenerated = generateTypes();
  if (!typesGenerated) {
    process.exit(1);
  }
  
  console.log('');
  console.log('🎉 All new migrations have been applied and types generated successfully!');
  console.log('');
}

// Run the main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
