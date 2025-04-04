import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

/**
 * Simple API route to test Supabase connection
 * This will help diagnose if the environment variables are correctly configured
 */
export async function GET() {
  try {
    // Create a server client instance
    const supabase = createServerClient();
    
    // Attempt to get the current user session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      return NextResponse.json({
        status: 'error',
        message: 'Supabase connection failed',
        error: error.message,
        hint: 'Check your .env.local file for correct Supabase credentials'
      }, { status: 500 });
    }
    
    // Try a simple database query to verify DB connection
    const { data: testData, error: dbError } = await supabase
      .from('farms')
      .select('count(*)')
      .limit(1)
      .single();
    
    if (dbError) {
      return NextResponse.json({
        status: 'partial',
        message: 'Auth connected but DB query failed',
        error: dbError.message,
        session: data.session ? 'Active' : 'None',
        hint: 'Check table permissions or RLS policies'
      }, { status: 500 });
    }
    
    // Connection is successful
    return NextResponse.json({
      status: 'success',
      message: 'Supabase connection is working correctly',
      auth: data.session ? 'Authenticated' : 'Not authenticated',
      db_test: 'Successful',
      env_vars: {
        url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        key_set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        service_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
  } catch (e) {
    console.error('Unexpected error in Supabase test endpoint:', e);
    return NextResponse.json({
      status: 'error',
      message: 'Unexpected error testing Supabase connection',
      error: e instanceof Error ? e.message : String(e)
    }, { status: 500 });
  }
}
