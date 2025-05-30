import React, { useState, useEffect } from 'react';
import { YieldStrategy, YieldStrategyFilter } from '@/types/yield-strategy.types';
import { createBrowserClient } from '@/utils/supabase/client';

export function useYieldStrategies(
  vaultId?: number,
  initialFilter?: Partial<YieldStrategyFilter>
) {
  const [strategies, setStrategies] = useState<YieldStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Partial<YieldStrategyFilter>>(initialFilter || {});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const refresh = () => setRefreshTrigger((prev: number) => prev + 1);

  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build query parameters
        const queryParams = new URLSearchParams();
        if (vaultId) queryParams.append('vaultId', vaultId.toString());
        if (filter.positionId) queryParams.append('positionId', filter.positionId);
        if (filter.strategyType) queryParams.append('strategyType', filter.strategyType);
        if (filter.isActive !== undefined) queryParams.append('isActive', filter.isActive.toString());
        if (filter.search) queryParams.append('search', filter.search);
        if (filter.limit) queryParams.append('limit', filter.limit.toString());
        if (filter.offset) queryParams.append('offset', filter.offset.toString());
        
        // Fetch strategies from API
        const response = await fetch(`/api/yield-strategies?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch strategies: ${response.statusText}`);
        }
        
        const data = await response.json();
        setStrategies(data.strategies || []);
      } catch (err: any) {
        console.error('Error fetching yield strategies:', err);
        setError(err.message || 'Failed to fetch yield strategies');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStrategies();
  }, [vaultId, filter, refreshTrigger]);
  
  // Alternative method using Supabase directly
  const fetchStrategiesWithSupabase = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const supabase = createBrowserClient();
      
      // Build query
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
      if (vaultId !== undefined) {
        query = query.eq('vault_id', vaultId);
      }
      
      if (filter.positionId) {
        query = query.eq('position_id', filter.positionId);
      }
      
      if (filter.strategyType) {
        query = query.eq('strategy_type', filter.strategyType);
      }
      
      if (filter.isActive !== undefined) {
        query = query.eq('is_active', filter.isActive);
      }
      
      if (filter.search) {
        query = query.ilike('name', `%${filter.search}%`);
      }
      
      // Apply pagination
      if (filter.limit) {
        query = query.limit(filter.limit);
      }
      
      if (filter.offset) {
        query = query.offset(filter.offset || 0);
      }
      
      // Execute query
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Format strategies
      const formattedStrategies = data.map((item: any) => formatStrategy(item));
      
      setStrategies(formattedStrategies);
    } catch (err: any) {
      console.error('Error fetching yield strategies:', err);
      setError(err.message || 'Failed to fetch yield strategies');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to format a strategy from the database
  const formatStrategy = (dbStrategy: any): YieldStrategy => {
    // Format allocations if present
    const allocations = dbStrategy.yield_strategy_allocations
      ? dbStrategy.yield_strategy_allocations.map((alloc: any) => ({
          id: alloc.id,
          strategyId: alloc.strategy_id,
          protocolId: alloc.protocol_id,
          allocationPercent: alloc.allocation_percent,
          currentAmount: alloc.current_amount,
          currentValueUsd: alloc.current_value_usd,
          earnedAmount: alloc.earned_amount,
          earnedValueUsd: alloc.earned_value_usd,
          currentApy: alloc.current_apy,
          entryPriceUsd: alloc.entry_price_usd,
          lastCompoundedAt: alloc.last_compounded_at,
          status: alloc.status,
          positionDetails: alloc.position_details,
          metadata: alloc.metadata,
          createdAt: alloc.created_at,
          updatedAt: alloc.updated_at,
          protocol: alloc.yield_protocols ? {
            id: alloc.yield_protocols.id,
            name: alloc.yield_protocols.name,
            chainId: alloc.yield_protocols.chain_id,
            protocolType: alloc.yield_protocols.protocol_type,
            contractAddress: alloc.yield_protocols.contract_address,
            tokenAddress: alloc.yield_protocols.token_address,
            tokenSymbol: alloc.yield_protocols.token_symbol,
            tokenDecimals: alloc.yield_protocols.token_decimals,
            apyRange: alloc.yield_protocols.apy_range,
            tvlUsd: alloc.yield_protocols.tvl_usd,
            riskLevel: alloc.yield_protocols.risk_level,
            isActive: alloc.yield_protocols.is_active,
            lastUpdatedAt: alloc.yield_protocols.last_updated_at,
            logoUrl: alloc.yield_protocols.logo_url,
            websiteUrl: alloc.yield_protocols.website_url,
            description: alloc.yield_protocols.description,
            metadata: alloc.yield_protocols.metadata,
            createdAt: alloc.yield_protocols.created_at,
            updatedAt: alloc.yield_protocols.updated_at
          } : undefined
        }))
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
  };
  
  const createStrategy = async (strategy: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/yield-strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(strategy),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create strategy');
      }
      
      const data = await response.json();
      refresh();
      return data.strategy;
    } catch (err: any) {
      console.error('Error creating yield strategy:', err);
      setError(err.message || 'Failed to create yield strategy');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  const updateStrategy = async (strategyId: string, updates: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/yield-strategies/${strategyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update strategy');
      }
      
      const data = await response.json();
      refresh();
      return data.strategy;
    } catch (err: any) {
      console.error('Error updating yield strategy:', err);
      setError(err.message || 'Failed to update yield strategy');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  const deleteStrategy = async (strategyId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/yield-strategies/${strategyId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete strategy');
      }
      
      refresh();
      return true;
    } catch (err: any) {
      console.error('Error deleting yield strategy:', err);
      setError(err.message || 'Failed to delete yield strategy');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    strategies,
    loading,
    error,
    filter,
    setFilter,
    refresh,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    fetchStrategiesWithSupabase
  };
}
