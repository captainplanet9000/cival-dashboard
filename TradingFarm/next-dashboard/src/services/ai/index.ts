/**
 * AI Services Module
 * Export all AI services and types for use in the application
 */

// Core LangChain service
export { default as LangChainService } from './langchain-service';

// Specialized AI services
export { default as TradingStrategyService } from './trading-strategy-service';
export { default as PerformanceInsightsService } from './performance-insights-service';
export { default as PortfolioOptimizationService } from './portfolio-optimization-service';

// Type definitions
export * from './types';

// Service instances factory
import LangChainService from './langchain-service';
import TradingStrategyService from './trading-strategy-service';
import PerformanceInsightsService from './performance-insights-service';
import PortfolioOptimizationService from './portfolio-optimization-service';
import { AIModelConfig } from './types';

/**
 * Create AI service instances with a shared LangChain service
 */
export function createAIServices(modelConfig?: AIModelConfig) {
  // Create shared LangChain service
  const langChainService = new LangChainService(modelConfig);
  
  // Create specialized services
  const tradingStrategyService = new TradingStrategyService(langChainService);
  const performanceInsightsService = new PerformanceInsightsService(langChainService);
  const portfolioOptimizationService = new PortfolioOptimizationService(langChainService);
  
  return {
    langChainService,
    tradingStrategyService,
    performanceInsightsService,
    portfolioOptimizationService,
  };
}
