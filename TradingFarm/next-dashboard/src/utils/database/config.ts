/**
 * Database configuration utility
 * IMPORTANT: Never expose API keys in client-side code
 * This file should only be imported in server-side components or API routes
 */

export const PINECONE_CONFIG = {
  apiKey: process.env.PINECONE_API_KEY,
  environment: process.env.PINECONE_ENVIRONMENT || 'gcp-starter',
  // Pinecone index configuration for different data types
  indexes: {
    strategyKnowledge: 'strategy-knowledge',
    agentInstructions: 'agent-instructions',
    elizaCommands: 'eliza-commands'
  },
  // Default dimensions for vector embeddings
  dimensions: 1536, // OpenAI embeddings dimension
};

export const NEON_CONFIG = {
  connectionString: process.env.NEON_CONNECTION_STRING,
  // PostgreSQL schemas for different data domains
  schemas: {
    users: 'users',
    farms: 'farms',
    trading: 'trading',
    wallet: 'wallet'
  }
};
