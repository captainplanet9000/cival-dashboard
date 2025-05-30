import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Set a timeout for Supabase operations
const TIMEOUT_MS = 15000; // 15 seconds

// This route checks if a farm exists and creates a default one if not
export async function GET(request: Request) {
  // Don't use createServerClient() to avoid any circular dependencies or app/pages conflicts
  let supabase;
  
  try {
    // For development purposes, use the SUPABASE_SERVICE_ROLE_KEY
    // This bypasses RLS policies and allows operations without authentication
    // In production, this should be properly secured
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    console.log('Creating Supabase client with admin access');
    supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
    
    // Simple diagnostic test of the Supabase connection
    console.log('Checking Supabase connection...');
    
    // Check for existing farms with timeout
    const fetchPromise = supabase.from('farms').select('id, name').limit(1);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Database query timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
    });
    
    // Use a properly typed Promise.race with explicit handling for timeout
    const raceResult = await Promise.race([
      fetchPromise,
      timeoutPromise.catch(error => {
        throw error; // Re-throw to be caught by the outer try-catch
      })
    ]);
    
    // If we get here, fetchPromise resolved before the timeout
    const { data: existingFarms, error: fetchError } = raceResult;
    
    if (fetchError) {
      console.error('Error fetching farms:', fetchError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to check farms: ${fetchError.message}`,
          details: fetchError
        },
        { status: 500 }
      );
    }
    
    console.log('Farms query successful, farms found:', existingFarms?.length || 0);
    
    // If there's an existing farm, return it
    if (existingFarms && existingFarms.length > 0) {
      return NextResponse.json(
        { success: true, data: existingFarms[0] },
        { status: 200 }
      );
    }
    
    console.log('No farms found, creating default farm...');
    
    // Create a default farm if none exists
    // For development purposes, we'll use a default user ID instead of requiring authentication
    // This makes the app work without auth during development
    console.log('Creating farm with default user ID');
    
    // DEVELOPMENT MODE ONLY - NEVER DO THIS IN PRODUCTION!
    // Create a consistent UUID for development that works with RLS policies
    // In production, this would come from real authentication
    const userId = 'fb5c9676-db95-45cd-b4d5-16dc09fb54b8';
    
    console.log(`Creating farm with development user ID: ${userId}`);
    
    // Create the farm with the required schema fields
    const { data: newFarm, error: createError } = await supabase
      .from('farms')
      .insert({
        name: 'Default Trading Farm',
        description: 'Auto-created farm for ElizaOS agents',
        user_id: userId,
        status: 'active',
        is_active: true,
        // Store risk parameters in settings JSON
        settings: {
          max_drawdown: 5.0,
          max_trade_size: 1000,
          risk_per_trade: 1.0,
          volatility_tolerance: 'medium'
        }
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating default farm:', createError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to create default farm: ${createError.message}`,
          details: createError 
        },
        { status: 500 }
      );
    }
    
    console.log('Default farm created successfully:', newFarm);
    
    return NextResponse.json(
      { success: true, data: newFarm },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in farm API:', error);
    
    // Get detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    return NextResponse.json(
      { 
        success: false, 
        error: `An unexpected error occurred: ${errorMessage}`,
        details: { message: errorMessage, stack: errorStack }
      },
      { status: 500 }
    );
  }
}
