"use client";

/**
 * Client-side Supabase client
 * Use this in client components to interact with Supabase
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Check if we should use mock data (for local development without Supabase)
const useMockData = typeof window !== 'undefined' && 
                  (window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1') && 
                  (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' || 
                   !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                   !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * Create a Supabase client for use in browser contexts
 */
export function createBrowserClient() {
  // For production, create a real Supabase client
  if (!useMockData && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
  }
  
  // For development without Supabase, return a mock client
  console.warn('Using mock Supabase client - connect to a real database for production');
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: {}, error: null }),
          order: () => ({
            limit: () => ({ data: [], error: null }),
          }),
        }),
        order: () => ({
          limit: () => ({ data: [], error: null }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: {}, error: null }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({ data: {}, error: null }),
          }),
        }),
      }),
      delete: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({ data: {}, error: null }),
          }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        upload: async () => ({ data: {}, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
    // Add other methods as needed
  };
}

export default { createBrowserClient };
