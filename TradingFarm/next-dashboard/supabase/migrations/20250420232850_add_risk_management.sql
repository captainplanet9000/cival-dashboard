-- Migration: add_risk_management
-- Description: Adds tables to support cross-chain risk management and policy enforcement

-- Create enum for risk rule types
CREATE TYPE public.risk_rule_type AS ENUM (
  'max_position_size',
  'max_transaction_size',
  'max_daily_volume',
  'max_leverage',
  'min_collateral_ratio',
  'allowed_asset_list',
  'blocked_asset_list',
  'allowed_protocol_list',
  'blocked_protocol_list',
  'max_drawdown',
  'max_position_concentration',
  'max_chain_allocation'
);

-- Create table for risk parameters
CREATE TABLE IF NOT EXISTS public.risk_parameters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  applies_to TEXT NOT NULL, -- 'global', 'vault', 'agent', 'strategy'
  entity_id UUID, -- Optional, null for global parameters
  rule_type risk_rule_type NOT NULL,
  chain_slug TEXT, -- Optional, null for all chains
  parameters JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100, -- Higher priority rules override lower ones
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(applies_to, entity_id, rule_type, chain_slug) WHERE entity_id IS NOT NULL AND chain_slug IS NOT NULL
);

-- Create table for position snapshots
CREATE TABLE IF NOT EXISTS public.position_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  chain_slug TEXT NOT NULL,
  asset_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  usd_value NUMERIC NOT NULL,
  protocol TEXT,
  position_type TEXT NOT NULL, -- 'spot', 'derivative', 'loan', 'supply', 'borrow'
  source_data JSONB,
  snapshot_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for risk events (violations, warnings, etc.)
CREATE TABLE IF NOT EXISTS public.risk_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  chain_slug TEXT,
  event_type TEXT NOT NULL, -- 'rule_violation', 'warning', 'auto_enforcement', 'manual_override'
  risk_parameter_id UUID REFERENCES public.risk_parameters(id),
  description TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  related_transaction_id UUID,
  metadata JSONB,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for signing keys
CREATE TABLE IF NOT EXISTS public.signing_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_name TEXT NOT NULL,
  chain_slug TEXT NOT NULL,
  key_type TEXT NOT NULL, -- 'hsm', 'mpc', 'local_encrypted'
  public_key TEXT NOT NULL,
  metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chain_slug, public_key)
);

-- Create table for multisig policy templates
CREATE TABLE IF NOT EXISTS public.multisig_policy_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  chain_slug TEXT NOT NULL,
  multisig_type TEXT NOT NULL, -- 'safe', 'msafe', 'squads'
  policy_template JSONB NOT NULL, -- Chain-specific policy structure
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add triggers for updated_at
CREATE TRIGGER handle_updated_at_risk_parameters
BEFORE UPDATE ON public.risk_parameters
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_risk_events
BEFORE UPDATE ON public.risk_events
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_signing_keys
BEFORE UPDATE ON public.signing_keys
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_multisig_policy_templates
BEFORE UPDATE ON public.multisig_policy_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add RLS policies
ALTER TABLE public.risk_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signing_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multisig_policy_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for risk_parameters
CREATE POLICY "Anyone can view active risk parameters"
ON public.risk_parameters
FOR SELECT
USING (is_active = true);

CREATE POLICY "Users can view their own vault risk parameters"
ON public.risk_parameters
FOR SELECT
USING (
  applies_to = 'vault' AND 
  entity_id IN (SELECT v.id FROM public.vaults v WHERE v.user_id = auth.uid())
);

CREATE POLICY "Service role can manage all risk parameters"
ON public.risk_parameters
USING (auth.role() = 'service_role');

-- Create policies for position_snapshots
CREATE POLICY "Users can view their own position snapshots"
ON public.position_snapshots
FOR SELECT
USING (vault_id IN (
  SELECT v.id FROM public.vaults v
  WHERE v.user_id = auth.uid()
));

CREATE POLICY "Service role can manage all position snapshots"
ON public.position_snapshots
USING (auth.role() = 'service_role');

-- Create policies for risk_events
CREATE POLICY "Users can view their own risk events"
ON public.risk_events
FOR SELECT
USING (vault_id IN (
  SELECT v.id FROM public.vaults v
  WHERE v.user_id = auth.uid()
));

CREATE POLICY "Service role can manage all risk events"
ON public.risk_events
USING (auth.role() = 'service_role');

-- Create policies for signing_keys
CREATE POLICY "Service role can manage all signing keys"
ON public.signing_keys
USING (auth.role() = 'service_role');

-- Create policies for multisig_policy_templates
CREATE POLICY "Anyone can view active policy templates"
ON public.multisig_policy_templates
FOR SELECT
USING (is_active = true);

CREATE POLICY "Service role can manage all policy templates"
ON public.multisig_policy_templates
USING (auth.role() = 'service_role');

-- Insert some initial global risk parameters
INSERT INTO public.risk_parameters 
  (name, description, applies_to, rule_type, parameters, is_active, priority)
VALUES
  ('Global Max Position Size', 'Maximum total position size across all chains', 'global', 'max_position_size', 
   '{"max_usd_value": 500000, "enforcement": "hard_limit"}', true, 1000),
   
  ('Global Max Transaction Size', 'Maximum transaction size across all chains', 'global', 'max_transaction_size', 
   '{"max_usd_value": 100000, "enforcement": "approval_required"}', true, 1000),
   
  ('Global Max Daily Volume', 'Maximum daily trading volume across all chains', 'global', 'max_daily_volume', 
   '{"max_usd_value": 1000000, "enforcement": "notification"}', true, 1000),
   
  ('Global Max Leverage', 'Maximum leverage for any position', 'global', 'max_leverage', 
   '{"max_leverage": 5, "enforcement": "hard_limit"}', true, 1000),
   
  ('Global Blocked Asset List', 'Assets that cannot be traded across any chain', 'global', 'blocked_asset_list', 
   '{"assets": [], "enforcement": "hard_limit"}', true, 1000);

-- Insert chain-specific risk parameters
INSERT INTO public.risk_parameters 
  (name, description, applies_to, rule_type, chain_slug, parameters, is_active, priority)
VALUES
  ('EVM Max Position Size', 'Maximum position size on EVM chains', 'global', 'max_position_size', 'evm',
   '{"max_usd_value": 250000, "enforcement": "hard_limit"}', true, 900),
   
  ('Solana Max Position Size', 'Maximum position size on Solana', 'global', 'max_position_size', 'solana',
   '{"max_usd_value": 150000, "enforcement": "hard_limit"}', true, 900),
   
  ('Sui Max Position Size', 'Maximum position size on Sui', 'global', 'max_position_size', 'sui',
   '{"max_usd_value": 100000, "enforcement": "hard_limit"}', true, 900),
   
  ('Sonic Max Position Size', 'Maximum position size on Sonic', 'global', 'max_position_size', 'sonic',
   '{"max_usd_value": 250000, "enforcement": "hard_limit"}', true, 900);

-- Insert initial policy templates
INSERT INTO public.multisig_policy_templates
  (name, description, chain_slug, multisig_type, policy_template, is_active)
VALUES
  ('Safe Default Policy', 'Default policy for Safe multisigs with daily limits', 'evm', 'safe',
   '{"type": "spendingLimit", "dailyLimitUsd": 50000, "requireApprovalAboveLimit": true}', true),
   
  ('MSafe Default Policy', 'Default policy for MSafe with transaction filters', 'sui', 'msafe',
   '{"type": "transactionFilter", "allowedRecipients": [], "allowedTypes": ["*"], "denylist": []}', true),
   
  ('Squads Default Policy', 'Default policy for Squads multisigs with timelock', 'solana', 'squads',
   '{"type": "timelock", "delaySeconds": 3600, "votingThreshold": 60}', true),
   
  ('Safe High Security', 'High security policy for Safe with guards', 'evm', 'safe',
   '{"type": "guardModule", "guards": ["delaySecurity", "whitelist"], "delaySeconds": 86400}', true),
   
  ('MSafe High Security', 'High security policy for MSafe with strict limits', 'sui', 'msafe',
   '{"type": "strictPolicy", "allowedDApps": [], "maxTransactionSize": 10000, "requireAllApprovals": true}', true),
   
  ('Squads High Security', 'High security policy for Squads with multiple rules', 'solana', 'squads',
   '{"type": "complexRules", "rules": ["timelock", "whitelist", "amountLimit"], "votingThreshold": 100}', true);

-- Insert mock signing keys (for development/testing only)
INSERT INTO public.signing_keys
  (key_name, chain_slug, key_type, public_key, metadata, is_active)
VALUES
  ('EVM Primary Backend Signer', 'evm', 'hsm', '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 
   '{"hsm_id": "azure-key-vault-1", "key_path": "/keys/evm-primary"}', true),
   
  ('Sonic Primary Backend Signer', 'sonic', 'hsm', '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 
   '{"hsm_id": "azure-key-vault-1", "key_path": "/keys/sonic-primary"}', true),
   
  ('Sui Primary Backend Signer', 'sui', 'hsm', '0x9a5d0fbf7eea1bc218ef46f0170c5ec30befcc0a6c965dda641319dcf9576a91', 
   '{"hsm_id": "azure-key-vault-1", "key_path": "/keys/sui-primary"}', true),
   
  ('Solana Primary Backend Signer', 'solana', 'hsm', 'ERNGLtCCpVt8LFgbYELHJaPaNLcLEm4UwjTxtcvQ7riw', 
   '{"hsm_id": "azure-key-vault-1", "key_path": "/keys/solana-primary"}', true);
