// Script to fix environment variables and test database connectivity
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define the proper environment variables
const envContent = `# Authentication (NextAuth/Auth.js)
AUTH_SECRET=KraAE0kU9dsQGOxXHMH8xWI2+5OeJkDBScohDlgo9lk=
NEXTAUTH_URL=http://localhost:3003

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://bgvlzvswzpfoywfxehis.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgzMTU1OSwiZXhwIjoyMDUyNDA3NTU5fQ.TZLKwHuMxv9xtSc0wJ7DG5ivjw0K-7NztPeLRsGqMAA

# Socket.io Configuration
NEXT_PUBLIC_SOCKET_URL=http://localhost:3002

# JWT Secret for Socket Authentication
JWT_SECRET=Il6dHM1bjTtJIVC0WBFbJHumyxi4e3dEVOgqsL9CAzq6K7ewrm/RQrQbtfU80+7cr+EmFsVRDaAb6Z7wIL9x4A==

# ElizaOS Configuration
NEXT_PUBLIC_ELIZAOS_API_URL=http://localhost:3002/elizaos
`;

console.log('Creating .env.local file with proper formatting...');
fs.writeFileSync(path.join(__dirname, '..', '.env.local'), envContent);
console.log('.env.local file created successfully!');

// Test Supabase setup
try {
  console.log('\nTesting Supabase connection...');
  const output = execSync('npx supabase status', { env: process.env }).toString();
  console.log('Supabase connection test output:');
  console.log(output);
} catch (error) {
  console.error('Error testing Supabase connection:', error.message);
  console.log('Error output:', error.stdout?.toString() || 'No output');
}

console.log('\nEnvironment setup complete. Please restart your Next.js server.');
