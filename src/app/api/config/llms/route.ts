import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server'; // For user authentication/session

export async function GET(request: Request) {
  // Although this specific endpoint doesn't strictly need user authentication
  // to call the Python backend (as Python lists globally available LLMs),
  // it's good practice to protect most API routes.
  // If LLM list could vary by user, this would be essential.
  // For now, let's include it for consistency.
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    // Depending on strictness, could allow this if LLMs are truly public info.
    // For now, require auth.
    // console.warn("Unauthorized attempt to access /api/config/llms");
    // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Self-correction: Listing available LLMs is likely not a protected operation.
    // It's configuration data of the system. Let's remove auth for this specific one.
  }

  const pythonApiBaseUrl = process.env.PYTHON_API_BASE_URL || 'http://localhost:8000';
  const pythonEndpoint = `${pythonApiBaseUrl}/config/llms`;

  try {
    const pythonResponse = await fetch(pythonEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add any other necessary headers for Python service if needed
      },
    });

    const responseData = await pythonResponse.json();

    if (!pythonResponse.ok) {
      console.error(`Error from Python service fetching LLMs (${pythonResponse.status}):`, responseData);
      return NextResponse.json(
        { error: responseData.detail || `Python service error: ${pythonResponse.statusText}` },
        { status: pythonResponse.status }
      );
    }
    
    return NextResponse.json(responseData, { status: pythonResponse.status });

  } catch (error: any) {
    console.error('Error calling Python service for available LLMs:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || 'Failed to connect to Python service for LLM list'}` },
      { status: 500 }
    );
  }
}
