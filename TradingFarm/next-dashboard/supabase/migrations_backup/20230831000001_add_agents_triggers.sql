-- supabase/migrations/20230831000001_add_agents_triggers.sql

-- Add the updated_at trigger to the agents table
-- This assumes the public.handle_updated_at function and public.agents table exist

DROP TRIGGER IF EXISTS handle_agents_updated_at ON public.agents;
CREATE TRIGGER handle_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();
