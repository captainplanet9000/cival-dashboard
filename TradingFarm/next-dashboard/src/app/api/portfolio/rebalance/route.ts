import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { RebalancingFrequency } from '@/types/portfolio';

/**
 * POST handler to rebalance a portfolio
 * 
 * Calculates and executes the necessary transactions to rebalance
 * a portfolio according to its target allocations
 */
export async function POST(req: Request) {
  try {
    const { portfolioId, manualRebalance = false } = await req.json();
    
    if (!portfolioId) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Fetch portfolio with current allocations and targets
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', portfolioId)
      .eq('user_id', session.user.id)
      .single();
    
    if (portfolioError || !portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found or access denied', details: portfolioError?.message },
        { status: 404 }
      );
    }
    
    // Check if rebalancing is needed (unless forced manual rebalance)
    if (!manualRebalance) {
      // For scheduled rebalancing, check if it's time based on frequency
      if (portfolio.rebalancing_frequency !== RebalancingFrequency.MANUAL && 
          portfolio.rebalancing_frequency !== RebalancingFrequency.THRESHOLD) {
        
        if (portfolio.next_rebalance && new Date(portfolio.next_rebalance) > new Date()) {
          return NextResponse.json({
            message: 'Rebalancing not scheduled yet',
            nextRebalanceDate: portfolio.next_rebalance
          });
        }
      }
    }
    
    // Fetch current allocations
    const { data: currentAllocations, error: allocationsError } = await supabase
      .from('portfolio_allocations')
      .select('*, strategy:strategies(name)')
      .eq('portfolio_id', portfolioId);
    
    if (allocationsError) {
      return NextResponse.json(
        { error: 'Failed to fetch current allocations', details: allocationsError.message },
        { status: 500 }
      );
    }
    
    // Fetch target allocations
    const { data: targetAllocations, error: targetsError } = await supabase
      .from('allocation_targets')
      .select('*, strategy:strategies(name)')
      .eq('portfolio_id', portfolioId);
    
    if (targetsError) {
      return NextResponse.json(
        { error: 'Failed to fetch target allocations', details: targetsError.message },
        { status: 500 }
      );
    }
    
    // If no targets defined, return error
    if (!targetAllocations || targetAllocations.length === 0) {
      return NextResponse.json(
        { error: 'No target allocations defined for this portfolio' },
        { status: 400 }
      );
    }
    
    // Format allocations for easier processing
    const formattedCurrentAllocations = currentAllocations.map(alloc => ({
      strategy_id: alloc.strategy_id,
      strategy_name: alloc.strategy?.name || 'Unknown Strategy',
      allocation_percentage: alloc.allocation_percentage,
      current_value: alloc.current_value || 0
    }));
    
    const formattedTargetAllocations = targetAllocations.map(target => ({
      strategy_id: target.strategy_id,
      strategy_name: target.strategy?.name || 'Unknown Strategy',
      target_percentage: target.target_percentage
    }));
    
    // For threshold-based rebalancing, check if any allocation has drifted beyond threshold
    if (portfolio.rebalancing_frequency === RebalancingFrequency.THRESHOLD && !manualRebalance) {
      const driftThreshold = portfolio.drift_threshold || 5; // Default to 5% if not specified
      
      let maxDrift = 0;
      let driftedStrategyName = '';
      
      formattedCurrentAllocations.forEach(current => {
        const target = formattedTargetAllocations.find(t => t.strategy_id === current.strategy_id);
        if (target) {
          const drift = Math.abs(current.allocation_percentage - target.target_percentage);
          if (drift > maxDrift) {
            maxDrift = drift;
            driftedStrategyName = current.strategy_name;
          }
        }
      });
      
      if (maxDrift <= driftThreshold) {
        return NextResponse.json({
          message: 'Rebalancing not needed - allocations within threshold',
          maxDrift: maxDrift,
          threshold: driftThreshold
        });
      }
    }
    
    // Calculate rebalance transactions
    const portfolioValue = portfolio.current_value;
    const transactions = [];
    
    // First, handle strategies in current allocations
    for (const current of formattedCurrentAllocations) {
      const target = formattedTargetAllocations.find(t => t.strategy_id === current.strategy_id);
      
      if (target) {
        // Strategy exists in both current and target
        const targetValue = (target.target_percentage / 100) * portfolioValue;
        const currentValue = current.current_value;
        const difference = targetValue - currentValue;
        
        // Only create transactions for significant differences (e.g., > $10)
        if (Math.abs(difference) > 10) {
          transactions.push({
            portfolio_id: portfolioId,
            strategy_id: current.strategy_id,
            date: new Date().toISOString(),
            action: difference > 0 ? 'buy' : 'sell',
            amount: Math.abs(difference),
            previous_allocation: current.allocation_percentage,
            new_allocation: target.target_percentage,
            reason: manualRebalance ? 'manual' : 
                  portfolio.rebalancing_frequency === RebalancingFrequency.THRESHOLD ? 'threshold' : 'scheduled',
            executed_by: session.user.id,
            status: 'pending'
          });
        }
      } else {
        // Strategy exists in current but not in target (remove it)
        transactions.push({
          portfolio_id: portfolioId,
          strategy_id: current.strategy_id,
          date: new Date().toISOString(),
          action: 'sell',
          amount: current.current_value,
          previous_allocation: current.allocation_percentage,
          new_allocation: 0,
          reason: manualRebalance ? 'manual' : 
                portfolio.rebalancing_frequency === RebalancingFrequency.THRESHOLD ? 'threshold' : 'scheduled',
          executed_by: session.user.id,
          status: 'pending'
        });
      }
    }
    
    // Then, handle strategies in target but not in current (add them)
    for (const target of formattedTargetAllocations) {
      const current = formattedCurrentAllocations.find(c => c.strategy_id === target.strategy_id);
      
      if (!current) {
        const targetValue = (target.target_percentage / 100) * portfolioValue;
        
        transactions.push({
          portfolio_id: portfolioId,
          strategy_id: target.strategy_id,
          date: new Date().toISOString(),
          action: 'buy',
          amount: targetValue,
          previous_allocation: 0,
          new_allocation: target.target_percentage,
          reason: manualRebalance ? 'manual' : 
                portfolio.rebalancing_frequency === RebalancingFrequency.THRESHOLD ? 'threshold' : 'scheduled',
          executed_by: session.user.id,
          status: 'pending'
        });
      }
    }
    
    // If no transactions needed, return early
    if (transactions.length === 0) {
      return NextResponse.json({
        message: 'No rebalancing needed - allocations already at target',
        transactions: []
      });
    }
    
    // Record the transactions in the database
    const { data: savedTransactions, error: transactionError } = await supabase
      .from('rebalancing_transactions')
      .insert(transactions)
      .select();
    
    if (transactionError) {
      return NextResponse.json(
        { error: 'Failed to create rebalancing transactions', details: transactionError.message },
        { status: 500 }
      );
    }
    
    // In a real-world scenario, you would now execute these transactions with the exchange
    // For demo purposes, we'll just simulate completion of the transactions
    
    // Update the transactions to 'completed' status
    const { error: updateError } = await supabase
      .from('rebalancing_transactions')
      .update({ status: 'completed' })
      .in('id', savedTransactions.map(t => t.id));
    
    if (updateError) {
      return NextResponse.json({
        warning: 'Transactions created but status update failed',
        details: updateError.message,
        transactions: savedTransactions
      });
    }
    
    // Update portfolio allocations based on target allocations
    const newAllocations = [];
    
    for (const target of formattedTargetAllocations) {
      newAllocations.push({
        portfolio_id: portfolioId,
        strategy_id: target.strategy_id,
        allocation_percentage: target.target_percentage,
        current_value: (target.target_percentage / 100) * portfolioValue,
        target_value: (target.target_percentage / 100) * portfolioValue,
        actual_percentage: target.target_percentage,
        drift: 0
      });
    }
    
    // Delete existing allocations
    await supabase
      .from('portfolio_allocations')
      .delete()
      .eq('portfolio_id', portfolioId);
    
    // Insert new allocations
    const { error: newAllocError } = await supabase
      .from('portfolio_allocations')
      .insert(newAllocations);
    
    if (newAllocError) {
      return NextResponse.json({
        warning: 'Rebalancing completed but allocation updates failed',
        details: newAllocError.message,
        transactions: savedTransactions
      });
    }
    
    // Update the portfolio's last_rebalanced date and set the next rebalance date
    const now = new Date();
    let nextRebalanceDate = null;
    
    switch (portfolio.rebalancing_frequency) {
      case RebalancingFrequency.DAILY:
        nextRebalanceDate = new Date(now.setDate(now.getDate() + 1));
        break;
      case RebalancingFrequency.WEEKLY:
        nextRebalanceDate = new Date(now.setDate(now.getDate() + 7));
        break;
      case RebalancingFrequency.MONTHLY:
        nextRebalanceDate = new Date(now.setMonth(now.getMonth() + 1));
        break;
      case RebalancingFrequency.QUARTERLY:
        nextRebalanceDate = new Date(now.setMonth(now.getMonth() + 3));
        break;
      case RebalancingFrequency.YEARLY:
        nextRebalanceDate = new Date(now.setFullYear(now.getFullYear() + 1));
        break;
      default:
        nextRebalanceDate = null; // No next date for THRESHOLD or MANUAL
    }
    
    const { error: portfolioUpdateError } = await supabase
      .from('portfolios')
      .update({
        last_rebalanced: new Date().toISOString(),
        next_rebalance: nextRebalanceDate ? nextRebalanceDate.toISOString() : null
      })
      .eq('id', portfolioId);
    
    if (portfolioUpdateError) {
      return NextResponse.json({
        warning: 'Rebalancing completed but portfolio date updates failed',
        details: portfolioUpdateError.message,
        transactions: savedTransactions
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Portfolio rebalanced successfully',
      transactionCount: transactions.length,
      transactions: savedTransactions,
      nextRebalance: nextRebalanceDate ? nextRebalanceDate.toISOString() : null
    });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET handler to check rebalance status
 * 
 * Returns whether a portfolio needs rebalancing and details about its status
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const portfolioId = searchParams.get('id');
  
  if (!portfolioId) {
    return NextResponse.json(
      { error: 'Portfolio ID is required' },
      { status: 400 }
    );
  }
  
  try {
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Fetch portfolio
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', portfolioId)
      .eq('user_id', session.user.id)
      .single();
    
    if (portfolioError || !portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found or access denied', details: portfolioError?.message },
        { status: 404 }
      );
    }
    
    // Fetch current allocations
    const { data: currentAllocations, error: allocationsError } = await supabase
      .from('portfolio_allocations')
      .select('*, strategy:strategies(name)')
      .eq('portfolio_id', portfolioId);
    
    if (allocationsError) {
      return NextResponse.json(
        { error: 'Failed to fetch current allocations', details: allocationsError.message },
        { status: 500 }
      );
    }
    
    // Fetch target allocations
    const { data: targetAllocations, error: targetsError } = await supabase
      .from('allocation_targets')
      .select('*, strategy:strategies(name)')
      .eq('portfolio_id', portfolioId);
    
    if (targetsError) {
      return NextResponse.json(
        { error: 'Failed to fetch target allocations', details: targetsError.message },
        { status: 500 }
      );
    }
    
    // If no targets defined, can't compare
    if (!targetAllocations || targetAllocations.length === 0) {
      return NextResponse.json({
        needsRebalance: false,
        message: 'No target allocations defined'
      });
    }
    
    // Check for drift if using threshold rebalancing
    let needsRebalance = false;
    let maxDrift = 0;
    let driftedStrategy = null;
    
    if (currentAllocations && currentAllocations.length > 0) {
      currentAllocations.forEach(current => {
        const target = targetAllocations.find(t => t.strategy_id === current.strategy_id);
        if (target) {
          const drift = Math.abs(current.allocation_percentage - target.target_percentage);
          if (drift > maxDrift) {
            maxDrift = drift;
            driftedStrategy = {
              id: current.strategy_id,
              name: current.strategy?.name,
              current: current.allocation_percentage,
              target: target.target_percentage,
              drift
            };
          }
        }
      });
    }
    
    // Check for scheduled rebalancing
    let scheduledRebalanceDue = false;
    
    if (portfolio.rebalancing_frequency !== RebalancingFrequency.MANUAL && 
        portfolio.rebalancing_frequency !== RebalancingFrequency.THRESHOLD) {
      if (!portfolio.next_rebalance || new Date(portfolio.next_rebalance) <= new Date()) {
        scheduledRebalanceDue = true;
      }
    }
    
    // Check if threshold is exceeded
    let thresholdExceeded = false;
    const driftThreshold = portfolio.drift_threshold || 5;
    
    if (maxDrift > driftThreshold) {
      thresholdExceeded = true;
    }
    
    // Determine if rebalance is needed
    if ((portfolio.rebalancing_frequency === RebalancingFrequency.THRESHOLD && thresholdExceeded) ||
        (portfolio.rebalancing_frequency !== RebalancingFrequency.THRESHOLD && 
         portfolio.rebalancing_frequency !== RebalancingFrequency.MANUAL && 
         scheduledRebalanceDue)) {
      needsRebalance = true;
    }
    
    // Calculate portfolio total value and strategy allocations for response
    const portfolioValue = portfolio.current_value;
    const strategyAllocations = currentAllocations.map(alloc => ({
      strategy_id: alloc.strategy_id,
      strategy_name: alloc.strategy?.name,
      current_percentage: alloc.allocation_percentage,
      target_percentage: targetAllocations.find(t => t.strategy_id === alloc.strategy_id)?.target_percentage || 0,
      current_value: alloc.current_value,
      target_value: ((targetAllocations.find(t => t.strategy_id === alloc.strategy_id)?.target_percentage || 0) / 100) * portfolioValue,
      drift: alloc.allocation_percentage - (targetAllocations.find(t => t.strategy_id === alloc.strategy_id)?.target_percentage || 0)
    }));
    
    // Fetching recent rebalancing transactions
    const { data: recentTransactions, error: transactionsError } = await supabase
      .from('rebalancing_transactions')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('date', { ascending: false })
      .limit(5);
    
    return NextResponse.json({
      portfolio: {
        id: portfolio.id,
        name: portfolio.name,
        rebalancing_frequency: portfolio.rebalancing_frequency,
        drift_threshold: driftThreshold,
        last_rebalanced: portfolio.last_rebalanced,
        next_rebalance: portfolio.next_rebalance
      },
      needsRebalance,
      maxDrift,
      driftThreshold,
      driftedStrategy,
      scheduledRebalanceDue,
      thresholdExceeded,
      strategyAllocations,
      recentTransactions: recentTransactions || []
    });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
