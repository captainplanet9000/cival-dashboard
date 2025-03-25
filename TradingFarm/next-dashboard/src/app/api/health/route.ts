import { NextResponse } from 'next/server';

/**
 * Simple health check endpoint to verify API functionality
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}
