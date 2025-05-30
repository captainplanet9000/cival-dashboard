import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const farmId = parseInt(params.id, 10);
  
  if (isNaN(farmId)) {
    return NextResponse.json(
      { error: 'Invalid farm ID' },
      { status: 400 }
    );
  }
  
  try {
    // Get farm from database
    const supabase = await createServerClient();
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .single();
    
    if (farmError) {
      console.error('Error fetching farm:', farmError);
      return NextResponse.json(
        { error: 'Failed to fetch farm' },
        { status: 500 }
      );
    }
    
    if (!farm) {
      return NextResponse.json(
        { error: 'Farm not found' },
        { status: 404 }
      );
    }
    
    // Get related data to calculate risk factors
    const { data: agents } = await supabase
      .from('agents')
      .select('*')
      .eq('farm_id', farmId);
    
    const { data: trades } = await supabase
      .from('trades')
      .select('*')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: false })
      .limit(100);
    
    // Calculate risk score and factors
    const riskScore = calculateRiskScore(farm, agents || [], trades || []);
    const riskFactors = calculateRiskFactors(farm, agents || [], trades || []);
    
    return NextResponse.json({ 
      farmId,
      riskScore,
      factors: riskFactors
    });
  } catch (error) {
    console.error('Error in risk profile API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const farmId = parseInt(params.id, 10);
  
  if (isNaN(farmId)) {
    return NextResponse.json(
      { error: 'Invalid farm ID' },
      { status: 400 }
    );
  }
  
  try {
    const body = await request.json();
    
    if (!body.risk_profile) {
      return NextResponse.json(
        { error: 'Risk profile is required' },
        { status: 400 }
      );
    }
    
    // Update farm risk profile
    const supabase = await createServerClient();
    const { error: updateError } = await supabase
      .from('farms')
      .update({
        risk_profile: body.risk_profile,
        updated_at: new Date().toISOString()
      })
      .eq('id', farmId);
    
    if (updateError) {
      console.error('Error updating farm:', updateError);
      return NextResponse.json(
        { error: 'Failed to update farm risk profile' },
        { status: 500 }
      );
    }
    
    // If risk controls are provided, update them in metadata
    if (body.metadata && body.metadata.risk_controls) {
      // First get current metadata to preserve other fields
      const { data: farm } = await supabase
        .from('farms')
        .select('metadata')
        .eq('id', farmId)
        .single();
      
      const updatedMetadata = {
        ...(farm?.metadata || {}),
        risk_controls: body.metadata.risk_controls
      };
      
      const { error: metadataError } = await supabase
        .from('farms')
        .update({
          metadata: updatedMetadata
        })
        .eq('id', farmId);
      
      if (metadataError) {
        console.error('Error updating risk controls:', metadataError);
        // Continue since the main risk profile was updated
      }
    }
    
    return NextResponse.json({
      message: 'Risk profile updated successfully',
      farmId
    });
  } catch (error) {
    console.error('Error in risk profile API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate risk score based on farm configuration and activity
 */
function calculateRiskScore(farm: any, agents: any[], trades: any[]): number {
  // Base risk from the farm's risk profile
  let baseRisk = 0;
  
  // Assess max drawdown level
  if (farm.risk_profile?.max_drawdown) {
    if (farm.risk_profile.max_drawdown <= 5) {
      baseRisk += 0.1; // Low risk
    } else if (farm.risk_profile.max_drawdown <= 15) {
      baseRisk += 0.3; // Medium risk
    } else {
      baseRisk += 0.5; // High risk
    }
  }
  
  // Assess volatility tolerance
  if (farm.risk_profile?.volatility_tolerance) {
    if (farm.risk_profile.volatility_tolerance === 'low') {
      baseRisk += 0.1;
    } else if (farm.risk_profile.volatility_tolerance === 'medium') {
      baseRisk += 0.3;
    } else {
      baseRisk += 0.5;
    }
  }
  
  // Risk from agent configuration
  let agentRisk = 0;
  if (agents.length > 0) {
    const riskLevels = agents.map(agent => {
      // Assess risk based on agent parameters
      let agentRiskLevel = 0;
      
      // More agents = higher risk due to complexity
      agentRiskLevel += 0.02 * agents.length;
      
      // If agent has high leverage settings
      if (agent.parameters?.leverage && agent.parameters.leverage > 3) {
        agentRiskLevel += 0.1 * (agent.parameters.leverage / 5);
      }
      
      return agentRiskLevel;
    });
    
    // Average risk across all agents
    agentRisk = riskLevels.reduce((sum, risk) => sum + risk, 0) / agents.length;
  }
  
  // Risk from trading activity
  let tradeRisk = 0;
  if (trades.length > 0) {
    // Calculate consecutive losses
    let maxConsecutiveLosses = 0;
    let currentConsecutiveLosses = 0;
    
    for (const trade of trades) {
      if (trade.profit < 0) {
        currentConsecutiveLosses++;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutiveLosses);
      } else {
        currentConsecutiveLosses = 0;
      }
    }
    
    // Adjust risk based on consecutive losses
    tradeRisk += 0.05 * Math.min(maxConsecutiveLosses / 3, 1);
    
    // Assess position sizing
    const positionSizes = trades.map(t => t.position_size || 0);
    const avgPositionSize = positionSizes.reduce((sum, size) => sum + size, 0) / positionSizes.length;
    const maxPositionSize = Math.max(...positionSizes);
    
    // If max position size is significantly larger than average, higher risk
    if (maxPositionSize > avgPositionSize * 3) {
      tradeRisk += 0.15;
    }
  }
  
  // Combine risk factors (weighted)
  const combinedRisk = (baseRisk * 0.5) + (agentRisk * 0.3) + (tradeRisk * 0.2);
  
  // Ensure result is between 0 and 1
  return Math.min(Math.max(combinedRisk, 0), 1);
}

/**
 * Calculate risk factors that contribute to the overall risk score
 */
function calculateRiskFactors(farm: any, agents: any[], trades: any[]): { name: string; impact: number; description: string }[] {
  const factors = [];
  
  // Drawdown risk
  if (farm.risk_profile?.max_drawdown) {
    const drawdownImpact = farm.risk_profile.max_drawdown / 50; // Normalized to 0-1 scale
    factors.push({
      name: 'Max Drawdown',
      impact: Math.min(drawdownImpact, 1),
      description: `Configured maximum drawdown of ${farm.risk_profile.max_drawdown}%`
    });
  }
  
  // Volatility tolerance
  if (farm.risk_profile?.volatility_tolerance) {
    let volatilityImpact = 0.3;
    if (farm.risk_profile.volatility_tolerance === 'low') {
      volatilityImpact = 0.2;
    } else if (farm.risk_profile.volatility_tolerance === 'high') {
      volatilityImpact = 0.7;
    }
    
    factors.push({
      name: 'Volatility Tolerance',
      impact: volatilityImpact,
      description: `${farm.risk_profile.volatility_tolerance} volatility tolerance setting`
    });
  }
  
  // Risk per trade
  if (farm.risk_profile?.risk_per_trade) {
    const riskPerTradeImpact = farm.risk_profile.risk_per_trade / 10;
    factors.push({
      name: 'Risk Per Trade',
      impact: Math.min(riskPerTradeImpact, 1),
      description: `${farm.risk_profile.risk_per_trade}% capital risked per trade`
    });
  }
  
  // Agent diversity
  if (agents.length > 0) {
    const agentTypes = new Set(agents.map(a => a.agent_type));
    const diversityImpact = 1 - (agentTypes.size / agents.length);
    
    factors.push({
      name: 'Agent Diversity',
      impact: diversityImpact,
      description: `${agentTypes.size} different agent types across ${agents.length} agents`
    });
  }
  
  // Market diversity
  if (agents.length > 0) {
    const marketsSet = new Set();
    agents.forEach(agent => {
      if (agent.markets && Array.isArray(agent.markets)) {
        agent.markets.forEach((market: string) => marketsSet.add(market));
      }
    });
    
    const marketCount = marketsSet.size;
    const diversityImpact = marketCount <= 1 ? 0.8 : marketCount <= 3 ? 0.5 : 0.3;
    
    factors.push({
      name: 'Market Diversity',
      impact: diversityImpact,
      description: `Trading activity across ${marketCount} markets`
    });
  }
  
  // Trading activity
  if (trades.length > 0) {
    // Win/loss ratio
    const wins = trades.filter(t => t.profit > 0).length;
    const losses = trades.filter(t => t.profit < 0).length;
    const winRate = wins / trades.length;
    
    let winRateImpact = 0.5;
    if (winRate < 0.4) {
      winRateImpact = 0.8;
    } else if (winRate > 0.6) {
      winRateImpact = 0.2;
    }
    
    factors.push({
      name: 'Win Rate',
      impact: winRateImpact,
      description: `${Math.round(winRate * 100)}% win rate over ${trades.length} trades`
    });
  }
  
  return factors;
} 