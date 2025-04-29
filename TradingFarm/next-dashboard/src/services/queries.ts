// Centralized query functions for TanStack Query data fetching
import { createBrowserClient } from '@/utils/supabase/client';
import { ExchangeService } from './exchangeService';

export async function fetchPerformanceStats() {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.from('performance_stats').select('*');
  if (error) throw error;
  return data;
}

export async function fetchMonthlyReturns() {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.from('monthly_returns').select('*');
  if (error) throw error;
  return data;
}

export async function fetchFarms() {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.from('farms').select('*');
  if (error) throw error;
  return data;
}

export async function fetchMarketAnalysis(symbol: string) {
  const exchangeService = new ExchangeService('coinbase', {});
  return exchangeService.getMarketAnalysis(symbol);
}

export async function fetchStrategyComparison() {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.from('strategy_comparison').select('*');
  if (error) throw error;
  return data;
}

// Mock implementation for the fetchFarm function
export async function fetchFarm(farmId: number) {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.from('farms').select('*').eq('id', farmId).single();
  if (error) throw error;
  return data;
}
