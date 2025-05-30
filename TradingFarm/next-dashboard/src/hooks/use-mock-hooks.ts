'use client';

import { useMockData, useMockQuery } from '@/providers/mock-data-provider';

// Mock implementation of usePositions hook
export function usePositions({ status }: { status: string }) {
  const { getMockData, mockConnectionStatus } = useMockData();
  const mockPositions = getMockData('openPositions');
  
  return useMockQuery({
    queryKey: ['openPositions'],
    mockData: mockPositions
  });
}

// Mock implementation of useSupabaseRealtime hook
export function useSupabaseRealtime(tableName: string, queryKeys: string[]) {
  const { mockConnectionStatus } = useMockData();
  
  // Map tableName to the proper mock connection status key
  const connectionKeyMap: Record<string, string> = {
    'trades': 'trades',
    'agents': 'agents',
    'market_tickers': 'marketOverview',
    'asset_performance': 'topAssets',
    'orders': 'orders',
    'positions': 'positions'
  };
  
  const connectionKey = connectionKeyMap[tableName] || tableName;
  
  return {
    isConnected: mockConnectionStatus[connectionKey] || false
  };
}

// Mock implementation of useSocket hook
export function useSocket() {
  const { mockConnectionStatus } = useMockData();
  
  return {
    isConnected: mockConnectionStatus.socket || false
  };
}
