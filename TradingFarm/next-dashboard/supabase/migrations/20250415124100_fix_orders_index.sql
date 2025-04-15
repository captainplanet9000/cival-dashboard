-- Fix orders migration issues
-- This migration adds the missing columns if needed and fixes index issues

-- First, check if user_id column exists in orders table
DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'orders'
        AND column_name = 'user_id'
    ) THEN
        -- Add user_id column if it doesn't exist
        ALTER TABLE public.orders
        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        
        -- Populate with a default value (could be null or a specific user)
        -- UPDATE public.orders SET user_id = '00000000-0000-0000-0000-000000000000';
        
        RAISE NOTICE 'Added missing user_id column to orders table';
    ELSE
        RAISE NOTICE 'user_id column already exists in orders table';
    END IF;
END
$$;

-- Create or recreate indexes, only if the column exists
DO $$
BEGIN
    -- Check for user_id column before creating index
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'orders'
        AND column_name = 'user_id'
    ) THEN
        -- Drop the index if it exists
        DROP INDEX IF EXISTS idx_orders_user_id;
        
        -- Create the index
        CREATE INDEX idx_orders_user_id ON public.orders(user_id);
        
        RAISE NOTICE 'Created or recreated index on orders.user_id';
    ELSE
        RAISE NOTICE 'Skipping user_id index creation as column does not exist';
    END IF;
END
$$;
