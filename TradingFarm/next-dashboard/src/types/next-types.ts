/**
 * Type definitions for Next.js 15.x API routes
 * This file addresses the import issues with NextRequest and NextResponse
 */
import type { NextRequest as OriginalNextRequest } from 'next/server';
export { NextResponse } from 'next/server';

// Re-export NextRequest type to ensure compatibility across different Next.js versions
export type NextRequest = OriginalNextRequest;

// Helper types for API routes
export type NextApiHandler = (
  req: NextRequest
) => Promise<Response> | Response;
