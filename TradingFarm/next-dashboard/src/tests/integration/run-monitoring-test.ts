/**
 * Run Monitoring Integration Tests
 * 
 * This script applies all necessary Supabase migrations and then runs
 * the monitoring integration tests with real-time trading data.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const execAsync = promisify(exec);
dotenv.config();

// Test settings
const FETCH_TEST_USER_ID = true; // Set to false if you want to enter user ID manually

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Main function to run the integration tests
 */
async function main() {
  console.log('┌──────────────────────────────────────────────────┐');
  console.log('│           TRADING FARM INTEGRATION TEST          │');
  console.log('│             Monitoring & Operations              │');
  console.log('└──────────────────────────────────────────────────┘');
  
  try {
    // Check environment
    await checkEnvironment();
    
    // Apply migrations if needed
    await applyMigrations();
    
    // Set test user ID
    await setTestUserId();
    
    // Run integration tests
    await runIntegrationTests();
    
    console.log('\n✅ Integration tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Error running integration tests:', error);
    process.exit(1);
  }
}

/**
 * Check if the environment is properly set up
 */
async function checkEnvironment() {
  console.log('\n📋 Checking environment...');
  
  // Check required environment variables
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Check if Supabase CLI is installed
  try {
    await execAsync('npx supabase --version');
    console.log('✅ Supabase CLI is installed');
  } catch (error) {
    console.warn('⚠️ Supabase CLI not found. Installing...');
    await execAsync('npm install @supabase/supabase-js');
  }
  
  // Check connection to Supabase
  try {
    // Start with simplest query possible to check connection
    console.log('Checking Supabase connection...');
    
    // Try a simpler query approach that doesn't use count(*) which is causing parsing issues
    const { error: simpleError } = await supabase.from('_schema').select('*').limit(1);
    
    // If that fails, try with system tables
    if (simpleError) {
      console.log('Trying alternative connection check method...');
      const { error: schemaError } = await supabase.from('information_schema.tables').select('table_name').limit(1);
      
      if (schemaError) {
        // Last resort - try a raw query through the functions API
        console.log('Trying final connection check method...');
        const { error: rpcError } = await supabase.rpc('get_timestamp');
        
        if (rpcError) {
          // Create a simple function if it doesn't exist
          await supabase.rpc('create_timestamp_function', {});
          throw rpcError;
        }
      }
    }
    
    console.log('✅ Connected to Supabase successfully');
  } catch (error) {
    console.error('Connection error details:', error);
    throw new Error(`Failed to connect to Supabase. Check your credentials and network connection.`);
  }
  
  console.log('✅ Environment check complete');
}

/**
 * Apply all Supabase migrations if needed
 */
async function applyMigrations() {
  console.log('\n📋 Checking migrations...');
  
  const migrationsPath = path.join(process.cwd(), 'supabase', 'migrations');
  
  // Check if migrations directory exists
  if (!fs.existsSync(migrationsPath)) {
    throw new Error(`Migrations directory not found: ${migrationsPath}`);
  }
  
  // List migration files
  const migrationFiles = fs.readdirSync(migrationsPath)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  console.log(`Found ${migrationFiles.length} migration files`);

  // Check if Supabase is initialized
  try {
    console.log('Checking Supabase project status...');
    await execAsync('npx supabase status');
    console.log('Supabase project is initialized');
  } catch (error) {
    console.log('Supabase project may not be initialized. Attempting to initialize...');
    try {
      await execAsync('npx supabase init');
      console.log('Supabase project initialized successfully');
    } catch (initError: any) { 
      console.warn(`Warning: Could not initialize Supabase project: ${initError.message}`);
      console.log('Continuing with testing, but migrations may not apply correctly.');
    }
  }
  
  // Get user confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise<string>(resolve => {
    rl.question('Do you want to apply all migrations? (y/n): ', resolve);
  });
  
  rl.close();
  
  if (answer.toLowerCase() !== 'y') {
    console.log('Skipping migrations');
    return;
  }
  
  // Apply migrations
  console.log('\n📋 Applying migrations...');
  
  try {
    // Start Supabase local development environment if needed
    console.log('Starting Supabase local development environment...');
    try {
      await execAsync('npx supabase start');
      console.log('Supabase local environment started');
    } catch (startError: any) {
      console.warn(`Warning: Could not start Supabase: ${startError.message}`);
      console.log('Continuing with migration application...');
    }
    
    // Apply migrations
    await execAsync('npx supabase migration up');
    console.log('✅ Migrations applied successfully');
    
    // Generate Typescript types
    console.log('\n📋 Updating TypeScript definitions...');
    await execAsync('npx supabase gen types typescript --local > src/types/database.types.ts');
    console.log('✅ TypeScript definitions updated');
  } catch (error: any) {
    throw new Error(`Failed to apply migrations: ${error.message}`);
  }
}

/**
 * Set the test user ID in the monitoring-integration-test.ts file
 */
async function setTestUserId() {
  console.log('\n📋 Setting up test user...');
  
  let testUserId: string;
  
  if (FETCH_TEST_USER_ID) {
    // Fetch a real user ID from the database
    const { data, error } = await supabase
      .from('farms')
      .select('user_id')
      .limit(1);
    
    if (error || !data || data.length === 0) {
      throw new Error('Could not find any users in the database. Please create at least one farm first.');
    }
    
    testUserId = data[0].user_id;
    console.log(`Using user ID from database: ${testUserId}`);
  } else {
    // Get user ID from input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    testUserId = await new Promise<string>(resolve => {
      rl.question('Enter test user ID: ', resolve);
    });
    
    rl.close();
  }
  
  // Update the integration test file with the real user ID
  const testFilePath = path.join(process.cwd(), 'src', 'tests', 'integration', 'monitoring-integration-test.ts');
  let testFileContent = fs.readFileSync(testFilePath, 'utf8');
  
  // Replace the placeholder user ID
  testFileContent = testFileContent.replace(
    /const TEST_USER_ID = ['"]replace-with-valid-user-id['"];/,
    `const TEST_USER_ID = '${testUserId}';`
  );
  
  // Write back to the file
  fs.writeFileSync(testFilePath, testFileContent);
  
  console.log('✅ Test user ID configured');
}

/**
 * Run the integration tests
 */
async function runIntegrationTests() {
  console.log('\n📋 Running integration tests...');
  
  try {
    // Install dependencies if needed
    const dependencies = ['ccxt', 'date-fns'];
    for (const dependency of dependencies) {
      try {
        require.resolve(dependency);
      } catch (e) {
        console.log(`Installing dependency: ${dependency}...`);
        await execAsync(`npm install ${dependency}`);
      }
    }
    
    // Run the integration test
    console.log('\n🧪 Starting monitoring integration tests...');
    // Use spawn instead of exec to properly handle stdout/stderr without stdio option
    const { spawn } = require('child_process');
    return new Promise<void>((resolve, reject) => {
      const testProcess = spawn('npx', ['tsx', 'src/tests/integration/monitoring-integration-test.ts'], {
        stdio: 'inherit',
        shell: true
      });
      
      testProcess.on('close', (code: number) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Integration tests failed with exit code ${code}`));
        }
      });
    });
  } catch (error: any) {
    throw new Error(`Integration tests failed: ${error.message}`);
  }
}

// Run the main function
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Failed to run tests:', error);
    process.exit(1);
  });
