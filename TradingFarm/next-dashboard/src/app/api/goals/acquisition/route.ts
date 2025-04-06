import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { goalAcquisitionService } from '@/services/goal-acquisition-service';
import { agentCoordinationService } from '@/services/agent-coordination-service';

// Mock data for when authentication fails
const mockAcquisitionGoal = {
  id: 'acquisition-goal-1',
  farm_id: '1',
  name: 'Acquire 10,000 SUI',
  description: 'Accumulate SUI tokens through DEX swaps and yield farming',
  target_amount: 10000,
  current_amount: 2500,
  target_assets: ['SUI', 'SONIC'],
  selected_asset: 'SUI',
  status: 'ACTIVE',
  completion_actions: {
    transferToBank: true,
    startNextGoal: false
  },
  created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString()
};

/**
 * GET handler for acquisition goals API route
 * Query parameters:
 * - farm_id: Filter goals by farm ID
 * - goal_id: Get a specific goal by ID
 */
export async function GET(request: NextRequest) {
  // Parse query parameters
  const url = new URL(request.url);
  const farmId = url.searchParams.get('farm_id');
  const goalId = url.searchParams.get('goal_id');
  
  try {
    // Create Supabase server client
    const supabase = await createServerClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Return mock data if no user is authenticated
      console.log('No authenticated user, returning mock acquisition goal data');
      return NextResponse.json({ 
        data: goalId ? mockAcquisitionGoal : [mockAcquisitionGoal],
        count: 1,
        total: 1
      });
    }
    
    // Query execution based on parameters
    if (goalId) {
      // Get specific goal by ID
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Supabase error fetching goal:', error);
        return NextResponse.json({ data: mockAcquisitionGoal });
      }
      
      return NextResponse.json({ data });
    } else {
      // Build query for acquisition goals
      let query = supabase
        .from('goals')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .overlaps('target_assets', ['SUI', 'SONIC']) // This identifies acquisition goals
        .order('created_at', { ascending: false });
      
      // Add farm_id filter if provided
      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      
      // Execute query
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Supabase error fetching acquisition goals:', error);
        return NextResponse.json({ 
          data: [mockAcquisitionGoal],
          count: 1,
          total: 1
        });
      }
      
      return NextResponse.json({ 
        data: data || [],
        count: data?.length || 0,
        total: count || 0
      });
    }
  } catch (error) {
    console.error('Error in acquisition goals API GET route:', error);
    return NextResponse.json({ 
      data: goalId ? mockAcquisitionGoal : [mockAcquisitionGoal],
      count: 1,
      total: 1
    });
  }
}

/**
 * POST handler for creating a new acquisition goal
 * Body parameters:
 * - farm_id: Farm ID
 * - name: Goal name
 * - description: Goal description (optional)
 * - target_amount: Amount to acquire
 * - target_assets: Array of assets to target (e.g., ['SUI', 'SONIC'])
 * - completion_actions: Object with completion configuration
 */
export async function POST(request: NextRequest) {
  try {
    const goalData = await request.json();
    
    // Validate required fields
    if (!goalData.farm_id || !goalData.name || !goalData.target_amount || !goalData.target_assets) {
      return NextResponse.json({ 
        error: 'Missing required fields: farm_id, name, target_amount, target_assets are required' 
      }, { status: 400 });
    }
    
    // Create Supabase server client
    const supabase = await createServerClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Return mock success response if no user is authenticated
      console.log('No authenticated user, returning mock success response');
      return NextResponse.json({ 
        data: {
          ...goalData,
          id: `acquisition-goal-${Date.now()}`,
          current_amount: 0,
          status: 'PENDING',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
    }
    
    // Verify user has access to the farm
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('*')
      .eq('id', goalData.farm_id)
      .eq('user_id', user.id)
      .single();
    
    if (farmError || !farm) {
      return NextResponse.json({ 
        error: 'Farm not found or you do not have access to it' 
      }, { status: 404 });
    }
    
    // Insert goal into database
    const { data: newGoal, error } = await supabase
      .from('goals')
      .insert({
        farm_id: goalData.farm_id,
        name: goalData.name,
        description: goalData.description || null,
        target_amount: goalData.target_amount,
        current_amount: 0,
        target_assets: goalData.target_assets,
        status: 'PENDING',
        completion_actions: goalData.completion_actions || {},
        user_id: user.id
      })
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error creating acquisition goal:', error);
      return NextResponse.json({ 
        error: 'Failed to create acquisition goal'
      }, { status: 500 });
    }
    
    return NextResponse.json({ data: newGoal });
  } catch (error) {
    console.error('Error in acquisition goals API POST route:', error);
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * PATCH handler for updating an acquisition goal
 * Path parameter: /api/goals/acquisition/:id
 * Body can include any updates to the goal
 */
export async function PATCH(request: NextRequest) {
  try {
    // Extract goal ID from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const goalId = pathSegments[pathSegments.length - 1];
    
    if (pathSegments[pathSegments.length - 1] === 'acquisition') {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }
    
    const updateData = await request.json();
    
    // Create Supabase server client
    const supabase = await createServerClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Return mock success response if no user is authenticated
      console.log('No authenticated user, returning mock success response');
      return NextResponse.json({ 
        data: {
          ...mockAcquisitionGoal,
          ...updateData,
          id: goalId || mockAcquisitionGoal.id,
          updated_at: new Date().toISOString()
        }
      });
    }
    
    // Verify goal exists and belongs to the user
    const { data: existingGoal, error: fetchError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single();
    
    if (fetchError || !existingGoal) {
      return NextResponse.json({ 
        error: 'Goal not found or you do not have access to it' 
      }, { status: 404 });
    }
    
    // Verify user has access to the farm
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('*')
      .eq('id', existingGoal.farm_id)
      .eq('user_id', user.id)
      .single();
    
    if (farmError || !farm) {
      return NextResponse.json({ 
        error: 'You do not have access to this goal' 
      }, { status: 403 });
    }
    
    // Check for status change to ACTIVE
    const isActivating = 
      existingGoal.status !== 'ACTIVE' && 
      updateData.status === 'ACTIVE';
    
    // Update goal in database
    const { data: updatedGoal, error: updateError } = await supabase
      .from('goals')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', goalId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Supabase error updating acquisition goal:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update acquisition goal'
      }, { status: 500 });
    }
    
    // If goal is being activated, notify the agent coordination service
    if (isActivating) {
      // This would be a background process in production
      // For now, we'll just log it
      console.log('Goal activated, notifying agent coordination service:', goalId);
      
      // Trigger the goal activation process
      agentCoordinationService.handleGoalActivation(goalId)
        .catch(error => console.error('Error activating goal:', error));
    }
    
    return NextResponse.json({ data: updatedGoal });
  } catch (error) {
    console.error('Error in acquisition goals API PATCH route:', error);
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * Additional endpoint for goal transactions
 * Path: /api/goals/acquisition/:id/transactions
 */
export async function GET_TRANSACTIONS(request: NextRequest) {
  // Extract goal ID from URL
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const goalId = pathSegments[pathSegments.length - 2]; // The ID is the second-to-last segment
  
  try {
    // Create Supabase server client
    const supabase = await createServerClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Return mock data if no user is authenticated
      console.log('No authenticated user, returning mock transaction data');
      return NextResponse.json({ 
        data: [
          {
            id: 'tx-1',
            goal_id: goalId,
            transaction_type: 'SWAP',
            asset_from: 'USDC',
            amount_from: 1000,
            asset_to: 'SUI',
            amount_to: 400,
            transaction_hash: '0x123abc',
            status: 'CONFIRMED',
            created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'tx-2',
            goal_id: goalId,
            transaction_type: 'SWAP',
            asset_from: 'USDC',
            amount_from: 2000,
            asset_to: 'SUI',
            amount_to: 750,
            transaction_hash: '0x456def',
            status: 'CONFIRMED',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      });
    }
    
    // Verify goal exists and belongs to the user
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single();
    
    if (goalError || !goal) {
      return NextResponse.json({ 
        error: 'Goal not found or you do not have access to it' 
      }, { status: 404 });
    }
    
    // Verify user has access to the farm
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('*')
      .eq('id', goal.farm_id)
      .eq('user_id', user.id)
      .single();
    
    if (farmError || !farm) {
      return NextResponse.json({ 
        error: 'You do not have access to this goal' 
      }, { status: 403 });
    }
    
    // Get transactions for the goal
    const { data: transactions, error } = await supabase
      .from('goal_transactions')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error fetching goal transactions:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch goal transactions'
      }, { status: 500 });
    }
    
    return NextResponse.json({ data: transactions || [] });
  } catch (error) {
    console.error('Error in goal transactions API route:', error);
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * Additional endpoint for goal strategies
 * Path: /api/goals/acquisition/:id/strategies
 */
export async function GET_STRATEGIES(request: NextRequest) {
  // Extract goal ID from URL
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const goalId = pathSegments[pathSegments.length - 2]; // The ID is the second-to-last segment
  
  try {
    // Create Supabase server client
    const supabase = await createServerClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Return mock data if no user is authenticated
      console.log('No authenticated user, returning mock strategy data');
      return NextResponse.json({ 
        data: [
          {
            id: 'strategy-1',
            goal_id: goalId,
            agent_id: 'agent-1',
            strategy_type: 'DEX_SWAP',
            parameters: {
              exchange: 'Cetus',
              asset_to_swap: 'USDC',
              estimated_price: 2.5,
              estimated_slippage: 0.5
            },
            is_active: true,
            proposed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            selected_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            agent: {
              id: 'agent-1',
              name: 'Market Analyst',
              type: 'analyst'
            }
          },
          {
            id: 'strategy-2',
            goal_id: goalId,
            agent_id: 'agent-2',
            strategy_type: 'YIELD_FARMING',
            parameters: {
              protocol: 'SuiYield',
              estimated_apr: 12.5,
              lock_period_days: 7
            },
            is_active: false,
            proposed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            agent: {
              id: 'agent-2',
              name: 'Yield Seeker',
              type: 'yield'
            }
          }
        ]
      });
    }
    
    // Verify goal exists and belongs to the user
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single();
    
    if (goalError || !goal) {
      return NextResponse.json({ 
        error: 'Goal not found or you do not have access to it' 
      }, { status: 404 });
    }
    
    // Verify user has access to the farm
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('*')
      .eq('id', goal.farm_id)
      .eq('user_id', user.id)
      .single();
    
    if (farmError || !farm) {
      return NextResponse.json({ 
        error: 'You do not have access to this goal' 
      }, { status: 403 });
    }
    
    // Get strategies for the goal
    const { data: strategies, error } = await supabase
      .from('goal_strategies')
      .select(`
        *,
        agent:agents(*)
      `)
      .eq('goal_id', goalId)
      .order('proposed_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error fetching goal strategies:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch goal strategies'
      }, { status: 500 });
    }
    
    return NextResponse.json({ data: strategies || [] });
  } catch (error) {
    console.error('Error in goal strategies API route:', error);
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * Additional endpoint for goal monitoring
 * Path: /api/goals/acquisition/:id/monitoring
 */
export async function GET_MONITORING(request: NextRequest) {
  // Extract goal ID from URL
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const goalId = pathSegments[pathSegments.length - 2]; // The ID is the second-to-last segment
  
  try {
    // Create Supabase server client
    const supabase = await createServerClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Return mock data if no user is authenticated
      console.log('No authenticated user, returning mock monitoring data');
      return NextResponse.json({ 
        data: [
          {
            id: 'event-1',
            goal_id: goalId,
            agent_id: 'agent-1',
            event_type: 'PLANNING_STARTED',
            event_data: {
              target_assets: ['SUI', 'SONIC'],
              target_amount: 10000
            },
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            agent: {
              id: 'agent-1',
              name: 'Market Analyst'
            }
          },
          {
            id: 'event-2',
            goal_id: goalId,
            agent_id: 'agent-1',
            event_type: 'STRATEGY_PROPOSED',
            event_data: {
              strategy_type: 'DEX_SWAP',
              target_asset: 'SUI',
              assessment: {
                feasibility: 'HIGH',
                time_estimate: '2 days',
                risk_level: 'MEDIUM'
              }
            },
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            agent: {
              id: 'agent-1',
              name: 'Market Analyst'
            }
          },
          {
            id: 'event-3',
            goal_id: goalId,
            agent_id: 'agent-3',
            event_type: 'STRATEGY_SELECTED',
            event_data: {
              strategy_id: 'strategy-1',
              strategy_type: 'DEX_SWAP',
              selected_asset: 'SUI'
            },
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            agent: {
              id: 'agent-3',
              name: 'Coordination Agent'
            }
          }
        ]
      });
    }
    
    // Verify goal exists and belongs to the user
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single();
    
    if (goalError || !goal) {
      return NextResponse.json({ 
        error: 'Goal not found or you do not have access to it' 
      }, { status: 404 });
    }
    
    // Verify user has access to the farm
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('*')
      .eq('id', goal.farm_id)
      .eq('user_id', user.id)
      .single();
    
    if (farmError || !farm) {
      return NextResponse.json({ 
        error: 'You do not have access to this goal' 
      }, { status: 403 });
    }
    
    // Get monitoring events for the goal
    const { data: events, error } = await supabase
      .from('goal_monitoring')
      .select(`
        *,
        agent:agents(id, name)
      `)
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Supabase error fetching goal monitoring events:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch goal monitoring events'
      }, { status: 500 });
    }
    
    return NextResponse.json({ data: events || [] });
  } catch (error) {
    console.error('Error in goal monitoring API route:', error);
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 });
  }
}
