import { NextResponse } from 'next/server';

// Fallback API route for routes replaced by webpack during build
export async function GET() {
  return NextResponse.json({ message: 'API route not available' }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ message: 'API route not available' }, { status: 404 });
}
