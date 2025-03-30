#!/usr/bin/env node

/**
 * Database initialization script for Sonic NFT
 * This script creates the required schema and tables for the Sonic NFT application
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Schema definition
const createSchemaSQL = `
-- Create Schema
CREATE SCHEMA IF NOT EXISTS sonic_nft;

-- NFT Metadata Table
CREATE TABLE IF NOT EXISTS sonic_nft.nft_metadata (
  token_id INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  ipfs_uri VARCHAR(255) NOT NULL,
  generator_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  cache_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  revealed BOOLEAN DEFAULT FALSE
);

-- NFT Ownership Table
CREATE TABLE IF NOT EXISTS sonic_nft.nft_ownership (
  id SERIAL PRIMARY KEY,
  token_id INTEGER NOT NULL REFERENCES sonic_nft.nft_metadata(token_id),
  owner_address VARCHAR(42) NOT NULL,
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  transaction_hash VARCHAR(66),
  UNIQUE(token_id)
);

-- Collection Stats Table
CREATE TABLE IF NOT EXISTS sonic_nft.collection_stats (
  id SERIAL PRIMARY KEY,
  total_supply INTEGER NOT NULL DEFAULT 5000,
  minted_count INTEGER NOT NULL DEFAULT 0,
  revealed_count INTEGER NOT NULL DEFAULT 0,
  holder_count INTEGER NOT NULL DEFAULT 0,
  floor_price NUMERIC(20, 18) DEFAULT 0,
  volume_traded NUMERIC(20, 18) DEFAULT 0,
  is_revealed BOOLEAN DEFAULT FALSE,
  reveal_date TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- IPFS Gateway Performance Table
CREATE TABLE IF NOT EXISTS sonic_nft.ipfs_gateways (
  id SERIAL PRIMARY KEY,
  gateway_url VARCHAR(255) NOT NULL,
  response_time_ms INTEGER,
  success_rate FLOAT DEFAULT 0.0,
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(gateway_url)
);

-- Insert default collection stats if not exists
INSERT INTO sonic_nft.collection_stats (id, total_supply, minted_count, is_revealed) 
VALUES (1, 5000, 0, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Insert default IPFS gateways
INSERT INTO sonic_nft.ipfs_gateways (gateway_url, success_rate) VALUES
('https://ipfs.io/ipfs/', 0.9),
('https://cloudflare-ipfs.com/ipfs/', 0.9),
('https://gateway.pinata.cloud/ipfs/', 0.9),
('https://dweb.link/ipfs/', 0.8),
('https://ipfs.fleek.co/ipfs/', 0.8),
('https://gateway.ipfs.io/ipfs/', 0.7)
ON CONFLICT (gateway_url) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS nft_ownership_owner_idx ON sonic_nft.nft_ownership(owner_address);
CREATE INDEX IF NOT EXISTS nft_metadata_generator_idx ON sonic_nft.nft_metadata(generator_type);
`;

// Run initialization
async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database initialization...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Execute schema creation
    await client.query(createSchemaSQL);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Database initialized successfully!');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    client.release();
    // Close pool
    await pool.end();
  }
}

initDatabase().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 