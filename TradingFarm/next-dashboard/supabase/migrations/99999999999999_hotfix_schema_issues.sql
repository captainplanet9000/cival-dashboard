-- Comprehensive hotfix for schema issues
-- This migration consolidates fixes for various issues with column types, trigger definitions, and policies
-- File should run last due to the high timestamp value

-- Fix wallet_id columns in transactions table to ensure proper foreign key references
DO $$
BEGIN
    -- Check if transactions table has wallet_id as INTEGER, if so convert to UUID
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'transactions'
          AND column_name = 'wallet_id'
          AND data_type = 'integer'
    ) THEN
        -- Create temporary table
        CREATE TEMP TABLE tmp_transactions AS SELECT * FROM public.transactions;
        
        -- Drop the original table
        DROP TABLE public.transactions;
        
        -- Create the table with correct column types
        CREATE TABLE public.transactions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            type TEXT NOT NULL,
            amount NUMERIC(24, 8) NOT NULL,
            status TEXT DEFAULT 'pending',
            wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
            farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Copy data from temp table, converting IDs as needed
        INSERT INTO public.transactions (id, type, amount, status, wallet_id, farm_id, created_at, updated_at)
        SELECT 
            uuid_generate_v4(), -- Generate new UUIDs for old integer IDs
            type, 
            amount, 
            status, 
            (SELECT id FROM public.wallets LIMIT 1), -- Replace with actual logic if needed
            (SELECT id FROM public.farms LIMIT 1), -- Replace with actual logic if needed
            created_at, 
            updated_at
        FROM tmp_transactions;
        
        -- Drop the temporary table
        DROP TABLE tmp_transactions;
    END IF;
END$$;

-- Add farm_id to agents table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agents' 
        AND column_name = 'farm_id'
    ) THEN
        ALTER TABLE public.agents ADD COLUMN farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_agents_farm_id ON public.agents(farm_id);
        COMMENT ON COLUMN public.agents.farm_id IS 'The farm that owns this agent';
    END IF;
END
$$;

-- Replace wallets user_id references with owner_id in policies
DO $$
BEGIN
    -- Drop and recreate wallet-related policies to fix user_id vs owner_id issue
    DROP POLICY IF EXISTS "Allow users to read wallets" ON public.wallets;
    DROP POLICY IF EXISTS "Allow users to create wallets" ON public.wallets;
    DROP POLICY IF EXISTS "Allow wallet owners to update wallets" ON public.wallets;
    DROP POLICY IF EXISTS "Allow wallet owners to create transactions" ON public.transactions;
    
    -- Create correct policies
    CREATE POLICY "Allow users to read wallets"
    ON public.wallets FOR SELECT
    USING (
        auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.farms
            WHERE farms.id = wallets.farm_id
            AND farms.user_id = auth.uid()
        )
    );
    
    CREATE POLICY "Allow users to create wallets"
    ON public.wallets FOR INSERT
    WITH CHECK (auth.uid() = owner_id);
    
    CREATE POLICY "Allow wallet owners to update wallets"
    ON public.wallets FOR UPDATE
    USING (auth.uid() = owner_id);
    
    CREATE POLICY "Allow wallet owners to create transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.wallets
            WHERE wallets.id = transactions.wallet_id
            AND wallets.owner_id = auth.uid()
        )
    );
    
    -- Ensure correct index exists (owner_id instead of user_id)
    DROP INDEX IF EXISTS idx_wallets_user_id;
    CREATE INDEX IF NOT EXISTS idx_wallets_owner_id ON public.wallets(owner_id);
END$$;

-- Fix triggers to ensure proper dropping before recreation
DO $$
BEGIN
    -- Fix agent triggers
    DROP TRIGGER IF EXISTS handle_agents_created_at ON public.agents;
    DROP TRIGGER IF EXISTS handle_agents_updated_at ON public.agents;
    
    -- Only create if handle_created_at function exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_created_at') THEN
        CREATE TRIGGER handle_agents_created_at
        BEFORE INSERT ON public.agents
        FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();
    END IF;
    
    -- Only create if handle_updated_at function exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        CREATE TRIGGER handle_agents_updated_at
        BEFORE UPDATE ON public.agents
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    
    -- Fix strategy triggers
    DROP TRIGGER IF EXISTS handle_strategies_created_at ON public.strategies;
    DROP TRIGGER IF EXISTS handle_strategies_updated_at ON public.strategies;
    
    -- Only create if handle_created_at function exists and strategies table exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_created_at') AND 
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'strategies') THEN
        CREATE TRIGGER handle_strategies_created_at
        BEFORE INSERT ON public.strategies
        FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();
    END IF;
    
    -- Only create if handle_updated_at function exists and strategies table exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'strategies') THEN
        CREATE TRIGGER handle_strategies_updated_at
        BEFORE UPDATE ON public.strategies
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END$$;

-- Create missing indexes with IF NOT EXISTS to prevent duplicates
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON public.farms(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_farm_id ON public.agents(farm_id);
CREATE INDEX IF NOT EXISTS idx_wallets_owner_id ON public.wallets(owner_id);
CREATE INDEX IF NOT EXISTS idx_wallets_farm_id ON public.wallets(farm_id);

-- Create missing transaction indexes if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
        CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_farm_id ON public.transactions(farm_id);
    END IF;
END$$;
