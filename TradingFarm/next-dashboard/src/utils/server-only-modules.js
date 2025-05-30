'use server';

/**
 * This file contains server-only imports and exports to prevent client-side 
 * errors with Node.js modules like fs, path, etc.
 * 
 * IMPORTANT: Only import this file in server components or API routes.
 */

// Re-export Pinecone client for server components
export async function getPineconeClient() {
  // Dynamic import to ensure it only loads on the server
  const { PineconeClient } = await import('@pinecone-database/pinecone');
  
  const client = new PineconeClient();
  await client.init({
    apiKey: process.env.PINECONE_API_KEY || '',
    environment: process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp',
  });
  
  return client;
}

// Re-export Neon PostgreSQL client for server components
export async function getNeonClient() {
  // Dynamic import to ensure it only loads on the server
  const { Client } = await import('pg');
  
  const client = new Client({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
  
  // Connect to the database
  await client.connect();
  
  return client;
}

// Example method for running a query on the Neon database
export async function runNeonQuery(query, params = []) {
  const client = await getNeonClient();
  try {
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Create a mock database client for client components to use
export const createMockDatabaseClient = () => {
  return {
    getAgent: async (id) => ({ id, name: 'Mock Agent', status: 'active' }),
    getAgents: async () => [{ id: 'agent-1', name: 'Mock Agent', status: 'active' }],
    getFarms: async () => [{ id: 'farm-1', name: 'Mock Farm', status: 'active' }],
    getAgentTrades: async () => [],
    // Add other methods as needed
  };
};
