import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest, // Keep NextRequest for consistency
  { params }: { params: { taskId: string } }
) {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const taskId = params.taskId;
  if (!taskId || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID format' }, { status: 400 });
  }

  const pythonApiBaseUrl = process.env.PYTHON_API_BASE_URL || 'http://localhost:8000';
  const pythonEndpoint = `${pythonApiBaseUrl}/tasks/${taskId}/reject_trade?user_id=${user.id}`;

  try {
    const pythonResponse = await fetch(pythonEndpoint, {
      method: 'POST',
      headers: {
        // 'Content-Type': 'application/json', // No body
      },
      // No body
    });

    const responseData = await pythonResponse.json();

    if (!pythonResponse.ok) {
      console.error(`Error from Python service rejecting trade for task ${taskId} (${pythonResponse.status}):`, responseData);
      return NextResponse.json(
        { error: responseData.detail || `Python service error: ${pythonResponse.statusText}` },
        { status: pythonResponse.status }
      );
    }
    
    return NextResponse.json(responseData, { status: pythonResponse.status });

  } catch (error: any) {
    console.error(`Error calling Python service for trade rejection (task ${taskId}):`, error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || 'Failed to connect to Python service'}` },
      { status: 500 }
    );
  }
}
