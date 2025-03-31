/**
 * Supabase Browser Client
 * Use this in client components to interact with Supabase
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Load configuration from environment or fallback to our known values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';

/**
 * Creates a Supabase client for use in browser environments
 */
export function createBrowserClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
