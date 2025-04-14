-- SQL script to examine the database structure
SELECT 
    table_name,
    string_agg(column_name || ' (' || data_type || ')', ', ') as columns
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
GROUP BY 
    table_name
ORDER BY 
    table_name;
