"use client";

import { useEffect, useState } from "react";
import { useSocket, TRADING_EVENTS } from "@/providers/socket-provider";

export type MarketUpdate = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high24h: number;
  low24h: number;
  timestamp: number;
  orderBook?: {
    bids: Array<[number, number]>; // [price, amount]
    asks: Array<[number, number]>; // [price, amount]
  };
};

export const useSocketMarket = (symbols: string[]) => {
  const { socket, isConnected, subscribeToMarketUpdates, unsubscribeFromMarketUpdates } = useSocket();
  const [marketData, setMarketData] = useState<Record<string, MarketUpdate>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !isConnected) return;

    setIsLoading(true);
    
    // Subscribe to market updates for the requested symbols
    subscribeToMarketUpdates(symbols);

    // Handle market updates
    const handleMarketUpdate = (data: MarketUpdate | MarketUpdate[]) => {
      setIsLoading(false);
      
      const updates = Array.isArray(data) ? data : [data];
      
      setMarketData(prevData => {
        const newData = { ...prevData };
        
        updates.forEach(update => {
          if (symbols.includes(update.symbol)) {
            newData[update.symbol] = {
              ...update,
              timestamp: update.timestamp || Date.now(),
            };
          }
        });
        
        return newData;
      });
    };

    // Register event handler
    socket.on(TRADING_EVENTS.MARKET_UPDATE, handleMarketUpdate);

    return () => {
      // Unsubscribe and remove event handler when component unmounts
      unsubscribeFromMarketUpdates(symbols);
      socket.off(TRADING_EVENTS.MARKET_UPDATE, handleMarketUpdate);
    };
  }, [socket, isConnected, symbols, subscribeToMarketUpdates, unsubscribeFromMarketUpdates]);

  return {
    marketData,
    isLoading,
    error,
    isConnected,
  };
};
