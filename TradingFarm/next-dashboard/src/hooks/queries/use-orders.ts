/**
 * Orders data hook for Trading Farm Dashboard
 * Provides type-safe access to order data with caching and real-time updates
 */
import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';

// Strong typing for orders
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderStatus = 'pending' | 'open' | 'filled' | 'partially_filled' | 'canceled' | 'rejected' | 'expired';

export interface Order {
  id: string;
  user_id: string;
  farm_id: string;
  wallet_id: string;
  agent_id?: string;
  strategy_id?: string;
  exchange: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  quantity: number;
  price?: number;
  filled_quantity: number;
  average_fill_price?: number;
  created_at: string;
  updated_at: string;
  execution_time?: string;
  time_in_force: string;
  stop_loss_price?: number;
  take_profit_price?: number;
  expiration?: string;
  leverage?: number;
  is_conditional: boolean;
  metadata: Record<string, any>;
}

export interface OrdersParams {
  farmId?: string;
  walletId?: string;
  agentId?: string;
  strategyId?: string;
  status?: OrderStatus | OrderStatus[];
  side?: OrderSide;
  symbol?: string;
  limit?: number;
  order?: 'asc' | 'desc';
  orderBy?: 'created_at' | 'updated_at' | 'execution_time';
}

/**
 * Fetches order data from Trading Farm
 * @param params Optional filter parameters
 * @returns Query result with typed orders data, loading state, and error handling
 */
export function useOrders(params?: OrdersParams) {
  const { 
    farmId, 
    walletId, 
    agentId, 
    strategyId, 
    status, 
    side, 
    symbol, 
    limit = 50,
    order = 'desc',
    orderBy = 'created_at'
  } = params || {};
  
  const supabase = createBrowserClient<Database>();
  
  return useQuery<Order[], Error>({
    queryKey: ['orders', { farmId, walletId, agentId, strategyId, status, side, symbol, limit, order, orderBy }],
    queryFn: async () => {
      try {
        let query = supabase.from('orders').select('*');
        
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
        
        return data as unknown as Order[];
      } catch (error) {
        console.error('Orders fetch error:', error);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds before data is considered stale
    refetchInterval: 60000, // refetch every minute
  });
}

export default useOrders;
