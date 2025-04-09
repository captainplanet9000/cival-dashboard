export interface Farm {
  id: number;
  name: string;
  description: string;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'ERROR';
  exchange: string;
  apiKey: string;
  apiSecret: string;
  createdAt: string;
  updatedAt: string;

  // Goal-related fields (added from migration)
  goal_name?: string | null;
  goal_description?: string | null;
  goal_target_assets?: string[] | null;
  goal_target_amount?: number | null;
  goal_current_progress?: Record<string, number> | null; // e.g., {'SUI': 500, 'SONIC': 100}
  goal_status?: 'inactive' | 'active' | 'paused' | 'completed' | 'failed' | null;
  goal_completion_action?: {
    transferToBank?: {
      enabled: boolean; // Indicates if transfer should happen
      percentage: number; // Percentage of goal asset(s) balance to transfer (0-100)
      targetVaultId: string; // ID of the destination vault account
      assetSymbol?: string; // Optional: Specific asset symbol to transfer. If null, may use goal_target_assets.
    };
    startNextGoal?: boolean;
    // Add other potential actions here
  } | null;
  goal_deadline?: string | null;
  goal_progress?: number | null;

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