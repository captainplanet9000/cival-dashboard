import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import React from 'react';
const { useCallback, useState } = React;

export interface Strategy {
  id: string;
  name: string;
  type: string;
  description: string;
  markets: string[];
  status: 'active' | 'inactive' | 'backtesting';
  performance: number;
  winRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface BacktestResult {
  id: string;
  strategyId: string;
  startDate: string;
  endDate: string;
  totalReturn: number;
  sharpeRatio: number;
  sortino: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  tradesCount: number;
  status: 'completed' | 'running' | 'failed';
  createdAt: string;
}

/**
 * Hook for managing trading strategies and backtests
 * 
 * @param userId - The user ID
 * @returns Strategy management functions and data
 */
export function useStrategyManagement(userId: string) {
  const queryClient = useQueryClient();
  const supabase = createBrowserClient();
  const { toast } = useToast();
  
  // Fetch strategies
  const strategiesQuery = useQuery({
    queryKey: ['strategies', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_strategies')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return (data || []).map((strategy: any) => ({
        id: strategy.id,
        name: strategy.name,
        type: strategy.type,
        description: strategy.description,
        markets: strategy.markets || [],
        status: strategy.status,
        performance: strategy.performance || 0,
        winRate: strategy.win_rate || 0,
        createdAt: strategy.created_at,
        updatedAt: strategy.updated_at
      }));
    }
  });
  
  // Fetch backtest results for a specific strategy
  const getBacktestResults = useCallback(async (strategyId: string) => {
    return useQuery({
      queryKey: ['backtestResults', strategyId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('backtest_results')
          .select('*')
          .eq('strategy_id', strategyId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        return (data || []).map((result: any) => ({
          id: result.id,
          strategyId: result.strategy_id,
          startDate: result.start_date,
          endDate: result.end_date,
          totalReturn: result.total_return,
          sharpeRatio: result.sharpe_ratio,
          sortino: result.sortino,
          maxDrawdown: result.max_drawdown,
          winRate: result.win_rate,
          profitFactor: result.profit_factor,
          tradesCount: result.trades_count,
          status: result.status,
          createdAt: result.created_at
        }));
      }
    });
  }, [supabase, userId]);
  
  // Create strategy mutation
  const createStrategyMutation = useMutation({
    mutationFn: async (strategyData: {
      name: string;
      type: string;
      description: string;
      markets: string[];
      code?: string;
      parameters?: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from('trading_strategies')
        .insert({
          name: strategyData.name,
          type: strategyData.type,
          description: strategyData.description,
          markets: strategyData.markets,
          code: strategyData.code || null,
          parameters: strategyData.parameters || null,
          status: 'inactive',
          user_id: userId
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies', userId] });
    }
  });
  
  // Update strategy mutation
  const updateStrategyMutation = useMutation({
    mutationFn: async ({ strategyId, strategyData }: {
      strategyId: string;
      strategyData: Partial<{
        name: string;
        type: string;
        description: string;
        markets: string[];
        code: string;
        parameters: Record<string, any>;
        status: 'active' | 'inactive';
      }>;
    }) => {
      const { data, error } = await supabase
        .from('trading_strategies')
        .update(strategyData)
        .eq('id', strategyId)
        .eq('user_id', userId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies', userId] });
    }
  });
  
  // Delete strategy mutation
  const deleteStrategyMutation = useMutation({
    mutationFn: async (strategyId: string) => {
      const { error } = await supabase
        .from('trading_strategies')
        .delete()
        .eq('id', strategyId)
        .eq('user_id', userId);
        
      if (error) throw error;
      return strategyId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies', userId] });
    }
  });
  
  // Run backtest mutation
  const runBacktestMutation = useMutation({
    mutationFn: async ({ strategyId, params }: {
      strategyId: string;
      params?: {
        startDate?: string;
        endDate?: string;
        initialCapital?: number;
        parameters?: Record<string, any>;
      };
    }) => {
      // First create a backtest record
      const { data: backtestRecord, error: createError } = await supabase
        .from('backtest_results')
        .insert({
          strategy_id: strategyId,
          start_date: params?.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // Default: 90 days ago
          end_date: params?.endDate || new Date().toISOString(), // Default: now
          initial_capital: params?.initialCapital || 10000, // Default: $10,000
          parameters: params?.parameters || null,
          status: 'running',
          user_id: userId
        })
        .select()
        .single();
        
      if (createError) throw createError;
      
      // Then start the backtest job
      const { data, error } = await supabase
        .rpc('run_strategy_backtest', { 
          strategy_id: strategyId,
          backtest_id: backtestRecord.id
        });
        
      if (error) throw error;
      
      return {
        backtestId: backtestRecord.id,
        ...data
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['backtestResults', variables.strategyId] });
    }
  });
  
  // Strategy action wrappers with error handling
  const createStrategy = useCallback(async (strategy: Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createStrategyMutation.mutateAsync(strategy);
      toast({
        title: "Strategy Created",
        description: `Strategy "${strategy.name}" has been created successfully.`,
        variant: "success"
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Failed to Create Strategy",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [createStrategyMutation, toast]);
  
  const updateStrategy = useCallback(async (strategyId: string, inputData: Partial<Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'>>) => {
    // Extract and normalize data for the API call which only supports active/inactive status
    const strategyData: Partial<{
      name: string;
      type: string;
      description: string;
      markets: string[];
      code: string;
      parameters: Record<string, any>;
      status: 'active' | 'inactive';
    }> = {
      ...inputData,
      // Convert backtesting status to inactive since the API only supports active/inactive
      status: inputData.status === 'backtesting' ? 'inactive' : inputData.status as 'active' | 'inactive' | undefined
    };
    try {
      await updateStrategyMutation.mutateAsync({ strategyId, strategyData });
      toast({
        title: "Strategy Updated",
        description: "The strategy has been updated successfully.",
        variant: "success"
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Failed to Update Strategy",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [updateStrategyMutation, toast]);
  
  const deleteStrategy = useCallback(async (strategyId: string) => {
    try {
      await deleteStrategyMutation.mutateAsync(strategyId);
      toast({
        title: "Strategy Deleted",
        description: "The strategy has been deleted successfully.",
        variant: "success"
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Failed to Delete Strategy",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [deleteStrategyMutation, toast]);
  
  const runBacktest = useCallback(async (strategyId: string, backtestParams: { startDate: string; endDate: string; markets: string[]; parameters: Record<string, any> }) => {
    try {
      await runBacktestMutation.mutateAsync({ strategyId, params: backtestParams });
      toast({
        title: "Backtest Started",
        description: "The backtest has been started and will run in the background.",
        variant: "success"
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Failed to Start Backtest",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [runBacktestMutation, toast]);
  
  return {
    strategies: strategiesQuery.data || [],
    strategiesLoading: strategiesQuery.isLoading,
    getBacktestResults,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    runBacktest
  };
}
