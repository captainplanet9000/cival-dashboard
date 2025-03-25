export interface Agent {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'error' | 'offline' | string;
  type: string;
  description?: string;
  model?: string;
  performance?: {
    day: number;
    week: number;
    month: number;
    winRate: number;
    avgProfit: number;
  };
  farm?: {
    id: string;
    name: string;
  };
  trades?: Array<{
    id: string;
    pair: string;
    type: 'buy' | 'sell';
    amount: number;
    price: number;
    time: string;
    profit: number;
  }>;
  capabilities?: string[];
  tools?: Array<{
    name: string;
    status: 'active' | 'disabled' | 'error' | string;
    lastUsed?: string;
    usageLevel?: 'High' | 'Medium' | 'Low' | string;
    type?: string;
  }>;
  settings?: {
    general?: {
      timeZone?: string;
      notifications?: boolean;
      reportFrequency?: 'real-time' | 'daily' | 'weekly' | string;
    };
    trading?: {
      maxTradeSize?: number;
      stopLoss?: number;
      takeProfit?: number;
      leverageAllowed?: boolean;
    };
    automation?: {
      active?: boolean;
      tradingHours?: 'all' | 'set-hours' | string;
      maxDailyTrades?: number;
    };
  };
  AIModelConfig?: {
    primary?: string;
    fallback?: string;
    maxBudget?: number;
    usedBudget?: number;
    avgTokensPerRequest?: number;
    promptTemplate?: string;
  };
}
