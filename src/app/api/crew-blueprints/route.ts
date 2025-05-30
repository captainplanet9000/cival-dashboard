import { NextResponse } from 'next/server';
// No server-side Supabase client needed here for user auth, 
// as listing blueprints is considered a public action for now.

export async function GET(request: Request) {
    const pythonApiBaseUrl = process.env.PYTHON_API_BASE_URL || 'http://localhost:8000';
    const pythonEndpoint = `${pythonApiBaseUrl}/crew-blueprints`;

    try {
        const response = await fetch(pythonEndpoint, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                // Add any other necessary headers for Python service if needed in future
            },
        });

        const responseData = await response.json();

        if (!response.ok) {
            // Log the error on the Next.js server side
            console.error(`Error from Python service fetching blueprints (${response.status}):`, responseData);
            // Return a structured error to the client
            return NextResponse.json(
                { error: responseData.detail || `Python service error: ${response.statusText}` },
                { status: response.status }
            );
        }
        
        // Forward the successful response (list of CrewBlueprintInterface)
        return NextResponse.json(responseData, { status: 200 });

    } catch (error: any) {
        console.error('Error calling Python service for crew blueprints:', error);
        return NextResponse.json(
            { error: `Internal server error: ${error.message || 'Failed to connect to Python service for crew blueprints'}` },
            { status: 500 }
        );
    }
}
