/**
 * Server-side Supabase client
 * Use this in server components and server actions to interact with Supabase
 * Compatible with both App Router and Pages Router
 * 
 * IMPORTANT: This utility is designed to work in both environments
 * without causing build errors related to next/headers
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Determine if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

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
  // Create and return a Supabase client for the server
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false, // Don't persist session in server context
        autoRefreshToken: false
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

  return createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
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

/**
 * Creates a Supabase client for server components
 * This function is designed to work in both App Router and Pages Router contexts
 * 
 * IMPORTANT: This version DOES NOT use next/headers at build time
 * to avoid Pages Router compatibility issues
 */
export const createServerComponentClient = async () => {
  try {
    // Use a universal approach that works in all environments
    // This ensures there are no build-time imports of App Router-only packages
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    throw new Error('Failed to initialize Supabase client');
  }
};
