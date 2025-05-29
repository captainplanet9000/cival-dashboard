import { type NextRequest, NextResponse } from 'next/server'; // Ensure NextRequest is imported if specific features are used, else Request is fine
import { createServerClient } from '@/utils/supabase/server'; 
import type { TriggerCrewRunPayload, TriggerCrewRunResponse } from '@/lib/types/crew'; 

export async function POST(request: NextRequest) { // Using NextRequest for consistency
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: TriggerCrewRunPayload;
    try {
        payload = await request.json();
    } catch (e) {
        return NextResponse.json({ error: 'Invalid request body: Malformed JSON' }, { status: 400 });
    }

    const { symbol, market_data_summary } = payload;

    if (!symbol || typeof symbol !== 'string' || symbol.trim() === '') { // Added more robust check
        return NextResponse.json({ error: 'Symbol is required and must be a non-empty string' }, { status: 400 });
    }
    if (market_data_summary !== undefined && (typeof market_data_summary !== 'string')) { // market_data_summary is optional
        return NextResponse.json({ error: 'market_data_summary must be a string if provided' }, { status: 400 });
    }


    const pythonApiBaseUrl = process.env.PYTHON_API_BASE_URL || 'http://localhost:8000';
    const pythonEndpoint = `${pythonApiBaseUrl}/crew/run_trading_analysis`;

    try {
        const pythonPayload = {
            symbol: symbol,
            user_id: user.id, 
            market_data_summary: market_data_summary || `Market summary for ${symbol} not provided.` 
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
