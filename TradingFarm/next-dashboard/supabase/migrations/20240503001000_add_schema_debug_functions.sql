-- Add diagnostic functions for schema debugging

-- Function to check ID column types across tables
CREATE OR REPLACE FUNCTION public.check_id_columns()
RETURNS TABLE (
  table_name TEXT,
  column_name TEXT,
  data_type TEXT,
  udt_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.table_name::TEXT, 
    c.column_name::TEXT, 
    c.data_type::TEXT,
    c.udt_name::TEXT
  FROM 
    information_schema.columns c
  WHERE 
    c.table_schema = 'public'
    AND (c.column_name = 'id' OR c.column_name LIKE '%_id')
  ORDER BY 
    c.table_name, 
    c.column_name;
END;
$$;

-- Let's also create a function to check a specific table's structure
CREATE OR REPLACE FUNCTION public.check_table_structure(p_table_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable TEXT,
  column_default TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::TEXT, 
    c.data_type::TEXT,
    c.is_nullable::TEXT,
    c.column_default::TEXT
  FROM 
    information_schema.columns c
  WHERE 
    c.table_schema = 'public'
    AND c.table_name = p_table_name
  ORDER BY 
    c.ordinal_position;
END;
$$;

-- Create a function to list all foreign key constraints
CREATE OR REPLACE FUNCTION public.list_foreign_keys()
RETURNS TABLE (
  constraint_name TEXT,
  table_name TEXT,
  column_name TEXT,
  foreign_table_name TEXT,
  foreign_column_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.constraint_name::TEXT,
    tc.table_name::TEXT,
    kcu.column_name::TEXT,
    ccu.table_name::TEXT AS foreign_table_name,
    ccu.column_name::TEXT AS foreign_column_name
  FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
  WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
  ORDER BY
    tc.table_name,
    kcu.column_name;
END;
$$;
