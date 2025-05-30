-- supabase/migrations/YYYYMMDDHHMMSS_create_crew_blueprints.sql

CREATE TABLE IF NOT EXISTS public.crew_blueprints (
    blueprint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    input_schema JSONB, -- JSON Schema for expected kickoff inputs
    python_crew_identifier TEXT NOT NULL UNIQUE, -- Key to map to Python Crew object
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.crew_blueprints IS 'Stores definitions of launchable CrewAI crew blueprints.';

-- Ensure the trigger function exists (idempotent)
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create (to ensure it's on the correct version of the function)
DROP TRIGGER IF EXISTS set_crew_blueprints_updated_at ON public.crew_blueprints;
CREATE TRIGGER set_crew_blueprints_updated_at
BEFORE UPDATE ON public.crew_blueprints
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- RLS: Allow authenticated users to read, service_role to manage.
ALTER TABLE public.crew_blueprints ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create (idempotent-like for policies)
DROP POLICY IF EXISTS "Allow authenticated read access to crew blueprints" ON public.crew_blueprints;
CREATE POLICY "Allow authenticated read access to crew blueprints"
  ON public.crew_blueprints FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to crew blueprints" ON public.crew_blueprints;
CREATE POLICY "Allow service_role full access to crew blueprints"
  ON public.crew_blueprints FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed a default blueprint for the existing trading_crew
INSERT INTO public.crew_blueprints (name, description, input_schema, python_crew_identifier)
VALUES (
    'Symbol Trading Analysis & Advice',
    'Analyzes a symbol using Market Analyst and Trade Advisor agents to provide a trade signal.',
    '{
        "type": "object",
        "properties": {
            "symbol": { "type": "string", "description": "The financial symbol to analyze, e.g., BTC/USD" },
            "market_data_summary": { "type": "string", "description": "A brief text summary of current market conditions for the symbol." }
        },
        "required": ["symbol", "market_data_summary"]
    }'::jsonb,
    'default_trading_crew' -- This key will map to trading_crew in Python
) ON CONFLICT (name) DO NOTHING;

-- Add another example blueprint for testing/demonstration if needed
INSERT INTO public.crew_blueprints (name, description, input_schema, python_crew_identifier)
VALUES (
    'Simple Research Crew',
    'Performs a basic research task with a single agent.',
    '{
        "type": "object",
        "properties": {
            "topic": { "type": "string", "description": "The research topic." },
            "question": { "type": "string", "description": "Specific question to answer about the topic." }
        },
        "required": ["topic", "question"]
    }'::jsonb,
    'simple_research_crew' -- This would map to a different Crew object in Python
) ON CONFLICT (name) DO NOTHING;
