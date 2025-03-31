import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Mock goals data
    const goals = [
      {
        id: 'goal-1',
        name: 'Monthly Profit Target',
        description: 'Achieve a 5% monthly profit across the farm',
        type: 'profit',
        status: 'in_progress',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        farm_id: 'farm-1',
        target_value: 0.05,
        current_value: 0.032,
        progress: 0.64,
        metrics: {
          startValue: 10000,
          currentValue: 10320,
          targetValue: 10500
        },
        strategy: 'Incremental growth with controlled risk',
        priority: 'high'
      },
      {
        id: 'goal-2',
        name: 'Risk Reduction',
        description: 'Reduce maximum drawdown to under 10%',
        type: 'risk',
        status: 'in_progress',
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        farm_id: 'farm-1',
        target_value: 0.10,
        current_value: 0.14,
        progress: 0.40,
        metrics: {
          startValue: 0.22,
          currentValue: 0.14,
          targetValue: 0.10
        },
        strategy: 'Implement tighter stop-losses and improve risk scoring',
        priority: 'medium'
      },
      {
        id: 'goal-3',
        name: 'Diversification Target',
        description: 'Expand to at least 5 different trading pairs',
        type: 'diversification',
        status: 'completed',
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        farm_id: 'farm-3',
        target_value: 5,
        current_value: 6,
        progress: 1.0,
        metrics: {
          startValue: 2,
          currentValue: 6,
          targetValue: 5
        },
        strategy: 'Gradually add new trading pairs based on correlation analysis',
        priority: 'high'
      },
      {
        id: 'goal-4',
        name: 'Automation Level',
        description: 'Achieve 90% fully automated trading operations',
        type: 'automation',
        status: 'in_progress',
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        farm_id: 'farm-1',
        target_value: 0.90,
        current_value: 0.68,
        progress: 0.76,
        metrics: {
          startValue: 0.45,
          currentValue: 0.68,
          targetValue: 0.90
        },
        strategy: 'Enhance agent capabilities with ElizaOS integration',
        priority: 'high'
      }
    ];
    
    // Filter by farmId if provided
    const filteredGoals = farmId 
      ? goals.filter(goal => goal.farm_id === farmId)
      : goals;
    
    // Apply pagination
    const paginatedGoals = filteredGoals.slice(offset, offset + limit);
    
    // Return the response with proper metadata
    return NextResponse.json({
      goals: paginatedGoals,
      total: filteredGoals.length,
      limit,
      offset,
      hasMore: offset + limit < filteredGoals.length
    });
  } catch (error) {
    console.error('Goals API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.farm_id || !data.type) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'Goal name, farm_id, and type are required'
        },
        { status: 400 }
      );
    }
    
    // In production, we would create the goal in the database with proper validation
    
    // Return mock response with generated ID
    const newGoal = {
      id: `goal-${Date.now()}`,
      name: data.name,
      description: data.description || '',
      type: data.type,
      status: 'in_progress',
      created_at: new Date().toISOString(),
      deadline: data.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      farm_id: data.farm_id,
      target_value: data.target_value || 0,
      current_value: 0,
      progress: 0,
      metrics: data.metrics || {},
      strategy: data.strategy || '',
      priority: data.priority || 'medium'
    };
    
    return NextResponse.json({ goal: newGoal }, { status: 201 });
  } catch (error) {
    console.error('Goal creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    );
  }
}
