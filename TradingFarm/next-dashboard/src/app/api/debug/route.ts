import { NextResponse } from 'next/server';
import { Client } from 'pg';

/**
 * Debug endpoint for verifying database connection and API functionality
 */
export async function GET() {
  // Environment check
  const environment = {
    nodeEnv: process.env.NODE_ENV,
    dbUrlProvided: !!process.env.NEON_DATABASE_URL,
    // Don't include the actual connection string for security
  };

  // Database connection test
  let dbConnection = { success: false, message: '', error: '' };
  
  try {
    const client = new Client({
      connectionString: process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_bzh81tQOZMIJ@ep-gentle-silence-a5h1nd5p-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    await client.connect();
    const result = await client.query('SELECT NOW() as time');
    
    dbConnection = {
      success: true,
      message: `Connected successfully at ${result.rows[0].time}`,
      error: ''
    };
    
    await client.end();
  } catch (error) {
    dbConnection = {
      success: false,
      message: '',
      error: error instanceof Error ? error.message : String(error)
    };
  }

  // API route check
  const apiRoutes = {
    health: '/api/health',
    farms: '/api/farm-management/farms',
    stats: '/api/farm-management/stats',
    messageBus: '/api/farm-management/message-bus',
  };

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment,
    dbConnection,
    apiRoutes,
    serverInfo: {
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
    }
  });
}
