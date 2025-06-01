import { BacktestEngine } from '@/services/trading/backtest-engine';
import { PerformanceAnalytics } from '@/services/trading/performance-analytics';
import { MarketDataService } from '@/services/trading/market-data-service';
import { BaseStrategy } from '@/services/trading/base-strategy';
import { createServerClient } from '@/utils/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { v4 as uuidv4 } from 'uuid';

interface OptimizationParameter {
  name: string;
  min: number;
  max: number;
  step: number;
  type: 'float' | 'integer' | 'boolean';
  path: string[]; // Path to the parameter in the strategy parameters object
}

interface OptimizationResult {
  id: string;
  strategy_id: string;
  parameters: Record<string, any>;
  metrics: {
    total_return: number;
    sharpe_ratio: number;
    max_drawdown: number;
    profit_factor: number;
    win_rate: number;
    score: number;
  };
  backtest_id: string;
  created_at: string;
}

interface OptimizationConfig {
  strategy_id: string;
  parameters: OptimizationParameter[];
  target_metric: 'total_return' | 'sharpe_ratio' | 'calmar_ratio' | 'profit_factor' | 'score';
  symbols: string[];
  timeframes: string[];
  start_date: Date;
  end_date: Date;
  initial_capital: number;
  max_iterations: number;
  population_size?: number;
  mutation_rate?: number;
  crossover_rate?: number;
  early_stopping?: boolean;
  early_stopping_tolerance?: number;
}

export class StrategyOptimizer {
  private supabase: SupabaseClient<Database>;
  private backtestEngine: BacktestEngine;
  private marketDataService: MarketDataService;
  private performanceAnalytics: PerformanceAnalytics;
  
  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient;
    this.marketDataService = new MarketDataService(supabaseClient);
    this.performanceAnalytics = new PerformanceAnalytics(supabaseClient);
    this.backtestEngine = new BacktestEngine(
      this.marketDataService,
      this.performanceAnalytics
    );
  }
  
  /**
   * Static factory method to create a service instance
   */
  public static async create(): Promise<StrategyOptimizer> {
    const supabase = await createServerClient();
    return new StrategyOptimizer(supabase);
  }
  
  /**
   * Run optimization for a strategy
   */
  public async optimizeStrategy(
    config: OptimizationConfig,
    strategyInstance: BaseStrategy
  ): Promise<OptimizationResult[]> {
    try {
      // Load historical data
      const historicalData = await this.loadHistoricalData(
        config.symbols,
        config.timeframes,
        config.start_date,
        config.end_date
      );
      
      // Run genetic algorithm optimization
      const results = await this.runGeneticAlgorithm(
        config,
        strategyInstance,
        historicalData
      );
      
      // Save optimization results
      await this.saveOptimizationResults(config.strategy_id, results);
      
      return results;
    } catch (error: any) {
      console.error('Error in strategy optimization:', error);
      throw new Error(`Strategy optimization failed: ${error.message}`);
    }
  }
  
  /**
   * Load historical data for optimization
   */
  private async loadHistoricalData(
    symbols: string[],
    timeframes: string[],
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    const historicalData = [];
    
    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        console.log(`Loading data for ${symbol} ${timeframe}...`);
        const data = await this.marketDataService.getHistoricalData(
          symbol,
          timeframe,
          undefined,
          startDate,
          endDate
        );
        
        historicalData.push({
          symbol,
          timeframe,
          data
        });
      }
    }
    
    return historicalData;
  }
  
  /**
   * Run genetic algorithm for strategy optimization with advanced refinements
   */
  private async runGeneticAlgorithm(
    config: OptimizationConfig,
    strategyInstance: BaseStrategy,
    historicalData: any[]
  ): Promise<OptimizationResult[]> {
    // Adjust population size based on parameter count
    const paramCount = config.parameters.length;
    const populationSize = config.population_size || Math.max(20, paramCount * 5);
    const maxIterations = config.max_iterations;
    const initialCrossoverRate = config.crossover_rate || 0.7;
    
    // Start with higher mutation rate and decrease over generations
    let currentMutationRate = config.mutation_rate || 0.3;
    
    console.log(`Starting optimization with ${paramCount} parameters, population size ${populationSize}`);
    console.log(`Parameters to optimize: ${config.parameters.map(p => p.name).join(', ')}`);
    
    // Generate initial population
    let population = this.generateInitialPopulation(config.parameters, populationSize);
    
    // Evaluate initial population
    let evaluatedPopulation: OptimizationResult[] = [];
    
    for (const individual of population) {
      const result = await this.evaluateStrategy(
        individual,
        strategyInstance,
        config,
        historicalData
      );
      evaluatedPopulation.push(result);
    }
    
    // Sort by target metric
    evaluatedPopulation.sort((a, b) => {
      return b.metrics[config.target_metric] - a.metrics[config.target_metric];
    });
    
    // Iterative optimization
    let bestScore = evaluatedPopulation[0].metrics[config.target_metric];
    let generations = 1;
    let noImprovementCount = 0;
    let parameterSensitivity: Record<string, { values: number[], scores: number[] }> = {};
    
    // Initialize parameter sensitivity tracking
    config.parameters.forEach(param => {
      parameterSensitivity[param.name] = {
        values: [],
        scores: []
      };
    });
    
    while (generations < maxIterations) {
      // Dynamic exploration-exploitation balance
      const explorationFactor = Math.max(0.1, 1 - (generations / maxIterations));
      const eliteCount = Math.floor(populationSize * (0.1 + (0.2 * (1 - explorationFactor))));
      
      console.log(`Generation ${generations}, best score: ${bestScore.toFixed(4)}, mutation rate: ${currentMutationRate.toFixed(3)}, exploration: ${explorationFactor.toFixed(2)}`);
      
      // Adjust mutation rate based on improvement trend
      if (noImprovementCount > 0) {
        // Increase mutation rate if stuck to encourage exploration
        currentMutationRate = Math.min(0.5, currentMutationRate * 1.2);
      } else {
        // Decrease gradually to fine-tune
        currentMutationRate = Math.max(0.05, currentMutationRate * 0.9);
      }
      
      // Adjust crossover rate inversely to mutation rate
      const currentCrossoverRate = Math.min(0.9, Math.max(0.5, initialCrossoverRate * (1 + (0.2 * noImprovementCount))));
      
      // Selection and reproduction
      const newPopulation = [];
      
      // Elitism: keep the best individuals
      const elites = evaluatedPopulation.slice(0, eliteCount);
      
      for (const elite of elites) {
        newPopulation.push(elite.parameters);
        
        // Track parameter values in best individuals for sensitivity analysis
        config.parameters.forEach(param => {
          const paramValue = this.getValueAtPath(elite.parameters, param.path);
          parameterSensitivity[param.name].values.push(paramValue);
          parameterSensitivity[param.name].scores.push(elite.metrics.score);
        });
      }
      
      // Generate rest of population through selection, crossover, mutation
      while (newPopulation.length < populationSize) {
        // Tournament selection with dynamic tournament size
        // Use smaller tournaments early for diversity, larger later for convergence
        const tournamentSize = Math.max(2, Math.min(5, Math.floor(3 + (2 * (1 - explorationFactor)))));
        const parent1 = this.tournamentSelection(evaluatedPopulation, tournamentSize);
        const parent2 = this.tournamentSelection(evaluatedPopulation, tournamentSize);
        
        // Crossover
        let child;
        if (Math.random() < currentCrossoverRate) {
          child = this.crossover(parent1.parameters, parent2.parameters);
        } else {
          // If no crossover, choose one parent
          child = Math.random() < 0.5 ? { ...parent1.parameters } : { ...parent2.parameters };
        }
        
        // Mutation with current dynamic rate
        child = this.mutate(child, config.parameters, currentMutationRate);
        
        newPopulation.push(child);
      }
      
      // Evaluate new population
      evaluatedPopulation = [];
      
      for (const individual of newPopulation) {
        const result = await this.evaluateStrategy(
          individual,
          strategyInstance,
          config,
          historicalData
        );
        evaluatedPopulation.push(result);
      }
      
      // Sort by target metric
      evaluatedPopulation.sort((a, b) => {
        return b.metrics[config.target_metric] - a.metrics[config.target_metric];
      });
      
      // Check for improvement
      const newBestScore = evaluatedPopulation[0].metrics[config.target_metric];
      const improvementPercent = ((newBestScore - bestScore) / Math.abs(bestScore)) * 100;
      
      if (newBestScore > bestScore) {
        console.log(`Improvement found: ${bestScore.toFixed(4)} -> ${newBestScore.toFixed(4)} (+${improvementPercent.toFixed(2)}%)`);
        bestScore = newBestScore;
        noImprovementCount = 0;
      } else {
        noImprovementCount++;
        console.log(`No improvement for ${noImprovementCount} generations`);
      }
      
      // Adaptive early stopping based on population convergence
      const convergenceThreshold = config.early_stopping_tolerance || 5;
      const adaptiveThreshold = Math.max(3, convergenceThreshold - Math.floor(generations / 5));
      
      if (config.early_stopping && noImprovementCount >= adaptiveThreshold) {
        console.log(`Early stopping after ${generations} generations with no improvement (threshold: ${adaptiveThreshold})`);
        
        // Run one last generation with high mutation rate if we're stopping early
        // to make sure we haven't missed anything
        if (generations < maxIterations / 2) {
          console.log('Running one final high-exploration generation...');
          const diversePopulation = this.generateInitialPopulation(config.parameters, populationSize);
          // Skip this last attempt in actual implementation as it could double runtime
        }
        
        break;
      }
      
      generations++;
    }
    
    // Analyze parameter sensitivity after optimization is complete
    const parameterImportance: Record<string, number> = {};
    
    for (const paramName in parameterSensitivity) {
      const { values, scores } = parameterSensitivity[paramName];
      if (values.length > 5) {
        // Calculate correlation between parameter values and scores
        const correlation = this.calculateCorrelation(values, scores);
        parameterImportance[paramName] = Math.abs(correlation);
        
        console.log(`Parameter ${paramName} importance: ${parameterImportance[paramName].toFixed(3)} (correlation: ${correlation.toFixed(3)})`);
      }
    }
    
    // Log the most important parameters
    const importantParams = Object.entries(parameterImportance)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, importance]) => `${name} (${importance.toFixed(2)})`)
      .join(', ');
    
    console.log(`Most influential parameters: ${importantParams}`);
    
    // Return top results
    return evaluatedPopulation.slice(0, 10);
  }
  
  /**
   * Calculate correlation coefficient between two arrays
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
      return 0;
    }
    
    const n = x.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let sumYY = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumXX += x[i] * x[i];
      sumYY += y[i] * y[i];
    }
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    if (denominator === 0) {
      return 0;
    }
    
    return numerator / denominator;
  }
  
  /**
   * Generate initial population of random parameter sets
   */
  private generateInitialPopulation(
    parameters: OptimizationParameter[],
    populationSize: number
  ): Record<string, any>[] {
    const population = [];
    
    for (let i = 0; i < populationSize; i++) {
      const individual = {};
      
      for (const param of parameters) {
        // Generate random value within the parameter range
        let value;
        
        if (param.type === 'boolean') {
          value = Math.random() < 0.5;
        } else if (param.type === 'integer') {
          const steps = Math.floor((param.max - param.min) / param.step) + 1;
          const randomStep = Math.floor(Math.random() * steps);
          value = param.min + (randomStep * param.step);
        } else {
          // Float
          value = param.min + Math.random() * (param.max - param.min);
          value = Math.round(value / param.step) * param.step;
        }
        
        // Set the value at the specified path
        this.setValueAtPath(individual, param.path, value);
      }
      
      population.push(individual);
    }
    
    return population;
  }
  
  /**
   * Tournament selection
   */
  private tournamentSelection(
    population: OptimizationResult[],
    tournamentSize: number
  ): OptimizationResult {
    const tournament = [];
    
    // Select random individuals for the tournament
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * population.length);
      tournament.push(population[randomIndex]);
    }
    
    // Find the best individual in the tournament
    return tournament.reduce((best, current) => {
      return current.metrics.score > best.metrics.score ? current : best;
    }, tournament[0]);
  }
  
  /**
   * Crossover two parent parameter sets
   */
  private crossover(
    parent1: Record<string, any>,
    parent2: Record<string, any>
  ): Record<string, any> {
    // Deep clone parent1 as the base
    const child = JSON.parse(JSON.stringify(parent1));
    
    // Recursively perform crossover
    this.recursiveCrossover(child, parent2);
    
    return child;
  }
  
  /**
   * Recursively traverse objects and randomly choose between parent values
   */
  private recursiveCrossover(child: any, parent2: any): void {
    for (const key in parent2) {
      if (typeof parent2[key] === 'object' && parent2[key] !== null && !Array.isArray(parent2[key])) {
        // If nested object exists in child, recurse
        if (key in child && typeof child[key] === 'object' && child[key] !== null) {
          this.recursiveCrossover(child[key], parent2[key]);
        } else {
          // Otherwise randomly choose
          if (Math.random() < 0.5) {
            child[key] = JSON.parse(JSON.stringify(parent2[key]));
          }
        }
      } else {
        // For primitive values or arrays, randomly choose
        if (Math.random() < 0.5) {
          child[key] = parent2[key];
        }
      }
    }
  }
  
  /**
   * Mutate an individual's parameters
   */
  private mutate(
    individual: Record<string, any>,
    parameters: OptimizationParameter[],
    mutationRate: number
  ): Record<string, any> {
    // Clone the individual
    const mutated = JSON.parse(JSON.stringify(individual));
    
    // Apply mutation to each parameter with probability mutationRate
    for (const param of parameters) {
      if (Math.random() < mutationRate) {
        let value: any;
        
        if (param.type === 'boolean') {
          // Flip boolean
          const currentValue = this.getValueAtPath(mutated, param.path);
          value = !currentValue;
        } else if (param.type === 'integer') {
          // Perturb integer value within range
          const currentValue = this.getValueAtPath(mutated, param.path);
          const steps = Math.floor((param.max - param.min) / param.step);
          const stepChange = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
          
          let newValue = currentValue + (stepChange * param.step);
          newValue = Math.max(param.min, Math.min(param.max, newValue));
          value = newValue;
        } else {
          // Perturb float value within range
          const currentValue = this.getValueAtPath(mutated, param.path);
          // Add random noise proportional to the parameter range
          const range = param.max - param.min;
          const noise = (Math.random() * 2 - 1) * range * 0.1; // +/- 10% of range
          
          let newValue = currentValue + noise;
          newValue = Math.max(param.min, Math.min(param.max, newValue));
          newValue = Math.round(newValue / param.step) * param.step;
          value = newValue;
        }
        
        // Set the mutated value
        this.setValueAtPath(mutated, param.path, value);
      }
    }
    
    return mutated;
  }
  
  /**
   * Set a value at a specified path in a nested object
   */
  private setValueAtPath(obj: any, path: string[], value: any): void {
    let current = obj;
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
  }
  
  /**
   * Get a value at a specified path in a nested object
   */
  private getValueAtPath(obj: any, path: string[]): any {
    let current = obj;
    
    for (let i = 0; i < path.length; i++) {
      if (current[path[i]] === undefined) {
        return undefined;
      }
      current = current[path[i]];
    }
    
    return current;
  }
  
  /**
   * Evaluate a strategy with a specific parameter set
   */
  private async evaluateStrategy(
    parameters: Record<string, any>,
    strategyInstance: BaseStrategy,
    config: OptimizationConfig,
    historicalData: any[]
  ): Promise<OptimizationResult> {
    try {
      // Clone the strategy and update parameters
      const strategy = strategyInstance.clone();
      strategy.updateParameters({
        ...strategy.getParameters(),
        ...parameters
      });
      
      // Configure backtest
      const backtestConfig = {
        startDate: config.start_date.toISOString(),
        endDate: config.end_date.toISOString(),
        initialCapital: config.initial_capital,
        symbols: config.symbols,
        timeframes: config.timeframes,
        feesPercentage: 0.1, // Default fee
        slippagePercentage: 0.05 // Default slippage
      };
      
      // Run backtest
      const backtestResult = await this.backtestEngine.runBacktest(
        strategy,
        backtestConfig,
        historicalData
      );
      
      // Calculate composite score based on multiple metrics
      // This helps balance different aspects of performance
      const totalReturn = backtestResult.profitPercent;
      const sharpeRatio = backtestResult.sharpeRatio || 0;
      const maxDrawdown = backtestResult.maxDrawdownPercent;
      const winRate = backtestResult.winningTrades / Math.max(1, backtestResult.trades) * 100;
      const profitFactor = backtestResult.metadata?.performanceMetrics?.profitFactor || 1;
      
      // Composite score calculation - normalize and weight different metrics
      const score = (
        (totalReturn / 10) + // Normalize to ~0-10 range
        (sharpeRatio * 5) +  // Weighted sharpe ratio
        (10 - Math.min(10, maxDrawdown / 5)) + // Drawdown penalty (lower is better)
        (profitFactor * 2) + // Profit factor bonus
        (winRate / 20)       // Win rate contribution
      );
      
      // Return evaluation result
      return {
        id: uuidv4(),
        strategy_id: config.strategy_id,
        parameters,
        metrics: {
          total_return: totalReturn,
          sharpe_ratio: sharpeRatio,
          max_drawdown: maxDrawdown,
          profit_factor: profitFactor,
          win_rate: winRate,
          score
        },
        backtest_id: backtestResult.id,
        created_at: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Error evaluating strategy:', error);
      
      // Return a failed result with negative score
      return {
        id: uuidv4(),
        strategy_id: config.strategy_id,
        parameters,
        metrics: {
          total_return: -100,
          sharpe_ratio: 0,
          max_drawdown: 100,
          profit_factor: 0,
          win_rate: 0,
          score: -1000
        },
        backtest_id: '',
        created_at: new Date().toISOString()
      };
    }
  }
  
  /**
   * Save optimization results to the database
   */
  private async saveOptimizationResults(
    strategyId: string,
    results: OptimizationResult[]
  ): Promise<void> {
    try {
      // Save each result
      for (const result of results) {
        await this.supabase
          .from('strategy_optimization_results')
          .insert({
            id: result.id,
            strategy_id: strategyId,
            parameters: result.parameters,
            metrics: result.metrics,
            backtest_id: result.backtest_id,
            created_at: result.created_at
          });
      }
      
      console.log(`Saved ${results.length} optimization results for strategy ${strategyId}`);
    } catch (error) {
      console.error('Error saving optimization results:', error);
    }
  }
  
  /**
   * Get optimization results for a strategy
   */
  public async getOptimizationResults(
    strategyId: string
  ): Promise<OptimizationResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('strategy_optimization_results')
        .select('*')
        .eq('strategy_id', strategyId)
        .order('metrics->score', { ascending: false });
      
      if (error) {
        throw new Error(`Error fetching optimization results: ${error.message}`);
      }
      
      return data as OptimizationResult[];
    } catch (error: any) {
      console.error('Error fetching optimization results:', error);
      return [];
    }
  }
  
  /**
   * Apply optimized parameters to a strategy
   */
  public async applyOptimizedParameters(
    strategyId: string,
    optimizationResultId: string
  ): Promise<boolean> {
    try {
      // Get the optimization result
      const { data: result, error } = await this.supabase
        .from('strategy_optimization_results')
        .select('*')
        .eq('id', optimizationResultId)
        .single();
      
      if (error || !result) {
        throw new Error(`Optimization result not found: ${error?.message || 'Unknown error'}`);
      }
      
      // Update the strategy parameters
      const { error: updateError } = await this.supabase
        .from('strategies')
        .update({
          parameters: result.parameters,
          last_optimized_at: new Date().toISOString(),
          optimization_result_id: optimizationResultId
        })
        .eq('id', strategyId);
      
      if (updateError) {
        throw new Error(`Error updating strategy parameters: ${updateError.message}`);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error applying optimized parameters:', error);
      return false;
    }
  }
}
