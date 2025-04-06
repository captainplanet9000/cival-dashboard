import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/utils/supabase/server';

// Handler for GET requests - fetch a specific acquisition goal
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const goalId = params.id;
    
    // Create server client with cookies
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Fetch specific goal by ID
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single();
    
    if (goalError) {
      console.error('Error fetching goal:', goalError);
      return NextResponse.json(
        { error: 'Failed to fetch goal' },
        { status: 500 }
      );
    }
    
    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ data: goal });
  } catch (error) {
    console.error('Error handling request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handler for PATCH requests - update a specific acquisition goal
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const goalId = params.id;
    const requestData = await request.json();
    
    // Create server client with cookies
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Validate update data
    const { status } = requestData;
    const validStatuses = ['PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'FAILED'];
    
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }
    
    // Check if goal exists and belongs to user
    const { data: existingGoal, error: checkError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single();
    
    if (checkError || !existingGoal) {
      return NextResponse.json(
        { error: 'Goal not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Update goal
    const updateData: any = {};
    
    if (status) {
      updateData.status = status;
    }
    
    // Add additional fields to update as needed
    
    const { data: updatedGoal, error: updateError } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', goalId)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating goal:', updateError);
      return NextResponse.json(
        { error: 'Failed to update goal' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data: updatedGoal });
  } catch (error) {
    console.error('Error handling request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handler for DELETE requests - delete a specific acquisition goal
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const goalId = params.id;
    
    // Create server client with cookies
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if goal exists and belongs to user
    const { data: existingGoal, error: checkError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single();
    
    if (checkError || !existingGoal) {
      return NextResponse.json(
        { error: 'Goal not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Delete goal
    const { error: deleteError } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', user.id);
    
    if (deleteError) {
      console.error('Error deleting goal:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete goal' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, message: 'Goal deleted successfully' }
    );
  } catch (error) {
    console.error('Error handling request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
