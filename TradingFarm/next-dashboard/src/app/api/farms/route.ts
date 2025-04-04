// TradingFarm/next-dashboard/src/app/api/farms/route.ts
import { NextRequest, NextResponse } from '@/types/next-types';
import { createServerClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { withRouteCache } from '@/utils/cache-middleware';
import { CACHE_POLICIES } from '@/services/redis-service';
import { invalidateFarmCache, invalidateNamespace } from '@/utils/cache-invalidation';

// Helper to get the authenticated user
async function getUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * GET /api/farms
 * Get all farms for the authenticated user
 */
async function getFarms(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const mock = searchParams.get('mock') === 'true';
  
  // Calculate offset
  const offset = (page - 1) * limit;
  
  try {
    // If mock mode is enabled, return mock data
    if (mock) {
      return NextResponse.json({
        data: Array.from({ length: limit }).map((_, i) => ({
          id: `mock-${i + offset + 1}`,
          name: `Mock Farm ${i + offset + 1}`,
          description: `This is a mock farm for testing purposes ${i + offset + 1}`,
          owner_id: 'mock-user',
          is_active: Math.random() > 0.3,
          agents_count: Math.floor(Math.random() * 5),
          elizaos_agents_count: Math.floor(Math.random() * 3),
          risk_profile: {
            max_drawdown: Math.floor(Math.random() * 20) + 5,
            risk_per_trade: Math.floor(Math.random() * 3) + 1,
            volatility_tolerance: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
          },
          performance_metrics: {
            win_rate: Math.random() * 0.7 + 0.3,
            profit_factor: Math.random() * 2 + 1,
            sharpe_ratio: Math.random() * 1.5 + 0.5,
            max_drawdown: Math.random() * 0.2 + 0.05
          },
          created_at: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
          updated_at: new Date().toISOString()
        })),
        count: limit,
        total: 100
      });
    }
    
    // Get the authenticated user
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all farms for the authenticated user
    const supabase = await createServerClient();
    const { data: farms, error, count } = await supabase
      .from('farms')
      .select('*, agents(count), elizaos_agents(count)', { count: 'exact' })
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching farms:', error);
      return NextResponse.json(
        { error: 'Failed to fetch farms' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: farms,
      count: farms.length,
      total: count
    });
  } catch (error) {
    console.error('Error processing farms request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply cache middleware to GET handler
export const GET = withRouteCache(
  'farm', 
  getFarms, 
  {
    // Extract user ID and page/limit from request for cache key
    keyFn: (req: NextRequest) => {
      const url = new URL(req.url);
      const page = url.searchParams.get('page') || '1';
      const limit = url.searchParams.get('limit') || '10';
      return `list:page=${page}:limit=${limit}`;
    },
    policy: CACHE_POLICIES.FARM
  }
);

/**
 * POST /api/farms
 * Create a new farm
 */
export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { name, description, mock } = requestData;
    
    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Farm name is required' },
        { status: 400 }
      );
    }
    
    // If mock mode is enabled, return mock response
    if (mock) {
      const newMockFarm = {
        id: uuidv4(),
        name,
        description: description || '',
        owner_id: 'mock-user',
        is_active: true,
        agents_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return NextResponse.json({ data: newMockFarm });
    }
    
    // Get the authenticated user
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create a new farm
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('farms')
      .insert({
        name,
        description: description || '',
        owner_id: user.id,
        is_active: true,
        status_summary: {
          goals_total: 0,
          goals_completed: 0,
          goals_in_progress: 0,
          goals_not_started: 0,
          goals_cancelled: 0,
          agents_total: 0,
          agents_active: 0,
          updated_at: new Date().toISOString()
        }
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating farm:', error);
      return NextResponse.json(
        { error: 'Failed to create farm' },
        { status: 500 }
      );
    }

    // Invalidate farm cache after creating a new farm
    await invalidateNamespace('farm');
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error processing farm creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
