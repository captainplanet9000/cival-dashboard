import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { AllocationMethod, RebalancingFrequency, PortfolioStatus } from '@/types/portfolio';

/**
 * GET handler to fetch user portfolios
 * 
 * Returns all portfolios belonging to the authenticated user
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const portfolioId = searchParams.get('id');
  
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
    
    // If portfolio ID is provided, fetch specific portfolio
    if (portfolioId) {
      const { data: portfolio, error } = await supabase
        .from('portfolios')
        .select(`
          *,
          portfolio_allocations(
            *,
            strategy:strategies(id, name, type)
          ),
          allocation_targets(
            *,
            strategy:strategies(id, name, type)
          )
        `)
        .eq('id', portfolioId)
        .eq('user_id', session.user.id)
        .single();
      
      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch portfolio', details: error.message },
          { status: 404 }
        );
      }
      
      return NextResponse.json(portfolio);
    }
    
    // Otherwise fetch all user portfolios
    const { data: portfolios, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch portfolios', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(portfolios);
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST handler to create a new portfolio
 * 
 * Creates a portfolio and its initial allocations
 */
export async function POST(req: Request) {
  try {
    const portfolioData = await req.json();
    
    // Validate required fields
    if (!portfolioData.name || !portfolioData.initial_capital || !portfolioData.allocation_method) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
    
    // Set up portfolio data
    const portfolio = {
      user_id: session.user.id,
      name: portfolioData.name,
      description: portfolioData.description || '',
      status: portfolioData.status || PortfolioStatus.DRAFT,
      initial_capital: portfolioData.initial_capital,
      current_value: portfolioData.initial_capital, // Initially set to same as initial capital
      allocation_method: portfolioData.allocation_method || AllocationMethod.EQUAL_WEIGHT,
      rebalancing_frequency: portfolioData.rebalancing_frequency || RebalancingFrequency.MONTHLY,
      drift_threshold: portfolioData.drift_threshold || 5
    };
    
    // Insert portfolio
    const { data: createdPortfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .insert(portfolio)
      .select()
      .single();
    
    if (portfolioError) {
      return NextResponse.json(
        { error: 'Failed to create portfolio', details: portfolioError.message },
        { status: 500 }
      );
    }
    
    // Insert portfolio allocations
    if (portfolioData.allocations && portfolioData.allocations.length > 0) {
      const allocations = portfolioData.allocations.map((allocation: any) => ({
        portfolio_id: createdPortfolio.id,
        strategy_id: allocation.strategy_id,
        allocation_percentage: allocation.allocation_percentage,
        current_value: (allocation.allocation_percentage / 100) * portfolioData.initial_capital,
        target_value: (allocation.allocation_percentage / 100) * portfolioData.initial_capital,
        actual_percentage: allocation.allocation_percentage,
        drift: 0 // Initially no drift
      }));
      
      const { error: allocationsError } = await supabase
        .from('portfolio_allocations')
        .insert(allocations);
      
      if (allocationsError) {
        // If allocations fail, still return the portfolio but with a warning
        return NextResponse.json({
          portfolio: createdPortfolio,
          warning: 'Portfolio created but allocations failed to save',
          details: allocationsError.message
        });
      }
      
      // Create allocation targets (match the initial allocations)
      const targets = portfolioData.allocations.map((allocation: any) => ({
        portfolio_id: createdPortfolio.id,
        strategy_id: allocation.strategy_id,
        target_percentage: allocation.allocation_percentage,
        min_percentage: null,
        max_percentage: null,
        is_locked: false
      }));
      
      await supabase.from('allocation_targets').insert(targets);
    }
    
    return NextResponse.json({
      success: true,
      portfolio: createdPortfolio,
      message: 'Portfolio created successfully'
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
 * PUT handler to update an existing portfolio
 * 
 * Updates portfolio details and allocations
 */
export async function PUT(req: Request) {
  try {
    const portfolioData = await req.json();
    
    // Validate portfolio ID
    if (!portfolioData.id) {
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
    
    // Verify the portfolio belongs to the user
    const { data: existingPortfolio, error: fetchError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', portfolioData.id)
      .eq('user_id', session.user.id)
      .single();
    
    if (fetchError || !existingPortfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found or access denied' },
        { status: 404 }
      );
    }
    
    // Update portfolio
    const portfolioUpdates = {
      name: portfolioData.name || existingPortfolio.name,
      description: portfolioData.description || existingPortfolio.description,
      status: portfolioData.status || existingPortfolio.status,
      allocation_method: portfolioData.allocation_method || existingPortfolio.allocation_method,
      rebalancing_frequency: portfolioData.rebalancing_frequency || existingPortfolio.rebalancing_frequency,
      drift_threshold: portfolioData.drift_threshold || existingPortfolio.drift_threshold
    };
    
    const { data: updatedPortfolio, error: updateError } = await supabase
      .from('portfolios')
      .update(portfolioUpdates)
      .eq('id', portfolioData.id)
      .select()
      .single();
    
    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update portfolio', details: updateError.message },
        { status: 500 }
      );
    }
    
    // Handle allocation updates if provided
    if (portfolioData.allocations && portfolioData.allocations.length > 0) {
      // Delete existing allocations
      await supabase
        .from('portfolio_allocations')
        .delete()
        .eq('portfolio_id', portfolioData.id);
      
      // Insert new allocations
      const allocations = portfolioData.allocations.map((allocation: any) => ({
        portfolio_id: portfolioData.id,
        strategy_id: allocation.strategy_id,
        allocation_percentage: allocation.allocation_percentage,
        current_value: (allocation.allocation_percentage / 100) * existingPortfolio.current_value,
        target_value: (allocation.allocation_percentage / 100) * existingPortfolio.current_value,
        actual_percentage: allocation.allocation_percentage,
        drift: 0 // Reset drift on update
      }));
      
      const { error: allocationsError } = await supabase
        .from('portfolio_allocations')
        .insert(allocations);
      
      if (allocationsError) {
        return NextResponse.json({
          portfolio: updatedPortfolio,
          warning: 'Portfolio updated but allocations failed to update',
          details: allocationsError.message
        });
      }
      
      // Update allocation targets
      await supabase
        .from('allocation_targets')
        .delete()
        .eq('portfolio_id', portfolioData.id);
      
      const targets = portfolioData.allocations.map((allocation: any) => ({
        portfolio_id: portfolioData.id,
        strategy_id: allocation.strategy_id,
        target_percentage: allocation.allocation_percentage,
        min_percentage: null,
        max_percentage: null,
        is_locked: false
      }));
      
      await supabase.from('allocation_targets').insert(targets);
    }
    
    return NextResponse.json({
      success: true,
      portfolio: updatedPortfolio,
      message: 'Portfolio updated successfully'
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
 * DELETE handler to delete a portfolio
 * 
 * Deletes a portfolio and all associated data
 */
export async function DELETE(req: Request) {
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
    
    // Verify the portfolio belongs to the user
    const { data: existingPortfolio, error: fetchError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', portfolioId)
      .eq('user_id', session.user.id)
      .single();
    
    if (fetchError || !existingPortfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found or access denied' },
        { status: 404 }
      );
    }
    
    // Delete the portfolio
    // Note: Due to CASCADE constraints in the database, this will delete all related records
    const { error: deleteError } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', portfolioId);
    
    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete portfolio', details: deleteError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Portfolio deleted successfully'
    });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
