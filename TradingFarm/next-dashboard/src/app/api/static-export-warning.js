// API routes are not available in static exports
// This file serves as a warning for static export builds

export const dynamic = 'force-static';

export async function GET() {
  return new Response(
    JSON.stringify({
      error: 'API routes are not available in static exports',
      message: 'This is a static export of the Trading Farm dashboard. API functionality requires server deployment.'
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

export async function POST() {
  return new Response(
    JSON.stringify({
      error: 'API routes are not available in static exports',
      message: 'This is a static export of the Trading Farm dashboard. API functionality requires server deployment.'
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
