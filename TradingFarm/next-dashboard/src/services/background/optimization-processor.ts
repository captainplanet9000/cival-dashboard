import { createServerClient } from '@/utils/supabase/server';
import { StrategyOptimizer } from '@/services/trading/strategy-optimizer';
import { BaseStrategy } from '@/services/trading/base-strategy';
import { MovingAverageCrossoverStrategy } from '@/services/trading/strategies/moving-average-crossover';
import { RsiStrategy } from '@/services/trading/strategies/rsi-strategy';
import { BollingerBandsStrategy } from '@/services/trading/strategies/bollinger-bands';
import { Database } from '@/types/database.types';
import { SupabaseClient } from '@supabase/supabase-js';

// Map of strategy types to their class constructors
const strategyClassMap: Record<string, any> = {
  'moving_average_crossover': MovingAverageCrossoverStrategy,
  'rsi_strategy': RsiStrategy,
  'bollinger_bands': BollingerBandsStrategy
};

/**
 * Process optimization job
 */
export async function processOptimizationJob(jobId: string): Promise<boolean> {
  console.log(`Starting processing for optimization job ${jobId}`);
  
  const supabase = await createServerClient();
  
  try {
    // Update job status to in_progress
    await updateJobStatus(supabase, jobId, 'in_progress');
    
    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('optimization_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
      
    if (jobError || !job) {
      console.error('Error fetching job details:', jobError);
      await updateJobStatus(supabase, jobId, 'failed', 'Job not found');
      return false;
    }
    
    // Get strategy details
    const { data: strategy, error: strategyError } = await supabase
      .from('trading_strategies')
      .select('*')
      .eq('id', job.strategy_id)
      .single();
      
    if (strategyError || !strategy) {
      console.error('Error fetching strategy details:', strategyError);
      await updateJobStatus(supabase, jobId, 'failed', 'Strategy not found');
      return false;
    }
    
    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('elizaos_agents')
      .select('*')
      .eq('id', job.agent_id)
      .single();
      
    if (agentError || !agent) {
      console.error('Error fetching agent details:', agentError);
      await updateJobStatus(supabase, jobId, 'failed', 'Agent not found');
      return false;
    }
    
    // Create strategy instance
    const StrategyClass = strategyClassMap[strategy.strategy_type] || BaseStrategy;
    const strategyInstance = new StrategyClass(strategy.parameters || {});
    
    // Create optimizer
    const optimizer = await StrategyOptimizer.create();
    
    // Run optimization
    const config = job.parameters.config;
    
    try {
      // Update job with progress
      await updateJobStatus(supabase, jobId, 'in_progress', 'Optimization in progress: 10% complete');
      
      const optimizationConfig = {
        strategy_id: strategy.id,
        parameters: config.parameters,
        target_metric: config.target_metric,
        symbols: config.symbols,
        timeframes: config.timeframes,
        start_date: new Date(config.start_date),
        end_date: new Date(config.end_date),
        initial_capital: config.initial_capital,
        max_iterations: config.max_iterations,
        population_size: config.population_size,
        mutation_rate: config.mutation_rate,
        crossover_rate: config.crossover_rate,
        early_stopping: config.early_stopping,
        early_stopping_tolerance: config.early_stopping_tolerance
      };
      
      // Run the optimization
      const results = await optimizer.optimizeStrategy(optimizationConfig, strategyInstance);
      
      // Update job status with intermediate progress
      await updateJobStatus(supabase, jobId, 'in_progress', 'Optimization complete: 80% complete. Saving results...');
      
      // Apply the best parameters to the strategy
      if (results.length > 0) {
        await optimizer.applyOptimizedParameters(strategy.id, results[0].id);
        
        // Update agent configuration with new strategy parameters
        const newConfig = {
          ...agent.configuration,
          strategy_parameters: results[0].parameters
        };
        
        await supabase
          .from('elizaos_agents')
          .update({
            configuration: newConfig,
            status: 'idle',
            updated_at: new Date().toISOString()
          })
          .eq('id', agent.id);
      }
      
      // Update job with result statistics
      const resultStats = {
        results_count: results.length,
        best_score: results.length > 0 ? results[0].metrics.score : null,
        improvement: results.length > 0 ? 
          `${((results[0].metrics.total_return - (strategy.parameters?.base_performance?.total_return || 0)) * 100).toFixed(2)}%` : 
          'No improvement',
        optimization_time_ms: Date.now() - new Date(job.created_at).getTime()
      };
      
      // Update job status to complete
      await updateJobStatus(supabase, jobId, 'complete', 'Optimization completed successfully', resultStats);
      console.log(`Optimization job ${jobId} completed successfully`);
      
      return true;
    } catch (optimizationError: any) {
      console.error('Error during optimization:', optimizationError);
      await updateJobStatus(supabase, jobId, 'failed', `Optimization error: ${optimizationError.message}`);
      
      // Set agent status back to idle
      await supabase
        .from('elizaos_agents')
        .update({
          status: 'idle',
          updated_at: new Date().toISOString()
        })
        .eq('id', agent.id);
        
      return false;
    }
  } catch (error: any) {
    console.error('Error processing optimization job:', error);
    await updateJobStatus(supabase, jobId, 'failed', `Processing error: ${error.message}`);
    return false;
  }
}

/**
 * Update job status with progress information
 */
async function updateJobStatus(
  supabase: SupabaseClient<Database>,
  jobId: string, 
  status: string, 
  message?: string,
  result?: any
): Promise<void> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };
    
    if (message) {
      updateData.message = message;
    }
    
    if (result) {
      updateData.result = result;
    }
    
    await supabase
      .from('optimization_jobs')
      .update(updateData)
      .eq('id', jobId);
  } catch (error) {
    console.error(`Error updating job ${jobId} status:`, error);
  }
}
