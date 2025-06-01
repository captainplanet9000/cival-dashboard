import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { RebalancingFrequency } from '@/types/portfolio';

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request body
    const { portfolioId } = await req.json();
    
    // Get portfolios to check
    let portfolioQuery = supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'active');
    
    // If portfolioId is provided, only check that specific portfolio
    if (portfolioId) {
      portfolioQuery = portfolioQuery.eq('id', portfolioId);
    }
    
    const { data: portfolios, error: portfoliosError } = await portfolioQuery;
    
    if (portfoliosError) {
      console.error('Error fetching portfolios:', portfoliosError);
      return NextResponse.json({ error: 'Failed to fetch portfolios' }, { status: 500 });
    }
    
    // For each portfolio, check if rebalancing is needed
    const rebalanceResults = await Promise.all(
      portfolios.map(async (portfolio) => {
        // For scheduled rebalancing, check if it's time to rebalance
        if (portfolio.rebalancing_frequency !== 'manual' && portfolio.rebalancing_frequency !== 'threshold') {
          let nextRebalanceDate = null;
          
          // Calculate next rebalance date based on last rebalance or creation date
          const baseDate = portfolio.last_rebalanced || portfolio.created_at;
          const lastRebalanceDate = new Date(baseDate);
          
          switch (portfolio.rebalancing_frequency as RebalancingFrequency) {
            case 'daily':
              nextRebalanceDate = new Date(lastRebalanceDate);
              nextRebalanceDate.setDate(lastRebalanceDate.getDate() + 1);
              break;
            case 'weekly':
              nextRebalanceDate = new Date(lastRebalanceDate);
              nextRebalanceDate.setDate(lastRebalanceDate.getDate() + 7);
              break;
            case 'monthly':
              nextRebalanceDate = new Date(lastRebalanceDate);
              nextRebalanceDate.setMonth(lastRebalanceDate.getMonth() + 1);
              break;
            case 'quarterly':
              nextRebalanceDate = new Date(lastRebalanceDate);
              nextRebalanceDate.setMonth(lastRebalanceDate.getMonth() + 3);
              break;
            case 'yearly':
              nextRebalanceDate = new Date(lastRebalanceDate);
              nextRebalanceDate.setFullYear(lastRebalanceDate.getFullYear() + 1);
              break;
          }
          
          // Update next_rebalance in database
          if (nextRebalanceDate) {
            const { error: updateError } = await supabase
              .from('portfolios')
              .update({ next_rebalance: nextRebalanceDate.toISOString() })
              .eq('id', portfolio.id);
              
            if (updateError) {
              console.error(`Error updating next_rebalance for portfolio ${portfolio.id}:`, updateError);
            }
            
            // Check if it's time to rebalance
            const now = new Date();
            if (nextRebalanceDate <= now) {
              // Set rebalance notification flag
              const { error: flagError } = await supabase
                .from('portfolios')
                .update({ rebalance_notification: true })
                .eq('id', portfolio.id);
                
              if (flagError) {
                console.error(`Error setting rebalance notification flag for portfolio ${portfolio.id}:`, flagError);
              }
            }
          }
        }
        
        // For threshold-based rebalancing, check drift against threshold
        if (portfolio.rebalancing_frequency === 'threshold') {
          // Get all allocations for this portfolio
          const { data: allocations, error: allocationsError } = await supabase
            .from('portfolio_allocations')
            .select('*')
            .eq('portfolio_id', portfolio.id);
            
          if (allocationsError) {
            console.error(`Error fetching allocations for portfolio ${portfolio.id}:`, allocationsError);
            return {
              portfolioId: portfolio.id,
              name: portfolio.name,
              result: 'error',
              message: 'Failed to fetch allocations',
            };
          }
          
          // Calculate if any allocation exceeds drift threshold
          const driftThreshold = portfolio.drift_threshold || 5; // Default to 5% if not specified
          const needsRebalancing = allocations.some(
            allocation => Math.abs(allocation.drift || 0) > driftThreshold
          );
          
          if (needsRebalancing) {
            // Set rebalance notification flag
            const { error: flagError } = await supabase
              .from('portfolios')
              .update({ rebalance_notification: true })
              .eq('id', portfolio.id);
              
            if (flagError) {
              console.error(`Error setting rebalance notification flag for portfolio ${portfolio.id}:`, flagError);
              return {
                portfolioId: portfolio.id,
                name: portfolio.name,
                result: 'error',
                message: 'Failed to set rebalance notification',
              };
            }
            
            return {
              portfolioId: portfolio.id,
              name: portfolio.name,
              result: 'needs_rebalancing',
              message: 'Portfolio exceeds drift threshold',
            };
          }
        }
        
        return {
          portfolioId: portfolio.id,
          name: portfolio.name,
          result: 'checked',
          message: 'Portfolio checked for rebalancing needs',
        };
      })
    );
    
    // Call the database function to create rebalance transactions
    const { error: functionError } = await supabase.rpc('create_scheduled_rebalance_transactions');
    
    if (functionError) {
      console.error('Error calling create_scheduled_rebalance_transactions:', functionError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Maintenance check completed',
      results: rebalanceResults,
    });
  } catch (error) {
    console.error('Error performing maintenance check:', error);
    return NextResponse.json(
      { error: 'Failed to perform maintenance check' },
      { status: 500 }
    );
  }
}
