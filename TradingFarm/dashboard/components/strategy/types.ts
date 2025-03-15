// Strategy types for the TradingFarm dashboard

export enum StrategyStatus {
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  ERROR = 'error',
  CONFIGURING = 'configuring'
}

export enum StrategyType {
  TREND_FOLLOWING = 'trend_following',
  MEAN_REVERSION = 'mean_reversion',
  BREAKOUT = 'breakout',
  MOMENTUM = 'momentum',
  ARBITRAGE = 'arbitrage',
  CUSTOM = 'custom',
  ELLIOTT_WAVE = 'elliott_wave'
}

export interface StrategyParameter {
  id: string;
  name: string;
  description: string;
  type: 'number' | 'string' | 'boolean' | 'select' | 'array';
  value: any;
  default: any;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{value: string; label: string}>;
  validation?: {
    required?: boolean;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  type: StrategyType;
  status: StrategyStatus;
  parameters: StrategyParameter[];
  exchanges: string[];
  symbols: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  performance?: {
    profitLoss: number;
    winRate: number;
    drawdown: number;
    sharpeRatio: number;
    totalTrades: number;
  };
  isLive: boolean;
  isBacktesting: boolean;
  isElizaOSOptimized: boolean;
}

export interface StrategyFilter {
  search?: string;
  status?: StrategyStatus[];
  types?: StrategyType[];
  exchanges?: string[];
  isLive?: boolean;
  isElizaOSOptimized?: boolean;
}

export interface StrategyTableColumn {
  id: keyof Strategy | 'actions';
  header: string;
  cell: (strategy: Strategy) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface StrategyBacktest {
  id: string;
  strategyId: string;
  startDate: string;
  endDate: string;
  status: 'running' | 'completed' | 'failed';
  results?: {
    profitLoss: number;
    winRate: number;
    drawdown: number;
    sharpeRatio: number;
    totalTrades: number;
  };
}

export interface ImportedStrategy {
  name: string;
  description: string;
  type: StrategyType;
  parameters: StrategyParameter[];
  code?: string;
  isValid: boolean;
}

export interface StrategyService {
  getStrategies: () => Promise<Strategy[]>;
  getStrategy: (id: string) => Promise<Strategy>;
  createStrategy: (strategy: Partial<Strategy>) => Promise<Strategy>;
  updateStrategy: (id: string, strategy: Partial<Strategy>) => Promise<Strategy>;
  deleteStrategy: (id: string) => Promise<boolean>;
  duplicateStrategy: (id: string) => Promise<Strategy>;
  toggleStrategyStatus: (id: string) => Promise<Strategy>;
  importStrategy: (file: File) => Promise<ImportedStrategy>;
  runBacktest: (id: string, startDate: Date, endDate: Date) => Promise<StrategyBacktest>;
}
