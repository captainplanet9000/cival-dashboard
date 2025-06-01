-- Consolidated-- DEPRECATED: Use 20250413200000_consolidated_schema.sql for all new environments. This migration is retained for historical reference only.
-- Fixes for consolidated orders table structure
-- This migration properly addresses user_id column and index issues

DO $$
DECLARE
  user_id_exists BOOLEAN;
  has_proper_reference BOOLEAN;
BEGIN
  -- Check if user_id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'user_id'
  ) INTO user_id_exists;

  -- Check if proper foreign key constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'orders'
      AND ccu.column_name = 'id'
      AND ccu.table_schema = 'auth'
      AND ccu.table_name = 'users'
  ) INTO has_proper_reference;

  -- Add or fix user_id column
  IF NOT user_id_exists THEN
    -- Add user_id column if it doesn't exist
    ALTER TABLE public.orders
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added missing user_id column to orders table';
  ELSIF NOT has_proper_reference THEN
    -- Drop existing column and recreate with proper reference
    -- First drop any constraints
    EXECUTE (
      SELECT 'ALTER TABLE public.orders DROP CONSTRAINT ' || conname
      FROM pg_constraint
      WHERE conrelid = 'public.orders'::regclass
        AND conname LIKE '%user_id%'
      LIMIT 1
    );
    
    -- Then modify the column
    ALTER TABLE public.orders
    ALTER COLUMN user_id TYPE UUID,
    ADD CONSTRAINT orders_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed user_id column reference in orders table';
  ELSE
    RAISE NOTICE 'user_id column already exists with proper reference';
  END IF;

  -- Ensure index exists and is properly created
  DROP INDEX IF EXISTS idx_orders_user_id;
  CREATE INDEX idx_orders_user_id ON public.orders(user_id);
  RAISE NOTICE 'Created or recreated index on orders.user_id';
  
  -- Add RLS policy if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders'
      AND policyname = 'orders_user_id_policy'
  ) THEN
    -- First ensure RLS is enabled
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policy to restrict by user_id
    CREATE POLICY orders_user_id_policy ON public.orders
      FOR ALL
      USING (auth.uid() = user_id);
      
    -- Allow service role to bypass RLS
    CREATE POLICY orders_service_role_policy ON public.orders
      FOR ALL
      TO service_role
      USING (true);
      
    RAISE NOTICE 'Added Row Level Security policies for orders table';
  END IF;
END
$$;
