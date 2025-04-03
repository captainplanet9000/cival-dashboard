-- Create utility functions for our application
-- This includes helper functions for checking if tables exist

-- Check table exists function
-- This function can be called from our application to check if a table exists before trying to access it
CREATE OR REPLACE FUNCTION public.check_table_exists(table_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  exists BOOLEAN;
BEGIN
  SELECT COUNT(*) > 0 INTO exists
  FROM pg_tables
  WHERE schemaname = 'public' 
  AND tablename = table_name;

  RETURN exists;
END;
$$;

-- Function to create the check_table_exists function
-- This is a utility function that can be called from our application to ensure the check_table_exists function is available
CREATE OR REPLACE FUNCTION public.create_check_table_exists_function()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- We're returning the function definition itself as a string
  EXECUTE $FUNC$
    CREATE OR REPLACE FUNCTION public.check_table_exists(table_name TEXT)
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
    AS $INNER$
    DECLARE
      exists BOOLEAN;
    BEGIN
      SELECT COUNT(*) > 0 INTO exists
      FROM pg_tables
      WHERE schemaname = 'public' 
      AND tablename = table_name;

      RETURN exists;
    END;
    $INNER$;
  $FUNC$;

  RETURN TRUE;
END;
$$;

-- Function to list all tables in the public schema
-- This is useful for debugging and exploring the database
CREATE OR REPLACE FUNCTION public.list_tables()
RETURNS TABLE (
  table_name TEXT,
  table_size BIGINT,
  row_count BIGINT,
  last_vacuum TIMESTAMP,
  last_analyze TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT, 
    pg_total_relation_size('public.' || t.tablename) AS table_size,
    (SELECT reltuples::BIGINT FROM pg_class WHERE oid = ('public.' || t.tablename)::regclass) AS row_count,
    last_vacuum,
    last_analyze
  FROM pg_tables t
  LEFT JOIN pg_stat_user_tables s ON t.tablename = s.relname
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
END;
$$;

-- Check if the pgvector extension exists
CREATE OR REPLACE FUNCTION public.pgvector_extension_exists()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  extension_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) > 0 INTO extension_exists
  FROM pg_extension
  WHERE extname = 'vector';
  
  RETURN extension_exists;
END;
$$;

-- Create check_function_exists to verify if a function exists in the database
CREATE OR REPLACE FUNCTION public.check_function_exists(function_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  exists BOOLEAN;
BEGIN
  SELECT COUNT(*) > 0 INTO exists
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = function_name;
  
  RETURN exists;
END;
$$;
