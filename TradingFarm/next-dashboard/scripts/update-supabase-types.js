#!/usr/bin/env node

/**
 * This script updates the TypeScript types for your Supabase database schema.
 * It uses the Supabase CLI to generate types from the remote database.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const projectId = supabaseUrl.match(/https:\/\/(.*?)\.supabase\.co/)?.[1];

if (!projectId) {
  console.error('Error: Could not extract project ID from Supabase URL');
  process.exit(1);
}

console.log('Updating Supabase database types...');
console.log(`Using project: ${projectId}`);

try {
  // Create a temporary supabase config file
  const configData = {
    project_id: projectId,
    api: {
      service_role_key: supabaseKey
    }
  };
  
  fs.writeFileSync(
    path.resolve(__dirname, '../.temp-supabase-config.json'), 
    JSON.stringify(configData, null, 2)
  );

  // Generate types using Supabase CLI
  console.log('Generating TypeScript types from remote database schema...');
  
  const outputFile = path.resolve(__dirname, '../src/types/database.types.ts');
  
  execSync(
    `npx supabase gen types typescript --project-id ${projectId} --output "${outputFile}"`,
    { stdio: 'inherit' }
  );
  
  console.log(`Database types successfully written to ${outputFile}`);
  
  // Clean up temporary config
  fs.unlinkSync(path.resolve(__dirname, '../.temp-supabase-config.json'));
  
} catch (error) {
  console.error('Error updating database types:', error.message);
  process.exit(1);
} finally {
  // Ensure cleanup of temporary files
  try {
    const tempConfig = path.resolve(__dirname, '../.temp-supabase-config.json');
    if (fs.existsSync(tempConfig)) {
      fs.unlinkSync(tempConfig);
    }
  } catch (e) {
    console.warn('Warning: Failed to clean up temporary files:', e.message);
  }
} 