import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { farmApiClient } from '@/services/api-client';
import { Farm, Agent, Wallet, RiskProfile } from '@/types/farm-types';

/**
 * Custom hook for fetching farm data with error handling and loading states
 */
export const useFarmData = (farmId: string | number) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Fetch farm details
  const farmQuery = useQuery({
    queryKey: ['farm', farmId, retryCount],
    queryFn: async () => {
      try {
        const response = await farmApiClient.getFarm(farmId);
        if (!response.success) {
          throw new Error(response.error || 'Failed to load farm data');
        }
        setIsOfflineMode(false);
        return response.data;
      } catch (error) {
        // If we can't connect, switch to offline mode with demo data
        setIsOfflineMode(true);
        throw error;
      }
    },
    retry: 1,
    staleTime: 30000, // 30 seconds
  });

  // Fetch agents for the farm
  const agentsQuery = useQuery({
    queryKey: ['agents', farmId, retryCount],
    queryFn: async () => {
      if (isOfflineMode) {
        // Return empty array in offline mode, demo farm has agents built-in
        return [];
      }
      
      const response = await farmApiClient.getAgents(farmId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load agents');
      }
      return response.data;
    },
    enabled: !farmQuery.isLoading && !isOfflineMode,
    retry: 1,
    staleTime: 30000,
  });

  // Fetch wallets for the farm
  const walletsQuery = useQuery({
    queryKey: ['wallets', farmId, retryCount],
    queryFn: async () => {
      if (isOfflineMode) {
        // Return empty array in offline mode, demo farm has wallets built-in
        return [];
      }
      
      const response = await farmApiClient.getWallets(farmId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load wallets');
      }
      return response.data;
    },
    enabled: !farmQuery.isLoading && !isOfflineMode,
    retry: 1,
    staleTime: 30000,
  });

  // Fetch risk profile
  const riskProfileQuery = useQuery({
    queryKey: ['riskProfile', farmId, retryCount],
    queryFn: async () => {
      if (isOfflineMode) {
        // Return demo risk profile in offline mode
        return {
          riskScore: 65,
          factors: [
            { name: 'Volatility Exposure', impact: 0.7, description: 'High exposure to volatile markets' },
            { name: 'Diversification', impact: 0.4, description: 'Moderate diversification across assets' },
            { name: 'Liquidity', impact: 0.3, description: 'Good liquidity in primary markets' },
          ]
        };
      }
      
      const response = await farmApiClient.getFarmRiskProfile(farmId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load risk profile');
      }
      return response.data;
    },
    enabled: !farmQuery.isLoading,
    retry: 1,
    staleTime: 60000, // 1 minute
  });

  // Mutation for updating farm
  const updateFarmMutation = useMutation({
    mutationFn: (data: Partial<Farm>) => farmApiClient.updateFarm(farmId, data),
    onSuccess: () => {
      // Invalidate queries to refetch data
      farmQuery.refetch();
    }
  });

  // Combined loading state
  const isLoading = farmQuery.isLoading || 
                  (!isOfflineMode && (agentsQuery.isLoading || walletsQuery.isLoading));

  // Combined error state
  const error = farmQuery.error || 
              (!isOfflineMode && (agentsQuery.error || walletsQuery.error || riskProfileQuery.error));

  // Function to retry loading data
  const retryConnection = () => {
    setRetryCount(prev => prev + 1);
    setIsOfflineMode(false);
  };

  // Combine data for consumption
  const data = {
    farm: farmQuery.data as Farm | undefined,
    agents: agentsQuery.data as Agent[] | undefined,
    wallets: walletsQuery.data as Wallet[] | undefined,
    riskProfile: riskProfileQuery.data as RiskProfile | undefined,
    isOfflineMode,
  };

  return {
    data,
    isLoading,
    error,
    isOfflineMode,
    retryConnection,
    updateFarm: updateFarmMutation.mutate,
    isUpdating: updateFarmMutation.isPending,
  };
};

/**
 * Custom hook for demo data when working offline
 */
export const getDemoFarm = (): Farm => {
  return {
    id: 0,
    name: "Demo Trading Farm",
    description: "This is demo data shown because we couldn't connect to the backend API",
    user_id: "demo-user",
    is_active: true,
    status: "active",
    exchange: "binance",
    asset_pairs: ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
    risk_profile: {
      max_drawdown: 15,
      max_trade_size: 5,
      risk_per_trade: 1.5,
      volatility_tolerance: "medium"
    },
    performance_metrics: {
      win_rate: 68,
      profit_factor: 1.8,
      trades_count: 142,
      total_profit_loss: 15420,
      average_win: 240,
      average_loss: 120
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    agents: [
      {
        id: 1,
        name: "Demo BTC Grid Bot",
        description: "A demo grid trading bot for Bitcoin",
        farm_id: 0,
        is_active: true,
        status: "running",
        type: "grid_trading",
        strategy_name: "Conservative Grid",
        configuration: {
          exchange: "binance",
          trading_pairs: ["BTC/USDT"],
          risk_level: 2,
          max_order_size: 0.1,
          use_elizaos: true,
          elizaos_settings: {
            mode: "conservative",
            adaptation_speed: "medium"
          }
        },
        performance: {
          trades_count: 86,
          win_rate: 72,
          profit_loss: 8720,
          active_since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          last_trade: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        name: "Demo ETH DCA Bot",
        description: "A demo dollar-cost averaging bot for Ethereum",
        farm_id: 0,
        is_active: true,
        status: "idle",
        type: "dca",
        strategy_name: "Weekly DCA",
        configuration: {
          exchange: "binance",
          trading_pairs: ["ETH/USDT"],
          risk_level: 1,
          max_order_size: 0.5,
          use_elizaos: true,
          elizaos_settings: {
            mode: "accumulation",
            interval: "weekly"
          }
        },
        performance: {
          trades_count: 24,
          win_rate: 65,
          profit_loss: 3250,
          active_since: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          last_trade: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 3,
        name: "Demo SOL ElizaOS AI Bot",
        description: "A demo Solana trading bot using ElizaOS AI",
        farm_id: 0,
        is_active: true,
        status: "running",
        type: "ai_trading",
        strategy_name: "ElizaOS AI Strategy",
        configuration: {
          exchange: "binance",
          trading_pairs: ["SOL/USDT"],
          risk_level: 3,
          max_order_size: 10,
          use_elizaos: true,
          elizaos_settings: {
            model: "trading-optimized",
            mode: "adaptive",
            market_analysis: true,
            sentiment_analysis: true
          }
        },
        performance: {
          trades_count: 32,
          win_rate: 78,
          profit_loss: 3450,
          active_since: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          last_trade: new Date().toISOString(),
        },
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }
    ],
    wallets: [
      {
        id: 1,
        name: "Demo Trading Wallet",
        description: "Main trading wallet for demo farm",
        farm_id: 0,
        user_id: "demo-user",
        address: "0x1234567890123456789012345678901234567890",
        balance: 25000,
        currency: "USDT",
        wallet_type: "trading",
        is_active: true,
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        name: "Demo Assets Wallet",
        description: "Assets storage wallet for demo farm",
        farm_id: 0,
        user_id: "demo-user",
        address: "0x0987654321098765432109876543210987654321",
        balance: 5.5,
        currency: "BTC",
        wallet_type: "assets",
        is_active: true,
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      }
    ]
  };
};
