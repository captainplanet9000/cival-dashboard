-- Migration: Add security policies for Trading Farm tables
-- Description: Implements Row Level Security (RLS) for all tables to ensure data isolation

-- Enable Row Level Security on all tables
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('schema_migrations')
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;
END
$$;

-- Create policy for user_profiles table
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Create policy for trading_strategies table
CREATE POLICY "Users can view their own strategies"
    ON public.trading_strategies
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own strategies"
    ON public.trading_strategies
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategies"
    ON public.trading_strategies
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategies"
    ON public.trading_strategies
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create policy for orders table
CREATE POLICY "Users can view their own orders"
    ON public.orders
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders"
    ON public.orders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
    ON public.orders
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create policy for risk_profiles table
CREATE POLICY "Users can view their own risk profiles"
    ON public.risk_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own risk profiles"
    ON public.risk_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own risk profiles"
    ON public.risk_profiles
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own risk profiles"
    ON public.risk_profiles
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create policy for user_preferences table
CREATE POLICY "Users can view their own preferences"
    ON public.user_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
    ON public.user_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON public.user_preferences
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create policy for exchange_connections table
CREATE POLICY "Users can view their own exchange connections"
    ON public.exchange_connections
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exchange connections"
    ON public.exchange_connections
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exchange connections"
    ON public.exchange_connections
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exchange connections"
    ON public.exchange_connections
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create secure functions for working with API keys
-- This function encrypts API keys before storage
CREATE OR REPLACE FUNCTION public.encrypt_api_key(api_key text, secret text)
RETURNS text
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
    result text;
BEGIN
    -- Set search path to empty to avoid SQL injection
    set search_path = '';
    
    -- Use pgcrypto extension to encrypt the API key
    result := encode(
        public.pgp_sym_encrypt(
            api_key,
            secret,
            'cipher-algo=aes256'
        )::bytea,
        'base64'
    );
    
    RETURN result;
END;
$$;

-- Create timestamp triggers for all tables
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers to all tables
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('schema_migrations')
    LOOP
        -- Check if the table has created_at column
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = t.tablename 
            AND column_name = 'created_at'
        ) THEN
            EXECUTE format('
                DROP TRIGGER IF EXISTS set_created_at ON public.%I;
                CREATE TRIGGER set_created_at
                BEFORE INSERT ON public.%I
                FOR EACH ROW
                EXECUTE FUNCTION public.handle_created_at();
            ', t.tablename, t.tablename);
        END IF;
        
        -- Check if the table has updated_at column
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = t.tablename 
            AND column_name = 'updated_at'
        ) THEN
            EXECUTE format('
                DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
                CREATE TRIGGER set_updated_at
                BEFORE UPDATE ON public.%I
                FOR EACH ROW
                EXECUTE FUNCTION public.handle_updated_at();
            ', t.tablename, t.tablename);
        END IF;
    END LOOP;
END
$$;
