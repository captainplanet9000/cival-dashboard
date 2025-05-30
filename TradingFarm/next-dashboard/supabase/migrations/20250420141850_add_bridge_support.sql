-- Migration: add_bridge_support
-- Description: Adds tables to support cross-chain asset bridging

-- Create enum for bridge transaction status
CREATE TYPE public.bridge_transaction_status AS ENUM (
  'initiated',
  'pending',
  'completed',
  'failed',
  'cancelled'
);

-- Create enum for bridge provider types
CREATE TYPE public.bridge_provider_type AS ENUM (
  'layerzero',
  'wormhole',
  'sonic_gateway',
  'custom'
);

-- Create table for tracking bridge transactions
CREATE TABLE IF NOT EXISTS public.bridge_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  source_chain TEXT NOT NULL,
  destination_chain TEXT NOT NULL,
  source_asset TEXT NOT NULL,
  destination_asset TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  amount_received NUMERIC,
  fee_amount NUMERIC,
  fee_token TEXT,
  source_tx_hash TEXT,
  destination_tx_hash TEXT,
  provider_type bridge_provider_type NOT NULL,
  status bridge_transaction_status NOT NULL DEFAULT 'initiated',
  source_multisig_id UUID REFERENCES public.farm_vault_multisigs(id),
  destination_multisig_id UUID REFERENCES public.farm_vault_multisigs(id),
  metadata JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for asset mappings across chains
CREATE TABLE IF NOT EXISTS public.chain_asset_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_name TEXT NOT NULL,
  chain_slug TEXT NOT NULL,
  asset_address TEXT NOT NULL,
  asset_symbol TEXT NOT NULL,
  asset_decimals INTEGER NOT NULL,
  asset_icon_url TEXT,
  is_native BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chain_slug, asset_address)
);

-- Create table for bridge provider configurations
CREATE TABLE IF NOT EXISTS public.bridge_provider_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_type bridge_provider_type NOT NULL,
  source_chain TEXT NOT NULL,
  destination_chain TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  config JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider_type, source_chain, destination_chain)
);

-- Add triggers for updated_at
CREATE TRIGGER handle_updated_at_bridge_transactions
BEFORE UPDATE ON public.bridge_transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_chain_asset_mappings
BEFORE UPDATE ON public.chain_asset_mappings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_bridge_provider_configs
BEFORE UPDATE ON public.bridge_provider_configs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add RLS policies
ALTER TABLE public.bridge_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chain_asset_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bridge_provider_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for bridge_transactions
CREATE POLICY "Users can view their own bridge transactions"
ON public.bridge_transactions
FOR SELECT
USING (vault_id IN (
  SELECT v.id FROM public.vaults v
  WHERE v.user_id = auth.uid()
));

CREATE POLICY "Service role can manage all bridge transactions"
ON public.bridge_transactions
USING (auth.role() = 'service_role');

-- Create policies for chain_asset_mappings
CREATE POLICY "Anyone can view active asset mappings"
ON public.chain_asset_mappings
FOR SELECT
USING (is_active = true);

CREATE POLICY "Service role can manage all asset mappings"
ON public.chain_asset_mappings
USING (auth.role() = 'service_role');

-- Create policies for bridge_provider_configs
CREATE POLICY "Anyone can view active bridge provider configs"
ON public.bridge_provider_configs
FOR SELECT
USING (is_active = true);

CREATE POLICY "Service role can manage all bridge provider configs"
ON public.bridge_provider_configs
USING (auth.role() = 'service_role');

-- Insert some initial canonical assets
INSERT INTO public.chain_asset_mappings 
  (canonical_name, chain_slug, asset_address, asset_symbol, asset_decimals, is_native)
VALUES
  -- USDC across chains
  ('USDC', 'evm', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 6, false),
  ('USDC', 'sonic', '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', 'USDC', 6, false),
  ('USDC', 'sui', '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN', 'USDC', 6, false),
  ('USDC', 'solana', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'USDC', 6, false),
  
  -- USDT across chains
  ('USDT', 'evm', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 'USDT', 6, false),
  ('USDT', 'sonic', '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', 'USDT', 6, false),
  ('USDT', 'sui', '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN', 'USDT', 6, false),
  ('USDT', 'solana', 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', 'USDT', 6, false),
  
  -- Native assets
  ('ETH', 'evm', '0x0000000000000000000000000000000000000000', 'ETH', 18, true),
  ('ETH', 'sonic', '0x0000000000000000000000000000000000000000', 'ETH', 18, true),
  ('SUI', 'sui', '0x0000000000000000000000000000000000000000', 'SUI', 9, true),
  ('SOL', 'solana', '0x0000000000000000000000000000000000000000', 'SOL', 9, true),
  
  -- Wrapped native assets
  ('WETH', 'evm', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH', 18, false),
  ('WETH', 'sonic', '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', 'WETH', 18, false),
  ('WSUI', 'sui', '0x0000000000000000000000000000000000000000::sui::SUI', 'WSUI', 9, false),
  ('WSOL', 'solana', 'So11111111111111111111111111111111111111112', 'WSOL', 9, false);

-- Insert initial bridge provider configurations
INSERT INTO public.bridge_provider_configs
  (provider_type, source_chain, destination_chain, priority, config)
VALUES
  -- LayerZero configs
  ('layerzero', 'evm', 'sonic', 1, '{"adapter_params": {"version": 2, "gas_limit": 200000}, "chain_id": {"evm": 1, "sonic": 42161}}'),
  ('layerzero', 'sonic', 'evm', 1, '{"adapter_params": {"version": 2, "gas_limit": 200000}, "chain_id": {"evm": 1, "sonic": 42161}}'),
  
  -- Wormhole configs
  ('wormhole', 'sui', 'solana', 1, '{"chain_id": {"sui": 21, "solana": 1}, "token_bridge": {"sui": "0x5ffa7c6614f88ef55fe21480bc4b4bcf360ea9f85c3d96446c2a14d84c84e2fa", "solana": "wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb"}}'),
  ('wormhole', 'solana', 'sui', 1, '{"chain_id": {"sui": 21, "solana": 1}, "token_bridge": {"sui": "0x5ffa7c6614f88ef55fe21480bc4b4bcf360ea9f85c3d96446c2a14d84c84e2fa", "solana": "wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb"}}'),
  
  -- Sonic Gateway configs
  ('sonic_gateway', 'evm', 'sonic', 2, '{"gateway_address": "0x3ee18B2214AFF97000D974cf647E7C347E8fa585", "outbound_address": "0x0000000000000000000000000000000000000000"}'),
  ('sonic_gateway', 'sonic', 'evm', 2, '{"gateway_address": "0xcEe284F754E854890e311e3280b767F80797180d", "outbound_address": "0x0000000000000000000000000000000000000000"}');
