import { PrismaClient, ExecutionStatus, TradeSide, TradeStatus } from '@prisma/client';
import { Server } from 'socket.io';
import exchangeService from '../exchanges/exchangeService';
import { parseStrategy } from './strategyParser';

const prisma = new PrismaClient();

interface StrategyExecutionConfig {
  farmId: string;
  strategyId: string;
  userId: string;
  apiKeyId: string;
  settings?: Record<string, any>;
}

class StrategyExecutionService {
  private io: Server | null = null;
  private activeExecutions: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Set the Socket.IO instance for real-time updates
   */
  setSocketIO(io: Server): void {
    this.io = io;
  }

  /**
   * Start execution of a strategy
   */
  async startExecution(config: StrategyExecutionConfig): Promise<any> {
    try {
      // Get the strategy
      const strategy = await prisma.strategy.findUnique({
        where: { id: config.strategyId }
      });

      if (!strategy) {
        throw new Error(`Strategy with ID ${config.strategyId} not found`);
      }

      // Get the farm
      const farm = await prisma.farm.findUnique({
        where: { id: config.farmId }
      });

      if (!farm) {
        throw new Error(`Farm with ID ${config.farmId} not found`);
      }

      // Create execution record
      const execution = await prisma.tradingExecution.create({
        data: {
          strategyId: config.strategyId,
          farmId: config.farmId,
          userId: config.userId,
          settings: config.settings || {},
          status: ExecutionStatus.ACTIVE
        }
      });

      // Initialize exchange
      const exchange = await exchangeService.getExchangeByApiKeyId(config.apiKeyId);
      
      // Parse and initialize the strategy
      const parsedStrategy = parseStrategy(strategy.code, strategy.language);

      // Set up execution interval for the strategy
      const intervalMs = (config.settings?.intervalMinutes || 5) * 60 * 1000;
      
      // Initial execution
      await this.executeStrategy(execution.id, parsedStrategy, exchange, farm.assetPairs);

      // Schedule recurring execution
      const interval = setInterval(async () => {
        try {
          // Check if execution is still active
          const executionStatus = await prisma.tradingExecution.findUnique({
            where: { id: execution.id },
            select: { status: true }
          });

          if (executionStatus?.status !== ExecutionStatus.ACTIVE) {
            this.stopExecution(execution.id);
            return;
          }

          await this.executeStrategy(execution.id, parsedStrategy, exchange, farm.assetPairs);
        } catch (error: any) {
          console.error(`Error in strategy execution interval: ${error.message}`);
          
          // Emit error event
          if (this.io) {
            this.io.to(`farm-${config.farmId}`).emit('execution-error', {
              executionId: execution.id,
              error: error.message
            });
          }
        }
      }, intervalMs);

      // Store interval reference
      this.activeExecutions.set(execution.id, interval);

      // Emit started event
      if (this.io) {
        this.io.to(`farm-${config.farmId}`).emit('execution-started', {
          executionId: execution.id,
          strategyId: config.strategyId,
          farmId: config.farmId
        });
      }

      return execution;
    } catch (error: any) {
      console.error(`Error starting strategy execution: ${error.message}`);
      throw new Error(`Failed to start strategy execution: ${error.message}`);
    }
  }

  /**
   * Execute a strategy once
   */
  private async executeStrategy(
    executionId: string,
    parsedStrategy: any,
    exchange: any,
    assetPairs: string[]
  ): Promise<void> {
    try {
      // For each asset pair, analyze and potentially execute trades
      for (const symbol of assetPairs) {
        // Get OHLCV data for analysis
        const timeframe = '1h'; // Can be configurable
        const ohlcv = await exchangeService.getOHLCV(exchange, symbol, timeframe, undefined, 100);
        
        // Process data for strategy input
        const candles = ohlcv.map((candle: any) => ({
          timestamp: candle[0],
          open: candle[1],
          high: candle[2],
          low: candle[3],
          close: candle[4],
          volume: candle[5]
        }));
        
        // Run strategy against candles
        const signals = parsedStrategy.execute(candles);
        
        // Process signals
        if (signals.length > 0) {
          const latestSignal = signals[signals.length - 1];
          
          if (latestSignal.action === 'buy' || latestSignal.action === 'sell') {
            // Get current market price
            const ticker = await exchangeService.getTicker(exchange, symbol);
            
            // Create a trade record
            const trade = await prisma.trade.create({
              data: {
                tradingExecutionId: executionId,
                exchange: exchange.id,
                assetPair: symbol,
                side: latestSignal.action === 'buy' ? TradeSide.BUY : TradeSide.SELL,
                entryPrice: ticker.last,
                quantity: latestSignal.amount || 0, // Amount from signal or calculate based on settings
                entryTime: new Date(),
                status: TradeStatus.OPEN,
                orderIds: [],
                notes: latestSignal.reason || 'Signal generated by strategy'
              }
            });
            
            // Execute the order on the exchange
            const orderResult = await exchangeService.createMarketOrder(
              exchange,
              symbol,
              latestSignal.action === 'buy' ? 'buy' : 'sell',
              trade.quantity
            );
            
            // Update trade with order id
            await prisma.trade.update({
              where: { id: trade.id },
              data: {
                orderIds: [orderResult.id],
                notes: `${trade.notes}; Order ID: ${orderResult.id}`
              }
            });
            
            // Emit trade event
            if (this.io) {
              this.io.to(`execution-${executionId}`).emit('trade-executed', {
                executionId,
                tradeId: trade.id,
                symbol,
                side: trade.side,
                price: trade.entryPrice,
                amount: trade.quantity
              });
            }
          }
        }
      }
    } catch (error: any) {
      console.error(`Error executing strategy: ${error.message}`);
      throw new Error(`Failed to execute strategy: ${error.message}`);
    }
  }

  /**
   * Stop execution of a strategy
   */
  async stopExecution(executionId: string): Promise<void> {
    try {
      // Clear interval if it exists
      const interval = this.activeExecutions.get(executionId);
      if (interval) {
        clearInterval(interval);
        this.activeExecutions.delete(executionId);
      }
      
      // Update execution status
      await prisma.tradingExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.STOPPED,
          stopTime: new Date()
        }
      });
      
      // Get execution details for event
      const execution = await prisma.tradingExecution.findUnique({
        where: { id: executionId },
        select: {
          farmId: true,
          strategyId: true
        }
      });
      
      // Emit stopped event
      if (this.io && execution) {
        this.io.to(`farm-${execution.farmId}`).emit('execution-stopped', {
          executionId,
          strategyId: execution.strategyId,
          farmId: execution.farmId
        });
      }
    } catch (error: any) {
      console.error(`Error stopping strategy execution: ${error.message}`);
      throw new Error(`Failed to stop strategy execution: ${error.message}`);
    }
  }

  /**
   * Pause execution of a strategy
   */
  async pauseExecution(executionId: string): Promise<void> {
    try {
      // Clear interval if it exists
      const interval = this.activeExecutions.get(executionId);
      if (interval) {
        clearInterval(interval);
        this.activeExecutions.delete(executionId);
      }
      
      // Update execution status
      await prisma.tradingExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.PAUSED
        }
      });
      
      // Get execution details for event
      const execution = await prisma.tradingExecution.findUnique({
        where: { id: executionId },
        select: {
          farmId: true,
          strategyId: true
        }
      });
      
      // Emit paused event
      if (this.io && execution) {
        this.io.to(`farm-${execution.farmId}`).emit('execution-paused', {
          executionId,
          strategyId: execution.strategyId,
          farmId: execution.farmId
        });
      }
    } catch (error: any) {
      console.error(`Error pausing strategy execution: ${error.message}`);
      throw new Error(`Failed to pause strategy execution: ${error.message}`);
    }
  }

  /**
   * Resume execution of a paused strategy
   */
  async resumeExecution(executionId: string): Promise<void> {
    try {
      // Get execution details
      const execution = await prisma.tradingExecution.findUnique({
        where: { id: executionId },
        include: {
          farm: {
            select: {
              assetPairs: true
            }
          },
          strategy: true
        }
      });
      
      if (!execution) {
        throw new Error(`Execution with ID ${executionId} not found`);
      }
      
      if (execution.status !== ExecutionStatus.PAUSED) {
        throw new Error(`Cannot resume execution that is not paused`);
      }
      
      // Get API key
      const apiKey = await prisma.apiKey.findFirst({
        where: {
          farmId: execution.farmId
        }
      });
      
      if (!apiKey) {
        throw new Error(`No API key found for farm ${execution.farmId}`);
      }
      
      // Initialize exchange
      const exchange = await exchangeService.getExchangeByApiKeyId(apiKey.id);
      
      // Parse and initialize the strategy
      const parsedStrategy = parseStrategy(execution.strategy.code, execution.strategy.language);
      
      // Set up execution interval for the strategy
      const settings = execution.settings as Record<string, any> || {};
      const intervalMs = (settings.intervalMinutes || 5) * 60 * 1000;
      
      // Schedule recurring execution
      const interval = setInterval(async () => {
        try {
          // Check if execution is still active
          const executionStatus = await prisma.tradingExecution.findUnique({
            where: { id: executionId },
            select: { status: true }
          });

          if (executionStatus?.status !== ExecutionStatus.ACTIVE) {
            this.stopExecution(executionId);
            return;
          }

          await this.executeStrategy(executionId, parsedStrategy, exchange, execution.farm.assetPairs);
        } catch (error: any) {
          console.error(`Error in strategy execution interval: ${error.message}`);
          
          // Emit error event
          if (this.io) {
            this.io.to(`farm-${execution.farmId}`).emit('execution-error', {
              executionId,
              error: error.message
            });
          }
        }
      }, intervalMs);
      
      // Store interval reference
      this.activeExecutions.set(executionId, interval);
      
      // Update execution status
      await prisma.tradingExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.ACTIVE
        }
      });
      
      // Emit resumed event
      if (this.io) {
        this.io.to(`farm-${execution.farmId}`).emit('execution-resumed', {
          executionId,
          strategyId: execution.strategyId,
          farmId: execution.farmId
        });
      }
    } catch (error: any) {
      console.error(`Error resuming strategy execution: ${error.message}`);
      throw new Error(`Failed to resume strategy execution: ${error.message}`);
    }
  }

  /**
   * Get all active executions
   */
  getActiveExecutionIds(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Stop all active executions
   */
  async stopAllExecutions(): Promise<void> {
    const executionIds = this.getActiveExecutionIds();
    const promises = executionIds.map(id => this.stopExecution(id));
    await Promise.all(promises);
  }
}

// Create a strategy parser placeholder (to be implemented)
const parseStrategy = (code: string, language: string) => {
  // This would be a more complex implementation based on the strategy language
  // Here we just return a simple object with an execute method
  return {
    execute: (candles: any[]) => {
      // Simple placeholder strategy logic
      const signals = [];
      if (candles.length > 14) {
        const lastCandle = candles[candles.length - 1];
        const prevCandle = candles[candles.length - 2];
        
        // Simple price movement detection
        if (lastCandle.close > prevCandle.close * 1.02) {
          signals.push({
            action: 'buy',
            amount: 0.1,
            reason: 'Price moved up by more than 2%'
          });
        } else if (lastCandle.close < prevCandle.close * 0.98) {
          signals.push({
            action: 'sell',
            amount: 0.1,
            reason: 'Price moved down by more than 2%'
          });
        }
      }
      return signals;
    }
  };
};

// Export a singleton instance
export const strategyExecutionService = new StrategyExecutionService();

export default strategyExecutionService; 