-- Fix schema cache issues by refreshing the agents table structure
-- First, make sure the agents table exists with all required columns

-- Check if agents table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'agents'
  ) THEN
    -- Create the agents table if it doesn't exist
    CREATE TABLE public.agents (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      farm_id BIGINT NOT NULL,
      status TEXT DEFAULT 'initializing' NOT NULL,
      type TEXT DEFAULT 'eliza' NOT NULL,
      configuration JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );

    -- Add comment to table
    COMMENT ON TABLE public.agents IS 'Stores trading agents configuration and status';
  ELSE
    -- Table exists, check for missing columns and add them if needed
    
    -- Check and add 'configuration' column if missing
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'configuration'
    ) THEN
      ALTER TABLE public.agents ADD COLUMN configuration JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    -- Check and add 'status' column if missing
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'status'
    ) THEN
      ALTER TABLE public.agents ADD COLUMN status TEXT DEFAULT 'initializing' NOT NULL;
    END IF;
    
    -- Check and add 'type' column if missing
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'type'
    ) THEN
      ALTER TABLE public.agents ADD COLUMN type TEXT DEFAULT 'eliza' NOT NULL;
    END IF;
    
    -- Check and add 'created_at' column if missing
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'created_at'
    ) THEN
      ALTER TABLE public.agents ADD COLUMN created_at TIMESTAMPTZ DEFAULT now() NOT NULL;
    END IF;
    
    -- Check and add 'updated_at' column if missing
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE public.agents ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;
    END IF;
  END IF;
END $$;

-- Create or replace the trigger functions for handling timestamps
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist and recreate them
DROP TRIGGER IF EXISTS on_agents_created ON public.agents;
DROP TRIGGER IF EXISTS on_agents_updated ON public.agents;

CREATE TRIGGER on_agents_created
  BEFORE INSERT ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER on_agents_updated
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create RPC function for agent creation with configuration
CREATE OR REPLACE FUNCTION public.create_agent(
  agent_name TEXT,
  agent_farm_id BIGINT,
  agent_status TEXT DEFAULT 'initializing',
  agent_type TEXT DEFAULT 'eliza',
  agent_config JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  new_agent_id BIGINT;
  result JSONB;
BEGIN
  -- Insert the new agent
  INSERT INTO public.agents (
    name,
    farm_id,
    status,
    type,
    configuration
  )
  VALUES (
    agent_name,
    agent_farm_id,
    agent_status,
    agent_type,
    agent_config
  )
  RETURNING id INTO new_agent_id;
  
  -- Fetch the complete agent record
  SELECT
    jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'farm_id', a.farm_id,
      'status', a.status,
      'type', a.type,
      'configuration', a.configuration,
      'created_at', a.created_at,
      'updated_at', a.updated_at
    ) INTO result
  FROM public.agents a
  WHERE a.id = new_agent_id;
  
  RETURN result;
END;
$$;

-- Enable Row Level Security
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Create policies for the agents table
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own agents" ON public.agents;
  DROP POLICY IF EXISTS "Users can insert their own agents" ON public.agents;
  DROP POLICY IF EXISTS "Users can update their own agents" ON public.agents;
  DROP POLICY IF EXISTS "Users can delete their own agents" ON public.agents;
  
  -- Create new policies
  CREATE POLICY "Users can view their own agents"
    ON public.agents
    FOR SELECT
    USING (
      farm_id IN (
        SELECT id FROM public.farms WHERE user_id = auth.uid()
      )
    );
  
  CREATE POLICY "Users can insert their own agents"
    ON public.agents
    FOR INSERT
    WITH CHECK (
      farm_id IN (
        SELECT id FROM public.farms WHERE user_id = auth.uid()
      )
    );
  
  CREATE POLICY "Users can update their own agents"
    ON public.agents
    FOR UPDATE
    USING (
      farm_id IN (
        SELECT id FROM public.farms WHERE user_id = auth.uid()
      )
    )
    WITH CHECK (
      farm_id IN (
        SELECT id FROM public.farms WHERE user_id = auth.uid()
      )
    );
  
  CREATE POLICY "Users can delete their own agents"
    ON public.agents
    FOR DELETE
    USING (
      farm_id IN (
        SELECT id FROM public.farms WHERE user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error creating policies: %', SQLERRM;
END $$;

-- Refresh the schema cache
DO $$
BEGIN
  -- Attempt to refresh the schema cache using PostgreSQL's built-in functionality
  ANALYZE public.agents;
  
  -- Force a refresh of the pg_stat_statements stats
  SELECT pg_stat_statements_reset();
EXCEPTION
  WHEN undefined_function THEN
    -- pg_stat_statements might not be enabled
    NULL;
END $$;
