/**
 * Trading Strategy API Endpoints - Mock Implementation
 * 
 * This is a simplified mock implementation to avoid TypeScript errors during build.
 */
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({
    success: false,
    error: 'This is a mock implementation for build purposes only.',
    message: 'The Trading Strategies API is not available in this environment.',
    id: params.id,
    metadata: {
      isMock: true
    }
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({
    success: false,
    error: 'This is a mock implementation for build purposes only.',
    message: 'The Trading Strategies API is not available in this environment.',
    id: params.id,
    metadata: {
      isMock: true
    }
  });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({
    success: false,
    error: 'This is a mock implementation for build purposes only.',
    message: 'The Trading Strategies API is not available in this environment.',
    id: params.id,
    metadata: {
      isMock: true
    }
  });
}
