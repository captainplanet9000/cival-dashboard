// Export MCP services
export * from './mcp/coordinator-service';
export * from './mcp/message-queue-service';

// Export other services as they are created 

// Export services
export * from './strategies';
export * from './strategies/ingestion';
export * from './strategies/execution';

// Export Trading Farm services with renamed types to avoid conflicts
export { 
  farmService,
} from './farm-service';

export { 
  walletService as tfWalletService,
} from './wallet-service';

export { 
  strategyService as tfStrategyService,
} from './strategy-service';

export { 
  elizaService as tfElizaService,
} from './eliza-service';

export { 
  analyticsService as tfAnalyticsService,
} from './analytics-service';

export { 
  tradingService as tfTradingService,
} from './trading-service';

// Export types
export type { ApiResponse, Farm, FarmWallet, FarmAgent } from './farm-service';
export type { Wallet as TFWallet, Transaction, VaultBalance } from './wallet-service';
export type { Strategy as TFStrategy, BacktestResult } from './strategy-service';
export type { ElizaMessage, ElizaConversation, KnowledgeItem } from './eliza-service';
export type { PerformanceMetrics, RiskMetrics, StrategyAnalytics } from './analytics-service';
export type { Order, Trade, FlashLoan, TradeStats } from './trading-service'; 