const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to execute commands and log output
function runCommand(command) {
  console.log(`\n> Running: ${command}\n`);
  
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return false;
  }
}

// Install dependencies if needed
runCommand('npm install --legacy-peer-deps');

// Generate type definitions
console.log('Generating type definitions...');
if (runCommand('npx supabase gen types typescript --local > src/types/database.types.ts')) {
  console.log('✅ Type definitions generated successfully');
}

// Set production environment
console.log('Setting production environment...');
if (fs.existsSync('.env')) {
  fs.copyFileSync('.env', '.env.backup');
  console.log('✅ Backed up .env file');
}

if (fs.existsSync('.env.production')) {
  fs.copyFileSync('.env.production', '.env');
  console.log('✅ Set production environment');
} else {
  console.log('⚠️ No production environment file found. Make sure to set up production variables.');
}

// Build the application with maximum compatibility
console.log('Building application...');
if (runCommand('npx next build')) {
  console.log('✅ Application built successfully');
  
  // Start the application
  console.log('\n=========================================');
  console.log('Application successfully built for production!');
  console.log('To start the application, run:');
  console.log('npm run start');
  console.log('=========================================\n');
} else {
  console.error('❌ Failed to build the application');
}
