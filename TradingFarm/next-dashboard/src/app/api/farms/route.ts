import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const supabase = await createServerClient();
    
    // Get the user ID from the authentication session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Query farms from Supabase
    const { data: farms, error, count } = await supabase
      .from('farms')
      .select('*, agents(count)', { count: 'exact' })
      .eq('user_id', user.id)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching farms:', error);
      return NextResponse.json(
        { error: 'Failed to fetch farms data' },
        { status: 500 }
      );
    }
    
    // Transform the data to include agent counts
    const transformedFarms = farms.map(farm => {
      const agentCount = farm.agents ? (farm.agents as any).count : 0;
      
      return {
        ...farm,
        agents_count: agentCount,
        // Remove the agents relationship from the response
        agents: undefined
      };
    });
    
    // Return the response with proper metadata
    return NextResponse.json({
      farms: transformedFarms,
      total: count || farms.length,
      limit,
      offset,
      hasMore: count ? offset + limit < count : false
    });
  } catch (error) {
    console.error('Farms API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch farms data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    
    const supabase = await createServerClient();
    
    // Get the user ID from the authentication session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Prepare the farm data with the authenticated user ID
    const farmData = {
      name: requestData.name,
      description: requestData.description,
      user_id: user.id
    };
    
    // Insert the farm data into Supabase
    const { data: farm, error } = await supabase
      .from('farms')
      .insert(farmData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating farm:', error);
      return NextResponse.json(
        { error: 'Failed to create farm' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ farm });
  } catch (error) {
    console.error('Farm creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create farm' },
      { status: 500 }
    );
  }
}
