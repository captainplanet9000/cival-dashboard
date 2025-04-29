import React from 'react';
const { useState, useEffect } = React;
import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/utils/supabase/client';

/**
 * Type definitions for performance data
 */
export interface PerformanceMetrics {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgHoldingTime: string;
  profitFactor: number;
  monthlyReturns?: Array<{
    month: string;
    return: number;
  }>;
}

export interface StrategyPerformance {
  id: string;
  name: string;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
}

/**
 * Hook to fetch and manage trading performance data
 * 
 * @param userId - The user ID to fetch performance data for
 * @param timeRange - The time range to fetch performance data for ('day', 'week', 'month', 'year', 'all')
 * @returns Performance data and loading state
 */
export function usePerformanceData(
  userId: string,
  timeRange: 'day' | 'week' | 'month' | 'year' | 'all' = 'month'
) {
  const supabase = createBrowserClient();
  
  // Convert timeRange to date range
  const getDateRange = () => {
    const now = new Date();
    const endDate = now.toISOString();
    let startDate = new Date();
    
    switch (timeRange) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        // Use a very old date to get all data
        startDate = new Date(2010, 0, 1);
        break;
    }
    
    return { startDate: startDate.toISOString(), endDate };
  };
  
  const { startDate, endDate } = getDateRange();
  
  // Fetch equity curve data
  const equityCurveQuery = useQuery({
    queryKey: ['equityCurve', userId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_value_history')
        .select('date, equity')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
        
      if (error) throw error;
      return data || [];
    }
  });
  
  // Fetch performance metrics
  const fetchPerformanceData = async (userId: string, timeRange: string): Promise<PerformanceMetrics> => {
    const { data, error } = await supabase
      .from('performance_metrics')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error) throw error;
    
    // Fetch monthly returns if we're looking at longer timeframes
    let monthlyReturns = [];
    if (timeRange === 'year' || timeRange === 'all') {
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('monthly_returns')
        .select('month, return')
        .eq('user_id', userId)
        .gte('month', timeRange === 'year' ? new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 7) : '2010-01')
        .order('month', { ascending: true });
        
      if (!monthlyError) {
        monthlyReturns = monthlyData || [];
      }
    }
    
    return {
      ...data,
      monthlyReturns
    } as PerformanceMetrics;
  };
  
  const performanceMetricsQuery = useQuery({
    queryKey: ['performanceMetrics', userId, startDate, endDate],
    queryFn: async () => {
      return fetchPerformanceData(userId, timeRange);
    }
  });
  
  // Fetch drawdown data
  const drawdownQuery = useQuery({
    queryKey: ['drawdown', userId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drawdown_history')
        .select('date, drawdown')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
        
      if (error) throw error;
      return data || [];
    }
  });
  
  // Fetch trade distribution
  const tradeDistributionQuery = useQuery({
    queryKey: ['tradeDistribution', userId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trade_distribution')
        .select('name, value')
        .eq('user_id', userId)
        .eq('time_range', timeRange);
        
      if (error) throw error;
      return data || [];
    }
  });
  
  // Fetch strategy performance
  const getStrategyPerformance = async (userId: string): Promise<StrategyPerformance[]> => {
    const { data, error } = await supabase
      .from('strategy_performance')
      .select('id, name, total_return, sharpe_ratio, max_drawdown, win_rate')
      .eq('user_id', userId)
      .order('total_return', { ascending: false });
      
    if (error) throw error;
    
    return (data || []).map((strategy: any) => ({
      id: strategy.id,
      name: strategy.name,
      totalReturn: strategy.total_return,
      sharpeRatio: strategy.sharpe_ratio,
      maxDrawdown: strategy.max_drawdown,
      winRate: strategy.win_rate
    }));
  };
  
  const strategyPerformanceQuery = useQuery({
    queryKey: ['strategyPerformance', userId, startDate, endDate],
    queryFn: async () => {
      return getStrategyPerformance(userId);
    }
  });
  
  // For now we'll just use the performance metrics query state since we haven't defined the others yet
  const isLoading = performanceMetricsQuery.isLoading || strategyPerformanceQuery.isLoading;
  const error = performanceMetricsQuery.error || strategyPerformanceQuery.error;
  
  return {
    performanceMetrics: performanceMetricsQuery.data,
    strategies: strategyPerformanceQuery.data,
    isLoading,
    error,
    refetch: () => {
      performanceMetricsQuery.refetch();
      strategyPerformanceQuery.refetch();
    }
  };
}
