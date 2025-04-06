import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/utils/supabase/server';

// Handler for GET requests - fetch transactions for a specific acquisition goal
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
    
    // Verify the goal belongs to the user before fetching transactions
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single();
    
    if (goalError || !goal) {
      return NextResponse.json(
        { error: 'Goal not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Fetch transactions for the goal
    const { data: transactions, error: transactionsError } = await supabase
      .from('goal_transactions')
      .select(`
        *,
        agent:agent_id (
          id,
          name,
          type,
          role
        )
      `)
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false });
    
    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data: transactions });
  } catch (error) {
    console.error('Error handling request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handler for POST requests - create a new transaction for a specific acquisition goal
export async function POST(
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
    
    // Verify the goal belongs to the user before creating transaction
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id, status, farm_id, selected_asset, current_amount')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single();
    
    if (goalError || !goal) {
      return NextResponse.json(
        { error: 'Goal not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Check if goal is in a valid state for recording transactions
    if (goal.status === 'COMPLETED' || goal.status === 'FAILED') {
      return NextResponse.json(
        { error: 'Cannot add transactions to completed or failed goal' },
        { status: 400 }
      );
    }
    
    // Validate transaction data
    const { 
      agent_id, 
      transaction_type, 
      asset_from, 
      amount_from, 
      asset_to, 
      amount_to,
      transaction_hash,
      protocol,
      status = 'PENDING',
      metadata
    } = requestData;
    
    if (!agent_id || !transaction_type) {
      return NextResponse.json(
        { error: 'Missing required fields: agent_id, transaction_type' },
        { status: 400 }
      );
    }
    
    // At least one of from/to must be specified
    if ((!asset_from || !amount_from) && (!asset_to || !amount_to)) {
      return NextResponse.json(
        { error: 'Transaction must specify at least one of: from asset/amount or to asset/amount' },
        { status: 400 }
      );
    }
    
    const transactionData = {
      goal_id: goalId,
      farm_id: goal.farm_id,
      agent_id,
      transaction_type,
      asset_from,
      amount_from,
      asset_to,
      amount_to,
      transaction_hash,
      protocol,
      status,
      metadata
    };
    
    // Create the new transaction
    const { data: newTransaction, error: createError } = await supabase
      .from('goal_transactions')
      .insert(transactionData)
      .select(`
        *,
        agent:agent_id (
          id,
          name,
          type,
          role
        )
      `)
      .single();
    
    if (createError) {
      console.error('Error creating transaction:', createError);
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      );
    }
    
    // If the transaction is confirmed and involves the target asset, update the goal's current amount
    // This is a simplified approach - in a real application, you might want more complex logic
    let updatedGoal = null;
    if (status === 'CONFIRMED' && 
        ((asset_to === goal.selected_asset && amount_to) || 
         (asset_from === goal.selected_asset && amount_from))) {
      
      let newAmount = goal.current_amount;
      
      // Add amount_to if it's the target asset
      if (asset_to === goal.selected_asset && amount_to) {
        newAmount += amount_to;
      }
      
      // Subtract amount_from if it's the target asset
      if (asset_from === goal.selected_asset && amount_from) {
        newAmount -= amount_from;
      }
      
      // Update the goal's current amount
      const { data: goalUpdate, error: updateError } = await supabase
        .from('goals')
        .update({ 
          current_amount: newAmount,
          // If we've reached the target, mark goal as completed
          status: newAmount >= goal.target_amount ? 'COMPLETED' : goal.status
        })
        .eq('id', goalId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating goal amount:', updateError);
      } else {
        updatedGoal = goalUpdate;
      }
    }
    
    return NextResponse.json({
      data: newTransaction,
      goal: updatedGoal
    }, { status: 201 });
  } catch (error) {
    console.error('Error handling request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
