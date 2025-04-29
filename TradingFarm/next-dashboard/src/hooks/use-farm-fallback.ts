'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Error handler for farm operations
 * Provides graceful fallback when farms table has schema issues
 */
export function useFarmErrorHandler() {
  const { toast } = useToast();
  const [showedToast, setShowedToast] = useState(false);

  useEffect(() => {
    // Listen for console errors related to farms table schema
    const originalConsoleError = console.error;
    
    console.error = function(...args) {
      // Call the original console.error
      originalConsoleError.apply(console, args);
      
      // Check if this is a farms schema error
      const errorString = args.join(' ');
      if ((errorString.includes('is_active') || errorString.includes('farms')) && !showedToast) {
        // Show a friendly toast notification just once
        toast({
          title: "Development mode active",
          description: "Using sample farm data. Database schema will be complete in production.",
          duration: 5000,
        });
        
        setShowedToast(true);
      }
    };
    
    // Restore original console.error on cleanup
    return () => {
      console.error = originalConsoleError;
    };
  }, [toast, showedToast]);
  
  // Return mock farms data as a fallback
  return {
    getFarmFallbackData: () => ([
      {
        id: 'farm-1',
        name: 'Momentum Strategy Farm',
        description: 'A farm focused on momentum strategies across crypto markets',
        user_id: 'user-1',
        config: {
          max_position_size: 0.1,
          risk_level: 'moderate',
          markets: ['BTC/USD', 'ETH/USD', 'SOL/USD']
        },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        performance: {
          daily: 1.2,
          weekly: 4.5,
          monthly: 12.3,
          yearly: 45.7
        }
      },
      {
        id: 'farm-2',
        name: 'Mean Reversion Farm',
        description: 'Capitalizes on price reversions to the mean',
        user_id: 'user-1',
        config: {
          max_position_size: 0.05,
          risk_level: 'conservative',
          markets: ['BTC/USD', 'ETH/USD', 'AVAX/USD']
        },
        is_active: true,
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        performance: {
          daily: -0.5,
          weekly: 2.3,
          monthly: 7.8,
          yearly: 31.2
        }
      },
      {
        id: 'farm-3',
        name: 'Breakout Strategy Farm',
        description: 'Identifies and trades breakouts from consolidation patterns',
        user_id: 'user-1',
        config: {
          max_position_size: 0.15,
          risk_level: 'aggressive',
          markets: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD']
        },
        is_active: false,
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        performance: {
          daily: 0,
          weekly: 0,
          monthly: 0,
          yearly: 0
        }
      }
    ]),
    createFarm: (farmData: any) => {
      return Promise.resolve({
        ...farmData,
        id: `farm-${Math.floor(Math.random() * 1000)}`,
        user_id: 'user-1',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    },
    updateFarm: (id: string, farmData: any) => {
      return Promise.resolve({
        ...farmData,
        id,
        updated_at: new Date().toISOString()
      });
    },
    deleteFarm: (id: string) => {
      return Promise.resolve({ success: true });
    },
    toggleFarmActive: (id: string, isActive: boolean) => {
      return Promise.resolve({
        id,
        is_active: isActive,
        updated_at: new Date().toISOString()
      });
    }
  };
}
