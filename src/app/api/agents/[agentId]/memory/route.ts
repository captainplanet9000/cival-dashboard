import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest, // Use NextRequest to easily access searchParams
  { params }: { params: { agentId: string } }
) {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const agentId = params.agentId;
  if (!agentId || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(agentId)) {
    return NextResponse.json({ error: 'Invalid agent ID format' }, { status: 400 });
  }

  // Get query parameters from the request URL
  const query = request.nextUrl.searchParams.get('query') || "*"; // Default to "*" if not provided
  const limit = request.nextUrl.searchParams.get('limit') || "20"; // Default to "20" if not provided

  const pythonApiBaseUrl = process.env.PYTHON_API_BASE_URL || 'http://localhost:8000';
  
  // Construct query parameters for Python endpoint
  const pythonParams = new URLSearchParams({
    user_id: user.id, // Pass authenticated user_id for authorization at Python service
    query: query,
    limit: limit,
  });
  const pythonEndpoint = `${pythonApiBaseUrl}/agents/${agentId}/memory?${pythonParams.toString()}`;

  try {
    const pythonResponse = await fetch(pythonEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add any other necessary headers if your Python service expects them
      },
    });

    const responseData = await pythonResponse.json();

    if (!pythonResponse.ok) {
      console.error(`Error from Python service fetching memories for agent ${agentId} (${pythonResponse.status}):`, responseData);
      return NextResponse.json(
        { error: responseData.detail || `Python service error: ${pythonResponse.statusText}` },
        { status: pythonResponse.status }
      );
    }
    
    return NextResponse.json(responseData, { status: pythonResponse.status });

  } catch (error: any) {
    console.error(`Error calling Python service for agent ${agentId} memories:`, error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || 'Failed to connect to Python service'}` },
      { status: 500 }
    );
  }
}
