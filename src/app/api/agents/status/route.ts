import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server'; // Use server client for API routes

export async function GET(request: Request) {
    const supabase = createServerClient();

    try {
        // Fetch data from the agents table
        const { data: agents, error } = await supabase
            .from('agents')
            .select('
                id,
                agent_type,
                status,
                last_heartbeat_at,
                manager_id
            ')
            .order('created_at', { ascending: true }); // Optional: order by creation time

        if (error) {
            console.error('Error fetching agent statuses:', error);
            throw error; // Let the catch block handle it
        }

        // Return the data
        // Note: The actual type might differ slightly from AgentStatusInfo 
        //       defined in the component, but structure should be compatible.
        return NextResponse.json(agents || []);

    } catch (error: any) {
        console.error("Error in /api/agents/status:", error);
        return NextResponse.json(
            { error: `Internal Server Error: ${error.message || 'Unknown error'}` }, 
            { status: 500 }
        );
    }
}

// Optional: Add cache control headers if needed
export const dynamic = 'force-dynamic'; // Ensure fresh data on each request 