// Script to update environment variables with correct Supabase credentials
const fs = require('fs');
const path = require('path');

// Define the proper environment variables with the updated credentials
const envContent = `# Authentication (NextAuth/Auth.js)
AUTH_SECRET=KraAE0kU9dsQGOxXHMH8xWI2+5OeJkDBScohDlgo9lk=
NEXTAUTH_URL=http://localhost:3003

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://bgvlzvswzpfoywfxehis.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgzMTU1OSwiZXhwIjoyMDUyNDA3NTU5fQ.TZLKwHuMxv9xtSc0wJ7DG5ivjw0K-7NztPeLRsGqMAA

# Socket.io Configuration
NEXT_PUBLIC_SOCKET_URL=http://localhost:3002

# JWT Secret for Socket Authentication
JWT_SECRET=Il6dHM1bjTtJIVC0WBFbJHumyxi4e3dEVOgqsL9CAzq6K7ewrm/RQrQbtfU80+7cr+EmFsVRDaAb6Z7wIL9x4A==

# ElizaOS Configuration
NEXT_PUBLIC_ELIZAOS_API_URL=http://localhost:3002/elizaos
`;

console.log('Creating .env.local file with updated Supabase credentials...');
fs.writeFileSync(path.join(__dirname, '..', '.env.local'), envContent);
console.log('.env.local file created successfully!');

// Update the Supabase config file if it exists
const configPath = path.join(__dirname, '..', 'supabase-mcp-config.json');
if (fs.existsSync(configPath)) {
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    // Update with the new connection string using the service role key
    config.connectionString = `postgresql://postgres:postgres@db.bgvlzvswzpfoywfxehis.supabase.co:5432/postgres`;
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('Updated supabase-mcp-config.json successfully!');
  } catch (error) {
    console.error('Error updating config file:', error.message);
  }
}

console.log('\nEnvironment setup complete. Please restart your Next.js server to apply the changes.');
