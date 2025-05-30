/**
 * Trading Farm Cross-Chain Yield Optimization
 * Service for managing yield strategies across multiple chains
 */

import { createServerClient } from '@/utils/supabase/server';
import { BridgeService } from '../bridge/bridge-service';
import { CrossChainPositionService } from '../positions/cross-chain-position-service';
import { PriceService } from '../price/price-service';
import { 
  YieldProtocol,
  YieldStrategy,
  YieldStrategyAllocation,
  YieldStrategyTransaction,
  YieldApyHistory,
  YieldStrategyPerformance,
  YieldProtocolCreateParams,
  YieldProtocolUpdateParams,
  YieldStrategyCreateParams,
  YieldStrategyUpdateParams,
  YieldAllocationCreateParams,
  YieldAllocationUpdateParams,
  YieldProtocolFilter,
  YieldStrategyFilter,
  YieldTransactionCreateParams,
  CompoundParams,
  RebalanceYieldParams,
  ProtocolType,
  StrategyType
} from '@/types/yield-strategy.types';
import { decrypt, encrypt } from '@/utils/crypto';

export class YieldStrategyService {
  private bridgeService: BridgeService;
  private positionService: CrossChainPositionService;
  private priceService: PriceService;

  constructor() {
    this.bridgeService = new BridgeService();
    this.positionService = new CrossChainPositionService();
    this.priceService = new PriceService();
  }

  /**
   * Get yield protocols matching filter criteria
   */
  async getProtocols(filter: YieldProtocolFilter = {}): Promise<YieldProtocol[]> {
    try {
      const supabase = await createServerClient();
      
      // Build the query
      let query = supabase
        .from('yield_protocols')
        .select('*');
      
      // Apply filters
      if (filter.chainId) {
        query = query.eq('chain_id', filter.chainId);
      }
      
      if (filter.protocolType) {
        query = query.eq('protocol_type', filter.protocolType);
      }
      
      if (filter.minApy !== undefined) {
        query = query.gte("apy_range->'min'", filter.minApy);
      }
      
      if (filter.minTvl !== undefined) {
        query = query.gte('tvl_usd', filter.minTvl);
      }
      
      if (filter.maxRiskLevel !== undefined) {
        query = query.lte('risk_level', filter.maxRiskLevel);
      }
      
      if (filter.isActive !== undefined) {
        query = query.eq('is_active', filter.isActive);
      }
      
      if (filter.search) {
        query = query.or(`name.ilike.%${filter.search}%,token_symbol.ilike.%${filter.search}%`);
      }
      
      // Apply pagination
      if (filter.limit) {
        query = query.limit(filter.limit);
      }
      
      if (filter.offset) {
        query = query.offset(filter.offset);
      }
      
      // Execute query
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Failed to fetch protocols: ${error.message}`);
      }
      
      return (data || []).map(item => this.formatProtocol(item));
    } catch (error) {
      console.error('Error in getProtocols:', error);
      throw error;
    }
  }

  /**
   * Get a specific protocol by ID
   */
  async getProtocol(protocolId: string): Promise<YieldProtocol | null> {
    try {
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('yield_protocols')
        .select('*')
        .eq('id', protocolId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch protocol: ${error.message}`);
      }
      
      return this.formatProtocol(data);
    } catch (error) {
      console.error('Error in getProtocol:', error);
      throw error;
    }
  }

  /**
   * Create a new yield protocol
   */
  async createProtocol(params: YieldProtocolCreateParams): Promise<YieldProtocol> {
    try {
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('yield_protocols')
        .insert({
          name: params.name,
          chain_id: params.chainId,
          protocol_type: params.protocolType,
          contract_address: params.contractAddress,
          token_address: params.tokenAddress,
          token_symbol: params.tokenSymbol,
          token_decimals: params.tokenDecimals,
          apy_range: params.apyRange || { min: 0, max: 0 },
          tvl_usd: params.tvlUsd || 0,
          risk_level: params.riskLevel || 1,
          logo_url: params.logoUrl,
          website_url: params.websiteUrl,
          description: params.description,
          metadata: params.metadata || {}
        })
        .select('*')
        .single();
      
      if (error) {
        throw new Error(`Failed to create protocol: ${error.message}`);
      }
      
      return this.formatProtocol(data);
    } catch (error) {
      console.error('Error in createProtocol:', error);
      throw error;
    }
  }

  /**
   * Update an existing yield protocol
   */
  async updateProtocol(protocolId: string, params: YieldProtocolUpdateParams): Promise<YieldProtocol> {
    try {
      const supabase = await createServerClient();
      
      const updateData: Record<string, any> = {};
      
      if (params.name !== undefined) updateData.name = params.name;
      if (params.protocolType !== undefined) updateData.protocol_type = params.protocolType;
      if (params.contractAddress !== undefined) updateData.contract_address = params.contractAddress;
      if (params.tokenAddress !== undefined) updateData.token_address = params.tokenAddress;
      if (params.tokenSymbol !== undefined) updateData.token_symbol = params.tokenSymbol;
      if (params.tokenDecimals !== undefined) updateData.token_decimals = params.tokenDecimals;
      if (params.apyRange !== undefined) updateData.apy_range = params.apyRange;
      if (params.tvlUsd !== undefined) updateData.tvl_usd = params.tvlUsd;
      if (params.riskLevel !== undefined) updateData.risk_level = params.riskLevel;
      if (params.isActive !== undefined) updateData.is_active = params.isActive;
      if (params.logoUrl !== undefined) updateData.logo_url = params.logoUrl;
      if (params.websiteUrl !== undefined) updateData.website_url = params.websiteUrl;
      if (params.description !== undefined) updateData.description = params.description;
      if (params.metadata !== undefined) updateData.metadata = params.metadata;
      
      const { data, error } = await supabase
        .from('yield_protocols')
        .update(updateData)
        .eq('id', protocolId)
        .select('*')
        .single();
      
      if (error) {
        throw new Error(`Failed to update protocol: ${error.message}`);
      }
      
      return this.formatProtocol(data);
    } catch (error) {
      console.error('Error in updateProtocol:', error);
      throw error;
    }
  }

  /**
   * Get yield strategies for a user
   */
  async getStrategies(filter: YieldStrategyFilter = {}): Promise<YieldStrategy[]> {
    try {
      const supabase = await createServerClient();
      
      // Build the query
      let query = supabase
        .from('yield_strategies')
        .select(`
          *,
          yield_strategy_allocations(
            *,
            yield_protocols(*)
          )
        `);
      
      // Apply filters
      if (filter.vaultId !== undefined) {
        query = query.eq('vault_id', filter.vaultId);
      }
      
      if (filter.positionId !== undefined) {
        query = query.eq('position_id', filter.positionId);
      }
      
      if (filter.strategyType) {
        query = query.eq('strategy_type', filter.strategyType);
      }
      
      if (filter.maxRiskLevel !== undefined) {
        query = query.lte('risk_level', filter.maxRiskLevel);
      }
      
      if (filter.isActive !== undefined) {
        query = query.eq('is_active', filter.isActive);
      }
      
      if (filter.minApy !== undefined) {
        query = query.gte('current_apy', filter.minApy);
      }
      
      if (filter.minValueUsd !== undefined) {
        query = query.gte('total_value_usd', filter.minValueUsd);
      }
      
      if (filter.search) {
        query = query.ilike('name', `%${filter.search}%`);
      }
      
      // Apply pagination
      if (filter.limit) {
        query = query.limit(filter.limit);
      }
      
      if (filter.offset) {
        query = query.offset(filter.offset);
      }
      
      // Execute query
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Failed to fetch strategies: ${error.message}`);
      }
      
      return (data || []).map(item => this.formatStrategy(item));
    } catch (error) {
      console.error('Error in getStrategies:', error);
      throw error;
    }
  }

  /**
   * Get a yield strategy by ID
   */
  async getStrategy(strategyId: string): Promise<YieldStrategy | null> {
    try {
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('yield_strategies')
        .select(`
          *,
          yield_strategy_allocations(
            *,
            yield_protocols(*)
          )
        `)
        .eq('id', strategyId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch strategy: ${error.message}`);
      }
      
      return this.formatStrategy(data);
    } catch (error) {
      console.error('Error in getStrategy:', error);
      throw error;
    }
  }

  /**
   * Create a new yield strategy
   */
  async createStrategy(params: YieldStrategyCreateParams): Promise<YieldStrategy> {
    try {
      const supabase = await createServerClient();
      
      // Create strategy record
      const { data: strategy, error } = await supabase
        .from('yield_strategies')
        .insert({
          name: params.name,
          description: params.description,
          vault_id: params.vaultId,
          position_id: params.positionId,
          template_id: params.templateId,
          strategy_type: params.strategyType,
          risk_level: params.riskLevel || 1,
          target_apy: params.targetApy,
          auto_compound: params.autoCompound || false,
          auto_rebalance: params.autoRebalance || false,
          rebalance_frequency: params.rebalanceFrequency || 'weekly',
          total_invested_usd: params.initialInvestmentUsd || 0,
          chain_allocations: params.chainAllocations || {},
          protocol_allocations: params.protocolAllocations || {},
          max_slippage_percent: params.maxSlippagePercent || 0.5,
          max_gas_usd: params.maxGasUsd || 100,
          metadata: params.metadata || {}
        })
        .select('*')
        .single();
      
      if (error) {
        throw new Error(`Failed to create strategy: ${error.message}`);
      }
      
      // Create initial allocations if provided
      if (params.initialAllocations && params.initialAllocations.length > 0) {
        const allocations = params.initialAllocations.map(a => ({
          strategy_id: strategy.id,
          protocol_id: a.protocolId,
          allocation_percent: a.allocationPercent,
          current_amount: a.initialAmount || '0',
          current_value_usd: a.initialValueUsd || 0,
          earned_amount: '0',
          earned_value_usd: 0,
          position_details: a.positionDetails || {},
          metadata: a.metadata || {}
        }));
        
        const { error: allocError } = await supabase
          .from('yield_strategy_allocations')
          .insert(allocations);
        
        if (allocError) {
          console.error('Failed to create strategy allocations:', allocError);
        }
      }
      
      // Get complete strategy with allocations
      return await this.getStrategy(strategy.id) as YieldStrategy;
    } catch (error) {
      console.error('Error in createStrategy:', error);
      throw error;
    }
  }

  /**
   * Update a yield strategy
   */
  async updateStrategy(strategyId: string, params: YieldStrategyUpdateParams): Promise<YieldStrategy> {
    try {
      const supabase = await createServerClient();
      
      const updateData: Record<string, any> = {};
      
      if (params.name !== undefined) updateData.name = params.name;
      if (params.description !== undefined) updateData.description = params.description;
      if (params.positionId !== undefined) updateData.position_id = params.positionId;
      if (params.strategyType !== undefined) updateData.strategy_type = params.strategyType;
      if (params.riskLevel !== undefined) updateData.risk_level = params.riskLevel;
      if (params.targetApy !== undefined) updateData.target_apy = params.targetApy;
      if (params.isActive !== undefined) updateData.is_active = params.isActive;
      if (params.autoCompound !== undefined) updateData.auto_compound = params.autoCompound;
      if (params.autoRebalance !== undefined) updateData.auto_rebalance = params.autoRebalance;
      if (params.rebalanceFrequency !== undefined) updateData.rebalance_frequency = params.rebalanceFrequency;
      if (params.chainAllocations !== undefined) updateData.chain_allocations = params.chainAllocations;
      if (params.protocolAllocations !== undefined) updateData.protocol_allocations = params.protocolAllocations;
      if (params.maxSlippagePercent !== undefined) updateData.max_slippage_percent = params.maxSlippagePercent;
      if (params.maxGasUsd !== undefined) updateData.max_gas_usd = params.maxGasUsd;
      if (params.metadata !== undefined) updateData.metadata = params.metadata;
      
      const { error } = await supabase
        .from('yield_strategies')
        .update(updateData)
        .eq('id', strategyId);
      
      if (error) {
        throw new Error(`Failed to update strategy: ${error.message}`);
      }
      
      // Return the updated strategy with allocations
      return await this.getStrategy(strategyId) as YieldStrategy;
    } catch (error) {
      console.error('Error in updateStrategy:', error);
      throw error;
    }
  }

  /**
   * Add or update a yield allocation
   */
  async addAllocation(strategyId: string, params: YieldAllocationCreateParams): Promise<YieldStrategyAllocation> {
    try {
      const supabase = await createServerClient();
      
      // Check if allocation for this protocol already exists
      const { data: existing } = await supabase
        .from('yield_strategy_allocations')
        .select('*')
        .eq('strategy_id', strategyId)
        .eq('protocol_id', params.protocolId)
        .single();
      
      if (existing) {
        // Update existing allocation
        const { data, error } = await supabase
          .from('yield_strategy_allocations')
          .update({
            allocation_percent: params.allocationPercent,
            current_amount: params.initialAmount || existing.current_amount,
            current_value_usd: params.initialValueUsd || existing.current_value_usd,
            position_details: params.positionDetails || existing.position_details,
            metadata: { ...(existing.metadata || {}), ...(params.metadata || {}) }
          })
          .eq('id', existing.id)
          .select('*')
          .single();
        
        if (error) {
          throw new Error(`Failed to update allocation: ${error.message}`);
        }
        
        return this.formatAllocation(data);
      } else {
        // Create new allocation
        const { data, error } = await supabase
          .from('yield_strategy_allocations')
          .insert({
            strategy_id: strategyId,
            protocol_id: params.protocolId,
            allocation_percent: params.allocationPercent,
            current_amount: params.initialAmount || '0',
            current_value_usd: params.initialValueUsd || 0,
            earned_amount: '0',
            earned_value_usd: 0,
            position_details: params.positionDetails || {},
            metadata: params.metadata || {}
          })
          .select('*')
          .single();
        
        if (error) {
          throw new Error(`Failed to create allocation: ${error.message}`);
        }
        
        // Update protocol allocations in strategy
        await this.updateProtocolAllocations(strategyId);
        
        return this.formatAllocation(data);
      }
    } catch (error) {
      console.error('Error in addAllocation:', error);
      throw error;
    }
  }

  /**
   * Format a protocol from database to API format
   */
  private formatProtocol(dbProtocol: any): YieldProtocol {
    return {
      id: dbProtocol.id,
      name: dbProtocol.name,
      chainId: dbProtocol.chain_id,
      protocolType: dbProtocol.protocol_type,
      contractAddress: dbProtocol.contract_address,
      tokenAddress: dbProtocol.token_address,
      tokenSymbol: dbProtocol.token_symbol,
      tokenDecimals: dbProtocol.token_decimals,
      apyRange: dbProtocol.apy_range,
      tvlUsd: dbProtocol.tvl_usd,
      riskLevel: dbProtocol.risk_level,
      isActive: dbProtocol.is_active,
      lastUpdatedAt: dbProtocol.last_updated_at,
      logoUrl: dbProtocol.logo_url,
      websiteUrl: dbProtocol.website_url,
      description: dbProtocol.description,
      metadata: dbProtocol.metadata,
      createdAt: dbProtocol.created_at,
      updatedAt: dbProtocol.updated_at
    };
  }

  /**
   * Format a strategy from database to API format
   */
  private formatStrategy(dbStrategy: any): YieldStrategy {
    // Format allocations if present
    const allocations = dbStrategy.yield_strategy_allocations
      ? dbStrategy.yield_strategy_allocations.map((alloc: any) => 
          this.formatAllocation(alloc))
      : undefined;
    
    return {
      id: dbStrategy.id,
      name: dbStrategy.name,
      description: dbStrategy.description,
      vaultId: dbStrategy.vault_id,
      positionId: dbStrategy.position_id,
      templateId: dbStrategy.template_id,
      strategyType: dbStrategy.strategy_type,
      riskLevel: dbStrategy.risk_level,
      targetApy: dbStrategy.target_apy,
      isActive: dbStrategy.is_active,
      autoCompound: dbStrategy.auto_compound,
      autoRebalance: dbStrategy.auto_rebalance,
      rebalanceFrequency: dbStrategy.rebalance_frequency,
      lastRebalancedAt: dbStrategy.last_rebalanced_at,
      nextRebalanceAt: dbStrategy.next_rebalance_at,
      totalInvestedUsd: dbStrategy.total_invested_usd,
      totalValueUsd: dbStrategy.total_value_usd,
      totalEarnedUsd: dbStrategy.total_earned_usd,
      currentApy: dbStrategy.current_apy,
      performanceMetrics: dbStrategy.performance_metrics,
      chainAllocations: dbStrategy.chain_allocations,
      protocolAllocations: dbStrategy.protocol_allocations,
      maxSlippagePercent: dbStrategy.max_slippage_percent,
      maxGasUsd: dbStrategy.max_gas_usd,
      metadata: dbStrategy.metadata,
      createdAt: dbStrategy.created_at,
      updatedAt: dbStrategy.updated_at,
      allocations
    };
  }

  /**
   * Format an allocation from database to API format
   */
  private formatAllocation(dbAllocation: any): YieldStrategyAllocation {
    const protocol = dbAllocation.yield_protocols 
      ? this.formatProtocol(dbAllocation.yield_protocols)
      : undefined;
    
    return {
      id: dbAllocation.id,
      strategyId: dbAllocation.strategy_id,
      protocolId: dbAllocation.protocol_id,
      allocationPercent: dbAllocation.allocation_percent,
      currentAmount: dbAllocation.current_amount,
      currentValueUsd: dbAllocation.current_value_usd,
      earnedAmount: dbAllocation.earned_amount,
      earnedValueUsd: dbAllocation.earned_value_usd,
      currentApy: dbAllocation.current_apy,
      entryPriceUsd: dbAllocation.entry_price_usd,
      lastCompoundedAt: dbAllocation.last_compounded_at,
      status: dbAllocation.status,
      positionDetails: dbAllocation.position_details,
      metadata: dbAllocation.metadata,
      createdAt: dbAllocation.created_at,
      updatedAt: dbAllocation.updated_at,
      protocol
    };
  }

  /**
   * Update protocol allocations in a strategy
   */
  private async updateProtocolAllocations(strategyId: string): Promise<void> {
    try {
      const supabase = await createServerClient();
      
      // Get all allocations for this strategy
      const { data: allocations, error } = await supabase
        .from('yield_strategy_allocations')
        .select('protocol_id, allocation_percent')
        .eq('strategy_id', strategyId);
      
      if (error) {
        throw new Error(`Failed to fetch allocations: ${error.message}`);
      }
      
      // Build protocol allocations object
      const protocolAllocations: Record<string, number> = {};
      allocations?.forEach(alloc => {
        protocolAllocations[alloc.protocol_id] = alloc.allocation_percent;
      });
      
      // Update strategy
      await supabase
        .from('yield_strategies')
        .update({
          protocol_allocations: protocolAllocations
        })
        .eq('id', strategyId);
    } catch (error) {
      console.error('Error in updateProtocolAllocations:', error);
    }
  }
}
