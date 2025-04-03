import { createServerClient } from './server';

/**
 * Utility functions for database operations and schema checks
 */

/**
 * Check if a table exists in the database
 * @param tableName Table name to check
 * @returns Boolean indicating if the table exists
 */
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase.rpc(
      'check_table_exists',
      { table_name: tableName } as any
    );
    
    if (error) {
      // If the RPC itself fails, try direct SQL
      console.warn('RPC check_table_exists failed, trying direct SQL check');
      
      const { data: directData, error: directError } = await supabase.from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .limit(1);
        
      if (directError) {
        console.error('Failed to check if table exists:', directError);
        return false;
      }
      
      return directData && directData.length > 0;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error checking if table exists:', error);
    return false;
  }
}

/**
 * Check if a database function exists
 * @param functionName Function name to check
 * @returns Boolean indicating if the function exists
 */
export async function functionExists(functionName: string): Promise<boolean> {
  try {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase.from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .eq('routine_name', functionName)
      .limit(1);
      
    if (error) {
      console.error('Failed to check if function exists:', error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking if function exists:', error);
    return false;
  }
}

/**
 * Safely execute a database function with fallback
 * @param functionName Name of the function to execute
 * @param params Parameters to pass to the function
 * @param fallbackFn Fallback function to execute if the database function doesn't exist
 * @returns Result of the function call or fallback
 */
export async function safeExecuteFunction<T, U>(
  functionName: string, 
  params: T,
  fallbackFn: () => Promise<U>
): Promise<U> {
  try {
    const fnExists = await functionExists(functionName);
    
    if (!fnExists) {
      return await fallbackFn();
    }
    
    const supabase = await createServerClient();
    const { data, error } = await supabase.rpc(functionName, params as any);
    
    if (error) {
      console.warn(`Error executing ${functionName}:`, error);
      return await fallbackFn();
    }
    
    return data as unknown as U;
  } catch (error) {
    console.error(`Error in safeExecuteFunction for ${functionName}:`, error);
    return await fallbackFn();
  }
}

/**
 * Create a stored procedure in the database to check if tables exist
 * This should be run through a migration
 */
export const createTableExistsFunction = `
CREATE OR REPLACE FUNCTION check_table_exists(table_name TEXT)
RETURNS BOOLEAN
SECURITY INVOKER
AS $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  -- Set search path for security
  SET search_path = '';
  
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = check_table_exists.table_name
  ) INTO table_exists;
  
  RETURN table_exists;
END;
$$ LANGUAGE plpgsql;
`;
