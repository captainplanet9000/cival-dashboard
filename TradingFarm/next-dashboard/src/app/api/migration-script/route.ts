import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20250330_create_trading_farm_schema.sql');
    const migrationSql = await fs.promises.readFile(migrationPath, 'utf8');
    
    // Return the migration SQL
    return new NextResponse(migrationSql, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error reading migration file:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to read migration file' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
