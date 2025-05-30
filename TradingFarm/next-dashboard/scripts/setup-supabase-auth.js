/**
 * Supabase Authentication Setup Helper
 * 
 * This script helps set up Supabase authentication for CLI commands
 * and provides alternative options for generating TypeScript types
 * without requiring login.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Generate types without using CLI auth
function generateTypesManually() {
  console.log('\n===== OPTION 1: Generate Types Manually =====\n');
  console.log('Instead of using the Supabase CLI, you can generate types manually:');
  console.log('1. Go to https://supabase.com/dashboard/project/bgvlzvswzpfoywfxehis/api');
  console.log('2. Click on "TypeScript" in the left sidebar');
  console.log('3. Copy the generated types');
  console.log('4. Paste them into src/types/database.types.ts');

  // Create a sample types file
  const typesDir = path.join(__dirname, '..', 'src', 'types');
  const typesPath = path.join(typesDir, 'database.types.ts');
  
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }
  
  if (!fs.existsSync(typesPath)) {
    const sampleTypes = `export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string
          farm_id: number
          agent_id: number | null
          exchange: string
          symbol: string
          type: string
          side: string
          quantity: number
          price: number | null
          time_in_force: string | null
          status: string
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          farm_id: number
          agent_id?: number | null
          exchange: string
          symbol: string
          type: string
          side: string
          quantity: number
          price?: number | null
          time_in_force?: string | null
          status: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          farm_id?: number
          agent_id?: number | null
          exchange?: string
          symbol?: string
          type?: string
          side?: string
          quantity?: number
          price?: number | null
          time_in_force?: string | null
          status?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      // Agent commands table
      agent_commands: {
        Row: {
          id: string
          agent_id: number
          command_type: string
          command_content: string
          status: string
          response_id: string | null
          context: Json | null
          order_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: number
          command_type: string
          command_content: string
          status?: string
          response_id?: string | null
          context?: Json | null
          order_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: number
          command_type?: string
          command_content?: string
          status?: string
          response_id?: string | null
          context?: Json | null
          order_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_commands_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commands_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      
      // Add other table definitions as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order_command: {
        Args: {
          agent_id_param: number
          order_id_param: string
          command_type_param: string
          command_content_param: string
          context_param?: Json
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier data access
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']`;

    fs.writeFileSync(typesPath, sampleTypes);
    console.log(`\n✅ Created a sample types file at: ${typesPath}`);
    console.log('Note: This is a simplified version. Update it with the full schema from Supabase dashboard.');
  }
}

// CLI login option
function cliLoginOption() {
  console.log('\n===== OPTION 2: Login with Supabase CLI =====\n');
  console.log('To authenticate with Supabase CLI:');
  console.log('1. Run: npx supabase login');
  console.log('2. Follow the prompts to open a browser and copy your access token');
  console.log('3. After login, run: npx supabase gen types typescript --project-id bgvlzvswzpfoywfxehis > src/types/database.types.ts');
}

// Environment variable option
function envVarOption() {
  console.log('\n===== OPTION 3: Set Environment Variable =====\n');
  console.log('You can set the SUPABASE_ACCESS_TOKEN environment variable:');
  console.log('1. Get your access token from https://supabase.com/dashboard/account/tokens');
  console.log('2. Create or update .env.local with:');
  console.log('   SUPABASE_ACCESS_TOKEN=your_token_here');
  console.log('   (Make sure not to commit this token to source control)');
  console.log('3. Then run:');
  console.log('   npx cross-env SUPABASE_ACCESS_TOKEN=$env:SUPABASE_ACCESS_TOKEN supabase gen types typescript --project-id bgvlzvswzpfoywfxehis > src/types/database.types.ts');
  
  // Check if .env.local exists
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    console.log('\nDetected .env.local file. You can add the SUPABASE_ACCESS_TOKEN to this file.');
  } else {
    console.log('\nNo .env.local file detected. Consider creating one for environment variables.');
  }
}

// Create a script to run with token
function createTokenScript() {
  console.log('\n===== OPTION 4: Use this Helper Script =====\n');
  
  const scriptPath = path.join(__dirname, 'gen-types-with-token.js');
  const scriptContent = `/**
 * Generate TypeScript Types with Token
 * 
 * Usage: node gen-types-with-token.js YOUR_SUPABASE_ACCESS_TOKEN
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get token from command line argument
const token = process.argv[2];

if (!token) {
  console.error('❌ Error: No token provided');
  console.log('Usage: node gen-types-with-token.js YOUR_SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

console.log('🔑 Using provided access token to generate types...');

try {
  // Create types directory if it doesn't exist
  const typesDir = path.join(__dirname, '..', 'src', 'types');
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }
  
  // Run the command with the token
  execSync(
    \`npx cross-env SUPABASE_ACCESS_TOKEN=\${token} supabase gen types typescript --project-id bgvlzvswzpfoywfxehis > src/types/database.types.ts\`,
    { stdio: 'inherit' }
  );
  
  console.log('✅ TypeScript types generated successfully!');
} catch (error) {
  console.error('❌ Error generating types:', error.message);
  process.exit(1);
}`;

  fs.writeFileSync(scriptPath, scriptContent);
  console.log(`Created helper script at: ${scriptPath}`);
  console.log('Usage: node scripts/gen-types-with-token.js YOUR_SUPABASE_ACCESS_TOKEN');
}

// Create a direct API fetch script (most reliable)
function createDirectFetchScript() {
  console.log('\n===== OPTION 5: Generate via Direct API Fetch (Most Reliable) =====\n');
  
  const fetchScriptPath = path.join(__dirname, 'fetch-database-types.js');
  const fetchScriptContent = `/**
 * Fetch Database Types Directly
 * 
 * This script fetches database types directly from the Supabase API
 * without requiring CLI authentication.
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ID = 'bgvlzvswzpfoywfxehis';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';

async function fetchPostgrestTypes() {
  console.log('🔍 Fetching database types directly from Supabase API...');
  
  try {
    // Create types directory if it doesn't exist
    const typesDir = path.join(__dirname, '..', 'src', 'types');
    if (!fs.existsSync(typesDir)) {
      fs.mkdirSync(typesDir, { recursive: true });
    }
    
    // Fetch the database schema from Supabase
    const response = await fetch(\`https://\${PROJECT_ID}.supabase.co/rest/v1/?apikey=\${API_KEY}`);
    
    if (!response.ok) {
      throw new Error(\`API request failed with status \${response.status}\`);
    }
    
    const schema = await response.json();
    
    // Build TypeScript definitions
    let definitions = \`export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
\`;

    // Process tables
    if (schema.definitions) {
      Object.entries(schema.definitions).forEach(([tableName, def]) => {
        if (def.properties) {
          definitions += \`      \${tableName}: {
        Row: {
\`;
          
          // Process columns
          Object.entries(def.properties).forEach(([colName, colDef]) => {
            let typeStr = 'any';
            if (colDef.type === 'string') {
              typeStr = 'string';
            } else if (colDef.type === 'number') {
              typeStr = 'number';
            } else if (colDef.type === 'boolean') {
              typeStr = 'boolean';
            } else if (colDef.type === 'object') {
              typeStr = 'Json';
            } else if (colDef.type === 'array') {
              typeStr = 'Json[]';
            }
            
            const nullable = !def.required || !def.required.includes(colName);
            typeStr = nullable ? \`\${typeStr} | null\` : typeStr;
            
            definitions += \`          \${colName}: \${typeStr}
\`;
          });
          
          // Complete Row type
          definitions += \`        }
        Insert: {
\`;
          
          // Process Insert type
          Object.entries(def.properties).forEach(([colName, colDef]) => {
            let typeStr = 'any';
            if (colDef.type === 'string') {
              typeStr = 'string';
            } else if (colDef.type === 'number') {
              typeStr = 'number';
            } else if (colDef.type === 'boolean') {
              typeStr = 'boolean';
            } else if (colDef.type === 'object') {
              typeStr = 'Json';
            } else if (colDef.type === 'array') {
              typeStr = 'Json[]';
            }
            
            const required = def.required && def.required.includes(colName);
            const nullable = !required;
            const optional = colName !== 'id' && !required;
            
            if (optional) {
              typeStr = nullable ? \`\${typeStr} | null\` : typeStr;
              definitions += \`          \${colName}?: \${typeStr}
\`;
            } else {
              typeStr = nullable ? \`\${typeStr} | null\` : typeStr;
              definitions += \`          \${colName}: \${typeStr}
\`;
            }
          });
          
          // Complete Insert type
          definitions += \`        }
        Update: {
\`;
          
          // Process Update type
          Object.entries(def.properties).forEach(([colName, colDef]) => {
            let typeStr = 'any';
            if (colDef.type === 'string') {
              typeStr = 'string';
            } else if (colDef.type === 'number') {
              typeStr = 'number';
            } else if (colDef.type === 'boolean') {
              typeStr = 'boolean';
            } else if (colDef.type === 'object') {
              typeStr = 'Json';
            } else if (colDef.type === 'array') {
              typeStr = 'Json[]';
            }
            
            const nullable = !def.required || !def.required.includes(colName);
            typeStr = nullable ? \`\${typeStr} | null\` : typeStr;
            
            definitions += \`          \${colName}?: \${typeStr}
\`;
          });
          
          // Complete table definition
          definitions += \`        }
        Relationships: []
      }
\`;
        }
      });
    }
    
    // Finish the interface
    definitions += \`    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier data access
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
\`;

    const outputPath = path.join(typesDir, 'database.types.ts');
    fs.writeFileSync(outputPath, definitions);
    
    console.log(\`✅ TypeScript types generated at: \${outputPath}\`);
  } catch (error) {
    console.error('❌ Error fetching database types:', error.message);
  }
}

// Install dependencies if needed
async function installDependencies() {
  try {
    console.log('📦 Checking for required dependencies...');
    
    try {
      require('node-fetch');
      console.log('✅ node-fetch is already installed.');
    } catch (e) {
      console.log('📦 Installing node-fetch...');
      execSync('npm install --save node-fetch@2.6.7', { stdio: 'inherit' });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error installing dependencies:', error.message);
    return false;
  }
}

// Run the function
async function main() {
  console.log('🚀 Fetching database types from Supabase...');
  
  const dependenciesOk = await installDependencies();
  if (dependenciesOk) {
    await fetchPostgrestTypes();
  }
}

main();
\`;

  fs.writeFileSync(fetchScriptPath, fetchScriptContent);
  console.log(`Created direct fetch script at: ${fetchScriptPath}`);
  console.log('Run it with: node scripts/fetch-database-types.js');
  
  // Add a package.json entry if needed
  const packagePath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(packagePath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      if (!packageJson.dependencies['node-fetch']) {
        console.log('\nYou need to install node-fetch for the direct fetch script:');
        console.log('npm install --save node-fetch@2.6.7');
      }
    } catch (e) {
      // Skip package.json check if we can't parse it
    }
  }
}

// Main function
function main() {
  console.log('===== Supabase Authentication & TypeScript Types Setup Helper =====');
  
  // Check for existing supabase CLI
  let cliInstalled = false;
  try {
    execSync('npx supabase --version', { stdio: 'ignore' });
    cliInstalled = true;
  } catch (e) {
    console.log('\n⚠️ Supabase CLI not found. Installing with npx should work for temporary use.');
  }
  
  // Check for cross-env
  let crossEnvInstalled = false;
  try {
    execSync('npm list cross-env', { stdio: 'ignore' });
    crossEnvInstalled = true;
  } catch (e) {
    console.log('\n⚠️ cross-env not found. You might need to install it: npm install --save-dev cross-env');
  }
  
  // Present all options
  generateTypesManually();
  cliLoginOption();
  envVarOption();
  createTokenScript();
  createDirectFetchScript();
  
  console.log('\n===== Recommended Approach =====');
  console.log('The most direct approach is Option 5: Generate via Direct API Fetch');
  console.log('Run: node scripts/fetch-database-types.js');
}

// Run the setup helper
main();
