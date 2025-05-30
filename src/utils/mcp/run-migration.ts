import fs from 'fs';
import path from 'path';
import { getSupabaseMcpClient } from './supabase-mcp-client';

export async function runMigration(migrationFile: string) {
  try {
    const client = getSupabaseMcpClient();
    
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'src', 'migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    const result = await client.runMigration(sql);
    
    if (!result.success) {
      throw new Error(`Migration failed: ${result.error}`);
    }
    
    console.log('Migration completed successfully');
    return result;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
} 