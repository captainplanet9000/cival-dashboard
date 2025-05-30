/**
 * Fix Environment Variables Script
 * 
 * This script creates a proper .env.local file with the correct Supabase credentials
 * from the supabase-mcp-ready.json file.
 */

const fs = require('fs');
const path = require('path');

// Load the Supabase MCP configuration
const supabaseMcpConfig = require('./supabase-mcp-ready.json');

// Create the environment variables content
const envContent = `# Updated on: ${new Date().toISOString()}
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${supabaseMcpConfig.api_url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseMcpConfig.anon_key}

# ElizaOS Configuration 
NEXT_PUBLIC_ELIZAOS_WEBSOCKET_URL=ws://localhost:8765
NEXT_PUBLIC_ELIZAOS_API_URL=http://localhost:8000
NEXT_PUBLIC_ELIZAOS_AGENT_PREFIX=eliza_trading_agent_

# Trading Farm Backend
NEXT_PUBLIC_TRADING_FARM_API_URL=http://localhost:8000/api
`;

// Write the environment file
fs.writeFileSync(path.join(__dirname, '.env.local'), envContent);

console.log('✅ .env.local file created successfully with the correct Supabase credentials!');
console.log('🔄 Please restart your Next.js development server for the changes to take effect.');
