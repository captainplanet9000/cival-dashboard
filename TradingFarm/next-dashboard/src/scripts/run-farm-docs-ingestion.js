/**
 * Run FARMDOCS Ingestion
 * 
 * This script compiles and runs the TypeScript script for ingesting FARMDOCS
 * into the Trading Farm's memory system.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to the TypeScript script
const scriptPath = path.join(__dirname, 'ingest-farm-docs.ts');

// Check if the script exists
if (!fs.existsSync(scriptPath)) {
  console.error(`Error: Script not found at ${scriptPath}`);
  process.exit(1);
}

// Use ts-node to run the TypeScript script
console.log('Starting FARMDOCS ingestion process...');
const child = spawn('npx', ['ts-node', scriptPath], {
  stdio: 'inherit',
  shell: true
});

// Handle process exit
child.on('exit', (code) => {
  if (code === 0) {
    console.log('FARMDOCS ingestion completed successfully!');
  } else {
    console.error(`FARMDOCS ingestion failed with code ${code}`);
  }
});

// Handle process errors
child.on('error', (err) => {
  console.error('Failed to start ingestion process:', err);
  process.exit(1);
}); 