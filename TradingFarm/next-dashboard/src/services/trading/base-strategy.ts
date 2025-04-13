import { Strategy, StrategyParams, StrategySignal, MarketData } from './strategy-interface';
import { Position, TimeFrame } from '@/types/trading.types';

/**
 * BaseStrategy implements common functionality for all strategies
 */
export abstract class BaseStrategy implements Strategy {
  protected params: StrategyParams;
  protected state: Record<string, any> = {};
  
  constructor(params?: StrategyParams) {
    this.params = params || this.getDefaultParams();
  }
  
  /**
   * Get the strategy identifier
   */
  getId(): string {
    return this.params.id;
  }
  
  /**
   * Get the strategy name
   */
  getName(): string {
    return this.params.name;
  }
  
  /**
   * Get the strategy description
   */
  getDescription(): string {
    return this.params.description || '';
  }
  
  /**
   * Get default parameters - must be implemented by each strategy
   */
  abstract getDefaultParams(): StrategyParams;
  
  /**
   * Configure the strategy with specific parameters
   */
  configure(params: StrategyParams): void {
    this.params = {
      ...this.getDefaultParams(),
      ...params
    };
  }
  
  /**
   * Get the required market data symbols and timeframes
   */
  getRequiredMarketData(): { symbols: string[], timeframes: TimeFrame[] } {
    return {
      symbols: this.params.symbols,
      timeframes: [this.params.timeframe]
    };
  }
  
  /**
   * Process market data and generate trading signals
   * This is the core method that must be implemented by each strategy
   */
  abstract processMarketData(marketData: MarketData): StrategySignal[];
  
  /**
   * Process current positions to potentially generate exit signals
   * Default implementation checks stop loss and take profit levels
   */
  processPositions(positions: Position[]): StrategySignal[] {
    const signals: StrategySignal[] = [];
    const timestamp = new Date().toISOString();
    
    // Filter positions related to this strategy
    const strategyPositions = positions.filter(p => 
      p.strategyId === this.params.id && 
      this.params.symbols.includes(p.symbol)
    );
    
    for (const position of strategyPositions) {
      // Check stop loss
      if (position.stopLoss !== undefined) {
        if (
          (position.side === 'long' && position.markPrice <= position.stopLoss) ||
          (position.side === 'short' && position.markPrice >= position.stopLoss)
        ) {
          signals.push({
            symbol: position.symbol,
            side: position.side === 'long' ? 'sell' : 'buy',
            strength: 1, // High confidence for stop loss
            price: position.markPrice,
            timestamp,
            timeframe: this.params.timeframe,
            metadata: {
              reason: 'stop_loss',
              positionId: position.id,
              stopLoss: position.stopLoss
            }
          });
        }
      }
      
      // Check take profit
      if (position.takeProfit !== undefined) {
        if (
          (position.side === 'long' && position.markPrice >= position.takeProfit) ||
          (position.side === 'short' && position.markPrice <= position.takeProfit)
        ) {
          signals.push({
            symbol: position.symbol,
            side: position.side === 'long' ? 'sell' : 'buy',
            strength: 1, // High confidence for take profit
            price: position.markPrice,
            timestamp,
            timeframe: this.params.timeframe,
            metadata: {
              reason: 'take_profit',
              positionId: position.id,
              takeProfit: position.takeProfit
            }
          });
        }
      }
    }
    
    return signals;
  }
  
  /**
   * Reset strategy state
   */
  reset(): void {
    this.state = {};
  }
  
  /**
   * Get the current strategy state (for persistence)
   */
  getState(): Record<string, any> {
    return { ...this.state };
  }
  
  /**
   * Restore the strategy state (after restart)
   */
  setState(state: Record<string, any>): void {
    this.state = { ...state };
  }
  
  /**
   * Calculate position size based on risk parameters
   * @param capital The available capital
   * @param entryPrice The entry price
   * @param stopLoss The stop loss price
   */
  protected calculatePositionSize(capital: number, entryPrice: number, stopLoss?: number): number {
    const maxPositionSize = capital * (this.params.risk.maxPositionSize / 100);
    
    if (!stopLoss || stopLoss === 0) {
      // If no stop loss, use the max position size based on risk percentage
      return maxPositionSize;
    }
    
    // Calculate risk per trade
    const riskPerTrade = capital * (this.params.risk.maxDrawdown / 100);
    
    // Calculate risk per unit
    const riskPerUnit = Math.abs(entryPrice - stopLoss);
    
    if (riskPerUnit === 0) {
      return maxPositionSize;
    }
    
    // Calculate position size based on risk
    const positionSize = riskPerTrade / riskPerUnit;
    
    // Return the smaller of the two position sizes
    return Math.min(positionSize, maxPositionSize);
  }
  
  /**
   * Calculate stop loss price based on risk parameters
   * @param entryPrice The entry price
   * @param side The position side (long or short)
   */
  protected calculateStopLoss(entryPrice: number, side: 'long' | 'short'): number | undefined {
    if (!this.params.risk.stopLossPercent) {
      return undefined;
    }
    
    const stopLossPercent = this.params.risk.stopLossPercent / 100;
    
    if (side === 'long') {
      return entryPrice * (1 - stopLossPercent);
    } else {
      return entryPrice * (1 + stopLossPercent);
    }
  }
  
  /**
   * Calculate take profit price based on risk parameters
   * @param entryPrice The entry price
   * @param side The position side (long or short)
   */
  protected calculateTakeProfit(entryPrice: number, side: 'long' | 'short'): number | undefined {
    if (!this.params.risk.takeProfitPercent) {
      return undefined;
    }
    
    const takeProfitPercent = this.params.risk.takeProfitPercent / 100;
    
    if (side === 'long') {
      return entryPrice * (1 + takeProfitPercent);
    } else {
      return entryPrice * (1 - takeProfitPercent);
    }
  }
}
