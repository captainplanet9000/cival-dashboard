-- Fix for missing user_id column in agents table
-- This migration adds the missing user_id column and fixes the Row Level Security policy

-- First, add the missing user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'agents' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.agents ADD COLUMN user_id UUID REFERENCES auth.users(id);
    
    -- Update existing records to associate with a default user if needed
    -- This is a placeholder - in production you'd want a more specific strategy
    -- UPDATE public.agents SET user_id = (SELECT id FROM auth.users LIMIT 1);
  END IF;
END
$$;

-- Drop the existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Users can view their agents" ON public.agents;

-- Create the correct policy
CREATE POLICY "Users can view their agents" 
  ON public.agents 
  FOR SELECT 
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Add a policy for inserting agents
DROP POLICY IF EXISTS "Users can create their agents" ON public.agents;
CREATE POLICY "Users can create their agents" 
  ON public.agents 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Add a policy for updating agents
DROP POLICY IF EXISTS "Users can update their agents" ON public.agents;
CREATE POLICY "Users can update their agents" 
  ON public.agents 
  FOR UPDATE 
  USING (user_id = auth.uid());

-- Add a policy for deleting agents
DROP POLICY IF EXISTS "Users can delete their agents" ON public.agents;
CREATE POLICY "Users can delete their agents" 
  ON public.agents 
  FOR DELETE 
  USING (user_id = auth.uid());
