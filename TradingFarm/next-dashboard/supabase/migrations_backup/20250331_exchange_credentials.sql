-- Migration: Exchange Credentials table
-- This migration creates a table for storing exchange API credentials securely
-- with proper Row Level Security (RLS) policies

-- Create exchange_credentials table
CREATE TABLE IF NOT EXISTS exchange_credentials (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id BIGINT REFERENCES farms(id) ON DELETE SET NULL,
  exchange VARCHAR(50) NOT NULL,
  api_key VARCHAR(255) NOT NULL,
  api_secret TEXT NOT NULL, -- Encrypted, never stored in plain text
  additional_params JSONB, -- For exchange-specific parameters (passphrase, wallet address, etc.)
  is_testnet BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Each user can only have one default credential per exchange
  UNIQUE(user_id, exchange, is_default),
  
  -- Ensure API keys are unique per user and exchange
  UNIQUE(user_id, exchange, api_key)
);

-- Add triggers for timestamps
CREATE TRIGGER handle_updated_at_exchange_credentials
  BEFORE UPDATE ON exchange_credentials
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE exchange_credentials ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own credentials
CREATE POLICY "Users can view their own exchange credentials"
  ON exchange_credentials
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own credentials
CREATE POLICY "Users can insert their own exchange credentials"
  ON exchange_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own credentials
CREATE POLICY "Users can update their own exchange credentials"
  ON exchange_credentials
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to delete their own credentials
CREATE POLICY "Users can delete their own exchange credentials"
  ON exchange_credentials
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create farm-credential associations table for shared credentials
CREATE TABLE IF NOT EXISTS farm_exchange_credentials (
  id BIGSERIAL PRIMARY KEY,
  farm_id BIGINT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  credential_id BIGINT NOT NULL REFERENCES exchange_credentials(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure a credential is only associated with a farm once
  UNIQUE(farm_id, credential_id)
);

-- Add triggers for timestamps
CREATE TRIGGER handle_created_at_farm_exchange_credentials
  BEFORE INSERT ON farm_exchange_credentials
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_created_at();

-- Enable Row Level Security
ALTER TABLE farm_exchange_credentials ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view farm credential associations they own
CREATE POLICY "Users can view farm credential associations they own"
  ON farm_exchange_credentials
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = farm_exchange_credentials.farm_id
    AND farms.user_id = auth.uid()
  ));

-- Create policy for users to insert farm credential associations they own
CREATE POLICY "Users can insert farm credential associations they own"
  ON farm_exchange_credentials
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = NEW.farm_id
    AND farms.user_id = auth.uid()
  ));

-- Create policy for users to delete farm credential associations they own
CREATE POLICY "Users can delete farm credential associations they own"
  ON farm_exchange_credentials
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = farm_exchange_credentials.farm_id
    AND farms.user_id = auth.uid()
  ));
