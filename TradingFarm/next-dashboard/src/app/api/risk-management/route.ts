import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { RiskManagementService } from '@/services/risk/risk-management-service';
import { YieldStrategy } from '@/types/yield-strategy.types';
import { RiskSettings } from '@/services/risk/risk-assessment-db';

// Initialize the risk management service
const riskManagementService = new RiskManagementService();

/**
 * GET /api/risk-management
 * Get risk assessments for user strategies
 */
export async function GET(request: Request) {
  try {
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Get authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401 }
      );
    }
    
    // Get URL params
    const { searchParams } = new URL(request.url);
    const strategyId = searchParams.get('strategyId');
    const farmId = searchParams.get('farmId');
    
    // If strategy ID is provided, get assessment for specific strategy
    if (strategyId) {
      // Fetch the strategy
      const { data: strategy, error } = await supabase
        .from('yield_strategies')
        .select('*')
        .eq('id', strategyId)
        .eq('user_id', session.user.id)
        .single();
      
      if (error || !strategy) {
        return new NextResponse(
          JSON.stringify({ error: 'Strategy not found' }),
          { status: 404 }
        );
      }
      
      // Get risk assessment
      const assessment = await riskManagementService.assessStrategyRisk(
        strategy as YieldStrategy,
        true // Save to DB
      );
      
      return NextResponse.json({ assessment });
    }
    
    // If farm ID is provided, get assessments for all strategies in farm
    if (farmId) {
      // Fetch all strategies for the farm
      const { data: strategies, error } = await supabase
        .from('yield_strategies')
        .select('*')
        .eq('farm_id', farmId)
        .eq('user_id', session.user.id);
      
      if (error) {
        return new NextResponse(
          JSON.stringify({ error: 'Error fetching strategies' }),
          { status: 500 }
        );
      }
      
      // Get assessments for all strategies
      const assessments = await Promise.all(
        (strategies as YieldStrategy[]).map(async (strategy) => {
          const assessment = await riskManagementService.assessStrategyRisk(strategy, true);
          return {
            strategyId: strategy.id,
            name: strategy.name,
            assessment
          };
        })
      );
      
      return NextResponse.json({ assessments });
    }
    
    // If neither provided, return user's risk settings
    const settings = await riskManagementService.getRiskSettings(session.user.id);
    
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('API route error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}

/**
 * POST /api/risk-management
 * Calculate position size or save risk settings
 */
export async function POST(request: Request) {
  try {
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Get authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { action, ...data } = body;
    
    switch (action) {
      case 'calculatePositionSize': {
        const { capital, riskLevel, maxRiskPercent, volatilityMultiplier, strategyId } = data;
        
        if (typeof capital !== 'number' || typeof riskLevel !== 'number') {
          return new NextResponse(
            JSON.stringify({ error: 'Invalid parameters' }),
            { status: 400 }
          );
        }
        
        const positionSize = await riskManagementService.calculatePositionSize(
          capital,
          riskLevel,
          maxRiskPercent || 2,
          volatilityMultiplier || 1,
          session.user.id,
          strategyId
        );
        
        return NextResponse.json({ positionSize });
      }
      
      case 'saveSettings': {
        const { strategyId, isDefault, ...settings } = data;
        
        const riskSettings: RiskSettings = {
          user_id: session.user.id,
          strategy_id: isDefault ? undefined : strategyId,
          max_risk_percent: settings.maxRiskPercent,
          stop_loss_enabled: settings.stopLossEnabled !== false,
          stop_loss_percent: settings.stopLossPercent,
          circuit_breaker_enabled: settings.circuitBreakerEnabled !== false,
          circuit_breaker_threshold: settings.circuitBreakerThreshold,
          auto_rebalance_enabled: settings.autoRebalanceEnabled === true,
          auto_rebalance_threshold: settings.autoRebalanceThreshold,
          is_default: isDefault === true
        };
        
        const savedSettings = await riskManagementService.saveRiskSettings(riskSettings);
        
        return NextResponse.json({
          settings: savedSettings,
          message: 'Risk settings saved successfully'
        });
      }
      
      case 'checkCircuitBreakers': {
        const { strategyId } = data;
        
        if (!strategyId) {
          return new NextResponse(
            JSON.stringify({ error: 'Strategy ID is required' }),
            { status: 400 }
          );
        }
        
        // Fetch the strategy
        const { data: strategy, error } = await supabase
          .from('yield_strategies')
          .select('*')
          .eq('id', strategyId)
          .eq('user_id', session.user.id)
          .single();
        
        if (error || !strategy) {
          return new NextResponse(
            JSON.stringify({ error: 'Strategy not found' }),
            { status: 404 }
          );
        }
        
        const circuitBreakers = await riskManagementService.checkCircuitBreakers(
          strategy as YieldStrategy,
          session.user.id
        );
        
        return NextResponse.json({ circuitBreakers });
      }
      
      default:
        return new NextResponse(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('API route error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}

/**
 * PUT /api/risk-management
 * Update risk settings
 */
export async function PUT(request: Request) {
  try {
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Get authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401 }
      );
    }
    
    // Parse request body
    const data = await request.json();
    const { strategyId, ...settings } = data;
    
    if (!strategyId) {
      return new NextResponse(
        JSON.stringify({ error: 'Strategy ID is required' }),
        { status: 400 }
      );
    }
    
    // First check if the strategy belongs to the user
    const { data: strategy, error } = await supabase
      .from('yield_strategies')
      .select('id')
      .eq('id', strategyId)
      .eq('user_id', session.user.id)
      .single();
    
    if (error || !strategy) {
      return new NextResponse(
        JSON.stringify({ error: 'Strategy not found or access denied' }),
        { status: 404 }
      );
    }
    
    // Construct risk settings object
    const riskSettings: RiskSettings = {
      user_id: session.user.id,
      strategy_id: strategyId,
      max_risk_percent: settings.maxRiskPercent,
      stop_loss_enabled: settings.stopLossEnabled !== false,
      stop_loss_percent: settings.stopLossPercent,
      circuit_breaker_enabled: settings.circuitBreakerEnabled !== false,
      circuit_breaker_threshold: settings.circuitBreakerThreshold,
      auto_rebalance_enabled: settings.autoRebalanceEnabled === true,
      auto_rebalance_threshold: settings.autoRebalanceThreshold,
      is_default: false
    };
    
    // Save settings
    const savedSettings = await riskManagementService.saveRiskSettings(riskSettings);
    
    return NextResponse.json({
      settings: savedSettings,
      message: 'Risk settings updated successfully'
    });
  } catch (error) {
    console.error('API route error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}
