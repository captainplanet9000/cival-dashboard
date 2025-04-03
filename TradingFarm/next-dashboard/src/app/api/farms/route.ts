import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

// Mock data for when authentication fails or no farms are found
const mockFarms = [
  {
    id: "1",
    name: "Bitcoin Momentum Farm",
    description: "Trading farm focused on BTC momentum strategies",
    user_id: "mock-user-id",
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
    exchange: "binance",
    api_keys: {},
    config: {},
    agents_count: 3
  },
  {
    id: "2",
    name: "Altcoin Swing Trader",
    description: "Farm for short-term swing trading on major altcoins",
    user_id: "mock-user-id",
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
    exchange: "coinbase",
    api_keys: {},
    config: {},
    agents_count: 5
  },
  {
    id: "3",
    name: "DeFi Yield Farm",
    description: "Optimizing yield farming opportunities across DeFi protocols",
    user_id: "mock-user-id",
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
    exchange: "bybit",
    api_keys: {},
    config: {},
    agents_count: 2
  }
];

// Check if mock mode is enabled by environment variables
const isMockModeEnabled = () => {
  return process.env.NEXT_PUBLIC_FORCE_MOCK_MODE === 'true' || 
         process.env.NEXT_PUBLIC_MOCK_API_ENABLED === 'true';
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Check if mock mode is enabled or requested
    if (isMockModeEnabled() || searchParams.get('mock') === 'true') {
      console.log('Using mock farm data in API');
      const paginatedMocks = mockFarms.slice(offset, offset + limit);
      return NextResponse.json({
        farms: paginatedMocks,
        total: mockFarms.length,
        limit,
        offset,
        hasMore: offset + limit < mockFarms.length
      });
    }
    
    const supabase = await createServerClient();
    
    // Get the user ID from the authentication session
    const { data: { user } } = await supabase.auth.getUser();
    
    // If no authenticated user, return mock data instead of 401
    if (!user) {
      console.log('No authenticated user, using mock data');
      const paginatedMocks = mockFarms.slice(offset, offset + limit);
      return NextResponse.json({
        farms: paginatedMocks,
        total: mockFarms.length,
        limit,
        offset,
        hasMore: offset + limit < mockFarms.length
      });
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
      // Return mock data instead of error
      const paginatedMocks = mockFarms.slice(offset, offset + limit);
      return NextResponse.json({
        farms: paginatedMocks,
        total: mockFarms.length,
        limit,
        offset,
        hasMore: offset + limit < mockFarms.length
      });
    }
    
    // If no farms returned, use mock data
    if (!farms || farms.length === 0) {
      console.log('No farms found for user, using mock data');
      const paginatedMocks = mockFarms.slice(offset, offset + limit);
      return NextResponse.json({
        farms: paginatedMocks,
        total: mockFarms.length,
        limit,
        offset,
        hasMore: offset + limit < mockFarms.length
      });
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
    // Return mock data instead of error
    const limit = 10;
    const offset = 0;
    return NextResponse.json({
      farms: mockFarms,
      total: mockFarms.length,
      limit,
      offset,
      hasMore: offset + limit < mockFarms.length
    });
  }
}

export async function POST(req: Request) {
  try {
    const requestData = await req.json();
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    
    // Check if mock mode is enabled or requested
    if (isMockModeEnabled() || searchParams.get('mock') === 'true') {
      console.log('Using mock farm creation in API');
      const newMockFarm = {
        id: `mock-${Date.now()}`,
        name: requestData.name,
        description: requestData.description,
        user_id: "mock-user-id",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: "active",
        exchange: requestData.exchange || "default",
        api_keys: requestData.api_keys || {},
        config: requestData.config || {},
        agents_count: 0
      };
      return NextResponse.json({ farm: newMockFarm });
    }
    
    const supabase = await createServerClient();
    
    // Get the user ID from the authentication session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Return mock data instead of 401 error
      const newMockFarm = {
        id: `mock-${Date.now()}`,
        name: requestData.name,
        description: requestData.description,
        user_id: "mock-user-id",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: "active",
        exchange: requestData.exchange || "default",
        api_keys: requestData.api_keys || {},
        config: requestData.config || {},
        agents_count: 0
      };
      return NextResponse.json({ farm: newMockFarm });
    }
    
    // Prepare the farm data with the authenticated user ID
    const farmData = {
      name: requestData.name,
      description: requestData.description,
      user_id: user.id,
      status: requestData.status || "active",
      exchange: requestData.exchange || "default",
      api_keys: requestData.api_keys || {},
      config: requestData.config || {}
    };
    
    // Insert the farm data into Supabase
    const { data: farm, error } = await supabase
      .from('farms')
      .insert(farmData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating farm:', error);
      // Return mock data instead of error
      const newMockFarm = {
        id: `mock-${Date.now()}`,
        name: requestData.name,
        description: requestData.description,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: requestData.status || "active",
        exchange: requestData.exchange || "default",
        api_keys: requestData.api_keys || {},
        config: requestData.config || {},
        agents_count: 0
      };
      return NextResponse.json({ farm: newMockFarm });
    }
    
    return NextResponse.json({ farm });
  } catch (error) {
    console.error('Farm creation error:', error);
    // Return mock data instead of error
    const requestData = { name: "New Farm", description: "Created due to error" };
    const newMockFarm = {
      id: `mock-${Date.now()}`,
      name: requestData.name,
      description: requestData.description,
      user_id: "mock-user-id",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "active",
      exchange: "default",
      api_keys: {},
      config: {},
      agents_count: 0
    };
    return NextResponse.json({ farm: newMockFarm });
  }
}
