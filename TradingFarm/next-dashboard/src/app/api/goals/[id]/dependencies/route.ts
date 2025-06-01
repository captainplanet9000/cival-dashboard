import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { goalService } from '@/services/goal-service';

/**
 * GET endpoint to retrieve all dependencies for a goal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const goalId = params.id;
    if (!goalId) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data: session } = await supabase.auth.getSession();

    if (!session || !session.session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user has access to this goal
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', session.session.user.id)
      .single();

    if (goalError || !goal) {
      return NextResponse.json(
        { error: goalError?.message || 'Goal not found' },
        { status: 404 }
      );
    }

    // Get goal dependencies
    if (!goal.dependencies) {
      return NextResponse.json({ data: [] });
    }

    // Get details for each dependency
    const dependencyIds = goal.dependencies.map((dep: any) => dep.goal_id);
    
    if (dependencyIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const { data: dependencyGoals, error: dependencyError } = await supabase
      .from('goals')
      .select('id, title, description, status, progress')
      .in('id', dependencyIds);

    if (dependencyError) {
      return NextResponse.json(
        { error: dependencyError.message },
        { status: 500 }
      );
    }

    // Enhance the dependency info with goal details
    const enhancedDependencies = goal.dependencies.map((dep: any) => {
      const goalDetails = dependencyGoals?.find(g => g.id === dep.goal_id);
      return {
        ...dep,
        goal_details: goalDetails || null
      };
    });

    return NextResponse.json({ data: enhancedDependencies });
  } catch (error) {
    console.error('Error getting goal dependencies:', error);
    return NextResponse.json(
      { error: 'Failed to get goal dependencies' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to add a new dependency to a goal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const goalId = params.id;
    if (!goalId) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { dependency_goal_id } = body;

    if (!dependency_goal_id) {
      return NextResponse.json(
        { error: 'Dependency goal ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const { data: session } = await supabase.auth.getSession();

    if (!session || !session.session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user has access to both goals
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('id, title, farm_id')
      .in('id', [goalId, dependency_goal_id])
      .eq('user_id', session.session.user.id);

    if (goalsError || !goals || goals.length < 2) {
      return NextResponse.json(
        { error: goalsError?.message || 'One or both goals not found' },
        { status: 404 }
      );
    }

    // Check for circular dependencies
    const { data: dependentGoal } = await supabase
      .from('goals')
      .select('dependencies')
      .eq('id', dependency_goal_id)
      .single();

    if (dependentGoal?.dependencies) {
      const hasCircular = dependentGoal.dependencies.some(
        (dep: any) => dep.goal_id === goalId
      );
      
      if (hasCircular) {
        return NextResponse.json(
          { error: 'Circular dependency detected' },
          { status: 400 }
        );
      }
    }

    // Add the dependency using the goal service
    const { data, error } = await goalService.addDependency(
      goalId,
      dependency_goal_id
    );

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error adding goal dependency:', error);
    return NextResponse.json(
      { error: 'Failed to add goal dependency' },
      { status: 500 }
    );
  }
}

/**
 * DELETE endpoint to remove a dependency from a goal
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const goalId = params.id;
    if (!goalId) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    const url = new URL(request.url);
    const dependencyGoalId = url.searchParams.get('dependency_goal_id');

    if (!dependencyGoalId) {
      return NextResponse.json(
        { error: 'Dependency goal ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const { data: session } = await supabase.auth.getSession();

    if (!session || !session.session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user has access to this goal
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', session.session.user.id)
      .single();

    if (goalError || !goal) {
      return NextResponse.json(
        { error: goalError?.message || 'Goal not found' },
        { status: 404 }
      );
    }

    // Remove the dependency using the goal service
    const { data, error } = await goalService.removeDependency(
      goalId,
      dependencyGoalId
    );

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error removing goal dependency:', error);
    return NextResponse.json(
      { error: 'Failed to remove goal dependency' },
      { status: 500 }
    );
  }
}
