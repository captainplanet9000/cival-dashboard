// Script to set up local Supabase instance and initialize database schema
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up local Supabase instance...');

// Create a clean .env.local file with local Supabase settings
const envContent = `# Authentication (NextAuth/Auth.js)
AUTH_SECRET=KraAE0kU9dsQGOxXHMH8xWI2+5OeJkDBScohDlgo9lk=
NEXTAUTH_URL=http://localhost:3003

# Supabase Configuration - Local Development
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Socket.io Configuration
NEXT_PUBLIC_SOCKET_URL=http://localhost:3002

# JWT Secret for Socket Authentication
JWT_SECRET=Il6dHM1bjTtJIVC0WBFbJHumyxi4e3dEVOgqsL9CAzq6K7ewrm/RQrQbtfU80+7cr+EmFsVRDaAb6Z7wIL9x4A==

# ElizaOS Configuration
NEXT_PUBLIC_ELIZAOS_API_URL=http://localhost:3002/elizaos
`;

console.log('Creating .env.local file with local development settings...');
fs.writeFileSync(path.join(__dirname, '..', '.env.local'), envContent);
console.log('.env.local file created successfully!');

// Function to run a command and log output
function runCommand(command, cwd = __dirname) {
  console.log(`\nRunning: ${command}`);
  try {
    const output = execSync(command, { cwd, stdio: 'inherit' });
    return { success: true, output };
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return { success: false, error };
  }
}

// Initialize Supabase locally
console.log('\nInitializing local Supabase...');
runCommand('npx supabase start', path.join(__dirname, '..'));

// Apply migrations
console.log('\nApplying database migrations...');
runCommand('npx supabase migration up', path.join(__dirname, '..'));

// Generate TypeScript types
console.log('\nGenerating TypeScript types...');
runCommand('npx supabase gen types typescript --local > src/types/database.types.ts', path.join(__dirname, '..'));

console.log('\n✅ Local Supabase setup complete! You can now restart your Next.js server.');
