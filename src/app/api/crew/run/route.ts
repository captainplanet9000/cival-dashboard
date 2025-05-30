import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server'; 
import type { TriggerCrewRunClientPayload, TriggerCrewRunResponse } from '@/lib/types/crew'; // Updated type

export async function POST(request: NextRequest) {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: TriggerCrewRunClientPayload;
    try {
        payload = await request.json();
    } catch (e) {
        return NextResponse.json({ error: 'Invalid request body: Malformed JSON' }, { status: 400 });
    }

    const { blueprint_id, inputs } = payload;

    // Basic validation for blueprint_id and inputs
    if (!blueprint_id || typeof blueprint_id !== 'string' || blueprint_id.trim() === '') {
        return NextResponse.json({ error: 'blueprint_id is required and must be a non-empty string' }, { status: 400 });
    }
    // Basic check for inputs being an object. More specific schema validation could be added if needed here,
    // or rely on Python backend's Pydantic validation based on blueprint's input_schema.
    if (inputs === undefined || typeof inputs !== 'object' || inputs === null) { 
        return NextResponse.json({ error: 'inputs are required and must be an object' }, { status: 400 });
    }
    // Example: Check for UUID format for blueprint_id if desired (simple regex)
    if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(blueprint_id)) {
        return NextResponse.json({ error: 'Invalid blueprint_id format. Must be a UUID.' }, { status: 400 });
    }


    const pythonApiBaseUrl = process.env.PYTHON_API_BASE_URL || 'http://localhost:8000';
    const pythonEndpoint = `${pythonApiBaseUrl}/crew/run_trading_analysis`; // This endpoint path in Python main.py was also updated

    try {
        // Construct payload for Python backend
        const pythonPayload = {
            blueprint_id: blueprint_id,
            user_id: user.id, 
            inputs: inputs 
        };

        const response = await fetch(pythonEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Example: Add an API key if the Python service is secured by one
                // 'X-Internal-API-Key': process.env.PYTHON_INTERNAL_API_KEY || '', 
            },
            body: JSON.stringify(pythonPayload),
        });

        if (!response.ok) {
            let errorData;
            try {
                 errorData = await response.json(); // Try to parse as JSON first
            } catch (e) {
                errorData = await response.text(); // Fallback to text if not JSON
            }
            console.error(`Error from Python service (${response.status}):`, errorData);
            return NextResponse.json(
                { error: `Python service error: ${response.statusText}`, details: errorData },
                { status: response.status }
            );
        }

        const responseData: TriggerCrewRunResponse = await response.json();
        // The Python service should return 200 OK with task_id if background task is accepted
        return NextResponse.json(responseData, { status: 200 }); 

    } catch (error: any) {
        console.error('Error calling Python service:', error);
        // Check if it's a network error (e.g., ECONNREFUSED)
        if (error.cause && typeof error.cause === 'object' && 'code' in error.cause) {
             if (error.cause.code === 'ECONNREFUSED') {
                return NextResponse.json(
                    { error: 'Failed to connect to Python service. Ensure it is running.'},
                    { status: 503 } // Service Unavailable
                );
            }
        }
        return NextResponse.json(
            { error: `Internal server error: ${error.message || 'Failed to connect to Python service'}` },
            { status: 500 }
        );
    }
}
