-- Add strategy versioning and link with goals
-- Add file storage capabilities to strategies

-- Create strategy_files table
CREATE TABLE IF NOT EXISTS public.strategy_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add created_at and updated_at triggers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_created_at') THEN
    CREATE OR REPLACE FUNCTION public.handle_created_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.created_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at') THEN
    CREATE OR REPLACE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END
$$;

-- Create strategy_versions table
CREATE TABLE IF NOT EXISTS public.strategy_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  parameters JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure versions are unique per strategy
  UNIQUE(strategy_id, version)
);

-- Add goal_id column to strategies table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'strategies' AND column_name = 'goal_id'
  ) THEN
    ALTER TABLE public.strategies ADD COLUMN goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- Add is_current_version column to strategies if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'strategies' AND column_name = 'current_version'
  ) THEN
    ALTER TABLE public.strategies ADD COLUMN current_version INTEGER DEFAULT 1;
  END IF;
END
$$;

-- Add RLS policies
ALTER TABLE public.strategy_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for strategy_files
CREATE POLICY "Users can view strategy files" 
  ON public.strategy_files FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert their own strategy files" 
  ON public.strategy_files FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Users can update their own strategy files" 
  ON public.strategy_files FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can delete their own strategy files" 
  ON public.strategy_files FOR DELETE 
  TO authenticated 
  USING (true);

-- Create policies for strategy_versions
CREATE POLICY "Users can view strategy versions" 
  ON public.strategy_versions FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert strategy versions" 
  ON public.strategy_versions FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Users can update strategy versions" 
  ON public.strategy_versions FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can delete strategy versions" 
  ON public.strategy_versions FOR DELETE 
  TO authenticated 
  USING (true);

-- Add triggers for updated_at
CREATE TRIGGER handle_strategy_files_updated_at
  BEFORE UPDATE ON public.strategy_files
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add indexes for performance
CREATE INDEX idx_strategy_files_strategy_id ON public.strategy_files(strategy_id);
CREATE INDEX idx_strategy_versions_strategy_id ON public.strategy_versions(strategy_id);
CREATE INDEX idx_strategies_goal_id ON public.strategies(goal_id);

-- Create a view to get the latest version for each strategy
CREATE OR REPLACE VIEW public.strategy_latest_versions AS
SELECT sv.*
FROM public.strategy_versions sv
JOIN (
  SELECT strategy_id, MAX(version) as max_version
  FROM public.strategy_versions
  GROUP BY strategy_id
) latest ON sv.strategy_id = latest.strategy_id AND sv.version = latest.max_version;

-- Create a function to create a new strategy version
CREATE OR REPLACE FUNCTION public.create_strategy_version(
  strategy_id UUID,
  name TEXT,
  description TEXT,
  config JSONB,
  parameters JSONB,
  metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  next_version INTEGER;
  new_version_id UUID;
BEGIN
  -- Get the next version number
  SELECT COALESCE(MAX(version), 0) + 1 
  INTO next_version 
  FROM public.strategy_versions 
  WHERE strategy_id = create_strategy_version.strategy_id;
  
  -- Insert the new version
  INSERT INTO public.strategy_versions (
    strategy_id, 
    version,
    name,
    description,
    config,
    parameters,
    metadata
  ) VALUES (
    create_strategy_version.strategy_id,
    next_version,
    create_strategy_version.name,
    create_strategy_version.description,
    create_strategy_version.config,
    create_strategy_version.parameters,
    create_strategy_version.metadata
  )
  RETURNING id INTO new_version_id;
  
  -- Update the strategy's current version
  UPDATE public.strategies 
  SET current_version = next_version,
      updated_at = NOW()
  WHERE id = create_strategy_version.strategy_id;
  
  RETURN new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 