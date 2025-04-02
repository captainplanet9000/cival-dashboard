// Script to fix environment variables with correct Supabase configuration
const fs = require('fs');
const path = require('path');

// Define the updated environment variables content
const envContent = `# Authentication (NextAuth/Auth.js)
AUTH_SECRET=KraAE0kU9dsQGOxXHMH8xWI2+5OeJkDBScohDlgo9lk=
NEXTAUTH_URL=http://localhost:3003

# Supabase Configuration - Correct Values
NEXT_PUBLIC_SUPABASE_URL=https://bgvlzvswzpfoywfxehis.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU

# Socket.io Configuration
NEXT_PUBLIC_SOCKET_URL=http://localhost:3002

# JWT Secret for Socket Authentication
JWT_SECRET=Il6dHM1bjTtJIVC0WBFbJHumyxi4e3dEVOgqsL9CAzq6K7ewrm/RQrQbtfU80+7cr+EmFsVRDaAb6Z7wIL9x4A==

# ElizaOS Configuration
NEXT_PUBLIC_ELIZAOS_API_URL=http://localhost:3002/elizaos
`;

// Write the updated environment variables to .env.local
console.log('Updating environment variables with correct Supabase configuration...');
fs.writeFileSync(path.join(__dirname, '..', '.env.local'), envContent);
console.log('✅ Environment variables updated successfully in .env.local!');

// Also check the supabase-mcp-config.json file if it exists
const configPath = path.join(__dirname, '..', 'supabase-mcp-config.json');
if (fs.existsSync(configPath)) {
  try {
    console.log('Updating Supabase MCP configuration...');
    const configContent = fs.readFileSync(configPath, 'utf8');
    let config = JSON.parse(configContent);
    
    // Update the project ID and URL
    config.projectId = 'bgvlzvswzpfoywfxehis';
    config.supabaseUrl = 'https://bgvlzvswzpfoywfxehis.supabase.co';
    
    // Write the updated configuration back
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ supabase-mcp-config.json updated successfully!');
  } catch (error) {
    console.error('Error updating supabase-mcp-config.json:', error.message);
  }
}

console.log('\n🔄 Please restart your Next.js server for changes to take effect.');
console.log('Run: npm run dev');
