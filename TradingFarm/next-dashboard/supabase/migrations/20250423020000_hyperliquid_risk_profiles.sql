-- Migration for adding HyperLiquid-specific risk parameters to risk_profiles table
-- This extends the risk management system to support HyperLiquid's specialized perpetual futures

-- Add HyperLiquid-specific columns to risk_profiles table
ALTER TABLE IF EXISTS public.risk_profiles
ADD COLUMN hl_liquidation_threshold decimal NOT NULL DEFAULT 0.80,
ADD COLUMN hl_max_leverage integer NOT NULL DEFAULT 10,
ADD COLUMN hl_risk_mode varchar(50) NOT NULL DEFAULT 'conservative',
ADD COLUMN hl_cross_margin_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN hl_partial_liquidation_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN hl_auto_deleveraging_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN hl_trading_pairs jsonb DEFAULT '["BTC-PERP", "ETH-PERP"]'::jsonb,
ADD COLUMN hl_max_position_notional decimal DEFAULT 10000.00,
ADD COLUMN hl_max_drawdown_percent decimal DEFAULT 25.00,
ADD COLUMN hl_custom_settings jsonb DEFAULT '{}'::jsonb;

-- Create an index for more efficient querying
CREATE INDEX IF NOT EXISTS idx_risk_profiles_hl_risk_mode
ON public.risk_profiles(hl_risk_mode);

-- Set up comment descriptions for the new columns
COMMENT ON COLUMN public.risk_profiles.hl_liquidation_threshold IS 'Threshold ratio (0-1) at which position gets liquidated on HyperLiquid';
COMMENT ON COLUMN public.risk_profiles.hl_max_leverage IS 'Maximum leverage allowed for HyperLiquid positions';
COMMENT ON COLUMN public.risk_profiles.hl_risk_mode IS 'Risk profile mode for HyperLiquid (conservative, moderate, aggressive)';
COMMENT ON COLUMN public.risk_profiles.hl_cross_margin_enabled IS 'Whether cross-margin is enabled for HyperLiquid positions';
COMMENT ON COLUMN public.risk_profiles.hl_partial_liquidation_enabled IS 'Whether partial liquidations are enabled instead of full liquidations';
COMMENT ON COLUMN public.risk_profiles.hl_auto_deleveraging_enabled IS 'Whether automatic deleveraging is enabled for positions nearing liquidation';
COMMENT ON COLUMN public.risk_profiles.hl_trading_pairs IS 'Array of allowed trading pairs/markets on HyperLiquid';
COMMENT ON COLUMN public.risk_profiles.hl_max_position_notional IS 'Maximum notional value for a single position in USD';
COMMENT ON COLUMN public.risk_profiles.hl_max_drawdown_percent IS 'Maximum allowed drawdown percentage before auto risk reduction';
COMMENT ON COLUMN public.risk_profiles.hl_custom_settings IS 'JSON object for additional custom HyperLiquid risk settings';

-- Create a trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the updated_at trigger exists on the risk_profiles table
DROP TRIGGER IF EXISTS set_risk_profiles_updated_at ON public.risk_profiles;
CREATE TRIGGER set_risk_profiles_updated_at
BEFORE UPDATE ON public.risk_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
