-- Create a helper RPC function to insert logs without requiring updated TypeScript types
CREATE OR REPLACE FUNCTION public.insert_system_logs(logs JSONB[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
  log_entry JSONB;
  inserted_count INTEGER := 0;
  failed_count INTEGER := 0;
BEGIN
  -- Check if system_logs table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'system_logs'
  ) THEN
    -- Create a temporary log table if it doesn't exist yet
    CREATE TABLE IF NOT EXISTS public.temp_system_logs (
      id TEXT PRIMARY KEY,
      farm_id BIGINT,
      strategy_id BIGINT,
      agent_id BIGINT,
      source TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      context JSONB,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    
    RAISE NOTICE 'System logs table does not exist. Created temporary table: temp_system_logs';
  END IF;
  
  -- Process each log entry
  FOREACH log_entry IN ARRAY logs
  LOOP
    BEGIN
      -- Insert the log entry
      IF EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'system_logs'
      ) THEN
        -- Insert into actual system_logs table
        INSERT INTO public.system_logs (
          id, farm_id, strategy_id, agent_id, source, level, message, context, created_at
        ) VALUES (
          log_entry->>'id',
          (log_entry->>'farm_id')::BIGINT,
          (log_entry->>'strategy_id')::BIGINT,
          (log_entry->>'agent_id')::BIGINT,
          log_entry->>'source',
          log_entry->>'level',
          log_entry->>'message',
          log_entry->'context',
          COALESCE((log_entry->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW())
        );
      ELSE
        -- Insert into temporary table
        INSERT INTO public.temp_system_logs (
          id, farm_id, strategy_id, agent_id, source, level, message, context, created_at
        ) VALUES (
          log_entry->>'id',
          (log_entry->>'farm_id')::BIGINT,
          (log_entry->>'strategy_id')::BIGINT,
          (log_entry->>'agent_id')::BIGINT,
          log_entry->>'source',
          log_entry->>'level',
          log_entry->>'message',
          log_entry->'context',
          COALESCE((log_entry->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW())
        );
      END IF;
      
      inserted_count := inserted_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Track failed inserts
      failed_count := failed_count + 1;
      RAISE NOTICE 'Failed to insert log entry: %', log_entry;
    END;
  END LOOP;
  
  -- Return results
  result := jsonb_build_object(
    'success', inserted_count > 0,
    'inserted_count', inserted_count,
    'failed_count', failed_count
  );
  
  RETURN result;
END;
$$;
