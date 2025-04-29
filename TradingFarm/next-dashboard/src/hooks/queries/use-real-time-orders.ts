/**
 * Real-time orders hook for Trading Farm Dashboard
 * Performance-optimized with memoization and debouncing
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';
import { Order, OrderStatus } from '@/hooks/queries/use-orders';

// Optimized interface for real-time order updates
export interface RealTimeOrderUpdate {
  id: string;
  status?: OrderStatus;
  filled_quantity?: number;
  average_fill_price?: number;
  updated_at: string;
}

export interface RealTimeOrdersOptions {
  farmId?: string;
  walletId?: string;
  statuses?: OrderStatus[];
  limit?: number;
  debounceMs?: number; // Control UI update frequency (default: 250ms)
  includeHistory?: boolean; // Whether to include historical orders
  onOrderStatusChange?: (order: Order, previousStatus: OrderStatus) => void;
}

/**
 * Hook for real-time order monitoring with optimized performance
 * Uses WebSockets, debouncing, and memoization to prevent UI jank
 */
export function useRealTimeOrders({
  farmId,
  walletId,
  statuses = ['open', 'pending', 'partially_filled'],
  limit = 50,
  debounceMs = 250,
  includeHistory = false,
  onOrderStatusChange,
}: RealTimeOrdersOptions = {}) {
  const queryClient = useQueryClient();
  const supabase = createBrowserClient<Database>();
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, RealTimeOrderUpdate>>({});
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create memoized query key to prevent unnecessary re-renders
  const queryKey = useMemo(() => 
    ['orders', 'realtime', { farmId, walletId, statuses, limit, includeHistory }], 
    [farmId, walletId, statuses?.join(','), limit, includeHistory]
  );
  
  // Initial data load
  const query = useQuery<Order[]>({
    queryKey,
    queryFn: async () => {
      let query = supabase.from('orders').select('*');
      
      // Apply filters
      if (farmId) query = query.eq('farm_id', farmId);
      if (walletId) query = query.eq('wallet_id', walletId);
      
      // Status filtering
      if (statuses && statuses.length > 0) {
        if (!includeHistory) {
          query = query.in('status', statuses);
        }
      }
      
      // Sort by most recent first
      query = query.order('created_at', { ascending: false }).limit(limit);
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data as unknown as Order[];
    },
    staleTime: 10000, // 10 seconds before data is considered stale
  });
  
  // Apply debounced updates to prevent UI jank from frequent WebSocket messages
  const applyPendingUpdates = useCallback(() => {
    if (Object.keys(pendingUpdates).length === 0) return;
    
    queryClient.setQueryData(queryKey, (oldData: Order[] = []) => {
      // Track status changes for callback
      const statusChanges: Array<{ order: Order, previousStatus: OrderStatus }> = [];
      
      // Update existing orders with new data
      const updatedData = oldData.map(order => {
        const update = pendingUpdates[order.id];
        if (!update) return order;
        
        // Track status change if needed
        if (update.status && update.status !== order.status && onOrderStatusChange) {
          statusChanges.push({
            order: { ...order, status: update.status },
            previousStatus: order.status
          });
        }
        
        return {
          ...order,
          ...update,
          // Only update specific fields that can change in real-time
          status: update.status || order.status,
          filled_quantity: update.filled_quantity ?? order.filled_quantity,
          average_fill_price: update.average_fill_price ?? order.average_fill_price,
          updated_at: update.updated_at
        };
      });
      
      // Trigger callbacks for status changes
      if (statusChanges.length > 0 && onOrderStatusChange) {
        setTimeout(() => {
          statusChanges.forEach(({ order, previousStatus }) => {
            onOrderStatusChange(order, previousStatus);
          });
        }, 0);
      }
      
      return updatedData;
    });
    
    // Clear pending updates
    setPendingUpdates({});
  }, [pendingUpdates, queryKey, queryClient, onOrderStatusChange]);
  
  // Set up WebSocket subscription for real-time updates
  useEffect(() => {
    if (!farmId && !walletId) return;
    
    // Create channel name based on filters
    const channelName = `orders-${farmId || ''}-${walletId || ''}`;
    
    const channel = supabase.channel(channelName)
      .on('broadcast', { event: 'order-update' }, (payload) => {
        if (!payload.payload) return;
        
        const updates = payload.payload as RealTimeOrderUpdate[];
        if (!Array.isArray(updates) || updates.length === 0) return;
        
        // Collect updates to apply them in batch
        setPendingUpdates(prev => {
          const newUpdates = { ...prev };
          
          updates.forEach(update => {
            newUpdates[update.id] = {
              ...newUpdates[update.id],
              ...update
            };
          });
          
          return newUpdates;
        });
        
        // Debounce updates to prevent excessive re-renders
        if (updateTimerRef.current) {
          clearTimeout(updateTimerRef.current);
        }
        
        updateTimerRef.current = setTimeout(() => {
          applyPendingUpdates();
          updateTimerRef.current = null;
        }, debounceMs);
      })
      .subscribe();
      
    return () => {
      // Clean up timer and subscription
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      channel.unsubscribe();
    };
  }, [farmId, walletId, debounceMs, applyPendingUpdates]);
  
  // Memoize the result to prevent unnecessary renders
  return useMemo(() => ({
    ...query,
    data: query.data || [],
    pendingUpdateCount: Object.keys(pendingUpdates).length,
  }), [query, pendingUpdates]);
}

export default useRealTimeOrders;
