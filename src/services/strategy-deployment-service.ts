import { supabase } from '../integrations/supabase/client';
import { Strategy, BacktestResult } from './backtest-service';

export type DeploymentStatus = 'pending' | 'active' | 'paused' | 'stopped' | 'error';

export interface DeploymentConfig {
  farmId: string;
  strategyId: string;
  initialCapital: number;
  maxPositionSize: number;
  symbol: string;
  allocatedPercentage: number;
  riskPerTrade: number;
  takeProfitPercentage?: number;
  stopLossPercentage?: number;
  trailingStopPercentage?: number;
  maxDrawdownPercentage?: number;
  maxOpenPositions: number;
  tradingHours?: {
    start: string;
    end: string;
    timezone: string;
    days: number[];
  };
}

export interface StrategyDeployment {
  id: string;
  farm_id: string;
  strategy_id: string;
  backtest_id?: string;
  status: DeploymentStatus;
  config: DeploymentConfig;
  performance_metrics?: {
    profit_loss: number;
    win_rate: number;
    total_trades: number;
    average_trade_duration: number;
    largest_win: number;
    largest_loss: number;
    updated_at: string;
  };
  created_at: string;
  updated_at: string;
  last_executed_at?: string;
  error_message?: string;
}

/**
 * Service for deploying strategies to trading farms
 */
export class StrategyDeploymentService {
  /**
   * Deploy a strategy to a farm
   * 
   * @param farmId Target farm ID
   * @param strategy Strategy to deploy
   * @param config Deployment configuration
   * @param backtestResult Optional backtest result to link
   * @returns Deployment record
   */
  async deployStrategy(
    farmId: string,
    strategy: Strategy,
    config: Partial<DeploymentConfig>,
    backtestResult?: BacktestResult
  ): Promise<StrategyDeployment> {
    try {
      // Validate farm exists
      const { data: farmData, error: farmError } = await supabase
        .from('farms')
        .select('id, name')
        .eq('id', farmId)
        .single();
      
      if (farmError || !farmData) {
        throw new Error(`Farm not found with ID ${farmId}`);
      }
      
      // Create deployment configuration with defaults
      const deploymentConfig: DeploymentConfig = {
        farmId,
        strategyId: strategy.id,
        initialCapital: config.initialCapital || 10000,
        maxPositionSize: config.maxPositionSize || 1000,
        symbol: config.symbol || 'BTCUSDT',
        allocatedPercentage: config.allocatedPercentage || 10,
        riskPerTrade: config.riskPerTrade || 1,
        takeProfitPercentage: config.takeProfitPercentage,
        stopLossPercentage: config.stopLossPercentage,
        trailingStopPercentage: config.trailingStopPercentage,
        maxDrawdownPercentage: config.maxDrawdownPercentage || 25,
        maxOpenPositions: config.maxOpenPositions || 3,
        tradingHours: config.tradingHours
      };
      
      // Create deployment record
      const deploymentId = `deploy-${Date.now()}`;
      const deployment: StrategyDeployment = {
        id: deploymentId,
        farm_id: farmId,
        strategy_id: strategy.id,
        backtest_id: backtestResult?.id,
        status: 'pending',
        config: deploymentConfig,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Save to database
      const { error: insertError } = await supabase
        .from('strategy_deployments')
        .insert([deployment]);
      
      if (insertError) {
        throw new Error(`Failed to save deployment: ${insertError.message}`);
      }
      
      // Initiate deployment process
      await this.initiateDeployment(deployment);
      
      return deployment;
    } catch (error: any) {
      console.error('Error deploying strategy:', error);
      throw new Error(`Strategy deployment failed: ${error.message}`);
    }
  }
  
  /**
   * Initiate the deployment process
   * 
   * In a real implementation, this would connect to trading platforms,
   * set up API keys, initialize exchange connections, etc.
   */
  private async initiateDeployment(deployment: StrategyDeployment): Promise<void> {
    try {
      // Simulate deployment process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update deployment status to active
      const { error } = await supabase
        .from('strategy_deployments')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
          last_executed_at: new Date().toISOString()
        })
        .eq('id', deployment.id);
      
      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Error initiating deployment:', error);
      
      // Update deployment status to error
      await supabase
        .from('strategy_deployments')
        .update({
          status: 'error',
          error_message: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', deployment.id);
      
      throw error;
    }
  }
  
  /**
   * Get all deployments for a farm
   * 
   * @param farmId Farm ID
   * @returns List of deployments
   */
  async getFarmDeployments(farmId: string): Promise<StrategyDeployment[]> {
    try {
      const { data, error } = await supabase
        .from('strategy_deployments')
        .select('*')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data as StrategyDeployment[];
    } catch (error: any) {
      console.error('Error fetching farm deployments:', error);
      throw new Error(`Failed to fetch deployments: ${error.message}`);
    }
  }
  
  /**
   * Get deployment by ID
   * 
   * @param deploymentId Deployment ID
   * @returns Deployment record
   */
  async getDeploymentById(deploymentId: string): Promise<StrategyDeployment | null> {
    try {
      const { data, error } = await supabase
        .from('strategy_deployments')
        .select('*')
        .eq('id', deploymentId)
        .single();
      
      if (error) throw error;
      
      return data as StrategyDeployment;
    } catch (error: any) {
      console.error('Error fetching deployment:', error);
      return null;
    }
  }
  
  /**
   * Update deployment status
   * 
   * @param deploymentId Deployment ID
   * @param status New status
   * @param errorMessage Optional error message
   * @returns Updated deployment
   */
  async updateDeploymentStatus(
    deploymentId: string,
    status: DeploymentStatus,
    errorMessage?: string
  ): Promise<StrategyDeployment | null> {
    try {
      const updateData: Record<string, any> = {
        status,
        updated_at: new Date().toISOString()
      };
      
      if (status === 'error' && errorMessage) {
        updateData.error_message = errorMessage;
      }
      
      if (status === 'active') {
        updateData.last_executed_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('strategy_deployments')
        .update(updateData)
        .eq('id', deploymentId)
        .select()
        .single();
      
      if (error) throw error;
      
      return data as StrategyDeployment;
    } catch (error: any) {
      console.error('Error updating deployment status:', error);
      return null;
    }
  }
  
  /**
   * Delete a deployment
   * 
   * @param deploymentId Deployment ID
   * @returns Success status
   */
  async deleteDeployment(deploymentId: string): Promise<boolean> {
    try {
      // First find and get the deployment to check its status
      const deployment = await this.getDeploymentById(deploymentId);
      
      if (!deployment) {
        throw new Error('Deployment not found');
      }
      
      // If active, stop it first
      if (deployment.status === 'active') {
        await this.updateDeploymentStatus(deploymentId, 'stopped');
      }
      
      // Now delete the deployment
      const { error } = await supabase
        .from('strategy_deployments')
        .delete()
        .eq('id', deploymentId);
      
      if (error) throw error;
      
      return true;
    } catch (error: any) {
      console.error('Error deleting deployment:', error);
      return false;
    }
  }
} 