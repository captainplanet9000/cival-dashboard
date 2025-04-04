/**
 * Supabase Browser Client
 * Use this in client components to interact with Supabase
 */
import { createClient } from '@supabase/supabase-js';
import type { ExtendedDatabase } from '@/types/supabase-extensions';

// Load configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate configuration is available
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key missing from environment variables');
  // Don't throw error here to avoid breaking the build, but log a clear message
}

/**
 * Creates a Supabase client for use in browser environments
 */
export function createBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('⚠️ Supabase connection failed: Missing environment variables');
    // Return a dummy client that won't actually connect but won't break the app
    // This is better than returning null which would cause runtime errors
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  return createClient<ExtendedDatabase>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      fetch: fetch.bind(globalThis),
      headers: { 'x-application-name': 'trading-farm-dashboard' }
    }
  });
}

// Singleton pattern for client-side usage
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get a singleton instance of the Supabase client for browser use
 */
export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient();
  }
  return browserClient;
}
