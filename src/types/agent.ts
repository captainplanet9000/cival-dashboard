export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'ERROR';
  type: 'EXECUTION' | 'MONITORING' | 'ANALYSIS';
  farmId: string;
  strategyId: string;
  createdAt: string;
  updatedAt: string;
  lastExecuted: string | null;
  performance: {
    successRate: number;
    averageExecutionTime: number;
    totalExecutions: number;
    failedExecutions: number;
  };
  settings: {
    executionInterval: number;
    maxRetries: number;
    timeout: number;
    notificationThreshold: number;
    autoRestart: boolean;
  };
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    networkLatency: number;
    lastHeartbeat: string;
  };
  permissions: {
    canTrade: boolean;
    canModifyStrategy: boolean;
    canAccessFunds: boolean;
    maxTradeAmount: number;
  };
} 