export interface Strategy {
  id: string;
  name: string;
  description: string;
  type: 'MOMENTUM' | 'MEAN_REVERSION' | 'TREND_FOLLOWING' | 'ARBITRAGE';
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'ERROR';
  tradingPair: string;
  createdAt: string;
  updatedAt: string;
  performance: {
    totalReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    winRate: number;
    profitFactor: number;
  };
  settings: {
    timeframe: string;
    entryConditions: string[];
    exitConditions: string[];
    riskManagement: {
      stopLoss: number;
      takeProfit: number;
      maxPositionSize: number;
      maxLeverage: number;
    };
  };
} 