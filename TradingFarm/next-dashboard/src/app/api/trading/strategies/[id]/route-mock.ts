/**
 * Trading Strategies API Route - Mock Implementation
 * 
 * This is a simplified mock implementation to avoid TypeScript errors during build.
 */
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'This is a mock implementation for build purposes only.',
    message: 'The Trading Strategies API is not available in this environment.',
    metadata: {
      isMock: true
    }
  });
}

export async function PUT() {
  return NextResponse.json({
    success: false,
    error: 'This is a mock implementation for build purposes only.',
    message: 'The Trading Strategies API is not available in this environment.',
    metadata: {
      isMock: true
    }
  });
}

export async function DELETE() {
  return NextResponse.json({
    success: false,
    error: 'This is a mock implementation for build purposes only.',
    message: 'The Trading Strategies API is not available in this environment.',
    metadata: {
      isMock: true
    }
  });
}
