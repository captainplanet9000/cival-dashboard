'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  mockMarketOverview,
  mockTopAssets,
  mockTrades,
  mockOpenOrders,
  mockPnlMetrics,
  mockAgents,
  mockOpenPositions
} from '@/utils/mock-data';

type MockDataContextType = {
  useMockData: boolean;
  setUseMockData: (use: boolean) => void;
  getMockData: <T>(key: string) => T | null;
  mockConnectionStatus: Record<string, boolean>;
};

const defaultMockConnectionStatus = {
  trades: true,
  agents: true,
  marketOverview: true,
  topAssets: true,
  orders: true,
  positions: true,
  socket: true
};

const MockDataContext = createContext<MockDataContextType>({
  useMockData: true,
  setUseMockData: () => {},
  getMockData: () => null,
  mockConnectionStatus: defaultMockConnectionStatus
});

export const useMockData = () => useContext(MockDataContext);

export function MockDataProvider({ children }: { children: React.ReactNode }) {
  const [useMockData, setUseMockData] = useState(true);
  const [mockConnectionStatus, setMockConnectionStatus] = useState(defaultMockConnectionStatus);

  // Simulate occasional connection instability for more realistic development
  useEffect(() => {
    if (!useMockData) return;
    
    const interval = setInterval(() => {
      const randomKey = Object.keys(mockConnectionStatus)[
        Math.floor(Math.random() * Object.keys(mockConnectionStatus).length)
      ];
      
      setMockConnectionStatus(prev => ({
        ...prev,
        [randomKey]: !prev[randomKey]
      }));
      
      // Reset after 3 seconds
      setTimeout(() => {
        setMockConnectionStatus(prev => ({
          ...prev,
          [randomKey]: true
        }));
      }, 3000);
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [useMockData, mockConnectionStatus]);

  const getMockData = <T,>(key: string): T | null => {
    if (!useMockData) return null;
    
    const mockDataMap: Record<string, any> = {
      marketOverview: mockMarketOverview,
      topAssets: mockTopAssets,
      recentTrades: mockTrades,
      openOrders: mockOpenOrders,
      pnlMetrics: mockPnlMetrics,
      agents: mockAgents,
      openPositions: mockOpenPositions
    };
    
    return mockDataMap[key] as T || null;
  };

  return (
    <MockDataContext.Provider value={{ useMockData, setUseMockData, getMockData, mockConnectionStatus }}>
      {children}
    </MockDataContext.Provider>
  );
}

// Hook for using mock queries that mimic react-query behavior
export function useMockQuery<T>({ 
  queryKey,
  mockData,
  enabled = true
}: { 
  queryKey: string[],
  mockData: T,
  enabled?: boolean
}) {
  // Access the context directly without using the hook (to avoid circular reference)
  const mockDataContext = useContext(MockDataContext);
  const { useMockData: shouldUseMockData, mockConnectionStatus } = mockDataContext;
  
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!shouldUseMockData || !enabled) return;
    
    let isMounted = true;
    
    // Simulate API loading time
    setIsLoading(true);
    const timer = setTimeout(() => {
      if (isMounted) {
        if (Math.random() > 0.95) {
          // Occasionally simulate an error for testing error states
          setError(new Error('Simulated fetch error'));
          setData(undefined);
        } else {
          setData(mockData);
          setError(null);
        }
        setIsLoading(false);
      }
    }, 700); // Simulate realistic loading time
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [useMockData, enabled, mockData]);
  
  // Get connection status for this query
  const isConnected = shouldUseMockData && mockConnectionStatus[queryKey[0]];
  
  return { data, isLoading, error, isConnected };
}
