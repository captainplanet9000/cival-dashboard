-- Create schema for the Sonic NFT collection
CREATE SCHEMA IF NOT EXISTS sonic_nft;

-- Table for NFT metadata caching
CREATE TABLE IF NOT EXISTS sonic_nft.metadata (
  token_id INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_uri TEXT,
  external_url TEXT,
  animation_url TEXT,
  background_color VARCHAR(7),
  is_revealed BOOLEAN DEFAULT FALSE,
  ipfs_uri TEXT,
  raw_metadata JSONB,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for collection statistics
CREATE TABLE IF NOT EXISTS sonic_nft.collection_stats (
  id INTEGER PRIMARY KEY DEFAULT 1, -- Only one row expected
  total_supply INTEGER NOT NULL,
  minted_count INTEGER DEFAULT 0,
  revealed_count INTEGER DEFAULT 0,
  holder_count INTEGER DEFAULT 0,
  floor_price NUMERIC(20, 9) DEFAULT 0,
  volume_traded NUMERIC(20, 9) DEFAULT 0,
  is_revealed BOOLEAN DEFAULT FALSE,
  reveal_date TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for tracking ownership
CREATE TABLE IF NOT EXISTS sonic_nft.ownership (
  id SERIAL PRIMARY KEY,
  token_id INTEGER NOT NULL,
  owner_address VARCHAR(42) NOT NULL,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  transaction_hash VARCHAR(66),
  UNIQUE(token_id),
  CONSTRAINT fk_token FOREIGN KEY(token_id) REFERENCES sonic_nft.metadata(token_id) ON DELETE CASCADE
);

-- Table for IPFS gateways and fallbacks
CREATE TABLE IF NOT EXISTS sonic_nft.ipfs_gateways (
  id SERIAL PRIMARY KEY,
  gateway_url TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 1,
  last_checked TIMESTAMP,
  status VARCHAR(20) DEFAULT 'unknown',
  average_response_time INTEGER -- in milliseconds
);

-- Table for user minting activity
CREATE TABLE IF NOT EXISTS sonic_nft.minting_activity (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  token_id INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  transaction_hash VARCHAR(66),
  status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed
  gas_used NUMERIC(20, 0),
  gas_price NUMERIC(20, 0)
);

-- Insert initial collection stats
INSERT INTO sonic_nft.collection_stats (id, total_supply, reveal_date)
VALUES (1, 5000, CURRENT_TIMESTAMP + INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- Insert default IPFS gateways
INSERT INTO sonic_nft.ipfs_gateways (gateway_url, priority) VALUES
('https://nftstorage.link/ipfs/', 1),
('https://cloudflare-ipfs.com/ipfs/', 2),
('https://ipfs.io/ipfs/', 3),
('https://gateway.pinata.cloud/ipfs/', 4),
('https://ipfs.fleek.co/ipfs/', 5),
('https://dweb.link/ipfs/', 6),
('https://ipfs.infura.io/ipfs/', 7),
('https://gateway.ipfs.io/ipfs/', 8)
ON CONFLICT (gateway_url) DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ownership_owner ON sonic_nft.ownership(owner_address);
CREATE INDEX IF NOT EXISTS idx_metadata_revealed ON sonic_nft.metadata(is_revealed);
CREATE INDEX IF NOT EXISTS idx_minting_wallet ON sonic_nft.minting_activity(wallet_address);

-- Create function to update last_updated timestamp automatically
CREATE OR REPLACE FUNCTION sonic_nft.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.last_updated = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for metadata
CREATE TRIGGER update_metadata_timestamp
BEFORE UPDATE ON sonic_nft.metadata
FOR EACH ROW
EXECUTE FUNCTION sonic_nft.update_timestamp();

-- Create trigger for collection_stats
CREATE TRIGGER update_collection_stats_timestamp
BEFORE UPDATE ON sonic_nft.collection_stats
FOR EACH ROW
EXECUTE FUNCTION sonic_nft.update_timestamp();

-- Insert test data for development (uncomment for testing)
/*
-- Insert a few test metadata records
INSERT INTO sonic_nft.metadata (token_id, name, description, is_revealed)
VALUES 
(0, 'Sonic NFT #0', 'Sonic NFT is a collection of generative art pieces.', false),
(1, 'Sonic NFT #1', 'Sonic NFT is a collection of generative art pieces.', false),
(2, 'Sonic NFT #2', 'Sonic NFT is a collection of generative art pieces.', false)
ON CONFLICT (token_id) DO NOTHING;

-- Insert test ownership records
INSERT INTO sonic_nft.ownership (token_id, owner_address, transaction_hash)
VALUES 
(0, '0x1234567890123456789012345678901234567890', '0x1234567890123456789012345678901234567890123456789012345678901234'),
(1, '0x1234567890123456789012345678901234567890', '0x2345678901234567890123456789012345678901234567890123456789012345'),
(2, '0x2345678901234567890123456789012345678901', '0x3456789012345678901234567890123456789012345678901234567890123456')
ON CONFLICT (token_id) DO NOTHING;

-- Update collection stats for test data
UPDATE sonic_nft.collection_stats
SET 
  minted_count = 3,
  holder_count = 2
WHERE id = 1;
*/ 