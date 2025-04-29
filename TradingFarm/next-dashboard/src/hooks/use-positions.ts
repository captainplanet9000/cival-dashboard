import { useQuery } from '@tanstack/react-query';
import { useTradingClient } from '@/utils/trading/trading-client';
import { createBrowserClient } from '@/utils/supabase/client';

export interface Position {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice?: number;
  notionalValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  initialMargin: number;
  exchange: string;
}

export interface PositionHistory {
  timestamp: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  price: number;
  pnl: number;
  cumulativePnl: number;
}

export interface AccountSummary {
  totalBalance: number;
  totalAvailable: number;
  totalMargin: number;
  totalUnrealizedPnl: number;
  maintenanceMargin: number;
  marginLevel: number;
}

/**
 * Hook for fetching and managing trading positions
 * 
 * @param exchange - The exchange to fetch positions for
 * @param exchangeCredentialId - The exchange credential ID
 * @returns Position data and account summary
 */
export function usePositions(exchange: string, exchangeCredentialId: number) {
  const tradingClient = useTradingClient();
  const supabase = createBrowserClient();
  
  // Fetch current positions
  const positionsQuery = useQuery({
    queryKey: ['positions', exchange, exchangeCredentialId],
    queryFn: async () => {
      return tradingClient.getPositions(exchange, exchangeCredentialId);
    },
    // Update every 5 seconds for real-time position monitoring
    refetchInterval: 5000
  });
  
  // Fetch position history
  const positionHistoryQuery = useQuery({
    queryKey: ['positionHistory', exchange, exchangeCredentialId],
    queryFn: async () => {
      // Get session user ID
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('User not authenticated');
      }
      
      const userId = session.session.user.id;
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      
      const { data, error } = await supabase
        .from('position_history')
        .select('*')
        .eq('user_id', userId)
        .eq('exchange_credential_id', exchangeCredentialId)
        .gte('timestamp', startOfDay)
        .order('timestamp', { ascending: true });
        
      if (error) throw error;
      
      return (data || []).map(item => ({
        timestamp: item.timestamp,
        symbol: item.symbol,
        side: item.side,
        size: item.size,
        price: item.price,
        pnl: item.pnl,
        cumulativePnl: item.cumulative_pnl
      }));
    }
  });
  
  // Fetch account summary
  const accountSummaryQuery = useQuery({
    queryKey: ['accountSummary', exchange, exchangeCredentialId],
    queryFn: async () => {
      return tradingClient.getAccountSummary(exchange, exchangeCredentialId);
    },
    // Update every 5 seconds for real-time account monitoring
    refetchInterval: 5000
  });
  
  return {
    positions: positionsQuery.data || [],
    positionHistory: positionHistoryQuery.data || [],
    accountSummary: accountSummaryQuery.data,
    isLoading: positionsQuery.isLoading || positionHistoryQuery.isLoading || accountSummaryQuery.isLoading,
    error: positionsQuery.error || positionHistoryQuery.error || accountSummaryQuery.error
  };
}
