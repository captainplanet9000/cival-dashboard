-- supabase/migrations/20240430000000_create_farms_table.sql

-- Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create farms table
CREATE TABLE IF NOT EXISTS public.farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    configuration JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'active'
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON public.farms(user_id);

-- Add comments
COMMENT ON TABLE public.farms IS 'Stores information about Trading Farms, which group agents and configurations.';
COMMENT ON COLUMN public.farms.id IS 'Unique identifier for the farm.';
COMMENT ON COLUMN public.farms.user_id IS 'The user who owns this farm.';
COMMENT ON COLUMN public.farms.name IS 'The name of the farm.';
COMMENT ON COLUMN public.farms.configuration IS 'JSONB field for farm-level configuration.';
COMMENT ON COLUMN public.farms.status IS 'Current status of the farm (e.g., active, inactive).';

-- Add triggers using existing functions (assumes they exist from 20230830... migration)
DROP TRIGGER IF EXISTS handle_farms_updated_at ON public.farms;
CREATE TRIGGER handle_farms_updated_at BEFORE UPDATE ON public.farms
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own farms"
  ON public.farms FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow read access for specific service roles if needed"
  ON public.farms FOR SELECT
  USING (true); -- Adjust policy as needed
