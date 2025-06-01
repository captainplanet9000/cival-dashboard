/**
 * Supabase client utilities for data access services
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

// Cached client instance to avoid recreating on every call
let cachedClient: SupabaseClient | null = null;

/**
 * Get a Supabase client instance appropriate for the current context
 * This will return a server-side client if called in a server context,
 * or a browser client if called from the client side
 */
export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (cachedClient) {
    return cachedClient;
  }

  // Determine if we're in a browser or server context
  // This is a simplified check - in practice, we'd use environment detection
  if (typeof window === 'undefined') {
    // Server context - use server client
    cachedClient = await createServerClient();
  } else {
    // Browser context - use browser client
    cachedClient = createBrowserClient();
  }

  return cachedClient;
}

/**
 * Clear the cached Supabase client
 * Useful when switching users or contexts
 */
export function clearSupabaseClient(): void {
  cachedClient = null;
}

/**
 * Get a Supabase server client
 * This should only be used in server components
 */
export async function getServerSupabaseClient(): Promise<SupabaseClient> {
  return createServerClient();
}

/**
 * Get a Supabase browser client
 * This should only be used in client components
 */
export function getBrowserSupabaseClient(): SupabaseClient {
  return createBrowserClient();
}

/**
 * Helper to extract user ID from the current session
 * Returns null if no session/user is found
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  
  return data.session?.user?.id || null;
}
