/**
 * Supabase Server Client
 * Use this in server components and server actions to interact with Supabase
 */
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { ExtendedDatabase } from '@/types/supabase-extensions';

// Load configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Create a Supabase client for use in server-side contexts
 * This version works with both pages/ and app/ directory setups
 */
export function createServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('⚠️ Supabase server connection failed: Missing environment variables');
    throw new Error('Missing Supabase environment configuration');
  }

  return createClient<ExtendedDatabase>(
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
 * Create an admin Supabase client with service role privileges
 * ONLY USE THIS IN TRUSTED SERVER CONTEXTS - NEVER EXPOSE IN CLIENT CODE
 */
export async function createServerAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('⚠️ Supabase admin connection failed: Missing service role key');
    throw new Error('Missing Supabase service role key');
  }

  return createClient<ExtendedDatabase>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: { 'x-application-name': 'trading-farm-dashboard-admin' }
      }
    }
  );
}

/**
 * Get the authenticated user from the server context
 */
export async function getAuthenticatedUser() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the authenticated session from the server context
 */
export async function getSession() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
