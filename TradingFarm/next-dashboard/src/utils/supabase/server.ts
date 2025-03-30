/**
 * Supabase Server Client
 * Use this in server components and server actions to interact with Supabase
 */
import { createServerClient as createServerClientCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import { type Database } from '@/types/database.types';

// Load configuration from environment or fallback to our known values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgzMTU1OSwiZXhwIjoyMDUyNDA3NTU5fQ.TZLKwHuMxv9xtSc0wJ7DG5ivjw0K-7NztPeLRsGqMAA';

/**
 * Creates a Supabase client for use in server environments
 * Using cookie-based auth with Next.js cookies() API
 */
export async function createServerClient(cookieStore?: ReadonlyRequestCookies) {
  const cookieJar = cookieStore || cookies();
  
  return createServerClientCookies<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      cookies: {
        get(name: string) {
          return cookieJar.get(name)?.value;
        },
        set(name: string, value: string, options: { path: string; maxAge: number; domain?: string; sameSite?: string; secure?: boolean }) {
          cookieJar.set(name, value, options);
        },
        remove(name: string, options: { path: string; domain?: string; sameSite?: string; secure?: boolean }) {
          cookieJar.set(name, '', { ...options, maxAge: 0 });
        },
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true
      },
      global: {
        headers: { 'x-application-name': 'trading-farm-dashboard' }
      }
    }
  );
}

/**
 * Creates a Supabase admin client for use in server environments
 * This uses the service role key and bypasses RLS policies
 */
export async function createServerAdminClient() {
  return createServerClientCookies<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: { 
          'x-application-name': 'trading-farm-dashboard-admin',
          'x-admin-request': 'true' 
        }
      }
    }
  );
}
