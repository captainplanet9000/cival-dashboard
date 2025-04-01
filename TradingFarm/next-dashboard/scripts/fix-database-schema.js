#!/usr/bin/env node

/**
 * This script executes direct SQL commands to fix database schema issues,
 * especially when the PostgREST schema cache is not updated properly.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// SQL commands to fix the agents table
const fixAgentsTableSql = `
DO $$
BEGIN
    -- Check if configuration column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'agents'
        AND column_name = 'configuration'
    ) THEN
        ALTER TABLE public.agents ADD COLUMN configuration JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added configuration column to agents table';
    ELSE
        RAISE NOTICE 'Configuration column already exists in agents table';
    END IF;

    -- Force schema cache refresh
    ALTER TABLE public.agents ADD COLUMN _temp_column TEXT;
    ALTER TABLE public.agents DROP COLUMN _temp_column;
    RAISE NOTICE 'Refreshed schema cache for agents table';
END;
$$;

-- Create direct insert function
CREATE OR REPLACE FUNCTION public.direct_insert_agent(
    p_name TEXT,
    p_farm_id INTEGER,
    p_status TEXT DEFAULT 'initializing',
    p_type TEXT DEFAULT 'eliza',
    p_config JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_result JSONB;
    v_agent public.agents;
BEGIN
    INSERT INTO public.agents (
        name, 
        farm_id, 
        status, 
        type, 
        configuration, 
        created_at, 
        updated_at
    ) VALUES (
        p_name,
        p_farm_id,
        p_status,
        p_type,
        p_config,
        now(),
        now()
    )
    RETURNING * INTO v_agent;
    
    v_result = jsonb_build_object(
        'id', v_agent.id,
        'name', v_agent.name,
        'farm_id', v_agent.farm_id,
        'status', v_agent.status,
        'type', v_agent.type,
        'configuration', v_agent.configuration
    );
    
    RETURN v_result;
END;
$$;

-- Grant execution rights
GRANT EXECUTE ON FUNCTION public.direct_insert_agent TO authenticated;
GRANT EXECUTE ON FUNCTION public.direct_insert_agent TO service_role;

-- Create exec_sql function if it doesn't exist
CREATE OR REPLACE FUNCTION public.exec_sql(sql_string TEXT) 
RETURNS SETOF RECORD 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY EXECUTE sql_string;
END;
$$;

-- Grant execution rights
GRANT EXECUTE ON FUNCTION public.exec_sql TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql TO service_role;
`;

// Create temporary SQL file
const sqlFilePath = path.resolve(__dirname, '../temp-fix-schema.sql');
fs.writeFileSync(sqlFilePath, fixAgentsTableSql);

console.log('Running SQL commands to fix database schema...');

try {
    // Run the SQL commands using Supabase CLI
    execSync(`npx supabase db execute --file ${sqlFilePath}`, {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit'
    });
    
    console.log('\nSuccessfully fixed database schema.');
    console.log('Regenerating TypeScript types...');
    
    // Regenerate TypeScript types
    execSync('npx supabase gen types typescript --local > src/types/database.types.ts', {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit'
    });
    
    console.log('\nSuccessfully regenerated TypeScript types.');
    console.log('Restarting Supabase services to clear caches...');
    
    // Restart Supabase services
    execSync('npx supabase stop && npx supabase start', {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit'
    });
    
    console.log('\nDatabase schema fix complete!');
    console.log('\nTry creating an agent now. If you still encounter issues, restart your Next.js development server.');
} catch (error) {
    console.error('Error fixing database schema:', error.message);
} finally {
    // Clean up temporary SQL file
    if (fs.existsSync(sqlFilePath)) {
        fs.unlinkSync(sqlFilePath);
    }
}
