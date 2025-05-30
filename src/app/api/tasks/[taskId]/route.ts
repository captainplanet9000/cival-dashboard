import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(
    request: Request,
    { params }: { params: { taskId: string } }
) {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taskId = params.taskId;
    // Basic UUID validation (lowercase and uppercase letters allowed)
    if (!taskId || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(taskId)) {
        return NextResponse.json({ error: 'Invalid task ID format' }, { status: 400 });
    }

    const pythonApiBaseUrl = process.env.PYTHON_API_BASE_URL || 'http://localhost:8000';
    // Pass authenticated user_id to Python service for authorization
    const pythonEndpoint = `${pythonApiBaseUrl}/tasks/${taskId}?user_id=${user.id}`; 

    try {
        const response = await fetch(pythonEndpoint, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            const errorText = await response.text(); // Get raw text for more flexible error parsing
            console.error(`Error from Python service getting task (${response.status}):`, errorText);
            try {
                // Attempt to parse Python's HTTPException detail if possible
                const jsonError = JSON.parse(errorText);
                return NextResponse.json({ error: jsonError.detail || `Python service error: ${response.statusText}` }, { status: response.status });
            } catch (e) {
                 // If parsing fails, return the raw text or a generic message
                 return NextResponse.json({ error: `Python service error: ${response.statusText || errorText}` }, { status: response.status });
            }
        }

        const responseData = await response.json(); // Should be AgentTask from Python service
        return NextResponse.json(responseData, { status: 200 });

    } catch (error: any) {
        console.error('Error calling Python service for task status:', error);
        return NextResponse.json(
            { error: `Internal server error: ${error.message || 'Failed to connect to Python service for task status'}` },
            { status: 500 }
        );
    }
}
