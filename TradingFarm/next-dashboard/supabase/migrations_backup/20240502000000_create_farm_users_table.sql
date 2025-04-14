-- supabase/migrations/20240502000000_create_farm_users_table.sql

-- Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create farm_users junction table
CREATE TABLE IF NOT EXISTS public.farm_users (
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- e.g., 'owner', 'admin', 'member', 'viewer'
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Composite primary key
    PRIMARY KEY (farm_id, user_id),

    -- Check constraint for valid roles
    CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_farm_users_farm_id ON public.farm_users(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_users_user_id ON public.farm_users(user_id);

-- Add comments
COMMENT ON TABLE public.farm_users IS 'Junction table linking users to farms and defining their roles within the farm.';
COMMENT ON COLUMN public.farm_users.farm_id IS 'Foreign key to the farms table.';
COMMENT ON COLUMN public.farm_users.user_id IS 'Foreign key to the auth.users table.';
COMMENT ON COLUMN public.farm_users.role IS 'The role of the user within the specific farm.';

-- Add triggers using existing functions (assumes they exist from 20230830... migration)
CREATE TRIGGER handle_farm_users_updated_at BEFORE UPDATE ON public.farm_users
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.farm_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Owners/Admins can manage farm users
CREATE POLICY "Farm owners/admins can manage farm users" 
  ON public.farm_users FOR ALL
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.farm_users fu
      WHERE fu.farm_id = farm_users.farm_id
      AND fu.user_id = auth.uid()
      AND fu.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.farm_users fu
      WHERE fu.farm_id = farm_users.farm_id
      AND fu.user_id = auth.uid()
      AND fu.role IN ('owner', 'admin')
    )
  );

-- Farm members can view other members of the same farm
CREATE POLICY "Farm members can view other members of the same farm" 
  ON public.farm_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.farm_users fu
      WHERE fu.farm_id = farm_users.farm_id
      AND fu.user_id = auth.uid()
    )
  );
