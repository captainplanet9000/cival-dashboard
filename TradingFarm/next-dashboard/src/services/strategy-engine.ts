import { createServerClient } from '@/utils/supabase/server';
import { parsePineScript } from '@/utils/brain/pinescript-parser';

/**
 * Strategy Execution Engine
 * 
 * This service handles the execution of trading strategies,
 * loading strategy definitions from brain assets when needed.
 */

export interface StrategyExecutionContext {
  strategyId: number;
  market: string;
  timeframe: string;
  params: Record<string, any>;
}

export interface StrategyExecutionResult {
  success: boolean;
  signals: Array<{
    time: string;
    type: 'buy' | 'sell' | 'neutral';
    price?: number;
    strength?: number;
    metadata?: Record<string, any>;
  }>;
  error?: string;
}

/**
 * Execute a strategy using its brain assets for logic
 */
export async function executeStrategy(context: StrategyExecutionContext): Promise<StrategyExecutionResult> {
  try {
    const supabase = createServerClient();
    
    // Load the strategy
    const { data: strategy, error: strategyError } = await supabase
      .from('strategies')
      .select('*')
      .eq('id', context.strategyId)
      .single();
    
    if (strategyError || !strategy) {
      throw new Error(`Strategy not found: ${strategyError?.message || 'Unknown error'}`);
    }
    
    // Get all brain assets linked to this strategy
    const { data: strategyAssets, error: assetLinkError } = await supabase
      .from('strategy_brain_assets')
      .select(`
        brain_asset_id,
        role,
        configuration,
        brain_assets!inner (
          id,
          asset_type,
          storage_path,
          content_text,
          metadata
        )
      `)
      .eq('strategy_id', context.strategyId);
    
    if (assetLinkError) {
      throw new Error(`Failed to load strategy assets: ${assetLinkError.message}`);
    }
    
    // Organize assets by role
    const assetsByRole: Record<string, any[]> = {};
    strategyAssets?.forEach(asset => {
      if (!assetsByRole[asset.role]) {
        assetsByRole[asset.role] = [];
      }
      assetsByRole[asset.role].push({
        ...asset.brain_assets,
        configuration: asset.configuration
      });
    });
    
    // Get the indicator asset(s)
    const indicators = assetsByRole['indicator'] || [];
    if (indicators.length === 0) {
      throw new Error('No indicator assets found for this strategy');
    }
    
    // Process each indicator to generate signals
    const allSignals: any[] = [];
    
    for (const indicator of indicators) {
      // Depending on the asset type, process differently
      if (indicator.asset_type === 'pinescript') {
        const signals = await executePineScriptIndicator(
          indicator, 
          context.market, 
          context.timeframe, 
          context.params
        );
        
        allSignals.push(...signals);
      } 
      // Add handlers for other indicator types as needed
    }
    
    // Get the filter assets (optional)
    const filters = assetsByRole['filter'] || [];
    
    // Apply each filter to refine signals
    let filteredSignals = [...allSignals];
    for (const filter of filters) {
      filteredSignals = await applyFilterToSignals(filter, filteredSignals, context);
    }
    
    return {
      success: true,
      signals: filteredSignals
    };
    
  } catch (error) {
    console.error('Strategy execution error:', error);
    return {
      success: false,
      signals: [],
      error: error instanceof Error ? error.message : 'Unknown error during strategy execution'
    };
  }
}

/**
 * Execute a PineScript indicator to generate signals
 */
async function executePineScriptIndicator(
  indicator: any,
  market: string,
  timeframe: string,
  params: Record<string, any>
): Promise<any[]> {
  // Parse the PineScript if needed
  let parsedScript;
  if (indicator.content_text) {
    parsedScript = parsePineScript(indicator.content_text);
  } else if (indicator.metadata?.parsed) {
    // Use pre-parsed metadata if available
    parsedScript = {
      metadata: {
        name: indicator.metadata.parsed.name,
        description: indicator.metadata.parsed.description,
        overlay: indicator.metadata.parsed.overlay,
        version: indicator.metadata.parsed.version
      },
      inputs: indicator.metadata.parsed.inputs,
      logic: '', // Logic would be loaded from content_text
      fullSource: '',
      plotStatements: [],
      functions: indicator.metadata.parsed.functions || []
    };
  } else {
    throw new Error('Invalid PineScript indicator: missing content and metadata');
  }
  
  // In a real implementation, this would:
  // 1. Fetch market data for the given market and timeframe
  // 2. Apply the PineScript logic to the data
  // 3. Generate signals based on the indicator results
  
  // For this demo, we'll return mock signals
  return [
    {
      time: new Date().toISOString(),
      type: 'buy',
      price: 50000,
      strength: 0.8,
      metadata: {
        indicator: parsedScript.metadata.name,
        market,
        timeframe
      }
    }
  ];
}

/**
 * Apply a filter to refine signals
 */
async function applyFilterToSignals(
  filter: any, 
  signals: any[], 
  context: StrategyExecutionContext
): Promise<any[]> {
  // In a real implementation, this would:
  // 1. Load the filter logic from the brain asset
  // 2. Apply the filter to the signals
  
  // For this demo, we'll just return the signals unchanged
  return signals;
}

/**
 * Load a strategy's configuration, including all brain assets
 */
export async function loadStrategyConfiguration(strategyId: number) {
  try {
    const supabase = createServerClient();
    
    // Load the strategy
    const { data: strategy, error: strategyError } = await supabase
      .from('strategies')
      .select('*')
      .eq('id', strategyId)
      .single();
    
    if (strategyError || !strategy) {
      throw new Error(`Strategy not found: ${strategyError?.message || 'Unknown error'}`);
    }
    
    // Get all brain assets linked to this strategy
    const { data: strategyAssets, error: assetLinkError } = await supabase
      .from('strategy_brain_assets')
      .select(`
        brain_asset_id,
        role,
        configuration,
        brain_assets!inner (
          id,
          filename,
          title,
          description,
          asset_type,
          summary,
          metadata
        )
      `)
      .eq('strategy_id', strategyId);
    
    if (assetLinkError) {
      throw new Error(`Failed to load strategy assets: ${assetLinkError.message}`);
    }
    
    // Organize assets by role
    const assetsByRole: Record<string, any[]> = {};
    strategyAssets?.forEach(asset => {
      if (!assetsByRole[asset.role]) {
        assetsByRole[asset.role] = [];
      }
      assetsByRole[asset.role].push({
        ...asset.brain_assets,
        configuration: asset.configuration
      });
    });
    
    return {
      strategy,
      assets: assetsByRole
    };
    
  } catch (error) {
    console.error('Error loading strategy configuration:', error);
    throw error;
  }
}
