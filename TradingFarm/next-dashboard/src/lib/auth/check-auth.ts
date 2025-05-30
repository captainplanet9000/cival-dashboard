/**
 * Authentication utility functions for API routes
 * This is a stub implementation that will be replaced with actual authentication
 */
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/next-auth-stubs';
import { createServerClient } from '@/utils/supabase/server';

export type UserData = {
  id: string;
  email: string;
  name?: string;
}

/**
 * Checks if the user is authenticated and returns the user data
 * @returns Object containing user data and next response in case of error
 */
export async function checkAuth(): Promise<{ user: UserData | null; errorResponse: NextResponse | null }> {
  // Get session from NextAuth
  const session = await getServerSession();
  
  if (!session || !session.user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    };
  }
  
  // Return user data from session
  return {
    user: {
      id: session.user.id || 'user-123', // Fallback to a dummy ID
      email: session.user.email || 'user@example.com',
      name: session.user.name
    },
    errorResponse: null
  };
}

/**
 * Middleware-style function that runs authentication check and early returns if not authenticated
 * @param handler The handler function to run if authentication passes
 */
export function withAuth<T>(handler: (user: UserData, ...args: any[]) => Promise<T>) {
  return async (...args: any[]): Promise<T | NextResponse> => {
    const { user, errorResponse } = await checkAuth();
    
    if (!user) {
      return errorResponse as NextResponse;
    }
    
    return handler(user, ...args);
  };
}

/**
 * Check if the user has access to a specific resource using Supabase RLS
 * @param userId The user ID
 * @param resourceTable The table name
 * @param resourceId The resource ID
 * @returns Boolean indicating whether the user has access
 */
export async function checkResourceAccess(
  userId: string,
  resourceTable: string,
  resourceId: string
): Promise<boolean> {
  try {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from(resourceTable)
      .select('id')
      .eq('id', resourceId)
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error checking resource access:`, error);
    return false;
  }
}
