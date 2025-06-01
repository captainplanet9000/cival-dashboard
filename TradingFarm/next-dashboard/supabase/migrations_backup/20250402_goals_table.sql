-- Create the goals table if it doesn't already exist from earlier migrations
-- This ensures we have a properly structured goals table in the database

-- Create extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check if the goals table already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'goals'
  ) THEN
    -- Create the goals table
    CREATE TABLE public.goals (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled')) DEFAULT 'not_started',
      priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,
      deadline TIMESTAMP WITH TIME ZONE,
      farm_id INTEGER NOT NULL,
      target_value NUMERIC NOT NULL DEFAULT 0,
      current_value NUMERIC NOT NULL DEFAULT 0,
      progress NUMERIC NOT NULL DEFAULT 0,
      metrics JSONB,
      strategy TEXT,
      
      CONSTRAINT fk_farm
        FOREIGN KEY (farm_id)
        REFERENCES public.farms(id)
        ON DELETE CASCADE
    );

    -- Add timestamp triggers
    CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.goals
      FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

    -- Create index on farm_id
    CREATE INDEX idx_goals_farm_id ON public.goals(farm_id);
    CREATE INDEX idx_goals_status ON public.goals(status);
    CREATE INDEX idx_goals_type ON public.goals(type);

    -- Enable row level security
    ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

    -- Create policies so users can only access their own goals
    CREATE POLICY goals_select_policy
      ON public.goals
      FOR SELECT
      USING (
        farm_id IN (
          SELECT id FROM public.farms WHERE user_id = auth.uid()
        )
      );

    CREATE POLICY goals_insert_policy
      ON public.goals
      FOR INSERT
      WITH CHECK (
        farm_id IN (
          SELECT id FROM public.farms WHERE user_id = auth.uid()
        )
      );

    CREATE POLICY goals_update_policy
      ON public.goals
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

    CREATE POLICY goals_delete_policy
      ON public.goals
      FOR DELETE
      USING (
        farm_id IN (
          SELECT id FROM public.farms WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;
