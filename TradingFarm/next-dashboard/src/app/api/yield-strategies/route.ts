
export async function GET(request) {
  return Response.json({
    success: true,
    message: 'Mock data for src/app/api/yield-strategies/route.ts',
    data: []
  });
}

export async function POST(request) {
  return Response.json({
    success: true,
    message: 'Mock POST handler for src/app/api/yield-strategies/route.ts',
    id: 'mock-id-' + Date.now()
  });
}
