/**
 * Mock Supabase MCP API Route
 * 
 * This provides a mock implementation for the Supabase MCP route to bypass TypeScript errors during build.
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
