/**
 * Run Supabase MCP Bridge
 * 
 * This script installs dependencies and runs the Supabase MCP bridge.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Check for required dependencies
console.log('Checking for required dependencies...');
const dependencies = ['express', 'cors', '@supabase/supabase-js'];
let needsInstall = false;

try {
  // Try to check for dependency existence without actually requiring them
  for (const dep of dependencies) {
    try {
      require.resolve(dep);
    } catch (e) {
      console.log(`Missing dependency: ${dep}`);
      needsInstall = true;
    }
  }
  
  if (needsInstall) {
    console.log('Installing required dependencies...');
    execSync('npm install express cors @supabase/supabase-js', { 
      stdio: 'inherit', 
      cwd: path.join(__dirname, '..')
    });
  }
  
  // Verify Supabase MCP config exists
  const configPath = path.join(__dirname, '..', 'supabase-mcp-config.json');
  if (!fs.existsSync(configPath)) {
    console.error('Error: supabase-mcp-config.json not found!');
    process.exit(1);
  }
  
  // Run the bridge
  console.log('Starting Supabase MCP Bridge...');
  require('./supabase-mcp-bridge.js');
  
} catch (error) {
  console.error('Error starting Supabase MCP Bridge:', error);
  process.exit(1);
}
