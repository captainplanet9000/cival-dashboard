import * as React from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useSupabaseRealtime } from './useSupabaseRealtime';
import { logEvent } from '@/utils/logging';

export interface Position {
  id: string;
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  size: number;
  leverage: number;
  side: 'long' | 'short';
  pnl: number;
  pnlPercent: number;
  status: 'open' | 'closed' | 'liquidated';
  strategy: string;
  openTime: string;
  closeTime?: string;
  exchange: string;
  riskLevel: 'low' | 'medium' | 'high';
  stopLoss?: number;
  takeProfit?: number;
  fees: number;
  user_id: string;
}

export function usePositionData(positionId: string) {
  const [position, setPosition] = React.useState<Position | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const supabase = createBrowserClient();
  
  // Subscribe to realtime updates for this position
  const { isConnected } = useSupabaseRealtime('positions', ['positions', positionId]);

  React.useEffect(() => {
    async function fetchPositionData() {
      if (!positionId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from('positions')
          .select('*')
          .eq('id', positionId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          // Calculate current PnL based on current price
          // In a real implementation, you'd fetch the current price from an API
          const currentPrice = data.current_price || data.entry_price;
          const pnl = data.side === 'long' 
            ? (currentPrice - data.entry_price) * data.size
            : (data.entry_price - currentPrice) * data.size;
          const pnlPercent = (pnl / (data.entry_price * data.size)) * 100;
          
          const formattedPosition: Position = {
            id: data.id,
            symbol: data.symbol,
            entryPrice: data.entry_price,
            currentPrice: currentPrice,
            size: data.size,
            leverage: data.leverage,
            side: data.side,
            pnl: pnl,
            pnlPercent: pnlPercent,
            status: data.status,
            strategy: data.strategy,
            openTime: data.open_time,
            closeTime: data.close_time,
            exchange: data.exchange,
            riskLevel: data.risk_level,
            stopLoss: data.stop_loss,
            takeProfit: data.take_profit,
            fees: data.fees,
            user_id: data.user_id
          };
          
          setPosition(formattedPosition);
          
          // Log view event
          logEvent({
            category: 'position',
            action: 'fetch_details',
            label: positionId,
            value: 1
          });
        }
      } catch (err) {
        console.error('Error fetching position data:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        
        // Log error event
        logEvent({
          category: 'error',
          action: 'fetch_position_error',
          label: positionId,
          value: 1
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchPositionData();
    
    // Set up an interval to refresh data (especially for current price updates)
    const intervalId = setInterval(fetchPositionData, 15000); // every 15 seconds
    
    return () => clearInterval(intervalId);
  }, [positionId, supabase]);

  // Functions to update position
  const updateStopLoss = async (newStopLoss: number) => {
    if (!position) return;
    
    try {
      const { error } = await supabase
        .from('positions')
        .update({ stop_loss: newStopLoss })
        .eq('id', positionId);
      
      if (error) throw error;
      
      // Optimistically update local state
      setPosition((prev: Position | null) => prev ? { ...prev, stopLoss: newStopLoss } : null);
      
      logEvent({
        category: 'position',
        action: 'update_stop_loss',
        label: positionId,
        value: newStopLoss
      });
      
      return true;
    } catch (err) {
      console.error('Error updating stop loss:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  };

  const updateTakeProfit = async (newTakeProfit: number) => {
    if (!position) return;
    
    try {
      const { error } = await supabase
        .from('positions')
        .update({ take_profit: newTakeProfit })
        .eq('id', positionId);
      
      if (error) throw error;
      
      // Optimistically update local state
      setPosition((prev: Position | null) => prev ? { ...prev, takeProfit: newTakeProfit } : null);
      
      logEvent({
        category: 'position',
        action: 'update_take_profit',
        label: positionId,
        value: newTakeProfit
      });
      
      return true;
    } catch (err) {
      console.error('Error updating take profit:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  };

  const closePosition = async () => {
    if (!position) return;
    
    try {
      // In a real implementation, this would execute a close order on the exchange
      // For now, we'll just update the position status
      const { error } = await supabase
        .from('positions')
        .update({ 
          status: 'closed',
          close_time: new Date().toISOString()
        })
        .eq('id', positionId);
      
      if (error) throw error;
      
      // Optimistically update local state
      setPosition((prev: Position | null) => prev ? { 
        ...prev, 
        status: 'closed',
        closeTime: new Date().toISOString()
      } : null);
      
      logEvent({
        category: 'position',
        action: 'close_position',
        label: positionId,
        value: position.pnl
      });
      
      return true;
    } catch (err) {
      console.error('Error closing position:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  };

  return {
    position,
    loading,
    error,
    isConnected,
    updateStopLoss,
    updateTakeProfit,
    closePosition
  };
}
