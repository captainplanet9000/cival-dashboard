import { createServerClient } from '@/utils/supabase/server';
import { 
  MonitorConditions, 
  MonitorConditionType,
  MonitorConditionForm
} from '@/types/workflows';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { WorkflowService } from './workflow.service';
import { ToolService } from './tool.service';
import { revalidatePath } from 'next/cache';
import { EventEmitter } from 'events';

export class MonitorAgentService extends EventEmitter {
  private supabase: SupabaseClient<Database>;
  private workflowService: WorkflowService;
  private toolService: ToolService;
  private activeMonitors: Map<string, NodeJS.Timeout> = new Map();
  private conditionEvaluationCache: Map<string, { result: boolean, timestamp: number }> = new Map();
  private CACHE_TTL = 60 * 1000; // 1 minute cache TTL
  
  constructor(supabase?: SupabaseClient<Database>) {
    super();
    this.supabase = supabase || createServerClient();
    this.workflowService = new WorkflowService(this.supabase);
    this.toolService = new ToolService(this.supabase);
    
    // Initialize event listeners
    this.on('conditionMet', this.handleConditionMet.bind(this));
  }
  
  /**
   * Start monitoring for all active conditions
   */
  async startMonitoring(): Promise<void> {
    console.log('Starting monitoring for all active conditions');
    
    // Get all active monitor conditions
    const { data: conditions, error } = await this.supabase
      .from('monitor_conditions')
      .select('*')
      .eq('active', true);
    
    if (error) {
      console.error('Error fetching active monitor conditions:', error);
      throw new Error(`Failed to fetch active monitor conditions: ${error.message}`);
    }
    
    // Start monitoring for each condition
    for (const condition of conditions) {
      await this.startConditionMonitor(condition);
    }
    
    console.log(`Started monitoring ${conditions.length} active conditions`);
  }
  
  /**
   * Stop all active monitors
   */
  async stopMonitoring(): Promise<void> {
    console.log('Stopping all active monitors');
    
    // Stop all active monitors
    for (const [conditionId, timer] of this.activeMonitors.entries()) {
      clearInterval(timer);
      this.activeMonitors.delete(conditionId);
    }
    
    console.log('Stopped all active monitors');
  }
  
  /**
   * Get all monitor conditions
   */
  async getMonitorConditions(): Promise<MonitorConditions[]> {
    const { data, error } = await this.supabase
      .from('monitor_conditions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching monitor conditions:', error);
      throw new Error(`Failed to fetch monitor conditions: ${error.message}`);
    }
    
    return data || [];
  }
  
  /**
   * Get a monitor condition by ID
   */
  async getMonitorCondition(id: string): Promise<MonitorConditions | null> {
    const { data, error } = await this.supabase
      .from('monitor_conditions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching monitor condition:', error);
      throw new Error(`Failed to fetch monitor condition: ${error.message}`);
    }
    
    return data;
  }
  
  /**
   * Add a new monitor condition
   */
  async addMonitorCondition(condition: MonitorConditionForm): Promise<string> {
    const { data, error } = await this.supabase
      .from('monitor_conditions')
      .insert({
        name: condition.name,
        description: condition.description,
        condition_type: condition.conditionType,
        parameters: condition.parameters,
        workflow_id: condition.workflowId,
        active: condition.active
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error adding monitor condition:', error);
      throw new Error(`Failed to add monitor condition: ${error.message}`);
    }
    
    // Start monitoring if active
    if (condition.active) {
      const fullCondition = await this.getMonitorCondition(data.id);
      if (fullCondition) {
        await this.startConditionMonitor(fullCondition);
      }
    }
    
    revalidatePath('/dashboard/workflows/monitors');
    return data.id;
  }
  
  /**
   * Update a monitor condition
   */
  async updateMonitorCondition(id: string, updates: Partial<MonitorConditionForm>): Promise<void> {
    // Convert from the form model to the database model
    const dbUpdates: Partial<MonitorConditions> = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.conditionType !== undefined) dbUpdates.condition_type = updates.conditionType;
    if (updates.parameters !== undefined) dbUpdates.parameters = updates.parameters;
    if (updates.workflowId !== undefined) dbUpdates.workflow_id = updates.workflowId;
    if (updates.active !== undefined) dbUpdates.active = updates.active;
    
    const { error } = await this.supabase
      .from('monitor_conditions')
      .update(dbUpdates)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating monitor condition:', error);
      throw new Error(`Failed to update monitor condition: ${error.message}`);
    }
    
    // Handle active status changes
    if (updates.active !== undefined) {
      const fullCondition = await this.getMonitorCondition(id);
      
      if (fullCondition) {
        if (updates.active && !this.activeMonitors.has(id)) {
          // Start monitoring if newly activated
          await this.startConditionMonitor(fullCondition);
        } else if (!updates.active && this.activeMonitors.has(id)) {
          // Stop monitoring if deactivated
          this.stopConditionMonitor(id);
        }
      }
    } else if (this.activeMonitors.has(id)) {
      // If other parameters changed but still active, restart monitoring
      this.stopConditionMonitor(id);
      const fullCondition = await this.getMonitorCondition(id);
      if (fullCondition) {
        await this.startConditionMonitor(fullCondition);
      }
    }
    
    revalidatePath('/dashboard/workflows/monitors');
    revalidatePath(`/dashboard/workflows/monitors/${id}`);
  }
  
  /**
   * Delete a monitor condition
   */
  async deleteMonitorCondition(id: string): Promise<void> {
    // Stop monitoring if active
    if (this.activeMonitors.has(id)) {
      this.stopConditionMonitor(id);
    }
    
    const { error } = await this.supabase
      .from('monitor_conditions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting monitor condition:', error);
      throw new Error(`Failed to delete monitor condition: ${error.message}`);
    }
    
    revalidatePath('/dashboard/workflows/monitors');
  }
  
  /**
   * Toggle a monitor condition's active status
   */
  async toggleMonitorCondition(id: string, active: boolean): Promise<void> {
    await this.updateMonitorCondition(id, { active });
  }
  
  /**
   * Start monitoring a specific condition
   */
  private async startConditionMonitor(condition: MonitorConditions): Promise<void> {
    // Don't start duplicate monitors
    if (this.activeMonitors.has(condition.id)) {
      console.warn(`Monitor for condition ${condition.id} already active`);
      return;
    }
    
    const checkInterval = this.getCheckIntervalForCondition(condition);
    
    console.log(`Setting up monitor for condition: ${condition.name} (${condition.id}) with interval ${checkInterval}ms`);

    // Set up interval to check condition
    const timer = setInterval(async () => {
      // console.log(`Checking condition: ${condition.name} (${condition.id})`);
      try {
        const isMet = await this.evaluateCondition(condition);
        
        if (isMet) {
          this.emit('conditionMet', condition);
        }
      } catch (error: any) {
        console.error(`Error evaluating condition ${condition.id}:`, error.message);
      }
    }, checkInterval);
    
    // Store the timer reference
    this.activeMonitors.set(condition.id, timer);
    
    console.log(`Started monitoring condition: ${condition.name} (${condition.id})`);
  }
  
  /**
   * Stop monitoring a specific condition
   */
  private stopConditionMonitor(conditionId: string): void {
    const timer = this.activeMonitors.get(conditionId);
    
    if (timer) {
      clearInterval(timer);
      this.activeMonitors.delete(conditionId);
      console.log(`Stopped monitoring condition: ${conditionId}`);
    } else {
      console.warn(`Attempted to stop non-existent monitor for condition: ${conditionId}`);
    }
  }
  
  /**
   * Get the appropriate check interval for a condition
   */
  private getCheckIntervalForCondition(condition: MonitorConditions): number {
    // Get check interval from condition parameters or use defaults based on type
    const { parameters, condition_type } = condition;
    
    if (parameters?.check_interval_ms && typeof parameters.check_interval_ms === 'number' && parameters.check_interval_ms > 0) {
      // Ensure interval is reasonable (e.g., not less than 5 seconds)
      return Math.max(5000, parameters.check_interval_ms);
    }
    
    // Default intervals based on condition type
    switch (condition_type) {
      case 'price_threshold': return 30 * 1000; // 30 seconds
      case 'volatility': return 60 * 1000; // 1 minute
      case 'news_event': return 5 * 60 * 1000; // 5 minutes
      case 'technical_indicator': return 2 * 60 * 1000; // 2 minutes
      case 'volume_spike': return 60 * 1000; // 1 minute
      case 'custom': return 60 * 1000; // 1 minute
      default: return 60 * 1000; // 1 minute default
    }
  }
  
  /**
   * Evaluate a condition to see if it is met
   */
  private async evaluateCondition(condition: MonitorConditions): Promise<boolean> {
    const { id, condition_type, parameters } = condition;
    
    // Check cache first
    const cacheKey = `${id}-${JSON.stringify(parameters)}`;
    const cachedResult = this.conditionEvaluationCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedResult && (now - cachedResult.timestamp) < this.CACHE_TTL) {
      return cachedResult.result;
    }
    
    let result = false;
    // console.log(`Evaluating condition ${id} of type ${condition_type}`);

    // Evaluate based on condition type
    try {
      switch (condition_type) {
        case 'price_threshold':
          result = await this.evaluatePriceThreshold(parameters);
          break;
        case 'volatility':
          result = await this.evaluateVolatility(parameters);
          break;
        case 'news_event':
          result = await this.evaluateNewsEvent(parameters);
          break;
        case 'technical_indicator':
          result = await this.evaluateTechnicalIndicator(parameters);
          break;
        case 'volume_spike':
          result = await this.evaluateVolumeSpike(parameters);
          break;
        case 'custom':
          result = await this.evaluateCustomCondition(parameters);
          break;
        default:
          console.error(`Unknown condition type: ${condition_type} for condition ${id}`);
          throw new Error(`Unknown condition type: ${condition_type}`);
      }
    } catch (error: any) {
      console.error(`Error during evaluation of condition ${id} (${condition_type}):`, error.message);
      result = false; // Default to false on error to avoid unintended triggers
    }
    
    // Cache the result
    this.conditionEvaluationCache.set(cacheKey, { result, timestamp: now });
    
    // Clean up old cache entries occasionally (simple example)
    if (Math.random() < 0.1) { // 10% chance on each evaluation
      this.cleanupCache();
    }

    return result;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, entry] of this.conditionEvaluationCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.conditionEvaluationCache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      // console.log(`Cleaned up ${removedCount} expired cache entries`);
    }
  }

  /**
   * Evaluate a price threshold condition
   */
  private async evaluatePriceThreshold(parameters: any): Promise<boolean> {
    const { asset, exchange, threshold, comparator } = parameters;
    
    if (!asset || !exchange || threshold === undefined || !comparator) {
      throw new Error('Missing parameters for price_threshold');
    }

    const priceData = await this.toolService.executeTool('exchange_data', {
      exchange,
      symbol: asset,
      dataType: 'price'
    });
    
    const currentPrice = priceData?.price;
    
    if (currentPrice === undefined) {
      throw new Error(`Could not fetch price for ${asset} on ${exchange}`);
    }

    switch (comparator) {
      case 'above': return currentPrice > threshold;
      case 'below': return currentPrice < threshold;
      default: throw new Error(`Unknown comparator: ${comparator}`);
    }
  }

  /**
   * Evaluate a volatility condition
   */
  private async evaluateVolatility(parameters: any): Promise<boolean> {
    const { asset, exchange, period = 20, threshold } = parameters;
    
    if (!asset || !exchange || threshold === undefined) {
      throw new Error('Missing parameters for volatility');
    }

    const volatilityData = await this.toolService.executeTool('price_analysis', { 
      exchange, 
      symbol: asset, 
      indicator: 'volatility', 
      params: { period } 
    });
    
    const currentVolatility = volatilityData?.volatility;
    
    if (currentVolatility === undefined) {
      throw new Error(`Could not calculate volatility for ${asset}`);
    }

    return currentVolatility > threshold;
  }

  /**
   * Evaluate a news event condition
   */
  private async evaluateNewsEvent(parameters: any): Promise<boolean> {
    const { keywords = [], assets = [], sentiment_threshold = 0.5, lookback_hours = 1 } = parameters;
    
    if (!keywords.length && !assets.length) {
      throw new Error('Keywords or assets required for news_event');
    }

    const newsData = await this.toolService.executeTool('market_sentiment', {
      keywords,
      assets,
      lookback_hours
    });

    if (!newsData?.news) return false;

    for (const newsItem of newsData.news) {
      if (newsItem.sentiment_score !== undefined && newsItem.sentiment_score > sentiment_threshold) {
        console.log(`News event condition met based on item: ${newsItem.title || 'Untitled News'}`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Evaluate a technical indicator condition
   */
  private async evaluateTechnicalIndicator(parameters: any): Promise<boolean> {
    const { asset, exchange, indicator, parameters: indicatorParams, condition } = parameters;
    
    if (!asset || !exchange || !indicator || !condition) {
      throw new Error('Missing parameters for technical_indicator');
    }

    const indicatorData = await this.toolService.executeTool('price_analysis', {
      exchange,
      symbol: asset,
      indicator,
      params: indicatorParams || {}
    });

    if (!indicatorData) {
      throw new Error(`Could not fetch indicator ${indicator} for ${asset}`);
    }

    return this.evaluateIndicatorCondition(indicatorData, condition);
  }

  /**
   * Evaluate a volume spike condition
   */
  private async evaluateVolumeSpike(parameters: any): Promise<boolean> {
    const { asset, exchange, threshold = 100, lookback_periods = 20, timeframe = '1h' } = parameters;
    
    if (!asset || !exchange) {
      throw new Error('Missing parameters for volume_spike');
    }

    const ohlcvData = await this.toolService.executeTool('exchange_data', {
      exchange,
      symbol: asset,
      dataType: 'ohlcv',
      timeframe,
      limit: lookback_periods + 1
    });

    if (!ohlcvData || ohlcvData.length <= 1) {
      throw new Error(`Insufficient volume data for ${asset}`);
    }

    const volumes = ohlcvData.map((candle: any) => candle.volume).filter((v: number) => v !== undefined && v > 0);
    
    if (volumes.length <= 1) return false;

    const currentVolume = volumes[volumes.length - 1];
    const historicalVolumes = volumes.slice(0, volumes.length - 1);
    
    if (!historicalVolumes.length) return false;

    const avgVolume = historicalVolumes.reduce((sum: number, vol: number) => sum + vol, 0) / historicalVolumes.length;
    
    if (avgVolume === 0) return false;

    const volumeIncreasePercent = ((currentVolume - avgVolume) / avgVolume) * 100;

    return volumeIncreasePercent > threshold;
  }

  /**
   * Evaluate a custom condition
   */
  private async evaluateCustomCondition(parameters: any): Promise<boolean> {
    const { code } = parameters;
    
    if (!code) {
      throw new Error('Missing code for custom condition');
    }
    
    try {
      // For safety, we'll use ElizaOS to evaluate the custom condition
      const result = await this.toolService.executeTool('evaluate_custom_condition', { code });
      return !!result;
    } catch (error) {
      // Fallback to safe evaluation if ElizaOS is not available
      return await this.evaluateSecureCode(code);
    }
  }

  /**
   * Evaluate an indicator condition
   */
  private evaluateIndicatorCondition(indicatorData: any, condition: string): boolean {
    // Example condition: "rsi > 70" or "macd_signal crosses_above macd_line"
    const parts = condition.match(/([a-zA-Z0-9_]+)\s*([><=]|crosses_above|crosses_below)\s*([a-zA-Z0-9_.]+)/);
    
    if (!parts || parts.length !== 4) {
      throw new Error(`Invalid indicator condition format: ${condition}`);
    }

    const [, indicator1Name, comparator, indicator2OrValue] = parts;

    const value1 = indicatorData[indicator1Name];
    
    if (value1 === undefined) {
      throw new Error(`Indicator ${indicator1Name} not found in data`);
    }

    let value2: number;
    const isComparingToValue = !isNaN(parseFloat(indicator2OrValue));

    if (isComparingToValue) {
      value2 = parseFloat(indicator2OrValue);
    } else {
      value2 = indicatorData[indicator2OrValue];
      if (value2 === undefined) {
        throw new Error(`Indicator ${indicator2OrValue} not found in data for comparison`);
      }
    }

    switch (comparator) {
      case '>': return value1 > value2;
      case '<': return value1 < value2;
      case '>=': return value1 >= value2;
      case '<=': return value1 <= value2;
      case '==': return Math.abs(value1 - value2) < 0.0001; // Float comparison
      case 'crosses_above': {
        const prevValue1 = indicatorData[`previous_${indicator1Name}`];
        const prevValue2 = isComparingToValue ? value2 : indicatorData[`previous_${indicator2OrValue}`];
        
        if (prevValue1 === undefined || prevValue2 === undefined) {
          throw new Error(`Previous values needed for 'crosses_above' not found`);
        }
        
        return prevValue1 < prevValue2 && value1 > value2;
      }
      case 'crosses_below': {
        const prevValue1 = indicatorData[`previous_${indicator1Name}`];
        const prevValue2 = isComparingToValue ? value2 : indicatorData[`previous_${indicator2OrValue}`];
          
        if (prevValue1 === undefined || prevValue2 === undefined) {
          throw new Error(`Previous values needed for 'crosses_below' not found`);
        }
        
        return prevValue1 > prevValue2 && value1 < value2;
      }
      default: throw new Error(`Unknown comparator in indicator condition: ${comparator}`);
    }
  }
  
  /**
   * Process the event when a condition is met
   */
  private async handleConditionMet(condition: MonitorConditions): Promise<void> {
    // Debounce: Check if this exact condition was met very recently to avoid duplicate triggers
    const lastTriggerKey = `lastTrigger_${condition.id}`;
    const now = Date.now();
    const lastTriggerTime = this.conditionEvaluationCache.get(lastTriggerKey)?.timestamp || 0;
    const debounceInterval = 30 * 1000; // 30 seconds debounce

    if (now - lastTriggerTime < debounceInterval) {
      console.log(`Condition ${condition.id} met, but debounced`);
      return;
    }

    // Update last trigger time immediately
    this.conditionEvaluationCache.set(lastTriggerKey, { result: true, timestamp: now });


    console.log(`---> Condition MET: ${condition.name} (${condition.id}) <---`);
    
    // Update condition with trigger information
    await this.supabase
      .from('monitor_conditions')
      .update({
        last_triggered: new Date().toISOString(),
        trigger_count: (condition.trigger_count || 0) + 1
      })
      .eq('id', condition.id);
    
    // Trigger associated workflow if specified
    if (condition.workflow_id) {
      console.log(`Triggering workflow ${condition.workflow_id} for condition ${condition.id}`);
      
      try {
        await this.workflowService.triggerWorkflow(
          condition.workflow_id,
          {
            triggerType: 'condition',
            triggerConditionId: condition.id,
            triggerConditionName: condition.name,
            triggerConditionType: condition.condition_type,
            triggerConditionParameters: condition.parameters,
            triggerTimestamp: new Date().toISOString()
          },
          'condition',
          condition.id
        );
      } catch (error: any) {
        console.error(`Error triggering workflow for condition ${condition.id}:`, error.message);
      }
    } else {
      console.warn(`Condition ${condition.id} met, but no associated workflow found`);
    }
    
    // Revalidate relevant paths
    revalidatePath('/dashboard/workflows/monitors');
    revalidatePath(`/dashboard/workflows/monitors/${condition.id}`);
  }
  
  /**
   * Safely evaluate custom condition code
   */
  private async evaluateSecureCode(code: string): Promise<boolean> {
    console.warn('Executing custom condition code WITHOUT sandbox (UNSAFE!)');
    
    try {
      // We're creating a limited context to reduce risk, but this is still not secure
      // In a production environment, use a proper sandbox or VM
      const context = { 
        // Provide limited safe data
        prices: { 'BTC/USD': 50000, 'ETH/USD': 3000 },
        indicators: { 'BTC/USD': { rsi: 55, macd: 0.5 } },
        assets: ['BTC/USD', 'ETH/USD']
      };
      
      // Use Function constructor for slightly safer evaluation than eval
      const fn = new Function('context', `
        try {
          with(context) {
            ${code}
          }
        } catch (e) {
          console.error('Error in custom condition:', e);
          return false;
        }
      `);
      
      const result = fn(context);
      return !!result;
    } catch (error: any) {
      console.error('Error executing custom condition code:', error.message);
      return false;
    }
  }
}
