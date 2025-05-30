/**
 * Secure Migrations Script for Trading Farm Dashboard
 * This script handles database migrations using environment variables
 * for secure credential management rather than embedded credentials
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

// Load environment variables (prefer temp config file for CI/CD environments)
dotenv.config({ path: path.join(__dirname, 'temp-db-config.env') });

// Configuration validation
function validateConfig() {
  const requiredVars = [
    'SUPABASE_PROJECT_ID',
    'SUPABASE_DB_HOST', 
    'SUPABASE_DB_PORT',
    'SUPABASE_DB_NAME',
    'SUPABASE_DB_USER',
    'SUPABASE_DB_PASSWORD'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please ensure these variables are set in your .env file or environment');
    
    // Try to load from config file as fallback
    try {
      const configPath = path.join(__dirname, '..', 'supabase-mcp-config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log('🔄 Attempting to use supabase-mcp-config.json as fallback...');
        
        // Export the variables to environment
        if (config.project_id) process.env.SUPABASE_PROJECT_ID = config.project_id;
        if (config.db_url) {
          // Parse the connection string to extract components
          const dbUrlMatch = config.db_url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
          if (dbUrlMatch) {
            process.env.SUPABASE_DB_USER = dbUrlMatch[1];
            process.env.SUPABASE_DB_PASSWORD = dbUrlMatch[2];
            process.env.SUPABASE_DB_HOST = dbUrlMatch[3];
            process.env.SUPABASE_DB_PORT = dbUrlMatch[4];
            process.env.SUPABASE_DB_NAME = dbUrlMatch[5];
          }
        }
        
        // Recheck missing vars
        const stillMissing = requiredVars.filter(varName => !process.env[varName]);
        if (stillMissing.length > 0) {
          console.error('❌ Still missing environment variables after config fallback:', stillMissing.join(', '));
          return false;
        }
        console.log('✅ Successfully loaded configuration from supabase-mcp-config.json');
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error loading config file:', error);
      return false;
    }
  }
  
  return true;
}

// Create a temporary connection file with properly escaped credentials
function createTempConnectionFile() {
  const tempDir = path.join(__dirname, 'temp');
  const tempFilePath = path.join(tempDir, '.env.supabase');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Create a secure connection string with proper escaping
  const connectionString = `postgresql://${encodeURIComponent(process.env.SUPABASE_DB_USER)}:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)}@${process.env.SUPABASE_DB_HOST}:${process.env.SUPABASE_DB_PORT}/${process.env.SUPABASE_DB_NAME}`;
  
  // Write to temporary file
  fs.writeFileSync(tempFilePath, `SUPABASE_CONNECTION_STRING=${connectionString}\n`);
  
  return tempFilePath;
}

// Clean up temporary files
function cleanup(tempFilePath) {
  if (fs.existsSync(tempFilePath)) {
    fs.unlinkSync(tempFilePath);
  }
  
  const tempDir = path.dirname(tempFilePath);
  if (fs.existsSync(tempDir) && fs.readdirSync(tempDir).length === 0) {
    fs.rmdirSync(tempDir);
  }
}

// Run migrations using the Supabase CLI
function runMigrations() {
  console.log('🚀 Starting secure migration process...');
  
  if (!validateConfig()) {
    console.error('❌ Configuration validation failed. Exiting...');
    process.exit(1);
  }
  
  const tempFilePath = createTempConnectionFile();
  console.log('✅ Temporary connection file created with secure credentials');
  
  try {
    // Set Supabase project
    console.log(`🔧 Setting Supabase project to: ${process.env.SUPABASE_PROJECT_ID}`);
    execSync(`npx supabase link --project-ref ${process.env.SUPABASE_PROJECT_ID}`, {
      stdio: 'inherit'
    });
    
    // Run migrations with env file
    console.log('🔄 Running migrations...');
    execSync(`npx supabase db push --env-file ${tempFilePath}`, {
      stdio: 'inherit'
    });
    
    console.log('✅ Migrations applied successfully');
    
    // Generate TypeScript types
    console.log('🔄 Generating TypeScript types...');
    execSync(`npx supabase gen types typescript --linked --schema public > src/types/database.types.ts`, {
      stdio: 'inherit'
    });
    
    console.log('✅ TypeScript types generated successfully');
    
  } catch (error) {
    console.error('❌ Error during migration process:', error.message);
    process.exit(1);
  } finally {
    // Clean up
    cleanup(tempFilePath);
    console.log('🧹 Cleaned up temporary files');
  }
  
  console.log('🎉 Migration process completed successfully!');
}

// Execute the migration process
runMigrations();
