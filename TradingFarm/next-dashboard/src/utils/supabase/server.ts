/**
 * Supabase Server Client
 * Use this in server components and server actions to interact with Supabase
 */
import { createClient } from '@supabase/supabase-js';
import { type Database } from '@/types/database.types';

// Load configuration from environment or fallback to our known values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgzMTU1OSwiZXhwIjoyMDUyNDA3NTU5fQ.TZLKwHuMxv9xtSc0wJ7DG5ivjw0K-7NztPeLRsGqMAA';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.RXkvfJuYTPCcQNSOxCEzRg0NRreSHtJCK9gZHBUX4Ls';

/**
 * Creates a Supabase client for use in server environments
 * This version works with both pages/ and app/ directory setups
 */
export async function createServerClient() {
  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false, // Don't persist session in server context
        autoRefreshToken: false,
      },
      global: {
        headers: { 'x-application-name': 'trading-farm-dashboard' }
      }
    }
  );
}

/**
 * Creates a Supabase admin client for use in server environments
 * Using the service role key to bypass RLS policies
 * !CAUTION: Only use this in secure server contexts, never on the client side
 */
export async function createServerAdminClient() {
  return createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: { 
          'x-application-name': 'trading-farm-dashboard-admin',
          'x-admin-access': 'true'
        }
      }
    }
  );
}
