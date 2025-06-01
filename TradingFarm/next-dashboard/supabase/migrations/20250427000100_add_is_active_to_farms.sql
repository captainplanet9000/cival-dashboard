-- Migration: 20250427000100_add_is_active_to_farms.sql
-- Adds is_active column to farms table if it doesn't exist

-- Check if farms table exists and create it if not
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'farms') THEN
    CREATE TABLE public.farms (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      description TEXT,
      config JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    
    -- Create trigger for updated_at
    CREATE TRIGGER handle_farms_updated_at
    BEFORE UPDATE ON public.farms
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
    
    -- Enable Row Level Security
    ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
    
    -- Create policy to allow users to only see and modify their own farms
    CREATE POLICY "Users can only view their own farms"
      ON public.farms
      FOR SELECT
      USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can only insert their own farms"
      ON public.farms
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can only update their own farms"
      ON public.farms
      FOR UPDATE
      USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can only delete their own farms"
      ON public.farms
      FOR DELETE
      USING (auth.uid() = user_id);
    
    -- Create an index for faster lookups by user
    CREATE INDEX farms_user_id_idx ON public.farms(user_id);
  ELSE
    -- If farms table exists but is_active column doesn't, add it
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'farms' 
      AND column_name = 'is_active'
    ) THEN
      ALTER TABLE public.farms ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
  END IF;
END
$$;
