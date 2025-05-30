#!/usr/bin/env node
/**
 * Direct Migrations Script
 * 
 * This script directly applies migrations without relying on Supabase CLI's environment handling.
 * It reads migration files from the supabase/migrations directory and executes them in order.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { execSync } = require('child_process');

// Configuration
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const TYPES_OUTPUT = path.join(__dirname, '..', 'src', 'types', 'database.types.ts');

// Get database connection info from supabase-mcp-config.json
const CONFIG_PATH = path.join(__dirname, '..', 'supabase-mcp-config.json');
let dbConfig = {};

try {
  const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
  const config = JSON.parse(configContent);
  const connectionString = config.connectionString;
  
  if (connectionString) {
    console.log('Found connection string in supabase-mcp-config.json');
    dbConfig = { connectionString };
  } else {
    console.error('No connection string found in config');
    process.exit(1);
  }
} catch (error) {
  console.error('Error reading supabase-mcp-config.json:', error.message);
  process.exit(1);
}

// Get all migration files
function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Natural sort by filename
  
  return files.map(file => ({
    name: file,
    path: path.join(MIGRATIONS_DIR, file),
    content: fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
  }));
}

// Execute migrations
async function executeMigrations() {
  console.log('🚀 Starting direct migration execution...');
  
  const migrations = getMigrationFiles();
  console.log(`Found ${migrations.length} migration files`);
  
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Get already executed migrations
    const { rows: executedMigrations } = await client.query(
      'SELECT name FROM _migrations'
    );
    const executedNames = executedMigrations.map(row => row.name);
    
    // Execute each migration in a transaction
    for (const migration of migrations) {
      if (executedNames.includes(migration.name)) {
        console.log(`Migration ${migration.name} already executed, skipping`);
        continue;
      }
      
      console.log(`Executing migration: ${migration.name}`);
      
      try {
        // Start transaction
        await client.query('BEGIN');
        
        // Execute migration
        await client.query(migration.content);
        
        // Record migration as executed
        await client.query(
          'INSERT INTO _migrations (name) VALUES ($1)',
          [migration.name]
        );
        
        // Commit transaction
        await client.query('COMMIT');
        
        console.log(`✅ Successfully executed migration: ${migration.name}`);
      } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error(`❌ Error executing migration ${migration.name}:`, error.message);
        throw error;
      }
    }
    
    console.log('✅ All migrations executed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Generate TypeScript types
async function generateTypes() {
  console.log('Generating TypeScript types from database schema...');
  
  try {
    // Create a temporary script to generate types and write them to a file
    const tempScriptPath = path.join(__dirname, 'temp-gen-types.js');
    const tempScriptContent = `
      const { execSync } = require('child_process');
      const fs = require('fs');
      
      try {
        // Use the connection info from supabase-mcp-config.json
        const configPath = '${CONFIG_PATH}';
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        // Generate types using pg_dump and schema-parser
        const connectionString = config.connectionString;
        
        if (!connectionString) {
          throw new Error('No connection string found in config');
        }
        
        // Extract connection parts from the connection string
        const connParts = connectionString.match(/postgres:\\/\\/(.*?):(.*?)@(.*?):(\\d+)\\/(.*)/);
        if (!connParts) {
          throw new Error('Could not parse connection string');
        }
        
        const [, user, password, host, port, database] = connParts;
        
        // Set environment variables for pg_dump
        process.env.PGPASSWORD = password;
        
        // Use pg_dump to get the schema
        const schemaDump = execSync(
          \`pg_dump -h \${host} -p \${port} -U \${user} -d \${database} --schema-only\`,
          { encoding: 'utf8' }
        );
        
        // Write the schema file
        const schemaPath = '${path.join(__dirname, 'temp-schema.sql')}';
        fs.writeFileSync(schemaPath, schemaDump);
        
        // Generate types from schema
        const types = \`
        export type Json =
          | string
          | number
          | boolean
          | null
          | { [key: string]: Json | undefined }
          | Json[]
        
        export interface Database {
          public: {
            Tables: {
              // Auto-generated types from schema dump
              \${generateTypesFromSchema(schemaDump)}
            }
            Views: {}
            Functions: {
              check_table_exists: {
                Args: { table_name: string }
                Returns: boolean
              }
            }
            Enums: {}
            CompositeTypes: {}
          }
        }
        
        function generateTypesFromSchema(schema) {
          // Very basic schema parser - in a real implementation this would be more robust
          const tables = {};
          const tableRegex = /CREATE TABLE (?:public\\.)?(\\w+) \\(/g;
          const columnRegex = /\\s+(\\w+)\\s+([A-Za-z0-9_\\[\\]]+)(?:\\s+(?:NOT NULL|NULL))?/g;
          
          let tableMatch;
          while ((tableMatch = tableRegex.exec(schema)) !== null) {
            const tableName = tableMatch[1];
            const tableStart = tableMatch.index + tableMatch[0].length;
            const tableEndMatch = schema.slice(tableStart).match(/\\);/);
            if (tableEndMatch) {
              const tableBody = schema.slice(tableStart, tableStart + tableEndMatch.index);
              
              const columns = {};
              let columnMatch;
              while ((columnMatch = columnRegex.exec(tableBody)) !== null) {
                const columnName = columnMatch[1];
                let columnType = columnMatch[2].toLowerCase();
                
                // Map PostgreSQL types to TypeScript types
                let tsType;
                if (columnType.includes('int') || columnType.includes('serial') || columnType === 'numeric') {
                  tsType = 'number';
                } else if (columnType === 'text' || columnType.includes('char')) {
                  tsType = 'string';
                } else if (columnType === 'boolean') {
                  tsType = 'boolean';
                } else if (columnType.includes('timestamp') || columnType === 'date') {
                  tsType = 'string';
                } else if (columnType === 'jsonb' || columnType === 'json') {
                  tsType = 'Json';
                } else if (columnType === 'uuid') {
                  tsType = 'string';
                } else {
                  tsType = 'unknown';
                }
                
                const isNullable = !tableBody.includes(\`\${columnName} NOT NULL\`);
                columns[columnName] = isNullable ? \`\${tsType} | null\` : tsType;
              }
              
              tables[tableName] = columns;
            }
          }
          
          // Generate TypeScript interface code
          let result = '';
          for (const [tableName, columns] of Object.entries(tables)) {
            result += \`\${tableName}: {
            Row: {
              \${Object.entries(columns).map(([col, type]) => \`\${col}: \${type}\`).join('\\n              ')}
            }
            Insert: {
              \${Object.entries(columns).map(([col, type]) => {
                // Make id and timestamps optional for inserts
                const isOptional = col === 'id' || col.includes('_at');
                return \`\${col}\${isOptional ? '?' : ''}: \${type}\`;
              }).join('\\n              ')}
            }
            Update: {
              \${Object.entries(columns).map(([col, type]) => \`\${col}?: \${type}\`).join('\\n              ')}
            }
          }\\n          \`;
          }
          
          return result;
        }
        \`;
        
        // Write types to file
        fs.writeFileSync('${TYPES_OUTPUT}', types);
        
        // Clean up temp schema file
        fs.unlinkSync(schemaPath);
        
        console.log('Types generated successfully');
      } catch (error) {
        console.error('Error generating types:', error);
        process.exit(1);
      }
    `;
    
    fs.writeFileSync(tempScriptPath, tempScriptContent);
    
    // Execute the temp script
    execSync(`node ${tempScriptPath}`, { stdio: 'inherit' });
    
    // Clean up temp script
    fs.unlinkSync(tempScriptPath);
    
    console.log(`✅ TypeScript types generated at ${TYPES_OUTPUT}`);
  } catch (error) {
    console.error('Failed to generate types:', error.message);
    
    // Fallback: Generate a minimal types file
    try {
      console.log('Creating minimal types file...');
      
      const minimalTypes = `
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      farms: {
        Row: {
          id: number
          name: string
          description: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          name: string
          description: string | null
          type: string
          status: string
          priority: string
          target_value: number | null
          current_value: number | null
          progress: number | null
          deadline: string | null
          farm_id: number | null
          user_id: string
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          type: string
          status?: string
          priority?: string
          target_value?: number | null
          current_value?: number | null
          progress?: number | null
          deadline?: string | null
          farm_id?: number | null
          user_id: string
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          type?: string
          status?: string
          priority?: string
          target_value?: number | null
          current_value?: number | null
          progress?: number | null
          deadline?: string | null
          farm_id?: number | null
          user_id?: string
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      agent_instructions: {
        Row: {
          id: string
          agent_id: number
          instructions: string
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: number
          instructions: string
          version: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: number
          instructions?: string
          version?: number
          created_at?: string
          updated_at?: string
        }
      }
      agent_command_history: {
        Row: {
          id: string
          agent_id: number
          command: string
          response: string
          executed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: number
          command: string
          response: string
          executed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: number
          command?: string
          response?: string
          executed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      agent_messages: {
        Row: {
          id: string
          agent_id: number
          content: string
          type: string
          source: string
          read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: number
          content: string
          type: string
          source: string
          read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: number
          content?: string
          type?: string
          source?: string
          read?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      agent_knowledge: {
        Row: {
          id: string
          agent_id: number
          topic: string
          content: string
          source: string
          verified: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: number
          topic: string
          content: string
          source: string
          verified?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: number
          topic?: string
          content?: string
          source?: string
          verified?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {}
    Functions: {
      check_table_exists: {
        Args: { table_name: string }
        Returns: boolean
      }
    }
    Enums: {}
    CompositeTypes: {}
  }
}`;
      
      fs.writeFileSync(TYPES_OUTPUT, minimalTypes);
      console.log(`✅ Minimal TypeScript types created at ${TYPES_OUTPUT}`);
    } catch (fallbackError) {
      console.error('Failed to create minimal types:', fallbackError.message);
      throw error;
    }
  }
}

// Main execution
async function main() {
  try {
    // Install pg if not already installed
    try {
      require.resolve('pg');
      console.log('pg module is already installed');
    } catch (e) {
      console.log('Installing pg module...');
      execSync('npm install pg --no-save', { stdio: 'inherit' });
      console.log('✅ pg module installed');
    }
    
    // Execute migrations
    await executeMigrations();
    
    // Generate TypeScript types
    await generateTypes();
    
    console.log('✅ Database setup completed successfully');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
