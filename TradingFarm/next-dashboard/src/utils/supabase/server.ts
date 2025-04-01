/**
 * Supabase Server Client
 * Use this in server components and server actions to interact with Supabase
 */
import { createClient } from '@supabase/supabase-js';
import { type Database } from '@/types/database.types';

// Load configuration from environment or fallback to our known values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Creates a Supabase client for use in server environments
 * This version works with both pages/ and app/ directory setups
 */
export async function createServerClient() {
  if (!supabaseAnonKey) {
    console.error('Missing Supabase anonymous key. Check your environment variables.');
  }
  
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
  if (!supabaseServiceKey) {
    console.error('Missing Supabase service role key. Check your environment variables.');
  }
  
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
