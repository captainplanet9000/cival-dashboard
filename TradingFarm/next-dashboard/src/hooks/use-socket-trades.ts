"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/providers/socket-provider";
import { TRADING_EVENTS } from "@/constants/socket-events";

export type TradeExecution = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
  total: number;
  status: "pending" | "executed" | "failed" | "canceled";
  timestamp: number;
  orderId?: string;
  agentId?: string;
  txHash?: string;
  exchange?: string;
  fee?: number;
};

export const useSocketTrades = () => {
  const { socket, isConnected } = useSocket();
  const [trades, setTrades] = useState<TradeExecution[]>([]);
  const [latestTrade, setLatestTrade] = useState<TradeExecution | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!socket || !isConnected) return;

    setIsLoading(true);

    // Handle trade execution updates
    const handleTradeExecution = (data: TradeExecution) => {
      setIsLoading(false);
      setLatestTrade(data);
      
      setTrades(prevTrades => {
        // Check if trade already exists
        const existingTradeIndex = prevTrades.findIndex(trade => trade.id === data.id);
        
        if (existingTradeIndex >= 0) {
          // Update existing trade
          const updatedTrades = [...prevTrades];
          updatedTrades[existingTradeIndex] = data;
          return updatedTrades;
        } else {
          // Add new trade to the beginning of the array
          return [data, ...prevTrades].slice(0, 100); // Limit to 100 trades
        }
      });
    };

    // Register event handler
    socket.on(TRADING_EVENTS.TRADE_EXECUTED, handleTradeExecution);

    // Request initial trade history
    socket.emit("trade:history", { limit: 50 });

    return () => {
      socket.off(TRADING_EVENTS.TRADE_EXECUTED, handleTradeExecution);
    };
  }, [socket, isConnected]);

  // Function to send a new trade order
  const submitTrade = (trade: Omit<TradeExecution, "id" | "status" | "timestamp">) => {
    if (!socket || !isConnected) {
      console.error("Cannot submit trade: Socket not connected");
      return false;
    }

    socket.emit("trade:submit", trade);
    return true;
  };

  // Function to cancel a pending trade
  const cancelTrade = (tradeId: string) => {
    if (!socket || !isConnected) {
      console.error("Cannot cancel trade: Socket not connected");
      return false;
    }

    socket.emit("trade:cancel", { tradeId });
    return true;
  };

  return {
    trades,
    latestTrade,
    isLoading,
    isConnected,
    submitTrade,
    cancelTrade,
  };
};
