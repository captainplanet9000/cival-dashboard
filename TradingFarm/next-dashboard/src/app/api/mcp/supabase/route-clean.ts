/**
 * Supabase MCP API Route - Mock Implementation
 * 
 * This is a simplified mock implementation to avoid TypeScript errors during build.
 */
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'This is a mock implementation for build purposes only.',
    message: 'The Supabase MCP API is not available in this environment.',
    metadata: {
      isMock: true
    }
  });
}

export const GET = POST;
export const PUT = POST;
export const DELETE = POST;
