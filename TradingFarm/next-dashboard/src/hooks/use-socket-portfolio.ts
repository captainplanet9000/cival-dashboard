"use client";

import { useEffect, useState } from "react";
import { useSocket, TRADING_EVENTS } from "@/providers/socket-provider";

export type AssetHolding = {
  symbol: string;
  amount: number;
  averageEntryPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  allocation: number; // Percentage of portfolio
};

export type PortfolioUpdate = {
  totalValue: number;
  fiatBalance: number;
  cryptoValue: number;
  pnl24h: number;
  pnl24hPercent: number;
  pnlTotal: number;
  pnlTotalPercent: number;
  holdings: AssetHolding[];
  timestamp: number;
};

export const useSocketPortfolio = () => {
  const { socket, isConnected } = useSocket();
  const [portfolio, setPortfolio] = useState<PortfolioUpdate | null>(null);
  const [portfolioHistory, setPortfolioHistory] = useState<Array<{value: number, timestamp: number}>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!socket || !isConnected) return;

    setIsLoading(true);

    // Handle portfolio updates
    const handlePortfolioUpdate = (data: PortfolioUpdate) => {
      setIsLoading(false);
      setPortfolio(data);
      
      // Add to history for charting
      setPortfolioHistory(prev => {
        const newEntry = { 
          value: data.totalValue, 
          timestamp: data.timestamp 
        };
        
        // Maintain a time-series with reasonable size (e.g., 1000 points)
        return [...prev, newEntry].slice(-1000);
      });
    };

    // Register event handler
    socket.on(TRADING_EVENTS.PORTFOLIO_UPDATE, handlePortfolioUpdate);

    // Request initial portfolio data
    socket.emit("portfolio:get");

    return () => {
      socket.off(TRADING_EVENTS.PORTFOLIO_UPDATE, handlePortfolioUpdate);
    };
  }, [socket, isConnected]);

  // Function to request portfolio rebalancing
  const requestRebalance = (targetAllocation: Record<string, number>) => {
    if (!socket || !isConnected) {
      console.error("Cannot request rebalance: Socket not connected");
      return false;
    }

    socket.emit("portfolio:rebalance", { targetAllocation });
    return true;
  };

  return {
    portfolio,
    portfolioHistory,
    isLoading,
    isConnected,
    requestRebalance,
  };
};
