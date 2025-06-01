/**
 * Trading Farm Cross-Chain Position Management
 * Service for managing cross-chain investment positions
 */

import { createServerClient } from '@/utils/supabase/server';
import { BridgeService } from '../bridge/bridge-service';
import { 
  CrossChainPosition, 
  CrossChainPositionComponent,
  CrossChainPositionCreateParams,
  CrossChainPositionUpdateParams,
  ComponentCreateParams,
  ComponentUpdateParams,
  RebalanceParams,
  RebalanceHistory,
  PerformanceHistory,
  PositionFilterParams
} from '@/types/cross-chain-position.types';
import { PriceService } from '../price/price-service';

export class CrossChainPositionService {
  private bridgeService: BridgeService;
  private priceService: PriceService;

  constructor() {
    this.bridgeService = new BridgeService();
    this.priceService = new PriceService();
  }

  /**
   * Create a new cross-chain position
   */
  async createPosition(params: CrossChainPositionCreateParams): Promise<CrossChainPosition> {
    try {
      const supabase = await createServerClient();

      // Insert position record
      const { data: position, error } = await supabase
        .from('cross_chain_positions')
        .insert({
          vault_id: params.vaultId,
          name: params.name,
          description: params.description || null,
          risk_level: params.riskLevel || 1,
          rebalance_frequency: params.rebalanceFrequency || 'weekly',
          auto_rebalance: params.autoRebalance || false,
          target_allocations: params.targetAllocations,
          max_slippage_percent: params.maxSlippagePercent || 0.5,
          max_gas_usd: params.maxGasUsd || 100,
          metadata: params.metadata || {}
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to create position: ${error.message}`);
      }

      if (!position) {
        throw new Error('Position was not created');
      }

      // If initial components are provided, create them
      if (params.initialComponents && params.initialComponents.length > 0) {
        const componentsToInsert = params.initialComponents.map(comp => ({
          position_id: position.id,
          chain_id: comp.chainId,
          protocol_id: comp.protocolId,
          asset_address: comp.assetAddress,
          asset_symbol: comp.assetSymbol,
          asset_decimals: comp.assetDecimals,
          current_amount: comp.currentAmount,
          target_allocation_percent: comp.targetAllocationPercent,
          strategy_type: comp.strategyType,
          strategy_params: comp.strategyParams || {},
          status: comp.status || 'active',
          metadata: comp.metadata || {}
        }));

        const { data: components, error: componentsError } = await supabase
          .from('cross_chain_position_components')
          .insert(componentsToInsert)
          .select('*');

        if (componentsError) {
          console.error('Failed to create position components:', componentsError);
          // Continue despite component creation error
        }

        // Return formatted position with components
        return this.formatPosition(position, components || []);
      }

      // Return formatted position without components
      return this.formatPosition(position);
    } catch (error) {
      console.error('Error in createPosition:', error);
      throw error;
    }
  }

  /**
   * Get a position by ID
   */
  async getPosition(positionId: string): Promise<CrossChainPosition | null> {
    try {
      const supabase = await createServerClient();

      // Fetch position
      const { data: position, error } = await supabase
        .from('cross_chain_positions')
        .select('*')
        .eq('id', positionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Position not found
          return null;
        }
        throw new Error(`Failed to fetch position: ${error.message}`);
      }

      if (!position) {
        return null;
      }

      // Fetch position components
      const { data: components, error: componentsError } = await supabase
        .from('cross_chain_position_components')
        .select('*')
        .eq('position_id', positionId);

      if (componentsError) {
        console.error('Failed to fetch position components:', componentsError);
        // Continue despite component fetch error
      }

      // Return formatted position with components
      return this.formatPosition(position, components || []);
    } catch (error) {
      console.error('Error in getPosition:', error);
      throw error;
    }
  }

  /**
   * Get positions by vault ID
   */
  async getPositionsByVault(vaultId: number, filters: Omit<PositionFilterParams, 'vaultId'> = {}): Promise<CrossChainPosition[]> {
    try {
      const supabase = await createServerClient();
      
      // Build the query
      let query = supabase
        .from('cross_chain_positions')
        .select('*')
        .eq('vault_id', vaultId);
      
      // Apply filters
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      
      if (filters.riskLevel) {
        query = query.eq('risk_level', filters.riskLevel);
      }
      
      if (filters.minValueUsd) {
        query = query.gte('total_value_usd', filters.minValueUsd);
      }
      
      if (filters.maxValueUsd) {
        query = query.lte('total_value_usd', filters.maxValueUsd);
      }
      
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
      
      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset) {
        query = query.offset(filters.offset);
      }
      
      // Execute the query
      const { data: positions, error } = await query;
      
      if (error) {
        throw new Error(`Failed to fetch positions: ${error.message}`);
      }
      
      if (!positions || positions.length === 0) {
        return [];
      }
      
      // Fetch components for all positions
      const positionIds = positions.map(p => p.id);
      const { data: components, error: componentsError } = await supabase
        .from('cross_chain_position_components')
        .select('*')
        .in('position_id', positionIds);
      
      if (componentsError) {
        console.error('Failed to fetch position components:', componentsError);
        // Continue despite component fetch error
      }
      
      // Group components by position_id
      const componentsByPosition: Record<string, any[]> = {};
      if (components) {
        components.forEach(comp => {
          if (!componentsByPosition[comp.position_id]) {
            componentsByPosition[comp.position_id] = [];
          }
          componentsByPosition[comp.position_id].push(comp);
        });
      }
      
      // Format and return positions with their components
      return positions.map(position => 
        this.formatPosition(position, componentsByPosition[position.id] || [])
      );
    } catch (error) {
      console.error('Error in getPositionsByVault:', error);
      throw error;
    }
  }

  /**
   * Update a position
   */
  async updatePosition(positionId: string, params: CrossChainPositionUpdateParams): Promise<CrossChainPosition> {
    try {
      const supabase = await createServerClient();
      
      // Prepare update data
      const updateData: Record<string, any> = {};
      
      if (params.name !== undefined) updateData.name = params.name;
      if (params.description !== undefined) updateData.description = params.description;
      if (params.isActive !== undefined) updateData.is_active = params.isActive;
      if (params.riskLevel !== undefined) updateData.risk_level = params.riskLevel;
      if (params.rebalanceFrequency !== undefined) updateData.rebalance_frequency = params.rebalanceFrequency;
      if (params.autoRebalance !== undefined) updateData.auto_rebalance = params.autoRebalance;
      if (params.targetAllocations !== undefined) updateData.target_allocations = params.targetAllocations;
      if (params.maxSlippagePercent !== undefined) updateData.max_slippage_percent = params.maxSlippagePercent;
      if (params.maxGasUsd !== undefined) updateData.max_gas_usd = params.maxGasUsd;
      if (params.metadata !== undefined) updateData.metadata = params.metadata;
      
      // Update position
      const { data: updatedPosition, error } = await supabase
        .from('cross_chain_positions')
        .update(updateData)
        .eq('id', positionId)
        .select('*')
        .single();
      
      if (error) {
        throw new Error(`Failed to update position: ${error.message}`);
      }
      
      if (!updatedPosition) {
        throw new Error('Position was not updated');
      }
      
      // Fetch position components
      const { data: components, error: componentsError } = await supabase
        .from('cross_chain_position_components')
        .select('*')
        .eq('position_id', positionId);
      
      if (componentsError) {
        console.error('Failed to fetch position components:', componentsError);
        // Continue despite component fetch error
      }
      
      // Return formatted position with components
      return this.formatPosition(updatedPosition, components || []);
    } catch (error) {
      console.error('Error in updatePosition:', error);
      throw error;
    }
  }

  /**
   * Delete a position
   */
  async deletePosition(positionId: string): Promise<boolean> {
    try {
      const supabase = await createServerClient();
      
      const { error } = await supabase
        .from('cross_chain_positions')
        .delete()
        .eq('id', positionId);
      
      if (error) {
        throw new Error(`Failed to delete position: ${error.message}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error in deletePosition:', error);
      throw error;
    }
  }

  /**
   * Add a component to a position
   */
  async addComponent(params: ComponentCreateParams): Promise<CrossChainPositionComponent> {
    try {
      const supabase = await createServerClient();
      
      // Verify position exists
      const { data: position, error: positionError } = await supabase
        .from('cross_chain_positions')
        .select('id')
        .eq('id', params.positionId)
        .single();
      
      if (positionError || !position) {
        throw new Error(`Position not found: ${params.positionId}`);
      }
      
      // Insert component
      const { data: component, error } = await supabase
        .from('cross_chain_position_components')
        .insert({
          position_id: params.positionId,
          chain_id: params.chainId,
          protocol_id: params.protocolId,
          asset_address: params.assetAddress,
          asset_symbol: params.assetSymbol,
          asset_decimals: params.assetDecimals,
          current_amount: params.currentAmount,
          current_value_usd: 0, // Will be updated by price service
          target_allocation_percent: params.targetAllocationPercent,
          strategy_type: params.strategyType,
          strategy_params: params.strategyParams || {},
          status: params.status || 'active',
          metadata: params.metadata || {}
        })
        .select('*')
        .single();
      
      if (error) {
        throw new Error(`Failed to add component: ${error.message}`);
      }
      
      if (!component) {
        throw new Error('Component was not created');
      }
      
      // Update the component's value based on current price
      await this.updateComponentValue(component.id);
      
      // Fetch the updated component
      const { data: updatedComponent, error: fetchError } = await supabase
        .from('cross_chain_position_components')
        .select('*')
        .eq('id', component.id)
        .single();
      
      if (fetchError || !updatedComponent) {
        console.error('Failed to fetch updated component:', fetchError);
        return this.formatComponent(component);
      }
      
      return this.formatComponent(updatedComponent);
    } catch (error) {
      console.error('Error in addComponent:', error);
      throw error;
    }
  }

  /**
   * Update a position component
   */
  async updateComponent(componentId: string, params: ComponentUpdateParams): Promise<CrossChainPositionComponent> {
    try {
      const supabase = await createServerClient();
      
      // Prepare update data
      const updateData: Record<string, any> = {};
      
      if (params.currentAmount !== undefined) updateData.current_amount = params.currentAmount;
      if (params.currentValueUsd !== undefined) updateData.current_value_usd = params.currentValueUsd;
      if (params.targetAllocationPercent !== undefined) updateData.target_allocation_percent = params.targetAllocationPercent;
      if (params.strategyType !== undefined) updateData.strategy_type = params.strategyType;
      if (params.strategyParams !== undefined) updateData.strategy_params = params.strategyParams;
      if (params.status !== undefined) updateData.status = params.status;
      if (params.metadata !== undefined) updateData.metadata = params.metadata;
      
      // Update component
      const { data: updatedComponent, error } = await supabase
        .from('cross_chain_position_components')
        .update(updateData)
        .eq('id', componentId)
        .select('*')
        .single();
      
      if (error) {
        throw new Error(`Failed to update component: ${error.message}`);
      }
      
      if (!updatedComponent) {
        throw new Error('Component was not updated');
      }
      
      // If amount was updated but not value, update the value
      if (params.currentAmount !== undefined && params.currentValueUsd === undefined) {
        await this.updateComponentValue(componentId);
        
        // Fetch the updated component
        const { data: refreshedComponent, error: fetchError } = await supabase
          .from('cross_chain_position_components')
          .select('*')
          .eq('id', componentId)
          .single();
        
        if (fetchError || !refreshedComponent) {
          console.error('Failed to fetch updated component:', fetchError);
          return this.formatComponent(updatedComponent);
        }
        
        return this.formatComponent(refreshedComponent);
      }
      
      return this.formatComponent(updatedComponent);
    } catch (error) {
      console.error('Error in updateComponent:', error);
      throw error;
    }
  }

  /**
   * Remove a component from a position
   */
  async removeComponent(componentId: string): Promise<boolean> {
    try {
      const supabase = await createServerClient();
      
      const { error } = await supabase
        .from('cross_chain_position_components')
        .delete()
        .eq('id', componentId);
      
      if (error) {
        throw new Error(`Failed to remove component: ${error.message}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error in removeComponent:', error);
      throw error;
    }
  }

  /**
   * Get rebalance history for a position
   */
  async getRebalanceHistory(positionId: string, limit: number = 10): Promise<RebalanceHistory[]> {
    try {
      const supabase = await createServerClient();
      
      const { data: history, error } = await supabase
        .from('cross_chain_rebalance_history')
        .select('*')
        .eq('position_id', positionId)
        .order('initiated_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        throw new Error(`Failed to fetch rebalance history: ${error.message}`);
      }
      
      if (!history || history.length === 0) {
        return [];
      }
      
      return history.map(entry => ({
        id: entry.id,
        positionId: entry.position_id,
        initiatedAt: entry.initiated_at,
        completedAt: entry.completed_at,
        status: entry.status,
        beforeAllocations: entry.before_allocations,
        targetAllocations: entry.target_allocations,
        actualAllocations: entry.actual_allocations,
        transactions: entry.transactions || [],
        totalGasCostUsd: entry.total_gas_cost_usd,
        totalSlippageUsd: entry.total_slippage_usd,
        errorMessage: entry.error_message,
        metadata: entry.metadata,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at
      }));
    } catch (error) {
      console.error('Error in getRebalanceHistory:', error);
      throw error;
    }
  }

  /**
   * Get performance history for a position
   */
  async getPerformanceHistory(positionId: string, days: number = 30): Promise<PerformanceHistory[]> {
    try {
      const supabase = await createServerClient();
      
      const { data: history, error } = await supabase
        .from('cross_chain_performance_history')
        .select('*')
        .eq('position_id', positionId)
        .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false });
      
      if (error) {
        throw new Error(`Failed to fetch performance history: ${error.message}`);
      }
      
      if (!history || history.length === 0) {
        return [];
      }
      
      return history.map(entry => ({
        id: entry.id,
        positionId: entry.position_id,
        timestamp: entry.timestamp,
        totalValueUsd: entry.total_value_usd,
        componentValues: entry.component_values,
        benchmarkComparison: entry.benchmark_comparison,
        periodReturnPercent: entry.period_return_percent,
        rollingReturns: entry.rolling_returns,
        riskMetrics: entry.risk_metrics,
        createdAt: entry.created_at
      }));
    } catch (error) {
      console.error('Error in getPerformanceHistory:', error);
      throw error;
    }
  }

  /**
   * Initiate a position rebalance
   */
  async initiateRebalance(params: RebalanceParams): Promise<RebalanceHistory> {
    try {
      const supabase = await createServerClient();
      
      // Get current position data
      const position = await this.getPosition(params.positionId);
      if (!position) {
        throw new Error(`Position not found: ${params.positionId}`);
      }
      
      // Get current component allocations
      const currentAllocations: Record<string, number> = {};
      if (position.components && position.components.length > 0) {
        const totalValue = position.totalValueUsd;
        position.components.forEach(comp => {
          const chainKey = comp.chainId;
          if (!currentAllocations[chainKey]) {
            currentAllocations[chainKey] = 0;
          }
          currentAllocations[chainKey] += (comp.currentValueUsd / totalValue) * 100;
        });
      }
      
      // Use provided target allocations or fall back to position's targets
      const targetAllocations = params.targetAllocations || position.targetAllocations;
      
      // Create rebalance history record
      const { data: rebalanceRecord, error } = await supabase
        .from('cross_chain_rebalance_history')
        .insert({
          position_id: params.positionId,
          status: 'pending',
          before_allocations: currentAllocations,
          target_allocations: targetAllocations,
          transactions: [],
          metadata: {
            maxSlippagePercent: params.maxSlippagePercent || position.maxSlippagePercent,
            maxGasUsd: params.maxGasUsd || position.maxGasUsd
          }
        })
        .select('*')
        .single();
      
      if (error) {
        throw new Error(`Failed to create rebalance record: ${error.message}`);
      }
      
      if (!rebalanceRecord) {
        throw new Error('Rebalance record was not created');
      }
      
      // In a real implementation, we would start an async process to perform the rebalance
      // For now, return the pending rebalance record
      return {
        id: rebalanceRecord.id,
        positionId: rebalanceRecord.position_id,
        initiatedAt: rebalanceRecord.initiated_at,
        completedAt: rebalanceRecord.completed_at,
        status: rebalanceRecord.status,
        beforeAllocations: rebalanceRecord.before_allocations,
        targetAllocations: rebalanceRecord.target_allocations,
        actualAllocations: rebalanceRecord.actual_allocations,
        transactions: rebalanceRecord.transactions || [],
        totalGasCostUsd: rebalanceRecord.total_gas_cost_usd,
        totalSlippageUsd: rebalanceRecord.total_slippage_usd,
        errorMessage: rebalanceRecord.error_message,
        metadata: rebalanceRecord.metadata,
        createdAt: rebalanceRecord.created_at,
        updatedAt: rebalanceRecord.updated_at
      };
    } catch (error) {
      console.error('Error in initiateRebalance:', error);
      throw error;
    }
  }

  /**
   * Update a component's USD value based on current price
   */
  private async updateComponentValue(componentId: string): Promise<boolean> {
    try {
      const supabase = await createServerClient();
      
      // Fetch the component
      const { data: component, error } = await supabase
        .from('cross_chain_position_components')
        .select('*')
        .eq('id', componentId)
        .single();
      
      if (error || !component) {
        console.error('Failed to fetch component for value update:', error);
        return false;
      }
      
      // Get the current price for this asset
      const price = await this.priceService.getTokenPrice(
        component.chain_id,
        component.asset_address,
        component.asset_symbol
      );
      
      if (!price) {
        console.warn(`Could not get price for ${component.asset_symbol} on ${component.chain_id}`);
        return false;
      }
      
      // Calculate value
      const amount = parseFloat(component.current_amount);
      const valueUsd = amount * price;
      
      // Update the component value
      const { error: updateError } = await supabase
        .from('cross_chain_position_components')
        .update({
          current_value_usd: valueUsd,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', componentId);
      
      if (updateError) {
        console.error('Failed to update component value:', updateError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in updateComponentValue:', error);
      return false;
    }
  }

  /**
   * Format a position from database to API format
   */
  private formatPosition(dbPosition: any, dbComponents: any[] = []): CrossChainPosition {
    const components = dbComponents.map(comp => this.formatComponent(comp));
    
    return {
      id: dbPosition.id,
      vaultId: dbPosition.vault_id,
      name: dbPosition.name,
      description: dbPosition.description,
      isActive: dbPosition.is_active,
      totalValueUsd: dbPosition.total_value_usd,
      riskLevel: dbPosition.risk_level,
      rebalanceFrequency: dbPosition.rebalance_frequency,
      lastRebalancedAt: dbPosition.last_rebalanced_at,
      nextRebalanceAt: dbPosition.next_rebalance_at,
      autoRebalance: dbPosition.auto_rebalance,
      targetAllocations: dbPosition.target_allocations,
      performanceMetrics: dbPosition.performance_metrics,
      maxSlippagePercent: dbPosition.max_slippage_percent,
      maxGasUsd: dbPosition.max_gas_usd,
      metadata: dbPosition.metadata,
      createdAt: dbPosition.created_at,
      updatedAt: dbPosition.updated_at,
      components: components.length > 0 ? components : undefined
    };
  }

  /**
   * Format a component from database to API format
   */
  private formatComponent(dbComponent: any): CrossChainPositionComponent {
    return {
      id: dbComponent.id,
      positionId: dbComponent.position_id,
      chainId: dbComponent.chain_id,
      protocolId: dbComponent.protocol_id,
      assetAddress: dbComponent.asset_address,
      assetSymbol: dbComponent.asset_symbol,
      assetDecimals: dbComponent.asset_decimals,
      currentAmount: dbComponent.current_amount,
      currentValueUsd: dbComponent.current_value_usd,
      targetAllocationPercent: dbComponent.target_allocation_percent,
      strategyType: dbComponent.strategy_type,
      strategyParams: dbComponent.strategy_params,
      lastUpdatedAt: dbComponent.last_updated_at,
      performanceData: dbComponent.performance_data,
      status: dbComponent.status,
      metadata: dbComponent.metadata,
      createdAt: dbComponent.created_at,
      updatedAt: dbComponent.updated_at
    };
  }
}
