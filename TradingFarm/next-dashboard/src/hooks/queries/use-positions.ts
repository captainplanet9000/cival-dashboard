/**
 * Positions data hook for Trading Farm Dashboard
 * Provides type-safe access to position data with caching and real-time updates
 */
import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';

// Strong typing for positions
export type PositionSide = 'long' | 'short';
export type PositionStatus = 'open' | 'closed' | 'liquidated';

export interface Position {
  id: string;
  user_id: string;
  farm_id: string;
  wallet_id: string;
  agent_id?: string;
  strategy_id?: string;
  exchange: string;
  symbol: string;
  side: PositionSide;
  status: PositionStatus;
  entry_price: number;
  current_price: number;
  quantity: number;
  remaining_quantity: number;
  liquidation_price?: number;
  take_profit_price?: number;
  stop_loss_price?: number;
  pnl: number;
  pnl_percentage: number;
  leverage?: number;
  margin?: number;
  funding_fee?: number;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  metadata: Record<string, any>;
}

export interface PositionsParams {
  farmId?: string;
  walletId?: string;
  agentId?: string;
  strategyId?: string;
  status?: PositionStatus | PositionStatus[];
  side?: PositionSide;
  symbol?: string;
  limit?: number;
  order?: 'asc' | 'desc';
  orderBy?: 'created_at' | 'updated_at' | 'pnl' | 'pnl_percentage';
}

/**
 * Fetches position data from Trading Farm
 * @param params Optional filter parameters
 * @returns Query result with typed position data, loading state, and error handling
 */
export function usePositions(params?: PositionsParams) {
  const { 
    farmId, 
    walletId, 
    agentId, 
    strategyId, 
    status = 'open', // Default to open positions
    side, 
    symbol, 
    limit = 50,
    order = 'desc',
    orderBy = 'created_at'
  } = params || {};
  
  const supabase = createBrowserClient<Database>();
  
  return useQuery<Position[], Error>({
    queryKey: ['positions', { farmId, walletId, agentId, strategyId, status, side, symbol, limit, order, orderBy }],
    queryFn: async () => {
      try {
        let query = supabase.from('positions').select('*');
        
        // Apply filters
        if (farmId) query = query.eq('farm_id', farmId);
        if (walletId) query = query.eq('wallet_id', walletId);
        if (agentId) query = query.eq('agent_id', agentId);
        if (strategyId) query = query.eq('strategy_id', strategyId);
        if (side) query = query.eq('side', side);
        if (symbol) query = query.eq('symbol', symbol);
        
        // Handle status filter (single or array)
        if (status) {
          if (Array.isArray(status)) {
            query = query.in('status', status);
          } else {
            query = query.eq('status', status);
          }
        }
        
        // Apply sorting and pagination
        query = query.order(orderBy, { ascending: order === 'asc' }).limit(limit);
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        return data as unknown as Position[];
      } catch (error) {
        console.error('Positions fetch error:', error);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds before data is considered stale
    refetchInterval: 20000, // refetch every 20 seconds for more real-time PnL
  });
}

export default usePositions;
