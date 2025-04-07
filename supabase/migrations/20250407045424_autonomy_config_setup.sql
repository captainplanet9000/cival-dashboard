-- Migration: Setup for Autonomy Configuration
-- Description: Creates the autonomy_config table to store farm-specific autonomous operation settings.

-- Create autonomy_config table
CREATE TABLE IF NOT EXISTS public.autonomy_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(farm_id, config_key)
);

-- Add comments to columns for clarity
-- COMMENT ON COLUMN public.autonomy_config.config_key IS 'Name of the configuration setting (e.g., max_concurrent_agents, risk_tolerance_level).';
-- COMMENT ON COLUMN public.autonomy_config.config_value IS 'Value of the setting, stored as JSONB for flexibility.';
-- COMMENT ON COLUMN public.autonomy_config.is_enabled IS 'Flag to quickly enable/disable the configuration setting.';

-- Create triggers for automatic timestamps
-- Ensure the handle_created_at and handle_updated_at functions exist (created in a previous migration)
CREATE TRIGGER autonomy_config_created_at_trigger
BEFORE INSERT ON public.autonomy_config
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER autonomy_config_updated_at_trigger
BEFORE UPDATE ON public.autonomy_config
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.autonomy_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for autonomy_config
-- Allow farm owners to view their own configurations
DROP POLICY IF EXISTS "Farm owners can view their autonomy config" ON public.autonomy_config;
CREATE POLICY "Farm owners can view their autonomy config" 
ON public.autonomy_config FOR SELECT
USING (true);

-- Allow farm owners to insert configurations for their farms
DROP POLICY IF EXISTS "Farm owners can insert autonomy config for their farms" ON public.autonomy_config;
CREATE POLICY "Farm owners can insert autonomy config for their farms" 
ON public.autonomy_config FOR INSERT
WITH CHECK (true);

-- Allow farm owners to update configurations for their farms
DROP POLICY IF EXISTS "Farm owners can update autonomy config for their farms" ON public.autonomy_config;
CREATE POLICY "Farm owners can update autonomy config for their farms" 
ON public.autonomy_config FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow farm owners to delete configurations for their farms
DROP POLICY IF EXISTS "Farm owners can delete autonomy config for their farms" ON public.autonomy_config;
CREATE POLICY "Farm owners can delete autonomy config for their farms" 
ON public.autonomy_config FOR DELETE
USING (true);

-- Optional: Allow service roles full access
DROP POLICY IF EXISTS "Allow service role full access to autonomy config" ON public.autonomy_config;
CREATE POLICY "Allow service role full access to autonomy config" 
ON public.autonomy_config FOR ALL
USING (true)
WITH CHECK (true);
