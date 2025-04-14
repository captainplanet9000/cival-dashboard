-- Query to check column types for all tables in the public schema
SELECT 
    table_name, 
    column_name, 
    data_type,
    udt_name
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND (column_name = 'id' OR column_name LIKE '%_id')
ORDER BY 
    table_name, 
    column_name;

-- Check specifically for the farms table structure
SELECT 
    table_name, 
    column_name, 
    data_type,
    udt_name
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name = 'farms'
ORDER BY 
    column_name;

-- List all tables in public schema
SELECT 
    table_name
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
ORDER BY 
    table_name;

-- Check for existing wallet-related tables
SELECT 
    table_name
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
    AND table_name LIKE 'wallet%'
ORDER BY 
    table_name;
