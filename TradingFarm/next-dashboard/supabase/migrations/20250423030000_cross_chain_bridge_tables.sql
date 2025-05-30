-- Migration for cross-chain bridge infrastructure
-- Part of Trading Farm's Cross-Chain Liquidity Management (Phase 1)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for storing asset mappings across different chains
CREATE TABLE IF NOT EXISTS public.chain_asset_mappings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_name varchar(100) NOT NULL, -- Common asset name (e.g. "Ethereum")
  chain_slug varchar(50) NOT NULL, -- Chain identifier (e.g. "ethereum", "arbitrum")
  asset_address varchar(255) NOT NULL, -- Contract address on the specific chain
  asset_symbol varchar(20) NOT NULL, -- Symbol on the specific chain
  asset_decimals integer NOT NULL, -- Decimals for the asset
  asset_icon_url text, -- URL to asset icon
  is_native boolean NOT NULL DEFAULT false, -- Whether this is the chain's native asset
  is_active boolean NOT NULL DEFAULT true, -- Whether this asset mapping is active
  metadata jsonb, -- Additional metadata for the asset
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for looking up assets by canonical name and chain
CREATE INDEX IF NOT EXISTS idx_chain_asset_mappings_canonical_chain
ON public.chain_asset_mappings(canonical_name, chain_slug);

-- Create index for looking up assets by chain and address
CREATE INDEX IF NOT EXISTS idx_chain_asset_mappings_chain_address
ON public.chain_asset_mappings(chain_slug, asset_address);

-- Add comment for the chain_asset_mappings table
COMMENT ON TABLE public.chain_asset_mappings IS 'Maps assets across different chains for cross-chain operations';

-- Table for storing bridge provider configurations
CREATE TABLE IF NOT EXISTS public.bridge_provider_configs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_type varchar(50) NOT NULL, -- layerzero, wormhole, sonic_gateway, debridge, etc.
  source_chain varchar(50) NOT NULL, -- Source chain identifier
  destination_chain varchar(50) NOT NULL, -- Destination chain identifier
  priority integer NOT NULL DEFAULT 1, -- Priority for this provider (lower is higher priority)
  config jsonb NOT NULL DEFAULT '{}'::jsonb, -- Provider-specific configuration
  is_active boolean NOT NULL DEFAULT true, -- Whether this provider is active
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create unique index for provider configs
CREATE UNIQUE INDEX IF NOT EXISTS idx_bridge_provider_configs_unique
ON public.bridge_provider_configs(provider_type, source_chain, destination_chain);

-- Create index for getting active providers for a route
CREATE INDEX IF NOT EXISTS idx_bridge_provider_configs_route
ON public.bridge_provider_configs(source_chain, destination_chain, is_active);

-- Add comment for the bridge_provider_configs table
COMMENT ON TABLE public.bridge_provider_configs IS 'Configuration for cross-chain bridge providers';

-- Table for storing cross-chain bridge transactions
CREATE TABLE IF NOT EXISTS public.bridge_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_id BIGINT NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  source_chain varchar(50) NOT NULL,
  destination_chain varchar(50) NOT NULL,
  source_asset varchar(255) NOT NULL, -- Asset address on source chain
  destination_asset varchar(255) NOT NULL, -- Asset address on destination chain
  amount varchar(78) NOT NULL, -- Amount to bridge (decimal string)
  amount_received varchar(78), -- Amount received after bridging (decimal string)
  fee_amount varchar(78), -- Fee paid for the bridge (decimal string)
  fee_token varchar(50), -- Token in which the fee was paid
  source_tx_hash varchar(255), -- Transaction hash on the source chain
  destination_tx_hash varchar(255), -- Transaction hash on the destination chain
  provider_type varchar(50) NOT NULL, -- Provider used for the bridge
  status varchar(20) NOT NULL DEFAULT 'initiated', -- initiated, pending, completed, failed, cancelled
  source_multisig_id uuid, -- Source chain multisig wallet
  destination_multisig_id uuid, -- Destination chain multisig wallet
  metadata jsonb, -- Additional metadata
  error_message text, -- Error message if the bridge failed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for querying bridge transactions
CREATE INDEX IF NOT EXISTS idx_bridge_transactions_vault_id
ON public.bridge_transactions(vault_id);

CREATE INDEX IF NOT EXISTS idx_bridge_transactions_status
ON public.bridge_transactions(status);

CREATE INDEX IF NOT EXISTS idx_bridge_transactions_chains
ON public.bridge_transactions(source_chain, destination_chain);

-- Add comment for the bridge_transactions table
COMMENT ON TABLE public.bridge_transactions IS 'Records of cross-chain bridge transactions';

-- Create function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at column
DROP TRIGGER IF EXISTS trigger_chain_asset_mappings_updated_at ON public.chain_asset_mappings;
CREATE TRIGGER trigger_chain_asset_mappings_updated_at
BEFORE UPDATE ON public.chain_asset_mappings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_bridge_provider_configs_updated_at ON public.bridge_provider_configs;
CREATE TRIGGER trigger_bridge_provider_configs_updated_at
BEFORE UPDATE ON public.bridge_provider_configs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_bridge_transactions_updated_at ON public.bridge_transactions;
CREATE TRIGGER trigger_bridge_transactions_updated_at
BEFORE UPDATE ON public.bridge_transactions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Seed some initial canonical assets for cross-chain bridging
INSERT INTO public.chain_asset_mappings (canonical_name, chain_slug, asset_address, asset_symbol, asset_decimals, is_native)
VALUES
  -- Ethereum assets
  ('Ether', 'ethereum', '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', 'ETH', 18, true),
  ('USD Coin', 'ethereum', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 6, false),
  ('Tether', 'ethereum', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 'USDT', 6, false),
  ('Dai', 'ethereum', '0x6B175474E89094C44Da98b954EedeAC495271d0F', 'DAI', 18, false),
  ('Wrapped Bitcoin', 'ethereum', '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 'WBTC', 8, false),
  
  -- Arbitrum assets
  ('Ether', 'arbitrum', '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', 'ETH', 18, true),
  ('USD Coin', 'arbitrum', '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', 'USDC', 6, false),
  ('Tether', 'arbitrum', '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', 'USDT', 6, false),
  ('Dai', 'arbitrum', '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', 'DAI', 18, false),
  ('Wrapped Bitcoin', 'arbitrum', '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', 'WBTC', 8, false),
  
  -- Base assets
  ('Ether', 'base', '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', 'ETH', 18, true),
  ('USD Coin', 'base', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 'USDC', 6, false),
  ('Dai', 'base', '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', 'DAI', 18, false),
  
  -- Sonic chain assets (example values, replace with actual addresses)
  ('Sonic', 'sonic', '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', 'SONIC', 18, true),
  ('USD Coin', 'sonic', '0x1234567890123456789012345678901234567890', 'USDC', 6, false)
ON CONFLICT DO NOTHING;

-- Seed initial bridge provider configurations
INSERT INTO public.bridge_provider_configs (provider_type, source_chain, destination_chain, priority, config)
VALUES
  -- LayerZero configurations
  ('layerzero', 'ethereum', 'arbitrum', 1, '{"gas_limit": 200000, "adapter_params": "0x"}'::jsonb),
  ('layerzero', 'arbitrum', 'ethereum', 1, '{"gas_limit": 200000, "adapter_params": "0x"}'::jsonb),
  ('layerzero', 'ethereum', 'base', 1, '{"gas_limit": 250000, "adapter_params": "0x"}'::jsonb),
  ('layerzero', 'base', 'ethereum', 1, '{"gas_limit": 250000, "adapter_params": "0x"}'::jsonb),
  ('layerzero', 'arbitrum', 'base', 1, '{"gas_limit": 200000, "adapter_params": "0x"}'::jsonb),
  ('layerzero', 'base', 'arbitrum', 1, '{"gas_limit": 200000, "adapter_params": "0x"}'::jsonb),
  
  -- Wormhole configurations
  ('wormhole', 'ethereum', 'arbitrum', 2, '{"relayer_fee_amount": "0.001", "relayer_fee_token": "ETH"}'::jsonb),
  ('wormhole', 'arbitrum', 'ethereum', 2, '{"relayer_fee_amount": "0.001", "relayer_fee_token": "ETH"}'::jsonb),
  ('wormhole', 'ethereum', 'base', 2, '{"relayer_fee_amount": "0.001", "relayer_fee_token": "ETH"}'::jsonb),
  ('wormhole', 'base', 'ethereum', 2, '{"relayer_fee_amount": "0.001", "relayer_fee_token": "ETH"}'::jsonb),
  
  -- Sonic Gateway configurations (specialized for Sonic integration)
  ('sonic_gateway', 'ethereum', 'sonic', 1, '{"verification_blocks": 12, "slippage_tolerance": 0.5}'::jsonb),
  ('sonic_gateway', 'sonic', 'ethereum', 1, '{"verification_blocks": 3, "slippage_tolerance": 0.5}'::jsonb),
  ('sonic_gateway', 'arbitrum', 'sonic', 1, '{"verification_blocks": 5, "slippage_tolerance": 0.5}'::jsonb),
  ('sonic_gateway', 'sonic', 'arbitrum', 1, '{"verification_blocks": 3, "slippage_tolerance": 0.5}'::jsonb),
  
  -- New deBridge configurations
  ('debridge', 'ethereum', 'arbitrum', 1, '{"execution_fee_multiplier": 1.1, "referrer_address": ""}'::jsonb),
  ('debridge', 'arbitrum', 'ethereum', 1, '{"execution_fee_multiplier": 1.1, "referrer_address": ""}'::jsonb),
  ('debridge', 'ethereum', 'base', 1, '{"execution_fee_multiplier": 1.1, "referrer_address": ""}'::jsonb),
  ('debridge', 'base', 'ethereum', 1, '{"execution_fee_multiplier": 1.1, "referrer_address": ""}'::jsonb),
  ('debridge', 'arbitrum', 'base', 1, '{"execution_fee_multiplier": 1.1, "referrer_address": ""}'::jsonb),
  ('debridge', 'base', 'arbitrum', 1, '{"execution_fee_multiplier": 1.1, "referrer_address": ""}'::jsonb)
ON CONFLICT DO NOTHING;

-- Enable Row-Level Security
ALTER TABLE public.chain_asset_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bridge_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bridge_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for chain_asset_mappings
CREATE POLICY "Anyone can read chain_asset_mappings" ON public.chain_asset_mappings FOR SELECT USING (true);
CREATE POLICY "Service roles can insert chain_asset_mappings" ON public.chain_asset_mappings FOR INSERT WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
);
CREATE POLICY "Service roles can update chain_asset_mappings" ON public.chain_asset_mappings FOR UPDATE USING (
  auth.jwt() ->> 'role' = 'service_role'
);
CREATE POLICY "Service roles can delete chain_asset_mappings" ON public.chain_asset_mappings FOR DELETE USING (
  auth.jwt() ->> 'role' = 'service_role'
);

-- Create policies for bridge_provider_configs
CREATE POLICY "Anyone can read bridge_provider_configs" ON public.bridge_provider_configs FOR SELECT USING (true);
CREATE POLICY "Service roles can insert bridge_provider_configs" ON public.bridge_provider_configs FOR INSERT WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
);
CREATE POLICY "Service roles can update bridge_provider_configs" ON public.bridge_provider_configs FOR UPDATE USING (
  auth.jwt() ->> 'role' = 'service_role'
);
CREATE POLICY "Service roles can delete bridge_provider_configs" ON public.bridge_provider_configs FOR DELETE USING (
  auth.jwt() ->> 'role' = 'service_role'
);

-- Create policies for bridge_transactions
CREATE POLICY "Authenticated users can read their bridge_transactions" ON public.bridge_transactions FOR SELECT USING (
  auth.uid() IS NOT NULL 
);

CREATE POLICY "Authenticated users can create bridge_transactions" ON public.bridge_transactions FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can update their bridge_transactions" ON public.bridge_transactions FOR UPDATE USING (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Service roles can read all bridge_transactions" ON public.bridge_transactions FOR SELECT USING (
  auth.jwt() ->> 'role' = 'service_role'
);

CREATE POLICY "Service roles can update all bridge_transactions" ON public.bridge_transactions FOR UPDATE USING (
  auth.jwt() ->> 'role' = 'service_role'
);

-- Create function to log bridge transaction status changes
CREATE OR REPLACE FUNCTION log_bridge_transaction_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the status change in the system
  RAISE NOTICE 'Bridge transaction % status changed from % to %', 
              NEW.id, OLD.status, NEW.status;
              
  -- In a full implementation, you might add code here to:
  -- 1. Insert into a notifications table if it exists
  -- 2. Trigger a webhook to an external notification system
  -- 3. Log the event to another tracking table
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bridge transaction status changes
DROP TRIGGER IF EXISTS trigger_bridge_transaction_status_change ON public.bridge_transactions;
CREATE TRIGGER trigger_bridge_transaction_status_change
AFTER UPDATE ON public.bridge_transactions
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION log_bridge_transaction_status_change();
