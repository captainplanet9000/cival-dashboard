/**
 * Supabase Server Client
 * Use this in server components and server actions to interact with Supabase
 */
import { createServerClient as createServerClientCookies, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type Database } from '@/types/database.types';

// Load configuration from environment or fallback to our known values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgzMTU1OSwiZXhwIjoyMDUyNDA3NTU5fQ.TZLKwHuMxv9xtSc0wJ7DG5ivjw0K-7NztPeLRsGqMAA';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.RXkvfJuYTPCcQNSOxCEzRg0NRreSHtJCK9gZHBUX4Ls';

/**
 * Creates a Supabase client for use in server environments
 * Using cookie-based auth with Next.js cookies() API
 * Compatible with Next.js 15.2.4
 */
export async function createServerClient() {
  const cookieStore = await cookies();
  
  return createServerClientCookies<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
      cookies: {
        async get(name: string) {
          const cookie = await cookieStore.get(name);
          return cookie?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          await cookieStore.set(name, value, options);
        },
        async remove(name: string, options: CookieOptions) {
          await cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
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
  const cookieStore = await cookies();
  
  return createServerClientCookies<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      cookieOptions: {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
      cookies: {
        async get(name: string) {
          const cookie = await cookieStore.get(name);
          return cookie?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          await cookieStore.set(name, value, options);
        },
        async remove(name: string, options: CookieOptions) {
          await cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
      auth: {
        persistSession: false,
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
