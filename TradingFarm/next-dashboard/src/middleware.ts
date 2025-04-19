import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
  ],
};

export async function middleware(request: NextRequest) {
  // No authentication: all routes are accessible
  return NextResponse.next();
}
