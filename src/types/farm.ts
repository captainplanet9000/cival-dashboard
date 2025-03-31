export interface Farm {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'ERROR';
  exchange: string;
  apiKey: string;
  apiSecret: string;
  createdAt: string;
  updatedAt: string;
  balance: {
    total: number;
    available: number;
    locked: number;
    currency: string;
  };
  performance: {
    totalReturn: number;
    dailyReturn: number;
    monthlyReturn: number;
    winRate: number;
    profitFactor: number;
  };
  settings: {
    maxPositions: number;
    maxDrawdown: number;
    riskPerTrade: number;
    leverageLimit: number;
    allowedStrategies: string[];
  };
  activeStrategies: string[];
  tradingPairs: string[];
} 