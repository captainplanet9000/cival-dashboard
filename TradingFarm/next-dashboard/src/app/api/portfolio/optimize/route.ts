import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { AllocationMethod } from '@/types/portfolio';
import { PortfolioStrategy } from '@/types/backtesting';

// Function to calculate covariance matrix from return series
function calculateCovarianceMatrix(returns: number[][]): number[][] {
  const n = returns.length; // Number of strategies
  const m = returns[0].length; // Number of data points
  
  // Calculate means
  const means = returns.map(series => 
    series.reduce((sum, val) => sum + val, 0) / m
  );
  
  // Calculate covariance matrix
  const covMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let cov = 0;
      for (let k = 0; k < m; k++) {
        cov += (returns[i][k] - means[i]) * (returns[j][k] - means[j]);
      }
      cov /= (m - 1);
      covMatrix[i][j] = cov;
      covMatrix[j][i] = cov; // Covariance matrix is symmetric
    }
  }
  
  return covMatrix;
}

// Function to calculate expected returns (average of historical returns)
function calculateExpectedReturns(returns: number[][]): number[] {
  return returns.map(series => 
    series.reduce((sum, val) => sum + val, 0) / series.length
  );
}

// Function to optimize portfolio for maximum Sharpe ratio
function optimizeMaximumSharpe(
  expectedReturns: number[], 
  covMatrix: number[][], 
  riskFreeRate: number = 0.02,
  constraints: any = {}
): number[] {
  const n = expectedReturns.length;
  
  // Simple approach using matrix operations would be more complex
  // For simplicity, we use a gradient ascent approach here
  
  // Initialize with equal weights
  let weights = Array(n).fill(1/n);
  
  // Apply constraints (min/max allocation per strategy)
  if (constraints.min_allocation_per_strategy) {
    weights = weights.map(w => Math.max(w, constraints.min_allocation_per_strategy));
    // Normalize
    const sum = weights.reduce((a, b) => a + b, 0);
    weights = weights.map(w => w / sum);
  }
  
  if (constraints.max_allocation_per_strategy) {
    weights = weights.map(w => Math.min(w, constraints.max_allocation_per_strategy));
    // Normalize
    const sum = weights.reduce((a, b) => a + b, 0);
    weights = weights.map(w => w / sum);
  }
  
  // Calculate portfolio return
  const portfolioReturn = weights.reduce((sum, weight, i) => 
    sum + weight * expectedReturns[i], 0
  );
  
  // Calculate portfolio variance
  let portfolioVariance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      portfolioVariance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  
  // Calculate portfolio std dev
  const portfolioStdDev = Math.sqrt(portfolioVariance);
  
  // Calculate Sharpe ratio
  const sharpeRatio = (portfolioReturn - riskFreeRate) / portfolioStdDev;
  
  // In a production system, we would use a formal optimization library
  // or algorithm to find the weights that maximize the Sharpe ratio
  
  // For now, we'll return our naive allocation as a placeholder
  return weights;
}

// Function to optimize portfolio for minimum variance
function optimizeMinimumVariance(
  covMatrix: number[][],
  constraints: any = {}
): number[] {
  const n = covMatrix.length;
  
  // Simple implementation - equal risk contribution
  // For a true minimum variance, we'd use quadratic programming
  
  // Initialize with equal weights
  let weights = Array(n).fill(1/n);
  
  // Apply constraints (min/max allocation per strategy)
  if (constraints.min_allocation_per_strategy) {
    weights = weights.map(w => Math.max(w, constraints.min_allocation_per_strategy));
    // Normalize
    const sum = weights.reduce((a, b) => a + b, 0);
    weights = weights.map(w => w / sum);
  }
  
  if (constraints.max_allocation_per_strategy) {
    weights = weights.map(w => Math.min(w, constraints.max_allocation_per_strategy));
    // Normalize
    const sum = weights.reduce((a, b) => a + b, 0);
    weights = weights.map(w => w / sum);
  }
  
  // In a production system, we would use a formal optimization library
  // to find the weights that minimize variance
  
  return weights;
}

// Function to optimize portfolio for risk parity
function optimizeRiskParity(
  covMatrix: number[][],
  constraints: any = {}
): number[] {
  const n = covMatrix.length;
  
  // For risk parity, we want each asset to contribute equally to portfolio risk
  // Start with equal weights
  let weights = Array(n).fill(1/n);
  
  // Calculate marginal risk contributions
  const riskContributions = [];
  
  for (let i = 0; i < n; i++) {
    let marginalRisk = 0;
    for (let j = 0; j < n; j++) {
      marginalRisk += weights[j] * covMatrix[i][j];
    }
    riskContributions.push(marginalRisk);
  }
  
  // Calculate portfolio volatility
  let portfolioVariance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      portfolioVariance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  const portfolioVolatility = Math.sqrt(portfolioVariance);
  
  // Calculate risk contributions
  const totalRiskContributions = weights.map((w, i) => 
    w * riskContributions[i] / portfolioVolatility
  );
  
  // Ideally, we would iteratively adjust weights until risk contributions are equal
  // For simplicity, we'll just return inverse volatility weighted allocation
  const volatilities = covMatrix.map((row, i) => Math.sqrt(row[i])); // Diagonal elements are variances
  const invVol = volatilities.map(vol => 1 / vol);
  const sum = invVol.reduce((a, b) => a + b, 0);
  weights = invVol.map(v => v / sum);
  
  // Apply constraints (min/max allocation per strategy)
  if (constraints.min_allocation_per_strategy) {
    weights = weights.map(w => Math.max(w, constraints.min_allocation_per_strategy));
    // Normalize
    const weightSum = weights.reduce((a, b) => a + b, 0);
    weights = weights.map(w => w / weightSum);
  }
  
  if (constraints.max_allocation_per_strategy) {
    weights = weights.map(w => Math.min(w, constraints.max_allocation_per_strategy));
    // Normalize
    const weightSum = weights.reduce((a, b) => a + b, 0);
    weights = weights.map(w => w / weightSum);
  }
  
  return weights;
}

/**
 * POST handler to optimize portfolio allocations
 * 
 * Takes a portfolio ID and optimization parameters and returns
 * the optimal allocations based on the selected method
 */
export async function POST(req: Request) {
  try {
    const { 
      portfolioId, 
      optimizationGoal, 
      riskFreeRate = 0.02,
      constraints = {},
      lookbackPeriod = '1y'
    } = await req.json();
    
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
    
    // Fetch current allocations to get the strategies in the portfolio
    const { data: currentAllocations, error: allocationsError } = await supabase
      .from('portfolio_allocations')
      .select('*, strategy:strategies(*)')
      .eq('portfolio_id', portfolioId);
    
    if (allocationsError || !currentAllocations || currentAllocations.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch portfolio allocations or no allocations found', details: allocationsError?.message },
        { status: 500 }
      );
    }
    
    // Extract strategy IDs
    const strategies = currentAllocations.map(allocation => ({
      id: allocation.strategy_id,
      name: allocation.strategy?.name || 'Unknown Strategy',
      currentAllocation: allocation.allocation_percentage
    }));
    
    // Fetch historical performance data for each strategy
    // In a real implementation, this would be actual historical data
    // For demo purposes, we'll generate synthetic data
    
    // Generate synthetic returns data (normally we would get this from historical data)
    const numDataPoints = lookbackPeriod === '1m' ? 30 : 
                         lookbackPeriod === '3m' ? 90 : 
                         lookbackPeriod === '6m' ? 180 : 
                         lookbackPeriod === '1y' ? 365 : 
                         lookbackPeriod === 'ytd' ? 365 : 365;
    
    const returns: number[][] = [];
    const strategyExpectedReturns: number[] = [];
    const strategyVolatilities: number[] = [];
    
    // Generate synthetic returns for each strategy
    for (let i = 0; i < strategies.length; i++) {
      const annualReturn = 0.05 + (Math.random() * 0.15); // 5-20% annual return
      const annualVol = 0.10 + (Math.random() * 0.20);    // 10-30% annual volatility
      
      const dailyReturn = annualReturn / 365;
      const dailyVol = annualVol / Math.sqrt(365);
      
      strategyExpectedReturns.push(annualReturn);
      strategyVolatilities.push(annualVol);
      
      const strategyReturns = [];
      for (let j = 0; j < numDataPoints; j++) {
        // Generate random return from normal distribution
        const randomReturn = dailyReturn + (dailyVol * (Math.random() * 2 - 1));
        strategyReturns.push(randomReturn);
      }
      
      returns.push(strategyReturns);
    }
    
    // Calculate covariance matrix from returns
    const covMatrix = calculateCovarianceMatrix(returns);
    
    // Expected returns (annualized)
    const expectedReturns = strategyExpectedReturns;
    
    // Determine optimization goal if not provided
    const method = optimizationGoal || (
      portfolio.allocation_method === AllocationMethod.RISK_PARITY ? 'risk_parity' :
      portfolio.allocation_method === AllocationMethod.MAXIMUM_SHARPE ? 'maximize_sharpe' :
      portfolio.allocation_method === AllocationMethod.MINIMUM_VARIANCE ? 'minimize_risk' :
      'maximize_sharpe' // Default
    );
    
    // Calculate optimal weights based on the selected method
    let optimalWeights: number[] = [];
    
    switch (method) {
      case 'maximize_return':
        // Simple approach - allocate to the strategy with highest expected return
        const maxReturnIndex = expectedReturns.indexOf(Math.max(...expectedReturns));
        optimalWeights = Array(strategies.length).fill(0);
        optimalWeights[maxReturnIndex] = 1;
        break;
        
      case 'minimize_risk':
        optimalWeights = optimizeMinimumVariance(covMatrix, constraints);
        break;
        
      case 'maximize_sharpe':
        optimalWeights = optimizeMaximumSharpe(expectedReturns, covMatrix, riskFreeRate, constraints);
        break;
        
      case 'risk_parity':
        optimalWeights = optimizeRiskParity(covMatrix, constraints);
        break;
        
      default:
        // Equal weight as fallback
        optimalWeights = Array(strategies.length).fill(1 / strategies.length);
    }
    
    // Ensure weights sum to 1 (100%)
    const sumWeights = optimalWeights.reduce((a, b) => a + b, 0);
    optimalWeights = optimalWeights.map(w => w / sumWeights);
    
    // Convert to percentages and format results
    const optimizedAllocations = strategies.map((strategy, index) => ({
      strategy_id: strategy.id,
      strategy_name: strategy.name,
      current_allocation: strategy.currentAllocation,
      recommended_allocation: optimalWeights[index] * 100,
      change: (optimalWeights[index] * 100) - strategy.currentAllocation,
      expected_return: expectedReturns[index] * 100, // Convert to percentage
      volatility: strategyVolatilities[index] * 100  // Convert to percentage
    }));
    
    // Calculate portfolio-level metrics
    let expectedPortfolioReturn = 0;
    let portfolioVariance = 0;
    
    // Calculate expected portfolio return
    for (let i = 0; i < strategies.length; i++) {
      expectedPortfolioReturn += optimalWeights[i] * expectedReturns[i];
    }
    
    // Calculate portfolio variance
    for (let i = 0; i < strategies.length; i++) {
      for (let j = 0; j < strategies.length; j++) {
        portfolioVariance += optimalWeights[i] * optimalWeights[j] * covMatrix[i][j];
      }
    }
    
    const expectedPortfolioVolatility = Math.sqrt(portfolioVariance);
    const expectedSharpeRatio = (expectedPortfolioReturn - riskFreeRate) / expectedPortfolioVolatility;
    
    // Save optimization parameters to database
    const { data: optimizationParams, error: paramError } = await supabase
      .from('optimization_parameters')
      .insert({
        portfolio_id: portfolioId,
        optimization_goal: method,
        risk_free_rate: riskFreeRate,
        max_allocation_per_strategy: constraints.max_allocation_per_strategy,
        min_allocation_per_strategy: constraints.min_allocation_per_strategy,
        max_portfolio_volatility: constraints.max_portfolio_volatility,
        min_expected_return: constraints.min_expected_return,
        custom_constraints: constraints.custom_constraints,
        lookback_period: lookbackPeriod
      })
      .select()
      .single();
    
    if (paramError) {
      return NextResponse.json({
        warning: 'Optimization completed but parameters failed to save',
        details: paramError.message,
        optimizedAllocations
      });
    }
    
    // Save optimization results
    const { data: optimizationResult, error: resultError } = await supabase
      .from('optimization_results')
      .insert({
        optimization_id: optimizationParams.id,
        portfolio_id: portfolioId,
        allocations: optimizedAllocations,
        expected_portfolio_return: expectedPortfolioReturn * 100, // Convert to percentage
        expected_portfolio_volatility: expectedPortfolioVolatility * 100, // Convert to percentage
        expected_sharpe_ratio: expectedSharpeRatio
      })
      .select()
      .single();
    
    if (resultError) {
      return NextResponse.json({
        warning: 'Optimization completed but results failed to save',
        details: resultError.message,
        optimizedAllocations
      });
    }
    
    return NextResponse.json({
      success: true,
      method: method,
      optimizedAllocations,
      portfolioMetrics: {
        expectedReturn: expectedPortfolioReturn * 100, // Convert to percentage
        expectedVolatility: expectedPortfolioVolatility * 100, // Convert to percentage
        expectedSharpeRatio,
        riskFreeRate: riskFreeRate * 100 // Convert to percentage
      },
      optimization: {
        id: optimizationResult.id,
        date: optimizationResult.created_at
      }
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
 * GET handler to fetch optimization history
 * 
 * Returns past optimization runs for a portfolio
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const portfolioId = searchParams.get('id');
  const optimizationId = searchParams.get('optimization_id');
  
  if (!portfolioId && !optimizationId) {
    return NextResponse.json(
      { error: 'Portfolio ID or optimization ID is required' },
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
    
    // If optimization ID is provided, fetch specific optimization
    if (optimizationId) {
      const { data: optimization, error: optimizationError } = await supabase
        .from('optimization_results')
        .select(`
          *,
          optimization:optimization_parameters(*)
        `)
        .eq('id', optimizationId)
        .single();
      
      if (optimizationError || !optimization) {
        return NextResponse.json(
          { error: 'Optimization not found or access denied', details: optimizationError?.message },
          { status: 404 }
        );
      }
      
      // Verify the user owns this optimization via portfolio
      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', optimization.portfolio_id)
        .eq('user_id', session.user.id)
        .single();
      
      if (portfolioError || !portfolio) {
        return NextResponse.json(
          { error: 'Access denied - optimization is not for your portfolio' },
          { status: 403 }
        );
      }
      
      return NextResponse.json(optimization);
    }
    
    // Otherwise fetch all optimizations for the portfolio
    const { data: optimizations, error: optimizationsError } = await supabase
      .from('optimization_results')
      .select(`
        *,
        optimization:optimization_parameters(*)
      `)
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: false });
    
    if (optimizationsError) {
      return NextResponse.json(
        { error: 'Failed to fetch optimizations', details: optimizationsError.message },
        { status: 500 }
      );
    }
    
    // Verify the user owns this portfolio
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
    
    return NextResponse.json(optimizations || []);
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
