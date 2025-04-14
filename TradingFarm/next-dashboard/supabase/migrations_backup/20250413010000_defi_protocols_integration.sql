-- Migration: DeFi Protocol Integration
-- Creates tables for DeFi protocol integration, including supported protocols,
-- transaction tracking, and smart contract interactions

-- Create type for DeFi protocol interaction status
CREATE TYPE public.defi_interaction_status AS ENUM (
  'pending', 'submitted', 'confirmed', 'failed', 'reverted', 'expired'
);

-- Create type for DeFi protocol types
CREATE TYPE public.defi_protocol_type AS ENUM (
  'dex', 'lending', 'yield', 'options', 'derivatives', 'insurance', 'staking'
);

-- Create table for supported DeFi protocols
CREATE TABLE IF NOT EXISTS public.defi_protocols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type defi_protocol_type NOT NULL,
  chain_id INTEGER NOT NULL,
  contract_address TEXT,
  abi JSONB,
  logo_url TEXT,
  description TEXT,
  module_path TEXT, -- Path to the protocol integration module
  is_active BOOLEAN DEFAULT TRUE,
  parameters JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Each protocol must have a unique name per chain
  UNIQUE(name, chain_id)
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_defi_protocols
BEFORE UPDATE ON public.defi_protocols
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.defi_protocols ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing protocols
CREATE POLICY "Anyone can view defi protocols"
ON public.defi_protocols
FOR SELECT
USING (true);

-- Only admins can modify protocols
CREATE POLICY "Admins can manage defi protocols"
ON public.defi_protocols
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Create table for DeFi transaction tracking
CREATE TABLE IF NOT EXISTS public.defi_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  protocol_id UUID NOT NULL REFERENCES public.defi_protocols(id),
  wallet_address TEXT NOT NULL,
  transaction_hash TEXT,
  function_name TEXT NOT NULL,
  function_args JSONB NOT NULL,
  value_wei NUMERIC DEFAULT 0,
  gas_price_gwei NUMERIC,
  gas_limit NUMERIC,
  gas_used NUMERIC,
  status defi_interaction_status NOT NULL DEFAULT 'pending',
  block_number INTEGER,
  error_message TEXT,
  result JSONB,
  receipt JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_defi_transactions
BEFORE UPDATE ON public.defi_transactions
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.defi_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own transactions
CREATE POLICY "Users can view their own defi transactions"
ON public.defi_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy for users to insert their own transactions
CREATE POLICY "Users can insert their own defi transactions"
ON public.defi_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own transactions
CREATE POLICY "Users can update their own defi transactions"
ON public.defi_transactions
FOR UPDATE
USING (auth.uid() = user_id);

-- Create table for DeFi positions (liquidity, staking, lending, etc.)
CREATE TABLE IF NOT EXISTS public.defi_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  protocol_id UUID NOT NULL REFERENCES public.defi_protocols(id),
  position_type TEXT NOT NULL, -- 'liquidity', 'lending', 'borrowing', 'staking', etc.
  token_address TEXT,
  token_symbol TEXT,
  amount NUMERIC NOT NULL,
  entry_price_usd NUMERIC,
  current_price_usd NUMERIC,
  unrealized_pnl_usd NUMERIC,
  health_factor NUMERIC, -- For lending positions
  liquidation_price NUMERIC, -- If applicable
  collateral_ratio NUMERIC, -- If applicable
  apr_percent NUMERIC,
  start_transaction_id UUID REFERENCES public.defi_transactions(id),
  end_transaction_id UUID REFERENCES public.defi_transactions(id),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_defi_positions
BEFORE UPDATE ON public.defi_positions
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.defi_positions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own positions
CREATE POLICY "Users can view their own defi positions"
ON public.defi_positions
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy for users to manage their own positions
CREATE POLICY "Users can manage their own defi positions"
ON public.defi_positions
FOR ALL
USING (auth.uid() = user_id);

-- Insert initial supported protocols
INSERT INTO public.defi_protocols (name, type, chain_id, contract_address, description, parameters)
VALUES
  ('Uniswap V3', 'dex', 1, '0x1F98431c8aD98523631AE4a59f267346ea31F984', 'Uniswap V3 automated market maker with concentrated liquidity', 
   '{"fee_tiers": [100, 500, 3000, 10000], "version": "3.0.0", "factory_address": "0x1F98431c8aD98523631AE4a59f267346ea31F984", "router_address": "0xE592427A0AEce92De3Edee1F18E0157C05861564"}'::jsonb),
  
  ('Aave V3', 'lending', 1, '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', 'Aave V3 lending and borrowing protocol', 
   '{"version": "3.0.0", "pool_address": "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2", "data_provider": "0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3"}'::jsonb),
  
  ('Compound V3', 'lending', 1, '0xc3d688B66703497DAA19211EEdff47f25384cdc3', 'Compound V3 (Comet) lending and borrowing protocol', 
   '{"version": "3.0.0", "configurator": "0x316f9708bB98af7dA9c68C1C3b5e79039cD336E3"}'::jsonb),
  
  ('Curve Finance', 'dex', 1, '0xB9fC157394Af804a3578134A6585C0dc9cc990d4', 'Curve Finance stablecoin exchange', 
   '{"factory_address": "0xB9fC157394Af804a3578134A6585C0dc9cc990d4", "registry_address": "0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5"}'::jsonb),
  
  ('Balancer V2', 'dex', 1, '0xBA12222222228d8Ba445958a75a0704d566BF2C8', 'Balancer V2 flexible AMM protocol', 
   '{"version": "2.0.0", "vault_address": "0xBA12222222228d8Ba445958a75a0704d566BF2C8"}'::jsonb)
ON CONFLICT (name, chain_id) DO NOTHING;

-- Create function to track DeFi transaction
CREATE OR REPLACE FUNCTION public.create_defi_transaction(
  p_farm_id UUID,
  p_agent_id UUID,
  p_protocol_id UUID,
  p_wallet_address TEXT,
  p_function_name TEXT,
  p_function_args JSONB,
  p_value_wei NUMERIC DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  INSERT INTO public.defi_transactions (
    farm_id,
    agent_id,
    protocol_id,
    wallet_address,
    function_name,
    function_args,
    value_wei,
    status,
    user_id
  )
  VALUES (
    p_farm_id,
    p_agent_id,
    p_protocol_id,
    p_wallet_address,
    p_function_name,
    p_function_args,
    p_value_wei,
    'pending',
    auth.uid()
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Create function to update DeFi transaction status
CREATE OR REPLACE FUNCTION public.update_defi_transaction_status(
  p_transaction_id UUID,
  p_status defi_interaction_status,
  p_transaction_hash TEXT DEFAULT NULL,
  p_block_number INTEGER DEFAULT NULL,
  p_gas_used NUMERIC DEFAULT NULL,
  p_receipt JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_result JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.defi_transactions
  SET
    status = p_status,
    transaction_hash = COALESCE(p_transaction_hash, transaction_hash),
    block_number = COALESCE(p_block_number, block_number),
    gas_used = COALESCE(p_gas_used, gas_used),
    receipt = COALESCE(p_receipt, receipt),
    error_message = COALESCE(p_error_message, error_message),
    result = COALESCE(p_result, result),
    updated_at = NOW()
  WHERE
    id = p_transaction_id
    AND (auth.uid() = user_id OR 
         EXISTS (SELECT 1 FROM farms WHERE farms.id = farm_id AND farms.owner_id = auth.uid()));
  
  RETURN FOUND;
END;
$$;
