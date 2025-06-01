
  
-- Create timestamp handlers for automatic created_at and updated_at
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

  
-- Create farms table if not exists
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  exchange TEXT NOT NULL,
  api_keys JSONB DEFAULT '{}'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create farms triggers
DROP TRIGGER IF EXISTS farms_created_at ON public.farms;
CREATE TRIGGER farms_created_at
  BEFORE INSERT ON public.farms
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_created_at();

DROP TRIGGER IF EXISTS farms_updated_at ON public.farms;
CREATE TRIGGER farms_updated_at
  BEFORE UPDATE ON public.farms
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Enable RLS on farms table
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for farms
CREATE POLICY "Allow users to read farms" 
  ON public.farms FOR SELECT 
  USING (true);

CREATE POLICY "Allow users to create farms" 
  ON public.farms FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow owners to update farms" 
  ON public.farms FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Allow owners to delete farms" 
  ON public.farms FOR DELETE 
  USING (auth.uid() = user_id);

  
-- Create agents table if not exists
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  type TEXT NOT NULL DEFAULT 'trading',
  config JSONB DEFAULT '{}'::jsonb,
  instructions TEXT,
  permissions JSONB DEFAULT '{}'::jsonb,
  performance JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agents triggers
DROP TRIGGER IF EXISTS agents_created_at ON public.agents;
CREATE TRIGGER agents_created_at
  BEFORE INSERT ON public.agents
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_created_at();

DROP TRIGGER IF EXISTS agents_updated_at ON public.agents;
CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Enable RLS on agents table
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for agents
CREATE POLICY "Allow users to read agents" 
  ON public.agents FOR SELECT 
  USING (true);

CREATE POLICY "Allow users to create agents" 
  ON public.agents FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow owners to update agents" 
  ON public.agents FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Allow owners to delete agents" 
  ON public.agents FOR DELETE 
  USING (auth.uid() = user_id);

  
-- Create goals table if not exists
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'profit',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  current_value NUMERIC DEFAULT 0,
  target_value NUMERIC DEFAULT 0,
  progress NUMERIC DEFAULT 0,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create goals triggers
DROP TRIGGER IF EXISTS goals_created_at ON public.goals;
CREATE TRIGGER goals_created_at
  BEFORE INSERT ON public.goals
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_created_at();

DROP TRIGGER IF EXISTS goals_updated_at ON public.goals;
CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Enable RLS on goals table
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for goals
CREATE POLICY "Allow users to read goals" 
  ON public.goals FOR SELECT 
  USING (true);

CREATE POLICY "Allow users to create goals" 
  ON public.goals FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow owners to update goals" 
  ON public.goals FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Allow owners to delete goals" 
  ON public.goals FOR DELETE 
  USING (auth.uid() = user_id);

  
  -- Insert sample farm
  INSERT INTO public.farms (name, description, status, exchange, api_keys, config)
  VALUES (
    'Demo Trading Farm', 
    'A demo trading farm for testing the dashboard', 
    'active', 
    'bybit', 
    '{"api_key": "demo_key", "api_secret": "demo_secret"}'::jsonb, 
    '{"risk_level": "medium", "strategy": "momentum"}'::jsonb
  )
  ON CONFLICT DO NOTHING;
  
  -- Get the farm ID
  DO $$
  DECLARE
    farm_id UUID;
  BEGIN
    SELECT id INTO farm_id FROM public.farms WHERE name = 'Demo Trading Farm' LIMIT 1;
    
    -- Insert sample agent
    INSERT INTO public.agents (name, description, farm_id, status, type, config, instructions)
    VALUES (
      'Alpha Trader', 
      'Demo trading agent for testing', 
      farm_id, 
      'active', 
      'trading', 
      '{"model": "gpt-4o", "strategy": "momentum"}'::jsonb,
      'Trade BTC and ETH using momentum indicators. Manage risk with stop losses.'
    )
    ON CONFLICT DO NOTHING;
    
    -- Insert sample goal
    INSERT INTO public.goals (name, description, farm_id, type, priority, status, current_value, target_value, progress, deadline)
    VALUES (
      'Monthly Profit Target', 
      'Achieve 10% monthly profit on portfolio', 
      farm_id, 
      'profit', 
      'high', 
      'active', 
      2.5, 
      10.0, 
      25.0,
      NOW() + INTERVAL '30 days'
    )
    ON CONFLICT DO NOTHING;
  END $$;
  
  