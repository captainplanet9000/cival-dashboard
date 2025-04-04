-- Add wallet management tables

-- First, check if farms table exists and uses UUID or bigint
DO $$
DECLARE
    farms_id_type TEXT;
BEGIN
    SELECT data_type INTO farms_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'farms'
      AND column_name = 'id';
      
    IF farms_id_type IS NULL THEN
        RAISE EXCEPTION 'Farms table not found. Please create it first.';
    END IF;
    
    IF farms_id_type != 'uuid' THEN
        RAISE NOTICE 'Farms table uses % type for id. Adjusting wallet tables to match.', farms_id_type;
    END IF;
END $$;

-- Create wallet table with compatible id types
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255) NOT NULL,
  network VARCHAR(50) NOT NULL,
  exchange VARCHAR(100),
  balance NUMERIC(20, 8) DEFAULT 0,
  currency VARCHAR(20) NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add foreign key constraints after table creation to handle type differences
DO $$
BEGIN
    -- Check farms id type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'farms' 
          AND column_name = 'id' 
          AND data_type = 'uuid'
    ) THEN
        -- If farms.id is UUID, add standard foreign key
        EXECUTE 'ALTER TABLE public.wallets 
                 ADD CONSTRAINT wallets_farm_id_fkey 
                 FOREIGN KEY (farm_id) 
                 REFERENCES public.farms(id) ON DELETE CASCADE';
    ELSE
        -- If farms.id is not UUID, we need to handle type conversion
        -- This might require more complex handling or schema modification
        RAISE WARNING 'Cannot automatically add foreign key to farms table due to type mismatch. Manual intervention required.';
    END IF;
    
    -- Add foreign key to users table (assuming it uses UUID)
    EXECUTE 'ALTER TABLE public.wallets 
             ADD CONSTRAINT wallets_user_id_fkey 
             FOREIGN KEY (user_id) 
             REFERENCES auth.users(id) ON DELETE CASCADE';
EXCEPTION
    WHEN others THEN
        RAISE WARNING 'Error adding foreign keys: %', SQLERRM;
END $$;

-- Create wallet transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL, -- deposit, withdrawal, transfer, trade, fee
  amount NUMERIC(20, 8) NOT NULL,
  currency VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status VARCHAR(20) DEFAULT 'completed',
  tx_hash VARCHAR(255),
  destination VARCHAR(255),
  source VARCHAR(255),
  fee NUMERIC(20, 8),
  fee_currency VARCHAR(20),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add foreign key constraint for wallet_transactions
ALTER TABLE public.wallet_transactions
ADD CONSTRAINT wallet_transactions_wallet_id_fkey
FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;

-- Create wallet alerts table
CREATE TABLE IF NOT EXISTS public.wallet_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL, -- low_balance, large_deposit, suspicious_activity, other
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.wallet_alerts
ADD CONSTRAINT wallet_alerts_wallet_id_fkey
FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;

-- Add constraint for resolved_by if auth.users exists and uses UUID
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'auth' 
          AND table_name = 'users' 
          AND column_name = 'id' 
          AND data_type = 'uuid'
    ) THEN
        EXECUTE 'ALTER TABLE public.wallet_alerts 
                 ADD CONSTRAINT wallet_alerts_resolved_by_fkey 
                 FOREIGN KEY (resolved_by) 
                 REFERENCES auth.users(id)';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE WARNING 'Error adding resolved_by foreign key: %', SQLERRM;
END $$;

-- Create wallet balance history table
CREATE TABLE IF NOT EXISTS public.wallet_balance_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL,
  balance NUMERIC(20, 8) NOT NULL,
  currency VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE public.wallet_balance_history
ADD CONSTRAINT wallet_balance_history_wallet_id_fkey
FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;

-- Create wallet settings table
CREATE TABLE IF NOT EXISTS public.wallet_settings (
  wallet_id UUID PRIMARY KEY,
  low_balance_threshold NUMERIC(20, 8),
  alerts_enabled BOOLEAN DEFAULT true,
  auto_refresh BOOLEAN DEFAULT true,
  refresh_interval INTEGER DEFAULT 15, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE public.wallet_settings
ADD CONSTRAINT wallet_settings_wallet_id_fkey
FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;

-- Add triggers for created_at and updated_at
-- First check if handle_created_at and handle_updated_at functions exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'handle_created_at' 
          AND pronamespace = 'public'::regnamespace
    ) THEN
        EXECUTE 'CREATE TRIGGER handle_wallet_created_at
                 BEFORE INSERT ON public.wallets
                 FOR EACH ROW EXECUTE FUNCTION public.handle_created_at()';
                 
        EXECUTE 'CREATE TRIGGER handle_wallet_transaction_created_at
                 BEFORE INSERT ON public.wallet_transactions
                 FOR EACH ROW EXECUTE FUNCTION public.handle_created_at()';
                 
        EXECUTE 'CREATE TRIGGER handle_wallet_alert_created_at
                 BEFORE INSERT ON public.wallet_alerts
                 FOR EACH ROW EXECUTE FUNCTION public.handle_created_at()';
                 
        EXECUTE 'CREATE TRIGGER handle_wallet_balance_history_created_at
                 BEFORE INSERT ON public.wallet_balance_history
                 FOR EACH ROW EXECUTE FUNCTION public.handle_created_at()';
                 
        EXECUTE 'CREATE TRIGGER handle_wallet_settings_created_at
                 BEFORE INSERT ON public.wallet_settings
                 FOR EACH ROW EXECUTE FUNCTION public.handle_created_at()';
    ELSE
        RAISE WARNING 'handle_created_at function not found. Skipping created_at triggers.';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'handle_updated_at' 
          AND pronamespace = 'public'::regnamespace
    ) THEN
        EXECUTE 'CREATE TRIGGER handle_wallet_updated_at
                 BEFORE UPDATE ON public.wallets
                 FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()';
                 
        EXECUTE 'CREATE TRIGGER handle_wallet_transaction_updated_at
                 BEFORE UPDATE ON public.wallet_transactions
                 FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()';
                 
        EXECUTE 'CREATE TRIGGER handle_wallet_alert_updated_at
                 BEFORE UPDATE ON public.wallet_alerts
                 FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()';
                 
        EXECUTE 'CREATE TRIGGER handle_wallet_balance_history_updated_at
                 BEFORE UPDATE ON public.wallet_balance_history
                 FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()';
                 
        EXECUTE 'CREATE TRIGGER handle_wallet_settings_updated_at
                 BEFORE UPDATE ON public.wallet_settings
                 FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()';
    ELSE
        RAISE WARNING 'handle_updated_at function not found. Skipping updated_at triggers.';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE WARNING 'Error creating triggers: %', SQLERRM;
END $$;

-- Enable Row Level Security
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for wallets
DO $$
BEGIN
    -- Check if farm_users table exists for RLS policies
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' 
          AND table_name = 'farm_users'
    ) THEN
        -- Create more specific policies
        EXECUTE $POLICY$
        CREATE POLICY "Users can view their own farm wallets"
        ON public.wallets FOR SELECT
        TO authenticated
        USING (
          user_id = auth.uid() OR
          farm_id IN (
            SELECT farm_id FROM public.farm_users
            WHERE user_id = auth.uid()
          )
        )
        $POLICY$;
        
        EXECUTE $POLICY$
        CREATE POLICY "Users can create wallets for their farms"
        ON public.wallets FOR INSERT
        TO authenticated
        WITH CHECK (
          user_id = auth.uid() OR
          farm_id IN (
            SELECT farm_id FROM public.farm_users
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
          )
        )
        $POLICY$;
        
        EXECUTE $POLICY$
        CREATE POLICY "Users can update their own farm wallets"
        ON public.wallets FOR UPDATE
        TO authenticated
        USING (
          user_id = auth.uid() OR
          farm_id IN (
            SELECT farm_id FROM public.farm_users
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
          )
        )
        $POLICY$;
        
        EXECUTE $POLICY$
        CREATE POLICY "Users can delete their own farm wallets"
        ON public.wallets FOR DELETE
        TO authenticated
        USING (
          user_id = auth.uid() OR
          farm_id IN (
            SELECT farm_id FROM public.farm_users
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
          )
        )
        $POLICY$;
    ELSE
        -- Create simpler policies without farm_users reference
        EXECUTE $POLICY$
        CREATE POLICY "Users can view their own wallets"
        ON public.wallets FOR SELECT
        TO authenticated
        USING (user_id = auth.uid())
        $POLICY$;
        
        EXECUTE $POLICY$
        CREATE POLICY "Users can create their own wallets"
        ON public.wallets FOR INSERT
        TO authenticated
        WITH CHECK (user_id = auth.uid())
        $POLICY$;
        
        EXECUTE $POLICY$
        CREATE POLICY "Users can update their own wallets"
        ON public.wallets FOR UPDATE
        TO authenticated
        USING (user_id = auth.uid())
        $POLICY$;
        
        EXECUTE $POLICY$
        CREATE POLICY "Users can delete their own wallets"
        ON public.wallets FOR DELETE
        TO authenticated
        USING (user_id = auth.uid())
        $POLICY$;
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE WARNING 'Error creating wallet RLS policies: %', SQLERRM;
END $$;

-- Similar policies for related tables
DO $$
BEGIN
    EXECUTE $POLICY$
    CREATE POLICY "Users can view their wallet transactions"
    ON public.wallet_transactions FOR SELECT
    TO authenticated
    USING (
      wallet_id IN (
        SELECT id FROM public.wallets
        WHERE user_id = auth.uid()
      )
    )
    $POLICY$;

    EXECUTE $POLICY$
    CREATE POLICY "Users can view their wallet alerts"
    ON public.wallet_alerts FOR SELECT
    TO authenticated
    USING (
      wallet_id IN (
        SELECT id FROM public.wallets
        WHERE user_id = auth.uid()
      )
    )
    $POLICY$;
    
    EXECUTE $POLICY$
    CREATE POLICY "Users can view their wallet balance history"
    ON public.wallet_balance_history FOR SELECT
    TO authenticated
    USING (
      wallet_id IN (
        SELECT id FROM public.wallets
        WHERE user_id = auth.uid()
      )
    )
    $POLICY$;
    
    EXECUTE $POLICY$
    CREATE POLICY "Users can view their wallet settings"
    ON public.wallet_settings FOR SELECT
    TO authenticated
    USING (
      wallet_id IN (
        SELECT id FROM public.wallets
        WHERE user_id = auth.uid()
      )
    )
    $POLICY$;
EXCEPTION
    WHEN others THEN
        RAISE WARNING 'Error creating related table RLS policies: %', SQLERRM;
END $$;

-- Create API functions for wallet management
CREATE OR REPLACE FUNCTION public.get_wallet_with_details(p_wallet_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (
    SELECT 
      jsonb_build_object(
        'wallet', row_to_json(w),
        'transactions', (
          SELECT jsonb_agg(row_to_json(t)) 
          FROM public.wallet_transactions t 
          WHERE t.wallet_id = w.id
          ORDER BY t.timestamp DESC
          LIMIT 100
        ),
        'alerts', (
          SELECT jsonb_agg(row_to_json(a)) 
          FROM public.wallet_alerts a 
          WHERE a.wallet_id = w.id
          ORDER BY a.timestamp DESC
        ),
        'settings', (
          SELECT row_to_json(s) 
          FROM public.wallet_settings s 
          WHERE s.wallet_id = w.id
        ),
        'balance_history', (
          SELECT jsonb_agg(row_to_json(h)) 
          FROM public.wallet_balance_history h 
          WHERE h.wallet_id = w.id
          ORDER BY h.timestamp DESC
          LIMIT 365
        )
      )
    FROM public.wallets w
    WHERE w.id = p_wallet_id
  );
END;
$$;
