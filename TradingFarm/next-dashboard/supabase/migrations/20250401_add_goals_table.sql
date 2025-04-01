-- Create goals table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  farm_id INTEGER NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  target_value NUMERIC DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  progress NUMERIC DEFAULT 0,
  metrics JSONB DEFAULT '{}'::jsonb,
  strategy TEXT,
  priority TEXT DEFAULT 'medium',
  deadline TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for goals table
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow users to view their own goals" 
  ON public.goals 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = goals.farm_id 
      AND farms.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow users to create goals for their farms" 
  ON public.goals 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = goals.farm_id 
      AND farms.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow users to update their goals" 
  ON public.goals 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = goals.farm_id 
      AND farms.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow users to delete their goals" 
  ON public.goals 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = goals.farm_id 
      AND farms.user_id = auth.uid()
    )
  );

-- Create triggers for handling created_at and updated_at
CREATE TRIGGER handle_goals_created_at
  BEFORE INSERT ON public.goals
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Add some example goals
INSERT INTO public.goals (name, description, type, status, farm_id, target_value, current_value, progress, metrics, strategy, priority, deadline)
VALUES 
  ('Monthly Profit Target', 'Achieve a 5% monthly profit across the farm', 'profit', 'in_progress', 1, 0.05, 0.032, 0.64, '{"startValue": 10000, "currentValue": 10320, "targetValue": 10500}'::jsonb, 'Incremental growth with controlled risk', 'high', now() + interval '15 days'),
  ('Risk Reduction', 'Reduce maximum drawdown to under 10%', 'risk', 'in_progress', 1, 0.10, 0.14, 0.40, '{"startValue": 0.22, "currentValue": 0.14, "targetValue": 0.10}'::jsonb, 'Implement tighter stop-losses and improve risk scoring', 'medium', now() + interval '30 days');
