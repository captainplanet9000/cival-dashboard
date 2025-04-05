/**
 * Server-side Supabase client
 * Use this in server components and server actions to interact with Supabase
 */
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { ExtendedDatabase } from '@/types/supabase-extensions';
import { createServerClient as createMockServerClient } from './mock-client';

// Load configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if we should use mock data
const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' || 
                   !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                   !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Create a Supabase client for use in server-side contexts
 * This version works with both pages/ and app/ directory setups
 */
export async function createServerClient() {
  if (useMockData) {
    // Use mock client if we're in development mode or missing credentials
    console.log('Using mock Supabase server client');
    return createMockServerClient();
  }

  // Create and return a Supabase client for the server
  return createClient<ExtendedDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false, // Don't persist session in server context
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: 'pkce',
        cookieOptions: {
          name: 'sb-session',
          path: '/',
          sameSite: 'lax',
          domain: '',
          secure: true
        }
      },
      global: {
        headers: {
          'x-my-custom-header': 'tradingfarm-server'
        },
        fetch: undefined, // Use default fetch implementation
      },
      db: {
        schema: 'public'
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
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the authenticated session from the server context
 */
export async function getSession() {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
